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
mod gui;
mod models;
mod notifications;
mod scheduler;
mod storage;
mod tray;

use anyhow::{Context, Result};
use std::sync::mpsc;
use std::sync::{Arc, RwLock};
use std::thread;
use std::time::Duration;

use config::Config;
use gui::GuiAction;
use models::{ExerciseType, Level};
use notifications::Notifier;
use scheduler::{Scheduler, SchedulerMessage};
use storage::Storage;
use tray::{TrayAction, TrayManager};

/// Shared application state
struct AppState {
    config: Arc<RwLock<Config>>,
    storage: Arc<Storage>,
    notifier: Arc<RwLock<Notifier>>,
    previous_level: Arc<RwLock<Level>>,
}

impl AppState {
    fn new() -> Result<Self> {
        let config = Config::load().context("Failed to load configuration")?;
        log::info!("Configuration loaded");

        let storage = Storage::new().context("Failed to initialize storage")?;
        log::info!("Storage initialized");

        let progress = storage.get_progress()?;
        let previous_level = progress.current_level.clone();

        let notifier = Notifier::new(&config);

        Ok(Self {
            config: Arc::new(RwLock::new(config)),
            storage: Arc::new(storage),
            notifier: Arc::new(RwLock::new(notifier)),
            previous_level: Arc::new(RwLock::new(previous_level)),
        })
    }

    /// Log an exercise and handle notifications
    fn log_exercise(&self, exercise: ExerciseType) {
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
                    let mut prev_level = self.previous_level.write().unwrap();
                    if progress.current_level != *prev_level {
                        let _ = notifier.level_up(
                            &progress.current_level,
                            progress.total_points,
                        );
                        *prev_level = progress.current_level.clone();
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
}

/// Run the GUI window
fn run_gui_window(state: Arc<AppState>) {
    let progress_handle = state.storage.get_progress_handle();
    let config = state.config.read().unwrap().clone();

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([650.0, 500.0])
            .with_min_inner_size([500.0, 400.0])
            .with_title("Geekfit - Fitness Tracker"),
        ..Default::default()
    };

    let state_clone = Arc::clone(&state);

    let _ = eframe::run_native(
        "Geekfit",
        options,
        Box::new(move |cc| {
            // Set up custom styling
            cc.egui_ctx.set_visuals(egui::Visuals::dark());

            let mut style = (*cc.egui_ctx.style()).clone();
            style.spacing.item_spacing = egui::vec2(10.0, 8.0);
            cc.egui_ctx.set_style(style);

            Ok(Box::new(GeekfitGuiApp::new(
                cc,
                progress_handle.clone(),
                config.clone(),
                Arc::clone(&state_clone),
            )))
        }),
    );
}

use eframe::egui;

/// GUI Application wrapper that handles actions
struct GeekfitGuiApp {
    gui: gui::GeekfitGui,
    state: Arc<AppState>,
}

impl GeekfitGuiApp {
    fn new(
        cc: &eframe::CreationContext<'_>,
        progress: Arc<RwLock<models::UserProgress>>,
        config: Config,
        state: Arc<AppState>,
    ) -> Self {
        Self {
            gui: gui::GeekfitGui::new(cc, progress, config),
            state,
        }
    }
}

impl eframe::App for GeekfitGuiApp {
    fn update(&mut self, ctx: &egui::Context, frame: &mut eframe::Frame) {
        // Let the GUI render
        self.gui.update(ctx, frame);

        // Process any actions from the GUI
        for action in self.gui.take_actions() {
            match action {
                GuiAction::LogExercise(exercise) => {
                    self.state.log_exercise(exercise);
                }
                GuiAction::ToggleReminders => {
                    let mut config = self.state.config.write().unwrap();
                    config.reminders.enabled = !config.reminders.enabled;
                    let _ = config.save();
                }
                GuiAction::SaveSettings => {
                    let new_config = self.gui.config().clone();
                    {
                        let mut config = self.state.config.write().unwrap();
                        *config = new_config.clone();
                    }
                    if let Err(e) = new_config.save() {
                        log::error!("Failed to save settings: {}", e);
                    } else {
                        log::info!("Settings saved");
                    }
                }
                GuiAction::CloseWindow => {
                    // Window will close naturally
                }
            }
        }
    }
}

fn main() -> Result<()> {
    // Initialize logging
    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info")
    ).init();

