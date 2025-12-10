//! Configuration management for Geekfit
//!
//! Handles loading, saving, and default configuration from TOML files.
//! Config is stored in the user's config directory for cross-platform support.

use crate::models::ExerciseType;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Main configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// General app settings
    pub general: GeneralConfig,

    /// Reminder/scheduling settings
    pub reminders: ReminderConfig,

    /// Exercise settings
    pub exercises: ExerciseConfig,

    /// Notification settings
    pub notifications: NotificationConfig,
}

/// General application settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralConfig {
    /// Whether to start minimized to tray
    pub start_minimized: bool,

    /// Whether to launch on system startup (informational, actual implementation is OS-specific)
    pub launch_on_startup: bool,

    /// Log level (debug, info, warn, error)
    pub log_level: String,
}

/// Reminder scheduling configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReminderConfig {
    /// Minimum interval between reminders in minutes
    pub min_interval_minutes: u32,

    /// Maximum interval between reminders in minutes (for random scheduling)
    pub max_interval_minutes: u32,

    /// Whether to use random intervals within the min/max range
    pub use_random_intervals: bool,

    /// Work day start hour (24h format)
    pub work_start_hour: u32,

    /// Work day end hour (24h format)
    pub work_end_hour: u32,

    /// Days of the week to send reminders (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    pub active_days: Vec<u32>,

    /// Whether reminders are currently enabled
    pub enabled: bool,
}

/// Exercise-specific configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExerciseConfig {
    /// Which exercises are enabled for reminders
    pub enabled_exercises: Vec<ExerciseType>,

    /// Custom rep counts per exercise (overrides defaults)
    pub custom_reps: std::collections::HashMap<ExerciseType, u32>,

    /// Daily goals per exercise type (optional)
    pub daily_goals: std::collections::HashMap<ExerciseType, u32>,
}

/// Notification settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationConfig {
    /// Whether to show notifications
    pub enabled: bool,

    /// Notification sound (platform-dependent)
    pub play_sound: bool,

    /// How long notifications stay visible (seconds, 0 = system default)
    pub timeout_seconds: u32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            general: GeneralConfig {
                start_minimized: true,
                launch_on_startup: false,
                log_level: "info".to_string(),
            },
            reminders: ReminderConfig {
                min_interval_minutes: 60,  // 1 hour minimum
                max_interval_minutes: 120, // 2 hours maximum
                use_random_intervals: true,
                work_start_hour: 9,  // 9 AM
                work_end_hour: 17,   // 5 PM
                active_days: vec![1, 2, 3, 4, 5], // Monday through Friday
                enabled: true,
            },
            exercises: ExerciseConfig {
                enabled_exercises: vec![
                    ExerciseType::PushUps,
                    ExerciseType::Squats,
                    ExerciseType::Planks,
                ],
                custom_reps: std::collections::HashMap::new(),
                daily_goals: std::collections::HashMap::new(),
            },
            notifications: NotificationConfig {
                enabled: true,
                play_sound: true,
                timeout_seconds: 10,
            },
        }
    }
}

impl Config {
    /// Get the config directory path
    pub fn config_dir() -> Result<PathBuf> {
        dirs::config_dir()
            .map(|p| p.join("geekfit"))
            .context("Failed to determine config directory")
    }

    /// Get the config file path
    pub fn config_path() -> Result<PathBuf> {
        Ok(Self::config_dir()?.join("config.toml"))
    }

    /// Load configuration from file, or create default if not exists
    pub fn load() -> Result<Self> {
        let path = Self::config_path()?;

        if path.exists() {
            let contents = fs::read_to_string(&path)
                .with_context(|| format!("Failed to read config file: {:?}", path))?;

            let config: Config = toml::from_str(&contents)
                .with_context(|| "Failed to parse config file")?;

            log::info!("Loaded config from {:?}", path);
            Ok(config)
        } else {
            log::info!("Config file not found, creating default at {:?}", path);
            let config = Config::default();
            config.save()?;
            Ok(config)
        }
    }

    /// Save configuration to file
    pub fn save(&self) -> Result<()> {
        let dir = Self::config_dir()?;
        fs::create_dir_all(&dir)
            .with_context(|| format!("Failed to create config directory: {:?}", dir))?;

        let path = Self::config_path()?;
        let contents = toml::to_string_pretty(self)
            .context("Failed to serialize config")?;

        fs::write(&path, contents)
            .with_context(|| format!("Failed to write config file: {:?}", path))?;

        log::info!("Saved config to {:?}", path);
        Ok(())
    }

    /// Get the rep count for an exercise (custom or default)
    pub fn get_reps(&self, exercise: &ExerciseType) -> u32 {
        self.exercises
            .custom_reps
            .get(exercise)
            .copied()
            .unwrap_or_else(|| exercise.default_reps())
    }

