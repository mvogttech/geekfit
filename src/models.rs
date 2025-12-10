//! Data models for Geekfit
//!
//! Contains all core data structures for exercises, progress tracking,
//! gamification (levels, badges, points), and user statistics.

use chrono::{DateTime, Datelike, Local, NaiveDate, Timelike};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a type of exercise the user can perform
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ExerciseType {
    PushUps,
    Squats,
    Planks,
    JumpingJacks,
    Stretches,
}

impl ExerciseType {
    /// Get all available exercise types
    pub fn all() -> Vec<ExerciseType> {
        vec![
            ExerciseType::PushUps,
            ExerciseType::Squats,
            ExerciseType::Planks,
            ExerciseType::JumpingJacks,
            ExerciseType::Stretches,
        ]
    }

    /// Get display name for the exercise
    pub fn display_name(&self) -> &'static str {
        match self {
            ExerciseType::PushUps => "Push-ups",
            ExerciseType::Squats => "Squats",
            ExerciseType::Planks => "Planks",
            ExerciseType::JumpingJacks => "Jumping Jacks",
            ExerciseType::Stretches => "Stretches",
        }
    }

    /// Get the default rep count for this exercise
    pub fn default_reps(&self) -> u32 {
        match self {
            ExerciseType::PushUps => 10,
            ExerciseType::Squats => 15,
            ExerciseType::Planks => 1, // 1 plank hold (30 seconds implied)
            ExerciseType::JumpingJacks => 20,
            ExerciseType::Stretches => 5,
        }
    }

    /// Get points awarded per completion
    pub fn points_per_set(&self) -> u32 {
        match self {
            ExerciseType::PushUps => 10,
            ExerciseType::Squats => 10,
            ExerciseType::Planks => 15, // Planks are harder, more points
            ExerciseType::JumpingJacks => 8,
            ExerciseType::Stretches => 5,
        }
    }

    /// Get a motivational message for this exercise
    pub fn motivation_message(&self) -> &'static str {
        match self {
            ExerciseType::PushUps => "Time for push-ups! Compile some muscle strength!",
            ExerciseType::Squats => "Squat time! Debug your leg day!",
            ExerciseType::Planks => "Plank it out! Hold strong like your code!",
            ExerciseType::JumpingJacks => "Jumping jacks! Jump-start your energy!",
            ExerciseType::Stretches => "Stretch break! Refactor those tight muscles!",
        }
    }
}

/// Represents a single completed exercise entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExerciseEntry {
    pub exercise_type: ExerciseType,
    pub reps: u32,
    pub completed_at: DateTime<Local>,
    pub points_earned: u32,
}

impl ExerciseEntry {
    pub fn new(exercise_type: ExerciseType, reps: u32) -> Self {
        let points_earned = exercise_type.points_per_set();
        Self {
            exercise_type,
            reps,
            completed_at: Local::now(),
            points_earned,
        }
    }
}

/// User level based on total points
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Level {
    NewbieCoder,      // 0-100 points
    JuniorDev,        // 101-500 points
    MidLevelEngineer, // 501-1500 points
    SeniorDev,        // 1501-5000 points
    TechLead,         // 5001-15000 points
    CTO,              // 15001+ points
}

impl Level {
    /// Determine level from total points
    pub fn from_points(points: u32) -> Self {
        match points {
            0..=100 => Level::NewbieCoder,
            101..=500 => Level::JuniorDev,
            501..=1500 => Level::MidLevelEngineer,
            1501..=5000 => Level::SeniorDev,
            5001..=15000 => Level::TechLead,
            _ => Level::CTO,
        }
    }

    /// Get the display name for this level
    pub fn display_name(&self) -> &'static str {
        match self {
            Level::NewbieCoder => "Newbie Coder",
            Level::JuniorDev => "Junior Dev",
            Level::MidLevelEngineer => "Mid-Level Engineer",
            Level::SeniorDev => "Senior Dev",
            Level::TechLead => "Tech Lead",
            Level::CTO => "CTO",
        }
    }

    /// Get the numeric level (1-6)
    pub fn numeric(&self) -> u32 {
        match self {
            Level::NewbieCoder => 1,
            Level::JuniorDev => 2,
            Level::MidLevelEngineer => 3,
            Level::SeniorDev => 4,
            Level::TechLead => 5,
            Level::CTO => 6,
        }
    }

    /// Get points needed for next level
    pub fn points_for_next(&self) -> Option<u32> {
        match self {
            Level::NewbieCoder => Some(101),
            Level::JuniorDev => Some(501),
            Level::MidLevelEngineer => Some(1501),
            Level::SeniorDev => Some(5001),
            Level::TechLead => Some(15001),
            Level::CTO => None, // Max level
        }
    }

    /// Get a level-up message
    pub fn level_up_message(&self) -> &'static str {
        match self {
            Level::NewbieCoder => "Welcome to the fitness journey, Newbie Coder!",
            Level::JuniorDev => "Level up! You're now a Junior Dev! Keep pushing!",
            Level::MidLevelEngineer => "Impressive! Mid-Level Engineer unlocked! Your code stamina grows!",
            Level::SeniorDev => "Senior Dev achieved! You're a fitness debugging expert!",
            Level::TechLead => "Tech Lead status! Leading by healthy example!",
            Level::CTO => "LEGENDARY! CTO level reached! You've mastered the art of fit coding!",
        }
    }
}