    log::info!("=== Geekfit v{} starting ===", env!("CARGO_PKG_VERSION"));

    // Create shared application state
    let state = Arc::new(AppState::new()?);

    // Check if this is first run
    let first_run = state.storage.get_progress()?.total_exercises == 0;

    // Create scheduler channel
    let (scheduler_sender, scheduler_receiver) = mpsc::channel();

    // Start the scheduler in a background thread
    let scheduler_config = state.config.read().unwrap().clone();
    let mut scheduler = Scheduler::new(scheduler_config, scheduler_sender);
    scheduler.start();

    // Create a channel for GUI requests
    let (gui_sender, gui_receiver) = mpsc::channel::<()>();

    // Spawn the tray icon thread
    let state_for_tray = Arc::clone(&state);
    let gui_sender_clone = gui_sender.clone();

    let tray_handle = thread::spawn(move || {
        // We need to run the tray on the main thread for some platforms
        // For now, use a simple polling loop
        run_tray_loop(state_for_tray, scheduler_receiver, gui_sender_clone, first_run)
    });

    // Wait for GUI requests and spawn GUI windows
    let state_for_gui = Arc::clone(&state);
    loop {
        match gui_receiver.recv() {
            Ok(()) => {
                log::info!("Opening GUI window");
                run_gui_window(Arc::clone(&state_for_gui));
            }
            Err(_) => {
                log::info!("GUI channel closed, shutting down");
                break;
            }
        }
    }

    // Clean up
    drop(scheduler);
    let _ = tray_handle.join();

    Ok(())
}

/// Run the tray icon event loop
fn run_tray_loop(
    state: Arc<AppState>,
    scheduler_receiver: mpsc::Receiver<SchedulerMessage>,
    gui_sender: mpsc::Sender<()>,
    first_run: bool,
) -> Result<()> {
    // Get initial tooltip
    let tooltip = state.storage.tooltip_summary()?;
    let config = state.config.read().unwrap().clone();

    // Create tray manager
    let tray = TrayManager::new(&config, &tooltip)
        .context("Failed to create tray manager")?;

    // Send welcome notification on first run
    if first_run {
        let notifier = state.notifier.read().unwrap();
        if let Err(e) = notifier.welcome() {
            log::warn!("Failed to send welcome notification: {}", e);
        }
    }

    log::info!("Tray icon created, entering event loop");

    loop {
        // Poll for tray events
        if let Some(action) = tray.poll_event() {
            match action {
                TrayAction::ViewProgress | TrayAction::OpenSettings => {
                    // Request GUI window
                    let _ = gui_sender.send(());
                }

                TrayAction::LogExercise(exercise) => {
                    state.log_exercise(exercise);
                }

                TrayAction::ToggleReminders => {
                    let mut config = state.config.write().unwrap();
                    config.reminders.enabled = !config.reminders.enabled;
                    tray.set_reminders_checked(config.reminders.enabled);

                    if let Err(e) = config.save() {
                        log::error!("Failed to save config: {}", e);
                    }

                    let status = if config.reminders.enabled { "enabled" } else { "disabled" };
                    let notifier = state.notifier.read().unwrap();
                    let _ = notifier.custom(
                        "Reminders Updated",
                        &format!("Exercise reminders are now {}", status),
                    );
                }

                TrayAction::ShowAbout => {
                    // Open GUI to show about (or show notification)
                    let _ = gui_sender.send(());
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

        // Process scheduler messages
        while let Ok(message) = scheduler_receiver.try_recv() {
            match message {
                SchedulerMessage::ExerciseReminder { exercise, reps } => {
                    log::info!("Reminder: {} x {}", exercise.display_name(), reps);
                    let notifier = state.notifier.read().unwrap();
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

        // Small sleep to avoid busy-waiting
        thread::sleep(Duration::from_millis(50));
    }
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
