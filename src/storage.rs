//! Data persistence for Geekfit
//!
//! Handles saving and loading user progress data to JSON files.
//! Data is stored in the user's data directory for cross-platform support.

use crate::models::UserProgress;
use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

/// Storage manager for persisting user data
pub struct Storage {
    /// Path to the data file
    data_path: PathBuf,

    /// Cached user progress (thread-safe)
    progress: Arc<RwLock<UserProgress>>,

    /// Whether auto-save is enabled
    auto_save: bool,
}

impl Storage {
    /// Get the data directory path
    pub fn data_dir() -> Result<PathBuf> {
        dirs::data_dir()
            .map(|p| p.join("geekfit"))
            .context("Failed to determine data directory")
    }

    /// Get the main data file path
    pub fn data_path() -> Result<PathBuf> {
        Ok(Self::data_dir()?.join("progress.json"))
    }

    /// Get the backup data file path
    pub fn backup_path() -> Result<PathBuf> {
        Ok(Self::data_dir()?.join("progress.backup.json"))
    }

    /// Create a new storage manager, loading existing data if available
    pub fn new() -> Result<Self> {
        let data_path = Self::data_path()?;
        let progress = Self::load_from_file(&data_path)?;

        Ok(Self {
            data_path,
            progress: Arc::new(RwLock::new(progress)),
            auto_save: true,
        })
    }

    /// Load progress from a specific file path
    fn load_from_file(path: &PathBuf) -> Result<UserProgress> {
        if path.exists() {
            let contents = fs::read_to_string(path)
                .with_context(|| format!("Failed to read data file: {:?}", path))?;

            let progress: UserProgress = serde_json::from_str(&contents)
                .with_context(|| "Failed to parse data file")?;

            log::info!("Loaded progress from {:?}", path);
            Ok(progress)
        } else {
            log::info!("No existing data file, starting fresh");
            Ok(UserProgress::default())
        }
    }

    /// Save progress to file
    pub fn save(&self) -> Result<()> {
        let dir = Self::data_dir()?;
        fs::create_dir_all(&dir)
            .with_context(|| format!("Failed to create data directory: {:?}", dir))?;

        // Create backup of existing file
        if self.data_path.exists() {
            let backup_path = Self::backup_path()?;
            if let Err(e) = fs::copy(&self.data_path, &backup_path) {
                log::warn!("Failed to create backup: {}", e);
            }
        }

        // Get read lock and serialize
        let progress = self.progress.read()
            .map_err(|e| anyhow::anyhow!("Failed to acquire read lock: {}", e))?;

        let contents = serde_json::to_string_pretty(&*progress)
            .context("Failed to serialize progress")?;

        // Write atomically by writing to temp file first
        let temp_path = self.data_path.with_extension("tmp");
        fs::write(&temp_path, &contents)
            .with_context(|| format!("Failed to write temp file: {:?}", temp_path))?;

        fs::rename(&temp_path, &self.data_path)
            .with_context(|| format!("Failed to rename temp file to: {:?}", self.data_path))?;

        log::debug!("Saved progress to {:?}", self.data_path);
        Ok(())
    }

    /// Get a clone of the current progress
    pub fn get_progress(&self) -> Result<UserProgress> {
        let progress = self.progress.read()
            .map_err(|e| anyhow::anyhow!("Failed to acquire read lock: {}", e))?;
        Ok(progress.clone())
    }

    /// Get the Arc<RwLock<UserProgress>> for shared access
    pub fn get_progress_handle(&self) -> Arc<RwLock<UserProgress>> {
        Arc::clone(&self.progress)
    }

