//! Geekfit - A Gamified Fitness Tracker for Programmers
//!
//! This is the main entry point for the Geekfit application.
//! It initializes all components and runs the main event loop.
//!
//! # Building
//! ```bash
//! cargo build --release
//! ```
//!
//! # Running
//! ```bash
//! cargo run --release
//! ```
//!
//! # Cross-platform support
//! - Windows: Uses native notification system and system tray
//! - macOS: Uses menu bar and Notification Center
//! - Linux: Uses D-Bus notifications and system tray (requires libappindicator)

mod config;
mod models;
mod notifications;
mod scheduler;
mod storage;
mod tray;

use anyhow::{Context, Result};
use std::sync::mpsc;
use std::time::Duration;
use winit::application::ApplicationHandler;
use winit::event::WindowEvent;
use winit::event_loop::{ActiveEventLoop, ControlFlow, EventLoop};
use winit::window::WindowId;

use config::Config;
use models::{ExerciseType, Level};
use notifications::Notifier;
use scheduler::{Scheduler, SchedulerMessage};
use storage::Storage;
use tray::{TrayAction, TrayManager};

/// Main application state
struct GeekfitApp {
    /// Configuration
    config: Config,

    /// Data storage
    storage: Storage,

    /// Notification manager
    notifier: Notifier,

    /// System tray manager
    tray: Option<TrayManager>,

    /// Background scheduler
    scheduler: Option<Scheduler>,

    /// Channel receiver for scheduler messages
    scheduler_receiver: mpsc::Receiver<SchedulerMessage>,

    /// Previous level (for detecting level-ups)
    previous_level: Level,

    /// Whether this is the first run
    first_run: bool,
}

impl GeekfitApp {
    /// Create a new application instance
    fn new() -> Result<Self> {
        // Initialize logging
        env_logger::Builder::from_env(
            env_logger::Env::default().default_filter_or("info")
        ).init();

        log::info!("=== Geekfit v{} starting ===", env!("CARGO_PKG_VERSION"));

        // Load configuration
        let config = Config::load().context("Failed to load configuration")?;
        log::info!("Configuration loaded");

        // Initialize storage
        let storage = Storage::new().context("Failed to initialize storage")?;
        log::info!("Storage initialized");

        // Get initial level
        let progress = storage.get_progress()?;
        let previous_level = progress.current_level.clone();
        let first_run = progress.total_exercises == 0;

        // Create notifier
        let notifier = Notifier::new(&config);

        // Create scheduler channel (placeholder until UI init)
        let (_scheduler_sender, scheduler_receiver) = mpsc::channel();

        Ok(Self {
            config,
            storage,
            notifier,
            tray: None,
            scheduler: None,
            scheduler_receiver,
            previous_level,
            first_run,
        })
    }

    /// Initialize the tray icon and scheduler (must be called from event loop)
    fn initialize_ui(&mut self) -> Result<()> {
        // Get initial tooltip
        let tooltip = self.storage.tooltip_summary()?;

        // Create tray manager
        let tray = TrayManager::new(&self.config, &tooltip)
            .context("Failed to create tray manager")?;
        self.tray = Some(tray);

        // Create and start scheduler with a new channel
        let (scheduler_sender, scheduler_receiver) = mpsc::channel();
        self.scheduler_receiver = scheduler_receiver;

        let mut scheduler = Scheduler::new(self.config.clone(), scheduler_sender);
        scheduler.start();
        self.scheduler = Some(scheduler);

        // Send welcome notification on first run
        if self.first_run {
            if let Err(e) = self.notifier.welcome() {
                log::warn!("Failed to send welcome notification: {}", e);
            }
        }

        log::info!("UI initialized successfully");
        Ok(())
    }

    /// Handle a tray menu action
    fn handle_tray_action(&mut self, action: TrayAction) {
        log::debug!("Handling tray action: {:?}", action);

        match action {
            TrayAction::ViewProgress => {
                if let Ok(report) = self.storage.detailed_report() {
                    tray::show_message("Geekfit Progress", &report);
                }
            }

            TrayAction::LogExercise(exercise) => {
                self.log_exercise(exercise);
            }

            TrayAction::ToggleReminders => {
                if let Some(ref scheduler) = self.scheduler {
                    let enabled = scheduler.toggle_enabled();
                    self.config.reminders.enabled = enabled;

                    if let Some(ref tray) = self.tray {
                        tray.set_reminders_checked(enabled);
                    }

                    // Save config
                    if let Err(e) = self.config.save() {
                        log::error!("Failed to save config: {}", e);
                    }

                    let status = if enabled { "enabled" } else { "disabled" };
                    let _ = self.notifier.custom(
                        "Reminders Updated",
                        &format!("Exercise reminders are now {}", status),
                    );
                }
            }

            TrayAction::OpenSettings => {
                tray::show_settings_info(&self.config);
            }

            TrayAction::ShowAbout => {
                let about = TrayManager::about_text();
                tray::show_message("About Geekfit", &about);
            }

            TrayAction::Quit => {
                log::info!("Quit requested");
                std::process::exit(0);
            }

            TrayAction::Unknown(id) => {
                log::warn!("Unknown menu action: {}", id);
            }
        }
    }

