//! GUI module for Geekfit
//!
//! Provides graphical windows for viewing progress, settings, and about info.
//! Uses egui/eframe for a lightweight, cross-platform GUI.

use crate::config::Config;
use crate::models::{Badge, ExerciseType, Level, UserProgress};
use eframe::egui;
use std::sync::{Arc, RwLock};

/// Which window/tab is currently active
#[derive(Debug, Clone, PartialEq, Default)]
pub enum ActiveTab {
    #[default]
    Dashboard,
    Exercises,
    Badges,
    History,
    Settings,
}

/// Actions that can be triggered from the GUI
#[derive(Debug, Clone)]
pub enum GuiAction {
    LogExercise(ExerciseType),
    ToggleReminders,
    SaveSettings,
    CloseWindow,
}

/// Main GUI application state
pub struct GeekfitGui {
    /// Shared progress data
    progress: Arc<RwLock<UserProgress>>,

    /// Configuration
    config: Config,

    /// Currently active tab
    active_tab: ActiveTab,

    /// Actions to be processed by the main app
    pending_actions: Vec<GuiAction>,

    /// Settings being edited (copy of config for editing)
    edit_config: EditableConfig,

    /// Whether settings have been modified
    settings_dirty: bool,

    /// Show exercise log confirmation
    show_log_confirmation: Option<ExerciseType>,
}

/// Editable subset of configuration for the settings UI
#[derive(Debug, Clone)]
pub struct EditableConfig {
    pub reminders_enabled: bool,
    pub min_interval: u32,
    pub max_interval: u32,
    pub use_random: bool,
    pub work_start: u32,
    pub work_end: u32,
    pub active_days: [bool; 7], // Sun-Sat
    pub enabled_exercises: [bool; 5], // PushUps, Squats, Planks, JumpingJacks, Stretches
    pub notifications_enabled: bool,
}

impl From<&Config> for EditableConfig {
    fn from(config: &Config) -> Self {
        let mut active_days = [false; 7];
        for day in &config.reminders.active_days {
            if *day < 7 {
                active_days[*day as usize] = true;
            }
        }

        let mut enabled_exercises = [false; 5];
        for ex in &config.exercises.enabled_exercises {
            match ex {
                ExerciseType::PushUps => enabled_exercises[0] = true,
                ExerciseType::Squats => enabled_exercises[1] = true,
                ExerciseType::Planks => enabled_exercises[2] = true,
                ExerciseType::JumpingJacks => enabled_exercises[3] = true,
                ExerciseType::Stretches => enabled_exercises[4] = true,
            }
        }

        Self {
            reminders_enabled: config.reminders.enabled,
            min_interval: config.reminders.min_interval_minutes,
            max_interval: config.reminders.max_interval_minutes,
            use_random: config.reminders.use_random_intervals,
            work_start: config.reminders.work_start_hour,
            work_end: config.reminders.work_end_hour,
            active_days,
            enabled_exercises,
            notifications_enabled: config.notifications.enabled,
        }
    }
}

impl EditableConfig {
    /// Apply changes back to a Config
    pub fn apply_to(&self, config: &mut Config) {
        config.reminders.enabled = self.reminders_enabled;
        config.reminders.min_interval_minutes = self.min_interval;
        config.reminders.max_interval_minutes = self.max_interval;
        config.reminders.use_random_intervals = self.use_random;
        config.reminders.work_start_hour = self.work_start;
        config.reminders.work_end_hour = self.work_end;

        config.reminders.active_days = self.active_days
            .iter()
            .enumerate()
            .filter_map(|(i, &active)| if active { Some(i as u32) } else { None })
            .collect();

        config.exercises.enabled_exercises = self.enabled_exercises
            .iter()
            .enumerate()
            .filter_map(|(i, &enabled)| {
                if enabled {
                    Some(match i {
                        0 => ExerciseType::PushUps,
                        1 => ExerciseType::Squats,
                        2 => ExerciseType::Planks,
                        3 => ExerciseType::JumpingJacks,
                        4 => ExerciseType::Stretches,
                        _ => return None,
                    })
                } else {
                    None
                }
            })
            .collect();

        config.notifications.enabled = self.notifications_enabled;
    }
}