    /// Check if it's currently within work hours
    pub fn is_work_hours(&self) -> bool {
        use chrono::{Local, Timelike, Datelike};

        let now = Local::now();
        let hour = now.hour();
        let weekday = now.weekday().num_days_from_sunday();

        // Check if today is an active day
        if !self.reminders.active_days.contains(&weekday) {
            return false;
        }

        // Check if within work hours
        hour >= self.reminders.work_start_hour && hour < self.reminders.work_end_hour
    }

    /// Calculate the next reminder interval in seconds
    pub fn next_reminder_interval(&self) -> u64 {
        use rand::Rng;

        if self.reminders.use_random_intervals {
            let mut rng = rand::thread_rng();
            let minutes = rng.gen_range(
                self.reminders.min_interval_minutes..=self.reminders.max_interval_minutes
            );
            (minutes * 60) as u64
        } else {
            (self.reminders.min_interval_minutes * 60) as u64
        }
    }

    /// Get a random enabled exercise
    pub fn random_exercise(&self) -> Option<ExerciseType> {
        use rand::seq::SliceRandom;

        if self.exercises.enabled_exercises.is_empty() {
            None
        } else {
            let mut rng = rand::thread_rng();
            self.exercises.enabled_exercises.choose(&mut rng).cloned()
        }
    }

    /// Toggle an exercise on/off
    pub fn toggle_exercise(&mut self, exercise: &ExerciseType) {
        if let Some(pos) = self.exercises.enabled_exercises.iter().position(|e| e == exercise) {
            self.exercises.enabled_exercises.remove(pos);
        } else {
            self.exercises.enabled_exercises.push(exercise.clone());
        }
    }

    /// Check if an exercise is enabled
    pub fn is_exercise_enabled(&self, exercise: &ExerciseType) -> bool {
        self.exercises.enabled_exercises.contains(exercise)
    }

    /// Update reminder interval
    pub fn set_reminder_interval(&mut self, min_minutes: u32, max_minutes: u32) {
        self.reminders.min_interval_minutes = min_minutes;
        self.reminders.max_interval_minutes = max_minutes.max(min_minutes);
    }

    /// Toggle reminders on/off
    pub fn toggle_reminders(&mut self) {
        self.reminders.enabled = !self.reminders.enabled;
    }

    /// Get a user-friendly description of current settings
    pub fn settings_summary(&self) -> String {
        let mut summary = String::new();
        summary.push_str("=== Geekfit Settings ===\n\n");

        summary.push_str(&format!(
            "Reminders: {}\n",
            if self.reminders.enabled { "ON" } else { "OFF" }
        ));

        if self.reminders.use_random_intervals {
            summary.push_str(&format!(
                "Interval: {}-{} minutes (random)\n",
                self.reminders.min_interval_minutes,
                self.reminders.max_interval_minutes
            ));
        } else {
            summary.push_str(&format!(
                "Interval: {} minutes (fixed)\n",
                self.reminders.min_interval_minutes
            ));
        }

        summary.push_str(&format!(
            "Work hours: {:02}:00 - {:02}:00\n",
            self.reminders.work_start_hour,
            self.reminders.work_end_hour
        ));

        let days: Vec<&str> = self.reminders.active_days.iter().map(|d| match d {
            0 => "Sun",
            1 => "Mon",
            2 => "Tue",
            3 => "Wed",
            4 => "Thu",
            5 => "Fri",
            6 => "Sat",
            _ => "?",
        }).collect();
        summary.push_str(&format!("Active days: {}\n", days.join(", ")));

        summary.push_str("\nEnabled exercises:\n");
        for exercise in &self.exercises.enabled_exercises {
            let reps = self.get_reps(exercise);
            summary.push_str(&format!("  - {} ({} reps)\n", exercise.display_name(), reps));
        }

        summary.push_str(&format!(
            "\nNotifications: {}\n",
            if self.notifications.enabled { "ON" } else { "OFF" }
        ));

        summary
    }
}

/// Generate default config file content as a string
pub fn default_config_toml() -> String {
    let config = Config::default();
    toml::to_string_pretty(&config).unwrap_or_else(|_| String::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert!(config.reminders.enabled);
        assert_eq!(config.reminders.min_interval_minutes, 60);
        assert!(!config.exercises.enabled_exercises.is_empty());
    }

    #[test]
    fn test_config_serialization() {
        let config = Config::default();
        let toml_str = toml::to_string_pretty(&config).unwrap();
        let parsed: Config = toml::from_str(&toml_str).unwrap();
        assert_eq!(parsed.reminders.min_interval_minutes, config.reminders.min_interval_minutes);
    }

    #[test]
    fn test_toggle_exercise() {
        let mut config = Config::default();
        let initial_count = config.exercises.enabled_exercises.len();

        config.toggle_exercise(&ExerciseType::PushUps);
        assert_eq!(config.exercises.enabled_exercises.len(), initial_count - 1);

        config.toggle_exercise(&ExerciseType::PushUps);
        assert_eq!(config.exercises.enabled_exercises.len(), initial_count);
    }
}
