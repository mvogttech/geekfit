//! Background reminder scheduler for Geekfit
//!
//! Handles timing of exercise reminders using a background thread.
//! Supports random and fixed intervals, respects work hours.

use crate::config::Config;
use crate::models::ExerciseType;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

/// Message sent from scheduler to main thread
#[derive(Debug, Clone)]
pub enum SchedulerMessage {
    /// Time for an exercise reminder
    ExerciseReminder {
        exercise: ExerciseType,
        reps: u32,
    },
    /// Scheduler started
    Started,
    /// Scheduler stopped
    Stopped,
    /// Error occurred
    Error(String),
}

/// Reminder scheduler running in background
pub struct Scheduler {
    /// Whether the scheduler is running
    running: Arc<AtomicBool>,

    /// Whether reminders are enabled
    enabled: Arc<AtomicBool>,

    /// Configuration (shared, mutable)
    config: Arc<Mutex<Config>>,

    /// Thread handle
    handle: Option<thread::JoinHandle<()>>,

    /// Message sender
    sender: std::sync::mpsc::Sender<SchedulerMessage>,
}

impl Scheduler {
    /// Create a new scheduler with a message channel
    pub fn new(
        config: Config,
        sender: std::sync::mpsc::Sender<SchedulerMessage>,
    ) -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            enabled: Arc::new(AtomicBool::new(config.reminders.enabled)),
            config: Arc::new(Mutex::new(config)),
            handle: None,
            sender,
        }
    }

    /// Start the scheduler in a background thread
    pub fn start(&mut self) {
        if self.running.load(Ordering::SeqCst) {
            log::warn!("Scheduler already running");
            return;
        }

        let running = Arc::clone(&self.running);
        let enabled = Arc::clone(&self.enabled);
        let config = Arc::clone(&self.config);
        let sender = self.sender.clone();

        running.store(true, Ordering::SeqCst);

        let handle = thread::spawn(move || {
            log::info!("Scheduler thread started");

            if let Err(e) = sender.send(SchedulerMessage::Started) {
                log::error!("Failed to send started message: {}", e);
            }

            // Initial delay before first reminder
            let mut next_reminder = {
                let cfg = config.lock().unwrap();
                let initial_delay = cfg.next_reminder_interval();
                log::info!("First reminder in {} seconds", initial_delay);
                Instant::now() + Duration::from_secs(initial_delay)
            };

            while running.load(Ordering::SeqCst) {
                // Sleep for a short interval to allow responsive shutdown
                thread::sleep(Duration::from_millis(500));

                // Check if it's time for a reminder
                if Instant::now() >= next_reminder {
                    if enabled.load(Ordering::SeqCst) {
                        let cfg = config.lock().unwrap();

                        // Check if within work hours
                        if cfg.is_work_hours() {
                            // Get a random exercise
                            if let Some(exercise) = cfg.random_exercise() {
                                let reps = cfg.get_reps(&exercise);

                                log::info!(
                                    "Sending reminder: {} x {}",
                                    exercise.display_name(),
                                    reps
                                );

                                if let Err(e) = sender.send(SchedulerMessage::ExerciseReminder {
                                    exercise,
                                    reps,
                                }) {
                                    log::error!("Failed to send reminder: {}", e);
                                }
                            } else {
                                log::warn!("No exercises enabled");
                            }
                        } else {
                            log::debug!("Outside work hours, skipping reminder");
                        }

                        // Schedule next reminder
                        let interval = cfg.next_reminder_interval();
                        next_reminder = Instant::now() + Duration::from_secs(interval);
                        log::debug!("Next reminder in {} seconds", interval);
                    } else {
                        // Reminders disabled, check again in a minute
                        next_reminder = Instant::now() + Duration::from_secs(60);
                        log::debug!("Reminders disabled, checking again in 60 seconds");
                    }
                }
            }

            log::info!("Scheduler thread stopping");
            let _ = sender.send(SchedulerMessage::Stopped);
        });

        self.handle = Some(handle);
        log::info!("Scheduler started");
    }

    /// Stop the scheduler
    pub fn stop(&mut self) {
        log::info!("Stopping scheduler...");
        self.running.store(false, Ordering::SeqCst);

        if let Some(handle) = self.handle.take() {
            match handle.join() {
                Ok(()) => log::info!("Scheduler thread joined successfully"),
                Err(e) => log::error!("Scheduler thread panicked: {:?}", e),
            }
        }
    }

    /// Check if scheduler is running
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    /// Enable or disable reminders
    pub fn set_enabled(&self, value: bool) {
        self.enabled.store(value, Ordering::SeqCst);
        log::info!("Reminders {}", if value { "enabled" } else { "disabled" });
    }

    /// Check if reminders are enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::SeqCst)
    }

    /// Toggle reminders on/off
    pub fn toggle_enabled(&self) -> bool {
        let current = self.enabled.load(Ordering::SeqCst);
        let new_value = !current;
        self.enabled.store(new_value, Ordering::SeqCst);
        log::info!("Reminders toggled to {}", if new_value { "enabled" } else { "disabled" });
        new_value
    }

    /// Update configuration
    pub fn update_config(&self, new_config: Config) {
        if let Ok(mut config) = self.config.lock() {
            *config = new_config;
            log::info!("Scheduler config updated");
        } else {
            log::error!("Failed to lock config for update");
        }
    }

    /// Force an immediate reminder (for testing)
    pub fn trigger_immediate(&self) {
        if !self.enabled.load(Ordering::SeqCst) {
            log::warn!("Cannot trigger reminder - reminders are disabled");
            return;
        }

        if let Ok(cfg) = self.config.lock() {
            if let Some(exercise) = cfg.random_exercise() {
                let reps = cfg.get_reps(&exercise);

                log::info!("Triggering immediate reminder: {} x {}", exercise.display_name(), reps);

                if let Err(e) = self.sender.send(SchedulerMessage::ExerciseReminder {
                    exercise,
                    reps,
                }) {
                    log::error!("Failed to send immediate reminder: {}", e);
                }
            }
        }
    }
}