impl GeekfitGui {
    /// Create a new GUI instance
    pub fn new(
        _cc: &eframe::CreationContext<'_>,
        progress: Arc<RwLock<UserProgress>>,
        config: Config,
    ) -> Self {
        let edit_config = EditableConfig::from(&config);

        Self {
            progress,
            config,
            active_tab: ActiveTab::Dashboard,
            pending_actions: Vec::new(),
            edit_config,
            settings_dirty: false,
            show_log_confirmation: None,
        }
    }

    /// Take any pending actions
    pub fn take_actions(&mut self) -> Vec<GuiAction> {
        std::mem::take(&mut self.pending_actions)
    }

    /// Get current config
    pub fn config(&self) -> &Config {
        &self.config
    }

    /// Render the dashboard tab
    fn render_dashboard(&mut self, ui: &mut egui::Ui) {
        let progress = self.progress.read().unwrap();

        // Header with level info
        ui.vertical_centered(|ui| {
            ui.add_space(10.0);
            ui.heading(format!("Level {}: {}",
                progress.current_level.numeric(),
                progress.current_level.display_name()
            ));
            ui.add_space(5.0);
        });

        // Progress bar to next level
        if let Some(next_points) = progress.current_level.points_for_next() {
            let current = progress.total_points;
            let prev_threshold = match progress.current_level {
                Level::NewbieCoder => 0,
                Level::JuniorDev => 101,
                Level::MidLevelEngineer => 501,
                Level::SeniorDev => 1501,
                Level::TechLead => 5001,
                Level::CTO => 15001,
            };
            let progress_in_level = current.saturating_sub(prev_threshold) as f32;
            let level_range = (next_points - prev_threshold) as f32;
            let fraction = (progress_in_level / level_range).min(1.0);

            ui.add_space(10.0);
            ui.horizontal(|ui| {
                ui.label("Progress to next level:");
                ui.add(egui::ProgressBar::new(fraction)
                    .text(format!("{} / {} pts", current, next_points)));
            });
        } else {
            ui.vertical_centered(|ui| {
                ui.label(egui::RichText::new("MAX LEVEL ACHIEVED!")
                    .color(egui::Color32::GOLD)
                    .strong());
            });
        }

        ui.add_space(20.0);
        ui.separator();

        // Stats grid
        egui::Grid::new("stats_grid")
            .num_columns(2)
            .spacing([40.0, 10.0])
            .show(ui, |ui| {
                ui.label("Total Points:");
                ui.label(egui::RichText::new(format!("{}", progress.total_points))
                    .strong()
                    .size(18.0));
                ui.end_row();

                ui.label("Total Exercises:");
                ui.label(egui::RichText::new(format!("{}", progress.total_exercises))
                    .strong()
                    .size(18.0));
                ui.end_row();

                ui.label("Current Streak:");
                ui.label(egui::RichText::new(format!("{} days", progress.current_streak))
                    .strong()
                    .size(18.0)
                    .color(if progress.current_streak >= 7 {
                        egui::Color32::GREEN
                    } else {
                        egui::Color32::WHITE
                    }));
                ui.end_row();

                ui.label("Longest Streak:");
                ui.label(egui::RichText::new(format!("{} days", progress.longest_streak))
                    .strong()
                    .size(18.0));
                ui.end_row();

                ui.label("Badges Earned:");
                ui.label(egui::RichText::new(format!("{} / {}",
                    progress.badges.len(),
                    Badge::all().len()))
                    .strong()
                    .size(18.0));
                ui.end_row();
            });

        ui.add_space(20.0);
        ui.separator();

        // Today's stats
        ui.heading("Today's Progress");
        ui.add_space(10.0);

        if let Some(today) = progress.today_stats() {
            egui::Grid::new("today_grid")
                .num_columns(2)
                .spacing([40.0, 8.0])
                .show(ui, |ui| {
                    ui.label("Exercises completed:");
                    ui.label(format!("{}", today.total_exercises()));
                    ui.end_row();

                    ui.label("Points earned:");
                    ui.label(format!("+{}", today.total_points));
                    ui.end_row();
                });

            if !today.exercise_counts.is_empty() {
                ui.add_space(10.0);
                for (exercise, count) in &today.exercise_counts {
                    ui.horizontal(|ui| {
                        ui.label(format!("  {} {}", exercise.display_name(), count));
                    });
                }
            }
        } else {
            ui.label("No exercises yet today. Get moving!");
        }
    }