    /// Update progress with a closure, optionally auto-saving
    pub fn update<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&mut UserProgress) -> R,
    {
        let result = {
            let mut progress = self.progress.write()
                .map_err(|e| anyhow::anyhow!("Failed to acquire write lock: {}", e))?;
            f(&mut *progress)
        };

        if self.auto_save {
            self.save()?;
        }

        Ok(result)
    }

    /// Record an exercise, updating progress and saving
    pub fn record_exercise(
        &self,
        exercise_type: crate::models::ExerciseType,
        reps: u32,
    ) -> Result<Vec<crate::models::Badge>> {
        self.update(|progress| {
            progress.record_exercise(exercise_type, reps)
        })
    }

    /// Get the tooltip summary
    pub fn tooltip_summary(&self) -> Result<String> {
        let progress = self.progress.read()
            .map_err(|e| anyhow::anyhow!("Failed to acquire read lock: {}", e))?;
        Ok(progress.tooltip_summary())
    }

    /// Get the detailed report
    pub fn detailed_report(&self) -> Result<String> {
        let progress = self.progress.read()
            .map_err(|e| anyhow::anyhow!("Failed to acquire read lock: {}", e))?;
        Ok(progress.detailed_report())
    }

    /// Export data to a specified path (for backup purposes)
    pub fn export_to(&self, path: &PathBuf) -> Result<()> {
        let progress = self.progress.read()
            .map_err(|e| anyhow::anyhow!("Failed to acquire read lock: {}", e))?;

        let contents = serde_json::to_string_pretty(&*progress)
            .context("Failed to serialize progress for export")?;

        fs::write(path, contents)
            .with_context(|| format!("Failed to export to: {:?}", path))?;

        log::info!("Exported progress to {:?}", path);
        Ok(())
    }

    /// Import data from a specified path
    pub fn import_from(&self, path: &PathBuf) -> Result<()> {
        let contents = fs::read_to_string(path)
            .with_context(|| format!("Failed to read import file: {:?}", path))?;

        let imported: UserProgress = serde_json::from_str(&contents)
            .with_context(|| "Failed to parse import file")?;

        {
            let mut progress = self.progress.write()
                .map_err(|e| anyhow::anyhow!("Failed to acquire write lock: {}", e))?;
            *progress = imported;
        }

        self.save()?;
        log::info!("Imported progress from {:?}", path);
        Ok(())
    }

    /// Reset all progress (use with caution!)
    pub fn reset(&self) -> Result<()> {
        // Create backup first
        self.save()?;
        let backup_path = Self::backup_path()?;
        if self.data_path.exists() {
            fs::copy(&self.data_path, &backup_path)
                .context("Failed to create backup before reset")?;
            log::info!("Created backup at {:?} before reset", backup_path);
        }

        {
            let mut progress = self.progress.write()
                .map_err(|e| anyhow::anyhow!("Failed to acquire write lock: {}", e))?;
            *progress = UserProgress::default();
        }

        self.save()?;
        log::info!("Progress has been reset");
        Ok(())
    }

    /// Get storage statistics
    pub fn storage_stats(&self) -> Result<StorageStats> {
        let data_size = if self.data_path.exists() {
            fs::metadata(&self.data_path)?.len()
        } else {
            0
        };

        let backup_path = Self::backup_path()?;
        let backup_size = if backup_path.exists() {
            fs::metadata(&backup_path)?.len()
        } else {
            0
        };

        Ok(StorageStats {
            data_path: self.data_path.clone(),
            data_size_bytes: data_size,
            backup_size_bytes: backup_size,
            has_backup: backup_path.exists(),
        })
    }
}

/// Statistics about storage usage
#[derive(Debug)]
pub struct StorageStats {
    pub data_path: PathBuf,
    pub data_size_bytes: u64,
    pub backup_size_bytes: u64,
    pub has_backup: bool,
}

impl StorageStats {
    pub fn format(&self) -> String {
        format!(
            "Data file: {:?}\nData size: {} bytes\nBackup size: {} bytes\nHas backup: {}",
            self.data_path,
            self.data_size_bytes,
            self.backup_size_bytes,
            self.has_backup
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ExerciseType;
    use std::env;

    #[test]
    fn test_storage_paths() {
        // Just verify paths can be generated
        let data_dir = Storage::data_dir();
        assert!(data_dir.is_ok());

        let data_path = Storage::data_path();
        assert!(data_path.is_ok());
    }

    #[test]
    fn test_storage_operations() {
        // Use temp directory for testing
        let temp_dir = env::temp_dir().join("geekfit_test");
        let _ = fs::remove_dir_all(&temp_dir); // Clean up any previous test
        fs::create_dir_all(&temp_dir).unwrap();

        // Create a test storage instance
        let storage = Storage {
            data_path: temp_dir.join("test_progress.json"),
            progress: Arc::new(RwLock::new(UserProgress::default())),
            auto_save: false,
        };

        // Record an exercise
        let badges = storage.record_exercise(ExerciseType::PushUps, 10).unwrap();
        assert!(badges.contains(&crate::models::Badge::FirstCommit));

        // Verify progress was updated
        let progress = storage.get_progress().unwrap();
        assert_eq!(progress.total_exercises, 1);
        assert_eq!(progress.total_points, 10);

        // Clean up
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