impl Drop for Scheduler {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Calculate time until next work hour start
pub fn time_until_work_hours(config: &Config) -> Option<Duration> {
    use chrono::{Local, Timelike};

    let now = Local::now();
    let current_hour = now.hour();

    // If we're before work hours today
    if current_hour < config.reminders.work_start_hour {
        let hours_until = config.reminders.work_start_hour - current_hour;
        return Some(Duration::from_secs((hours_until as u64) * 3600));
    }

    // If we're after work hours, calculate time until tomorrow's start
    if current_hour >= config.reminders.work_end_hour {
        let hours_until_midnight = 24 - current_hour;
        let hours_after_midnight = config.reminders.work_start_hour;
        let total_hours = hours_until_midnight + hours_after_midnight;
        return Some(Duration::from_secs((total_hours as u64) * 3600));
    }

    // We're in work hours
    None
}

/// Format duration as human-readable string
pub fn format_duration(duration: Duration) -> String {
    let secs = duration.as_secs();
    let hours = secs / 3600;
    let minutes = (secs % 3600) / 60;

    if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    #[test]
    fn test_scheduler_creation() {
        let (sender, _receiver) = mpsc::channel();
        let config = Config::default();
        let scheduler = Scheduler::new(config, sender);

        assert!(!scheduler.is_running());
        assert!(scheduler.is_enabled());
    }

    #[test]
    fn test_toggle_enabled() {
        let (sender, _receiver) = mpsc::channel();
        let config = Config::default();
        let scheduler = Scheduler::new(config, sender);

        let initial = scheduler.is_enabled();
        let toggled = scheduler.toggle_enabled();
        assert_ne!(initial, toggled);

        let toggled_again = scheduler.toggle_enabled();
        assert_eq!(initial, toggled_again);
    }

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(Duration::from_secs(60)), "1m");
        assert_eq!(format_duration(Duration::from_secs(3600)), "1h 0m");
        assert_eq!(format_duration(Duration::from_secs(3660)), "1h 1m");
        assert_eq!(format_duration(Duration::from_secs(7200)), "2h 0m");
    }
}
