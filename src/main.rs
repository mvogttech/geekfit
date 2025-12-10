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

// Hide console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod gui;
mod models;
mod notifications;
mod scheduler;
mod storage;
mod tray;

use anyhow::{Context, Result};
use eframe::egui;
use std::sync::mpsc;
use std::sync::{Arc, RwLock};
use std::time::Duration;

use config::Config;
use gui::GuiAction;
use models::{ExerciseType, Level};
use notifications::Notifier;
use scheduler::{Scheduler, SchedulerMessage};
use storage::Storage;
use tray::{TrayAction, TrayManager};

/// Main application combining GUI and background services
struct GeekfitApp {
    /// GUI state
    gui: gui::GeekfitGui,

    /// Configuration
    config: Arc<RwLock<Config>>,

    /// Data storage
    storage: Arc<Storage>,

    /// Notification manager
    notifier: Arc<RwLock<Notifier>>,

    /// Previous level (for detecting level-ups)
    previous_level: Level,

    /// Background scheduler
    _scheduler: Scheduler,

    /// Channel receiver for scheduler messages
    scheduler_receiver: mpsc::Receiver<SchedulerMessage>,

    /// System tray manager (optional - may fail on some systems)
    tray: Option<TrayManager>,
}

impl GeekfitApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Result<Self> {
        // Load configuration
        let config = Config::load().context("Failed to load configuration")?;
        log::info!("Configuration loaded");

        // Initialize storage
        let storage = Storage::new().context("Failed to initialize storage")?;
        log::info!("Storage initialized");

        // Get initial progress
        let progress = storage.get_progress()?;
        let previous_level = progress.current_level.clone();
        let first_run = progress.total_exercises == 0;

        // Create notifier
        let notifier = Notifier::new(&config);

        // Create scheduler channel and start scheduler
        let (scheduler_sender, scheduler_receiver) = mpsc::channel();
        let mut scheduler = Scheduler::new(config.clone(), scheduler_sender);
        scheduler.start();

        // Try to create tray icon (may fail on some systems)
        let tooltip = storage.tooltip_summary().unwrap_or_else(|_| "Geekfit".to_string());
        let tray = match TrayManager::new(&config, &tooltip) {
            Ok(t) => {
                log::info!("System tray created successfully");
                Some(t)
            }
            Err(e) => {
                log::warn!("Failed to create system tray (continuing without it): {}", e);
                None
            }
        };

        // Create GUI
        let progress_handle = storage.get_progress_handle();
        let gui = gui::GeekfitGui::new(cc, progress_handle, config.clone());

        // Send welcome notification on first run
        if first_run {
            if let Err(e) = notifier.welcome() {
                log::warn!("Failed to send welcome notification: {}", e);
            }
        }

