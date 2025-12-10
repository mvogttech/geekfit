//! System tray integration for Geekfit
//!
//! Handles the system tray icon, menu, and user interactions.
//! Cross-platform support for Windows, macOS, and Linux.

use crate::config::Config;
use crate::models::ExerciseType;
use anyhow::{Context, Result};
use muda::{
    CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu,
};
use tray_icon::{
    Icon, TrayIcon, TrayIconBuilder,
};

/// Menu item IDs for handling events
pub mod menu_ids {
    pub const VIEW_PROGRESS: &str = "view_progress";
    pub const LOG_PUSHUPS: &str = "log_pushups";
    pub const LOG_SQUATS: &str = "log_squats";
    pub const LOG_PLANKS: &str = "log_planks";
    pub const LOG_JUMPING_JACKS: &str = "log_jumping_jacks";
    pub const LOG_STRETCHES: &str = "log_stretches";
    pub const TOGGLE_REMINDERS: &str = "toggle_reminders";
    pub const SETTINGS: &str = "settings";
    pub const ABOUT: &str = "about";
    pub const QUIT: &str = "quit";
}

/// User action triggered from tray menu
#[derive(Debug, Clone)]
pub enum TrayAction {
    ViewProgress,
    LogExercise(ExerciseType),
    ToggleReminders,
    OpenSettings,
    ShowAbout,
    Quit,
    Unknown(String),
}

impl TrayAction {
    /// Parse a menu event ID into an action
    pub fn from_menu_id(id: &str) -> Self {
        match id {
            menu_ids::VIEW_PROGRESS => TrayAction::ViewProgress,
            menu_ids::LOG_PUSHUPS => TrayAction::LogExercise(ExerciseType::PushUps),
            menu_ids::LOG_SQUATS => TrayAction::LogExercise(ExerciseType::Squats),
            menu_ids::LOG_PLANKS => TrayAction::LogExercise(ExerciseType::Planks),
            menu_ids::LOG_JUMPING_JACKS => TrayAction::LogExercise(ExerciseType::JumpingJacks),
            menu_ids::LOG_STRETCHES => TrayAction::LogExercise(ExerciseType::Stretches),
            menu_ids::TOGGLE_REMINDERS => TrayAction::ToggleReminders,
            menu_ids::SETTINGS => TrayAction::OpenSettings,
            menu_ids::ABOUT => TrayAction::ShowAbout,
            menu_ids::QUIT => TrayAction::Quit,
            other => TrayAction::Unknown(other.to_string()),
        }
    }
}

/// System tray manager
pub struct TrayManager {
    /// The tray icon instance
    _tray_icon: TrayIcon,

    /// Toggle reminders menu item (to update checked state)
    toggle_reminders_item: CheckMenuItem,
}

impl TrayManager {
    /// Create a new tray manager with the given configuration
    pub fn new(config: &Config, tooltip: &str) -> Result<Self> {
        // Load or create the icon
        let icon = Self::load_icon()?;

        // Create the menu
        let (menu, toggle_reminders_item) = Self::create_menu(config)?;

        // Build the tray icon
        let tray_icon = TrayIconBuilder::new()
            .with_menu(Box::new(menu))
            .with_tooltip(tooltip)
            .with_icon(icon)
            .with_title("Geekfit") // macOS menu bar title
            .build()
            .context("Failed to create tray icon")?;

        log::info!("Tray icon created successfully");

        Ok(Self {
            _tray_icon: tray_icon,
            toggle_reminders_item,
        })
    }

    /// Load the application icon
    fn load_icon() -> Result<Icon> {
        // Create a simple 32x32 icon programmatically
        // This creates a simple dumbbell-like icon in green
        let size = 32u32;
        let mut rgba = Vec::with_capacity((size * size * 4) as usize);

        for y in 0..size {
            for x in 0..size {
                // Create a simple dumbbell shape
                let in_bar = y >= 12 && y <= 19 && x >= 4 && x <= 27;
                let in_left_weight = x >= 2 && x <= 8 && y >= 6 && y <= 25;
                let in_right_weight = x >= 23 && x <= 29 && y >= 6 && y <= 25;

                if in_bar || in_left_weight || in_right_weight {
                    // Green color for the dumbbell
                    rgba.push(76);   // R
                    rgba.push(175);  // G
                    rgba.push(80);   // B
                    rgba.push(255);  // A
                } else {
                    // Transparent
                    rgba.push(0);
                    rgba.push(0);
                    rgba.push(0);
                    rgba.push(0);
                }
            }
        }

        Icon::from_rgba(rgba, size, size)
            .context("Failed to create icon from RGBA data")
    }