    /// Render the exercises tab with log buttons
    fn render_exercises(&mut self, ui: &mut egui::Ui) {
        ui.heading("Log Exercise");
        ui.add_space(10.0);
        ui.label("Click a button to log a completed exercise:");
        ui.add_space(20.0);

        let exercises = ExerciseType::all();

        for exercise in exercises {
            let reps = self.config.get_reps(&exercise);
            let points = exercise.points_per_set();

            ui.horizontal(|ui| {
                if ui.add_sized([200.0, 40.0],
                    egui::Button::new(format!("{} ({} reps)", exercise.display_name(), reps))
                ).clicked() {
                    self.show_log_confirmation = Some(exercise.clone());
                }
                ui.label(format!("+{} pts", points));
            });
            ui.add_space(5.0);
        }

        // Confirmation dialog
        if let Some(ref exercise) = self.show_log_confirmation.clone() {
            egui::Window::new("Confirm Exercise")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
                .show(ui.ctx(), |ui| {
                    ui.vertical_centered(|ui| {
                        ui.add_space(10.0);
                        ui.label(format!("Log {} {}?",
                            self.config.get_reps(exercise),
                            exercise.display_name()
                        ));
                        ui.add_space(15.0);
                        ui.horizontal(|ui| {
                            if ui.button("  Yes  ").clicked() {
                                self.pending_actions.push(GuiAction::LogExercise(exercise.clone()));
                                self.show_log_confirmation = None;
                            }
                            ui.add_space(20.0);
                            if ui.button("Cancel").clicked() {
                                self.show_log_confirmation = None;
                            }
                        });
                        ui.add_space(10.0);
                    });
                });
        }

        ui.add_space(30.0);
        ui.separator();

        // Lifetime stats
        ui.heading("Lifetime Stats");
        ui.add_space(10.0);

        let progress = self.progress.read().unwrap();
        egui::Grid::new("lifetime_grid")
            .num_columns(2)
            .spacing([40.0, 8.0])
            .show(ui, |ui| {
                for exercise in ExerciseType::all() {
                    let count = progress.lifetime_counts.get(&exercise).unwrap_or(&0);
                    ui.label(format!("{}:", exercise.display_name()));
                    ui.label(format!("{}", count));
                    ui.end_row();
                }
            });
    }

    /// Render the badges tab
    fn render_badges(&mut self, ui: &mut egui::Ui) {
        ui.heading("Achievements");
        ui.add_space(10.0);

        let progress = self.progress.read().unwrap();
        let all_badges = Badge::all();

        egui::ScrollArea::vertical().show(ui, |ui| {
            for badge in all_badges {
                let earned = progress.badges.contains(&badge);

                ui.horizontal(|ui| {
                    let icon_text = if earned {
                        egui::RichText::new(badge.icon())
                            .size(20.0)
                            .color(egui::Color32::GOLD)
                    } else {
                        egui::RichText::new("[ ]")
                            .size(20.0)
                            .color(egui::Color32::GRAY)
                    };
                    ui.label(icon_text);

                    ui.vertical(|ui| {
                        let name_text = if earned {
                            egui::RichText::new(badge.display_name())
                                .strong()
                                .color(egui::Color32::WHITE)
                        } else {
                            egui::RichText::new(badge.display_name())
                                .color(egui::Color32::GRAY)
                        };
                        ui.label(name_text);
                        ui.label(egui::RichText::new(badge.description())
                            .small()
                            .color(if earned { egui::Color32::LIGHT_GRAY } else { egui::Color32::DARK_GRAY }));
                    });
                });
                ui.add_space(10.0);
            }
        });
    }