/// Achievement badges the user can earn
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Badge {
    FirstCommit,       // Complete first exercise
    WeekendWarrior,    // Exercise on a weekend
    MarathonCoder,     // 7-day streak
    CenturyClub,       // 100 total exercises
    EarlyBird,         // Exercise before 9 AM
    NightOwl,          // Exercise after 9 PM
    Diversified,       // Complete all exercise types
    ConsistentShipper, // 30-day streak
    ThousandPushUps,   // 1000 total push-ups
    IronWill,          // 100 plank sessions
}

impl Badge {
    /// Get all possible badges
    pub fn all() -> Vec<Badge> {
        vec![
            Badge::FirstCommit,
            Badge::WeekendWarrior,
            Badge::MarathonCoder,
            Badge::CenturyClub,
            Badge::EarlyBird,
            Badge::NightOwl,
            Badge::Diversified,
            Badge::ConsistentShipper,
            Badge::ThousandPushUps,
            Badge::IronWill,
        ]
    }

    /// Get display name
    pub fn display_name(&self) -> &'static str {
        match self {
            Badge::FirstCommit => "First Commit",
            Badge::WeekendWarrior => "Weekend Warrior",
            Badge::MarathonCoder => "Marathon Coder",
            Badge::CenturyClub => "Century Club",
            Badge::EarlyBird => "Early Bird",
            Badge::NightOwl => "Night Owl",
            Badge::Diversified => "Diversified Portfolio",
            Badge::ConsistentShipper => "Consistent Shipper",
            Badge::ThousandPushUps => "1K Push-ups Club",
            Badge::IronWill => "Iron Will",
        }
    }

    /// Get description
    pub fn description(&self) -> &'static str {
        match self {
            Badge::FirstCommit => "Complete your first exercise",
            Badge::WeekendWarrior => "Exercise on a weekend",
            Badge::MarathonCoder => "Maintain a 7-day exercise streak",
            Badge::CenturyClub => "Complete 100 total exercises",
            Badge::EarlyBird => "Exercise before 9 AM",
            Badge::NightOwl => "Exercise after 9 PM",
            Badge::Diversified => "Complete all exercise types",
            Badge::ConsistentShipper => "Maintain a 30-day streak",
            Badge::ThousandPushUps => "Complete 1000 total push-ups",
            Badge::IronWill => "Complete 100 plank sessions",
        }
    }

    /// Get emoji/icon representation
    pub fn icon(&self) -> &'static str {
        match self {
            Badge::FirstCommit => "[*]",
            Badge::WeekendWarrior => "[W]",
            Badge::MarathonCoder => "[M]",
            Badge::CenturyClub => "[C]",
            Badge::EarlyBird => "[E]",
            Badge::NightOwl => "[N]",
            Badge::Diversified => "[D]",
            Badge::ConsistentShipper => "[S]",
            Badge::ThousandPushUps => "[P]",
            Badge::IronWill => "[I]",
        }
    }
}

/// Daily statistics for a specific date
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DailyStats {
    pub date: NaiveDate,
    pub exercises: Vec<ExerciseEntry>,
    pub total_points: u32,
    pub exercise_counts: HashMap<ExerciseType, u32>,
}

impl DailyStats {
    pub fn new(date: NaiveDate) -> Self {
        Self {
            date,
            exercises: Vec::new(),
            total_points: 0,
            exercise_counts: HashMap::new(),
        }
    }

    /// Add an exercise entry to this day's stats
    pub fn add_exercise(&mut self, entry: ExerciseEntry) {
        self.total_points += entry.points_earned;
        *self.exercise_counts.entry(entry.exercise_type.clone()).or_insert(0) += entry.reps;
        self.exercises.push(entry);
    }

