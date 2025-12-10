//! Cross-platform notification system for Geekfit
//!
//! Handles sending desktop notifications for exercise reminders,
//! achievements, and other user alerts.

use crate::config::Config;
use crate::models::{Badge, ExerciseType, Level};
use anyhow::{Context, Result};
use notify_rust::{Notification, Timeout};

/// Notification manager
pub struct Notifier {
    /// App name for notifications
    app_name: String,

    /// Whether notifications are enabled
    enabled: bool,

    /// Default timeout in milliseconds
    timeout_ms: u32,
}

impl Notifier {
    /// Create a new notifier with configuration
    pub fn new(config: &Config) -> Self {
        Self {
            app_name: "Geekfit".to_string(),
            enabled: config.notifications.enabled,
            timeout_ms: config.notifications.timeout_seconds * 1000,
        }
    }

    /// Create a default notifier
    pub fn default_notifier() -> Self {
        Self {
            app_name: "Geekfit".to_string(),
            enabled: true,
            timeout_ms: 10000, // 10 seconds
        }
    }

    /// Update settings from config
    pub fn update_from_config(&mut self, config: &Config) {
        self.enabled = config.notifications.enabled;
        self.timeout_ms = config.notifications.timeout_seconds * 1000;
    }

    /// Send a basic notification
    fn send(&self, title: &str, body: &str) -> Result<()> {
        if !self.enabled {
            log::debug!("Notifications disabled, skipping: {}", title);
            return Ok(());
        }

        let timeout = if self.timeout_ms == 0 {
            Timeout::Default
        } else {
            Timeout::Milliseconds(self.timeout_ms)
        };

        Notification::new()
            .appname(&self.app_name)
            .summary(title)
            .body(body)
            .timeout(timeout)
            .show()
            .context("Failed to show notification")?;

        log::debug!("Sent notification: {}", title);
        Ok(())
    }

    /// Send an exercise reminder notification
    pub fn exercise_reminder(&self, exercise: &ExerciseType, reps: u32) -> Result<()> {
        let title = format!("Time for {}!", exercise.display_name());
        let body = format!(
            "{}\n\nDo {} {} now!\n\nClick the tray icon to log when done.",
            exercise.motivation_message(),
            reps,
            exercise.display_name().to_lowercase()
        );

        self.send(&title, &body)
    }

    /// Send a notification when exercise is completed
    pub fn exercise_completed(
        &self,
        exercise: &ExerciseType,
        reps: u32,
        points: u32,
        total_points: u32,
    ) -> Result<()> {
        let title = format!("{} completed!", exercise.display_name());
        let body = format!(
            "Great job! +{} points\n{} {} logged.\nTotal points: {}",
            points,
            reps,
            exercise.display_name().to_lowercase(),
            total_points
        );

        self.send(&title, &body)
    }

    /// Send a level up notification
    pub fn level_up(&self, new_level: &Level, total_points: u32) -> Result<()> {
        let title = "Level Up!";
        let body = format!(
            "{}\n\nYou've reached {} ({} total points)!",
            new_level.level_up_message(),
            new_level.display_name(),
            total_points
        );

        self.send(title, &body)
    }

    /// Send a badge earned notification
    pub fn badge_earned(&self, badge: &Badge) -> Result<()> {
        let title = "Badge Unlocked!";
        let body = format!(
            "{} {}\n\n{}",
            badge.icon(),
            badge.display_name(),
            badge.description()
        );

        self.send(title, &body)
    }

    /// Send multiple badge notifications
    pub fn badges_earned(&self, badges: &[Badge]) -> Result<()> {
        for badge in badges {
            self.badge_earned(badge)?;
        }
        Ok(())
    }

    /// Send a streak notification
    pub fn streak_milestone(&self, days: u32) -> Result<()> {
        let title = "Streak Milestone!";
        let message = match days {
            7 => "One week strong! You're a Marathon Coder!",
            14 => "Two weeks! Your dedication is compiling nicely!",
            30 => "30 days! You're a Consistent Shipper!",
            60 => "60 days! Your fitness routine is bug-free!",
            90 => "90 days! You've achieved fitness enlightenment!",
            100 => "100 DAYS! You are legendary!",
            _ => return Ok(()), // No notification for non-milestone days
        };

        let body = format!("{} day streak!\n\n{}", days, message);
        self.send(title, &body)
    }