    /// Log an exercise completion
    fn log_exercise(&mut self, exercise: ExerciseType) {
        let reps = self.config.get_reps(&exercise);

        log::info!("Logging exercise: {} x {}", exercise.display_name(), reps);

        match self.storage.record_exercise(exercise.clone(), reps) {
            Ok(new_badges) => {
                // Get updated progress
                if let Ok(progress) = self.storage.get_progress() {
                    // Notify about completion
                    let _ = self.notifier.exercise_completed(
                        &exercise,
                        reps,
                        exercise.points_per_set(),
                        progress.total_points,
                    );

                    // Check for level up
                    if progress.current_level != self.previous_level {
                        let _ = self.notifier.level_up(
                            &progress.current_level,
                            progress.total_points,
                        );
                        self.previous_level = progress.current_level.clone();
                    }

                    // Notify about new badges
                    for badge in new_badges {
                        let _ = self.notifier.badge_earned(&badge);
                    }

                    // Check for streak milestones
                    let streak = progress.current_streak;
                    if [7, 14, 30, 60, 90, 100].contains(&streak) {
                        let _ = self.notifier.streak_milestone(streak);
                    }
                }
            }
            Err(e) => {
                log::error!("Failed to record exercise: {}", e);
                let _ = self.notifier.custom(
                    "Error",
                    &format!("Failed to log exercise: {}", e),
                );
            }
        }
    }

    /// Handle a scheduler message
    fn handle_scheduler_message(&mut self, message: SchedulerMessage) {
        match message {
            SchedulerMessage::ExerciseReminder { exercise, reps } => {
                log::info!("Reminder: {} x {}", exercise.display_name(), reps);
                if let Err(e) = self.notifier.exercise_reminder(&exercise, reps) {
                    log::error!("Failed to send reminder notification: {}", e);
                }
            }
            SchedulerMessage::Started => {
                log::info!("Scheduler started");
            }
            SchedulerMessage::Stopped => {
                log::info!("Scheduler stopped");
            }
            SchedulerMessage::Error(err) => {
                log::error!("Scheduler error: {}", err);
            }
        }
    }

    /// Collect tray events into a vector to avoid borrow issues
    fn collect_tray_events(&self) -> Vec<TrayAction> {
        let mut actions = Vec::new();
        if let Some(ref tray) = self.tray {
            while let Some(action) = tray.poll_event() {
                actions.push(action);
            }
        }
        actions
    }

    /// Process pending events (called from event loop)
    fn process_events(&mut self) {
        // Collect tray menu events first to avoid borrow issues
        let actions = self.collect_tray_events();
        for action in actions {
            self.handle_tray_action(action);
        }

        // Process scheduler messages
        while let Ok(message) = self.scheduler_receiver.try_recv() {
            self.handle_scheduler_message(message);
        }
    }
}

impl ApplicationHandler for GeekfitApp {
    fn resumed(&mut self, _event_loop: &ActiveEventLoop) {
        // Initialize UI components when the event loop is ready
        if self.tray.is_none() {
            if let Err(e) = self.initialize_ui() {
                log::error!("Failed to initialize UI: {}", e);
                std::process::exit(1);
            }
        }
    }

    fn window_event(
        &mut self,
        _event_loop: &ActiveEventLoop,
        _window_id: WindowId,
        _event: WindowEvent,
    ) {
        // We don't have any windows, but this is required by the trait
    }

    fn about_to_wait(&mut self, event_loop: &ActiveEventLoop) {
        // Process all pending events
        self.process_events();

        // Set control flow to wait with timeout for responsive event handling
        event_loop.set_control_flow(ControlFlow::wait_duration(Duration::from_millis(100)));
    }
}

fn main() -> Result<()> {
    // Create application
    let mut app = GeekfitApp::new()?;

    // Create event loop
    let event_loop = EventLoop::new()
        .context("Failed to create event loop")?;

    // Run the application
    log::info!("Starting event loop");
    event_loop.run_app(&mut app)
        .context("Event loop error")?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exercise_points() {
        let pushups = ExerciseType::PushUps;
        assert_eq!(pushups.points_per_set(), 10);

        let planks = ExerciseType::Planks;
        assert_eq!(planks.points_per_set(), 15);
    }

    #[test]
    fn test_level_progression() {
        assert_eq!(Level::from_points(0), Level::NewbieCoder);
        assert_eq!(Level::from_points(50), Level::NewbieCoder);
        assert_eq!(Level::from_points(101), Level::JuniorDev);
        assert_eq!(Level::from_points(502), Level::MidLevelEngineer);
    }
}