        Ok(Self {
            gui,
            config: Arc::new(RwLock::new(config)),
            storage: Arc::new(storage),
            notifier: Arc::new(RwLock::new(notifier)),
            previous_level,
            _scheduler: scheduler,
            scheduler_receiver,
            tray,
        })
    }

    /// Log an exercise and handle notifications
    fn log_exercise(&mut self, exercise: ExerciseType) {
        let config = self.config.read().unwrap();
        let reps = config.get_reps(&exercise);
        drop(config);

        log::info!("Logging exercise: {} x {}", exercise.display_name(), reps);

        match self.storage.record_exercise(exercise.clone(), reps) {
            Ok(new_badges) => {
                if let Ok(progress) = self.storage.get_progress() {
                    let notifier = self.notifier.read().unwrap();

                    // Notify about completion
                    let _ = notifier.exercise_completed(
                        &exercise,
                        reps,
                        exercise.points_per_set(),
                        progress.total_points,
                    );

                    // Check for level up
                    if progress.current_level != self.previous_level {
                        let _ = notifier.level_up(
                            &progress.current_level,
                            progress.total_points,
                        );
                        self.previous_level = progress.current_level.clone();
                    }

                    // Notify about new badges
                    for badge in new_badges {
                        let _ = notifier.badge_earned(&badge);
                    }

                    // Check for streak milestones
                    let streak = progress.current_streak;
                    if [7, 14, 30, 60, 90, 100].contains(&streak) {
                        let _ = notifier.streak_milestone(streak);
                    }
                }
            }
            Err(e) => {
                log::error!("Failed to record exercise: {}", e);
            }
        }
    }

    /// Process scheduler messages
    fn process_scheduler_messages(&self) {
        while let Ok(message) = self.scheduler_receiver.try_recv() {
            match message {
                SchedulerMessage::ExerciseReminder { exercise, reps } => {
                    log::info!("Reminder: {} x {}", exercise.display_name(), reps);
                    let notifier = self.notifier.read().unwrap();
                    if let Err(e) = notifier.exercise_reminder(&exercise, reps) {
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
    }

    /// Process tray menu events
    fn process_tray_events(&mut self) -> Vec<TrayAction> {
        let mut actions = Vec::new();
        if let Some(ref tray) = self.tray {
            while let Some(action) = tray.poll_event() {
                actions.push(action);
            }
        }
        actions
    }
}

impl eframe::App for GeekfitApp {
    fn update(&mut self, ctx: &egui::Context, frame: &mut eframe::Frame) {
        // Process background messages
        self.process_scheduler_messages();

        // Process tray events
        let tray_actions = self.process_tray_events();
        for action in tray_actions {
            match action {
                TrayAction::LogExercise(exercise) => {
                    self.log_exercise(exercise);
                }
                TrayAction::ToggleReminders => {
                    let mut config = self.config.write().unwrap();
                    config.reminders.enabled = !config.reminders.enabled;
                    if let Some(ref tray) = self.tray {
                        tray.set_reminders_checked(config.reminders.enabled);
                    }
                    let _ = config.save();
                }
                TrayAction::Quit => {
                    log::info!("Quit requested from tray");
                    ctx.send_viewport_cmd(egui::ViewportCommand::Close);
                }
                _ => {
                    // ViewProgress, OpenSettings, ShowAbout - window is already open
                }
            }
        }

        // Update GUI
        self.gui.update(ctx, frame);

        // Process GUI actions
        for action in self.gui.take_actions() {
            match action {
                GuiAction::LogExercise(exercise) => {
                    self.log_exercise(exercise);
                }
                GuiAction::ToggleReminders => {
                    let mut config = self.config.write().unwrap();
                    config.reminders.enabled = !config.reminders.enabled;
                    let _ = config.save();
                }
                GuiAction::SaveSettings => {
                    let new_config = self.gui.config().clone();
                    {
                        let mut config = self.config.write().unwrap();
                        *config = new_config.clone();
                    }
                    if let Err(e) = new_config.save() {
                        log::error!("Failed to save settings: {}", e);
                    } else {
                        log::info!("Settings saved");
                    }
                }
                GuiAction::CloseWindow => {
                    // Window close handled by eframe
                }
            }
        }

        // Request continuous updates for background processing
        ctx.request_repaint_after(Duration::from_millis(100));
    }
}

fn main() -> Result<()> {
    // Initialize logging
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info")
    ).init();

    log::info!("=== Geekfit v{} starting ===", env!("CARGO_PKG_VERSION"));

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([650.0, 500.0])
            .with_min_inner_size([500.0, 400.0])
            .with_title("Geekfit - Fitness Tracker"),
        ..Default::default()
    };

    eframe::run_native(
        "Geekfit",
        options,
        Box::new(|cc| {
            // Set up styling
            cc.egui_ctx.set_visuals(egui::Visuals::dark());

            let mut style = (*cc.egui_ctx.style()).clone();
            style.spacing.item_spacing = egui::vec2(10.0, 8.0);
            cc.egui_ctx.set_style(style);

            match GeekfitApp::new(cc) {
                Ok(app) => Ok(Box::new(app)),
                Err(e) => {
                    log::error!("Failed to initialize app: {}", e);
                    Err(e.to_string().into())
                }
            }
        }),
    ).map_err(|e| anyhow::anyhow!("eframe error: {}", e))?;

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