    /// Create the tray context menu
    fn create_menu(config: &Config) -> Result<(Menu, CheckMenuItem)> {
        let menu = Menu::new();

        // View Progress
        let view_progress = MenuItem::with_id(
            menu_ids::VIEW_PROGRESS,
            "View Progress",
            true,
            None,
        );
        menu.append(&view_progress)?;

        menu.append(&PredefinedMenuItem::separator())?;

        // Log Exercise submenu
        let log_submenu = Submenu::new("Log Exercise", true);

        let log_pushups = MenuItem::with_id(
            menu_ids::LOG_PUSHUPS,
            "Push-ups",
            true,
            None,
        );
        let log_squats = MenuItem::with_id(
            menu_ids::LOG_SQUATS,
            "Squats",
            true,
            None,
        );
        let log_planks = MenuItem::with_id(
            menu_ids::LOG_PLANKS,
            "Planks",
            true,
            None,
        );
        let log_jumping_jacks = MenuItem::with_id(
            menu_ids::LOG_JUMPING_JACKS,
            "Jumping Jacks",
            true,
            None,
        );
        let log_stretches = MenuItem::with_id(
            menu_ids::LOG_STRETCHES,
            "Stretches",
            true,
            None,
        );

        log_submenu.append(&log_pushups)?;
        log_submenu.append(&log_squats)?;
        log_submenu.append(&log_planks)?;
        log_submenu.append(&log_jumping_jacks)?;
        log_submenu.append(&log_stretches)?;

        menu.append(&log_submenu)?;

        menu.append(&PredefinedMenuItem::separator())?;

        // Toggle Reminders (checkable)
        let toggle_reminders = CheckMenuItem::with_id(
            menu_ids::TOGGLE_REMINDERS,
            "Reminders Enabled",
            true,
            config.reminders.enabled,
            None,
        );
        menu.append(&toggle_reminders)?;

        // Settings
        let settings = MenuItem::with_id(
            menu_ids::SETTINGS,
            "Settings...",
            true,
            None,
        );
        menu.append(&settings)?;

        menu.append(&PredefinedMenuItem::separator())?;

        // About
        let about = MenuItem::with_id(
            menu_ids::ABOUT,
            "About Geekfit",
            true,
            None,
        );
        menu.append(&about)?;

        menu.append(&PredefinedMenuItem::separator())?;

        // Quit
        let quit = MenuItem::with_id(
            menu_ids::QUIT,
            "Quit",
            true,
            None,
        );
        menu.append(&quit)?;

        Ok((menu, toggle_reminders))
    }

    /// Poll for menu events (non-blocking)
    pub fn poll_event(&self) -> Option<TrayAction> {
        // Use the global menu event receiver from muda
        if let Ok(event) = MenuEvent::receiver().try_recv() {
            let action = TrayAction::from_menu_id(event.id().0.as_str());
            log::debug!("Menu event: {:?}", action);
            Some(action)
        } else {
            None
        }
    }

    /// Update the reminders toggle state
    pub fn set_reminders_checked(&self, checked: bool) {
        self.toggle_reminders_item.set_checked(checked);
    }

    /// Get the about text
    pub fn about_text() -> String {
        format!(
            "Geekfit v{}\n\n\
             A gamified fitness tracker for programmers.\n\n\
             Stay fit while you code!\n\n\
             Features:\n\
             - Exercise reminders during work hours\n\
             - Points and level progression\n\
             - Achievement badges\n\
             - Streak tracking\n\n\
             Data stored in: {:?}\n\
             Config stored in: {:?}",
            env!("CARGO_PKG_VERSION"),
            crate::storage::Storage::data_dir().unwrap_or_default(),
            crate::config::Config::config_dir().unwrap_or_default(),
        )
    }
}

/// Simple message dialog (cross-platform)
pub fn show_message(title: &str, message: &str) {
    // For now, just log it - in a real app you might use native dialogs
    // or a simple GUI library like native-dialog
    log::info!("Message Dialog - {}: {}", title, message);

    // Also print to console for visibility
    println!("\n=== {} ===\n{}\n", title, message);
}

/// Show settings info (since we don't have a full GUI)
pub fn show_settings_info(config: &Config) {
    let info = format!(
        "{}\n\nTo modify settings, edit the config file at:\n{:?}",
        config.settings_summary(),
        Config::config_path().unwrap_or_default()
    );
    show_message("Geekfit Settings", &info);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tray_action_parsing() {
        assert!(matches!(
            TrayAction::from_menu_id(menu_ids::QUIT),
            TrayAction::Quit
        ));

        assert!(matches!(
            TrayAction::from_menu_id(menu_ids::LOG_PUSHUPS),
            TrayAction::LogExercise(ExerciseType::PushUps)
        ));

        assert!(matches!(
            TrayAction::from_menu_id("unknown"),
            TrayAction::Unknown(_)
        ));
    }

    #[test]
    fn test_about_text() {
        let about = TrayManager::about_text();
        assert!(about.contains("Geekfit"));
        assert!(about.contains("gamified"));
    }
}