    /// Render the history tab
    fn render_history(&mut self, ui: &mut egui::Ui) {
        ui.heading("Exercise History");
        ui.add_space(10.0);

        let progress = self.progress.read().unwrap();

        if progress.daily_history.is_empty() {
            ui.label("No exercise history yet. Start your fitness journey!");
            return;
        }

        // Sort dates in reverse order (most recent first)
        let mut dates: Vec<_> = progress.daily_history.keys().collect();
        dates.sort_by(|a, b| b.cmp(a));

        egui::ScrollArea::vertical().show(ui, |ui| {
            for date in dates.iter().take(30) { // Show last 30 days
                if let Some(day_stats) = progress.daily_history.get(*date) {
                    ui.collapsing(format!("{} - {} exercises, +{} pts",
                        date.format("%Y-%m-%d"),
                        day_stats.total_exercises(),
                        day_stats.total_points
                    ), |ui| {
                        for (exercise, count) in &day_stats.exercise_counts {
                            ui.label(format!("  {} {}", exercise.display_name(), count));
                        }
                    });
                }
            }
        });
    }

    /// Render the settings tab
    fn render_settings(&mut self, ui: &mut egui::Ui) {
        ui.heading("Settings");
        ui.add_space(10.0);

        egui::ScrollArea::vertical().show(ui, |ui| {
            // Reminders section
            ui.group(|ui| {
                ui.heading("Reminders");
                ui.add_space(5.0);

                if ui.checkbox(&mut self.edit_config.reminders_enabled, "Enable reminders")
                    .changed() {
                    self.settings_dirty = true;
                }

                ui.add_space(10.0);
                ui.horizontal(|ui| {
                    ui.label("Interval (minutes):");
                    if ui.add(egui::DragValue::new(&mut self.edit_config.min_interval)
                        .range(15..=240)
                        .prefix("min: "))
                        .changed() {
                        self.settings_dirty = true;
                    }
                    if ui.add(egui::DragValue::new(&mut self.edit_config.max_interval)
                        .range(15..=240)
                        .prefix("max: "))
                        .changed() {
                        self.settings_dirty = true;
                        // Ensure max >= min
                        if self.edit_config.max_interval < self.edit_config.min_interval {
                            self.edit_config.max_interval = self.edit_config.min_interval;
                        }
                    }
                });

                if ui.checkbox(&mut self.edit_config.use_random, "Use random intervals")
                    .changed() {
                    self.settings_dirty = true;
                }

                ui.add_space(10.0);
                ui.horizontal(|ui| {
                    ui.label("Work hours:");
                    if ui.add(egui::DragValue::new(&mut self.edit_config.work_start)
                        .range(0..=23)
                        .suffix(":00"))
                        .changed() {
                        self.settings_dirty = true;
                    }
                    ui.label("to");
                    if ui.add(egui::DragValue::new(&mut self.edit_config.work_end)
                        .range(1..=24)
                        .suffix(":00"))
                        .changed() {
                        self.settings_dirty = true;
                    }
                });

                ui.add_space(10.0);
                ui.label("Active days:");
                ui.horizontal(|ui| {
                    let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    for (i, day) in days.iter().enumerate() {
                        if ui.checkbox(&mut self.edit_config.active_days[i], *day).changed() {
                            self.settings_dirty = true;
                        }
                    }
                });
            });

            ui.add_space(15.0);

            // Exercises section
            ui.group(|ui| {
                ui.heading("Enabled Exercises");
                ui.add_space(5.0);

                let exercise_names = ["Push-ups", "Squats", "Planks", "Jumping Jacks", "Stretches"];
                for (i, name) in exercise_names.iter().enumerate() {
                    if ui.checkbox(&mut self.edit_config.enabled_exercises[i], *name).changed() {
                        self.settings_dirty = true;
                    }
                }
            });

            ui.add_space(15.0);

            // Notifications section
            ui.group(|ui| {
                ui.heading("Notifications");
                ui.add_space(5.0);

                if ui.checkbox(&mut self.edit_config.notifications_enabled, "Enable notifications")
                    .changed() {
                    self.settings_dirty = true;
                }
            });

            ui.add_space(20.0);

            // Save button
            ui.horizontal(|ui| {
                let save_btn = ui.add_enabled(
                    self.settings_dirty,
                    egui::Button::new("Save Settings")
                );
                if save_btn.clicked() {
                    self.edit_config.apply_to(&mut self.config);
                    self.pending_actions.push(GuiAction::SaveSettings);
                    self.settings_dirty = false;
                }

                if self.settings_dirty {
                    ui.label(egui::RichText::new("(unsaved changes)")
                        .small()
                        .color(egui::Color32::YELLOW));
                }
            });

            ui.add_space(20.0);

            // Config file location
            ui.separator();
            ui.add_space(10.0);
            if let Ok(path) = Config::config_path() {
                ui.label(egui::RichText::new(format!("Config file: {}", path.display()))
                    .small()
                    .color(egui::Color32::GRAY));
            }
        });
    }
}