    /// Send a welcome notification on first launch
    pub fn welcome(&self) -> Result<()> {
        let title = "Welcome to Geekfit!";
        let body = "Your fitness journey starts now!\n\n\
                    I'll remind you to exercise throughout the day.\n\
                    Click the tray icon to see your progress.";

        self.send(title, body)
    }

    /// Send a daily summary notification
    pub fn daily_summary(&self, exercises: u32, points: u32, streak: u32) -> Result<()> {
        let title = "Geekfit Daily Summary";
        let body = format!(
            "Today's stats:\n\
             - Exercises: {}\n\
             - Points earned: {}\n\
             - Current streak: {} days\n\n\
             Keep up the great work!",
            exercises, points, streak
        );

        self.send(title, &body)
    }

    /// Send a reminder that the app is still running
    pub fn still_running(&self) -> Result<()> {
        let title = "Geekfit is running";
        let body = "I'm still here, keeping you fit!\nCheck the system tray for more options.";

        self.send(title, body)
    }

    /// Send a custom notification
    pub fn custom(&self, title: &str, body: &str) -> Result<()> {
        self.send(title, body)
    }

    /// Toggle notifications on/off
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
        log::info!("Notifications {}", if enabled { "enabled" } else { "disabled" });
    }

    /// Check if notifications are enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }
}

/// Message templates for various notifications
pub mod templates {
    use crate::models::ExerciseType;

    /// Get a random motivational message
    pub fn random_motivation() -> &'static str {
        use rand::seq::SliceRandom;

        const MESSAGES: &[&str] = &[
            "Code compiles faster when you're fit!",
            "Debugging is easier with blood flowing!",
            "Every push-up makes your code stronger!",
            "Strong body, strong mind, clean code!",
            "Your IDE approves of this workout!",
            "Fitness: The ultimate productivity hack!",
            "Merge your health into main branch!",
            "No bugs in this workout routine!",
            "git commit -m 'Added gains'",
            "Your uptime is about to improve!",
        ];

        let mut rng = rand::thread_rng();
        MESSAGES.choose(&mut rng).unwrap_or(&MESSAGES[0])
    }

    /// Get a completion celebration message
    pub fn random_celebration() -> &'static str {
        use rand::seq::SliceRandom;

        const MESSAGES: &[&str] = &[
            "Excellent work!",
            "You're crushing it!",
            "Keep that momentum!",
            "Beast mode activated!",
            "Fitness goals: Achieved!",
            "Your muscles thank you!",
            "That's the spirit!",
            "Legendary performance!",
            "Build passing: Health check OK!",
            "Deployed: Gains to production!",
        ];

        let mut rng = rand::thread_rng();
        MESSAGES.choose(&mut rng).unwrap_or(&MESSAGES[0])
    }

    /// Get exercise-specific encouragement
    pub fn exercise_encouragement(exercise: &ExerciseType) -> &'static str {
        match exercise {
            ExerciseType::PushUps => "Push your way to better code!",
            ExerciseType::Squats => "Squat deep, code deeper!",
            ExerciseType::Planks => "Hold strong like your architecture!",
            ExerciseType::JumpingJacks => "Jump-start your productivity!",
            ExerciseType::Stretches => "Stretch away the bugs!",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notifier_creation() {
        let config = Config::default();
        let notifier = Notifier::new(&config);
        assert!(notifier.is_enabled());
    }

    #[test]
    fn test_disabled_notifier() {
        let mut notifier = Notifier::default_notifier();
        notifier.set_enabled(false);
        assert!(!notifier.is_enabled());

        // Should not fail even when disabled
        let result = notifier.send("Test", "This should not show");
        assert!(result.is_ok());
    }

    #[test]
    fn test_random_messages() {
        // Just verify they don't panic
        let _ = templates::random_motivation();
        let _ = templates::random_celebration();
        let _ = templates::exercise_encouragement(&ExerciseType::PushUps);
    }
}