    /// Get total exercise count for the day
    pub fn total_exercises(&self) -> u32 {
        self.exercises.len() as u32
    }

    /// Get count for a specific exercise type
    pub fn get_exercise_count(&self, exercise_type: &ExerciseType) -> u32 {
        *self.exercise_counts.get(exercise_type).unwrap_or(&0)
    }
}

/// Overall user progress and statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProgress {
    pub total_points: u32,
    pub current_level: Level,
    pub current_streak: u32,
    pub longest_streak: u32,
    pub total_exercises: u32,
    pub badges: Vec<Badge>,
    pub daily_history: HashMap<NaiveDate, DailyStats>,
    pub lifetime_counts: HashMap<ExerciseType, u32>,
    pub last_exercise_date: Option<NaiveDate>,
    pub exercise_types_completed: Vec<ExerciseType>,
}

impl Default for UserProgress {
    fn default() -> Self {
        Self {
            total_points: 0,
            current_level: Level::NewbieCoder,
            current_streak: 0,
            longest_streak: 0,
            total_exercises: 0,
            badges: Vec::new(),
            daily_history: HashMap::new(),
            lifetime_counts: HashMap::new(),
            last_exercise_date: None,
            exercise_types_completed: Vec::new(),
        }
    }
}

impl UserProgress {
    /// Record a completed exercise and return any new badges earned
    pub fn record_exercise(&mut self, exercise_type: ExerciseType, reps: u32) -> Vec<Badge> {
        let entry = ExerciseEntry::new(exercise_type.clone(), reps);
        let today = Local::now().date_naive();
        let hour = Local::now().hour();
        let is_weekend = Local::now().weekday().num_days_from_monday() >= 5;

        // Update daily stats
        let daily = self.daily_history.entry(today).or_insert_with(|| DailyStats::new(today));
        daily.add_exercise(entry.clone());

        // Update totals
        self.total_points += entry.points_earned;
        self.total_exercises += 1;
        *self.lifetime_counts.entry(exercise_type.clone()).or_insert(0) += reps;

        // Track exercise types completed
        if !self.exercise_types_completed.contains(&exercise_type) {
            self.exercise_types_completed.push(exercise_type.clone());
        }

        // Update streak
        if let Some(last_date) = self.last_exercise_date {
            let days_diff = (today - last_date).num_days();
            if days_diff == 1 {
                self.current_streak += 1;
            } else if days_diff > 1 {
                self.current_streak = 1;
            }
            // If same day, streak doesn't change
        } else {
            self.current_streak = 1;
        }
        self.last_exercise_date = Some(today);
        self.longest_streak = self.longest_streak.max(self.current_streak);

        // Update level
        let new_level = Level::from_points(self.total_points);
        let leveled_up = new_level != self.current_level;
        self.current_level = new_level;

        // Check for new badges
        let mut new_badges = Vec::new();

        // First Commit
        if self.total_exercises == 1 && !self.badges.contains(&Badge::FirstCommit) {
            new_badges.push(Badge::FirstCommit);
        }

        // Weekend Warrior
        if is_weekend && !self.badges.contains(&Badge::WeekendWarrior) {
            new_badges.push(Badge::WeekendWarrior);
        }

        // Marathon Coder (7-day streak)
        if self.current_streak >= 7 && !self.badges.contains(&Badge::MarathonCoder) {
            new_badges.push(Badge::MarathonCoder);
        }

        // Century Club (100 exercises)
        if self.total_exercises >= 100 && !self.badges.contains(&Badge::CenturyClub) {
            new_badges.push(Badge::CenturyClub);
        }

        // Early Bird (before 9 AM)
        if hour < 9 && !self.badges.contains(&Badge::EarlyBird) {
            new_badges.push(Badge::EarlyBird);
        }

        // Night Owl (after 9 PM / 21:00)
        if hour >= 21 && !self.badges.contains(&Badge::NightOwl) {
            new_badges.push(Badge::NightOwl);
        }

        // Diversified (all exercise types)
        if self.exercise_types_completed.len() >= ExerciseType::all().len()
            && !self.badges.contains(&Badge::Diversified)
        {
            new_badges.push(Badge::Diversified);
        }

        // Consistent Shipper (30-day streak)
        if self.current_streak >= 30 && !self.badges.contains(&Badge::ConsistentShipper) {
            new_badges.push(Badge::ConsistentShipper);
        }

        // 1K Push-ups
        if *self.lifetime_counts.get(&ExerciseType::PushUps).unwrap_or(&0) >= 1000
            && !self.badges.contains(&Badge::ThousandPushUps)
        {
            new_badges.push(Badge::ThousandPushUps);
        }

        // Iron Will (100 plank sessions)
        if *self.lifetime_counts.get(&ExerciseType::Planks).unwrap_or(&0) >= 100
            && !self.badges.contains(&Badge::IronWill)
        {
            new_badges.push(Badge::IronWill);
        }

        // Add new badges to user's collection
        for badge in &new_badges {
            if !self.badges.contains(badge) {
                self.badges.push(badge.clone());
            }
        }

        // If leveled up, we could return that info too, but for now just badges
        if leveled_up {
            log::info!("Level up! Now: {}", self.current_level.display_name());
        }

        new_badges
    }