impl GeekfitGui {
    /// Public update method that can be called from the wrapper
    pub fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Side panel with navigation
        egui::SidePanel::left("nav_panel")
            .resizable(false)
            .default_width(120.0)
            .show(ctx, |ui| {
                ui.add_space(10.0);
                ui.vertical_centered(|ui| {
                    ui.heading("Geekfit");
                });
                ui.add_space(20.0);
                ui.separator();
                ui.add_space(10.0);

                if ui.selectable_label(self.active_tab == ActiveTab::Dashboard, "Dashboard").clicked() {
                    self.active_tab = ActiveTab::Dashboard;
                }
                if ui.selectable_label(self.active_tab == ActiveTab::Exercises, "Exercises").clicked() {
                    self.active_tab = ActiveTab::Exercises;
                }
                if ui.selectable_label(self.active_tab == ActiveTab::Badges, "Badges").clicked() {
                    self.active_tab = ActiveTab::Badges;
                }
                if ui.selectable_label(self.active_tab == ActiveTab::History, "History").clicked() {
                    self.active_tab = ActiveTab::History;
                }
                if ui.selectable_label(self.active_tab == ActiveTab::Settings, "Settings").clicked() {
                    self.active_tab = ActiveTab::Settings;
                }

                // Spacer to push version to bottom
                ui.with_layout(egui::Layout::bottom_up(egui::Align::Center), |ui| {
                    ui.add_space(10.0);
                    ui.label(egui::RichText::new(format!("v{}", env!("CARGO_PKG_VERSION")))
                        .small()
                        .color(egui::Color32::GRAY));
                });
            });

        // Main content panel
        egui::CentralPanel::default().show(ctx, |ui| {
            match self.active_tab {
                ActiveTab::Dashboard => self.render_dashboard(ui),
                ActiveTab::Exercises => self.render_exercises(ui),
                ActiveTab::Badges => self.render_badges(ui),
                ActiveTab::History => self.render_history(ui),
                ActiveTab::Settings => self.render_settings(ui),
            }
        });

        // Request repaint for animations (like progress bars)
        ctx.request_repaint_after(std::time::Duration::from_secs(1));
    }
}