    /// Get today's stats
    pub fn today_stats(&self) -> Option<&DailyStats> {
        let today = Local::now().date_naive();
        self.daily_history.get(&today)
    }

    /// Get a summary string for the tooltip
    pub fn tooltip_summary(&self) -> String {
        let today = self.today_stats();
        let today_points = today.map(|s| s.total_points).unwrap_or(0);
        let today_exercises = today.map(|s| s.total_exercises()).unwrap_or(0);

        format!(
            "Geekfit | Level {}: {} | {} pts\nToday: {} exercises (+{} pts) | Streak: {} days",
            self.current_level.numeric(),
            self.current_level.display_name(),
            self.total_points,
            today_exercises,
            today_points,
            self.current_streak
        )
    }

    /// Get detailed progress report
    pub fn detailed_report(&self) -> String {
        let mut report = String::new();
        report.push_str("=== Geekfit Progress Report ===\n\n");

        // Level info
        report.push_str(&format!(
            "Level: {} ({})\n",
            self.current_level.numeric(),
            self.current_level.display_name()
        ));
        report.push_str(&format!("Total Points: {}\n", self.total_points));

        if let Some(next) = self.current_level.points_for_next() {
            report.push_str(&format!(
                "Points to next level: {}\n",
                next.saturating_sub(self.total_points)
            ));
        }

        report.push_str(&format!("\nCurrent Streak: {} days\n", self.current_streak));
        report.push_str(&format!("Longest Streak: {} days\n", self.longest_streak));
        report.push_str(&format!("Total Exercises: {}\n", self.total_exercises));

        // Today's stats
        report.push_str("\n--- Today's Progress ---\n");
        if let Some(today) = self.today_stats() {
            report.push_str(&format!("Exercises: {}\n", today.total_exercises()));
            report.push_str(&format!("Points: {}\n", today.total_points));
            for (exercise, count) in &today.exercise_counts {
                report.push_str(&format!("  {}: {}\n", exercise.display_name(), count));
            }
        } else {
            report.push_str("No exercises yet today. Get moving!\n");
        }

        // Badges
        report.push_str("\n--- Badges Earned ---\n");
        if self.badges.is_empty() {
            report.push_str("No badges yet. Keep at it!\n");
        } else {
            for badge in &self.badges {
                report.push_str(&format!(
                    "{} {} - {}\n",
                    badge.icon(),
                    badge.display_name(),
                    badge.description()
                ));
            }
        }

        // Lifetime stats
        report.push_str("\n--- Lifetime Stats ---\n");
        for exercise_type in ExerciseType::all() {
            let count = self.lifetime_counts.get(&exercise_type).unwrap_or(&0);
            report.push_str(&format!("{}: {}\n", exercise_type.display_name(), count));
        }

        report
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_level_from_points() {
        assert_eq!(Level::from_points(0), Level::NewbieCoder);
        assert_eq!(Level::from_points(100), Level::NewbieCoder);
        assert_eq!(Level::from_points(101), Level::JuniorDev);
        assert_eq!(Level::from_points(500), Level::JuniorDev);
        assert_eq!(Level::from_points(501), Level::MidLevelEngineer);
        assert_eq!(Level::from_points(20000), Level::CTO);
    }

    #[test]
    fn test_record_exercise() {
        let mut progress = UserProgress::default();
        let badges = progress.record_exercise(ExerciseType::PushUps, 10);

        assert_eq!(progress.total_exercises, 1);
        assert_eq!(progress.total_points, 10);
        assert!(badges.contains(&Badge::FirstCommit));
    }

    #[test]
    fn test_daily_stats() {
        let mut stats = DailyStats::new(Local::now().date_naive());
        let entry = ExerciseEntry::new(ExerciseType::Squats, 15);
        stats.add_exercise(entry);

        assert_eq!(stats.total_exercises(), 1);
        assert_eq!(stats.get_exercise_count(&ExerciseType::Squats), 15);
    }
}
