use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, State,
};

// Database state
struct DbState(Mutex<Connection>);

// ============ Data Structures ============

#[derive(Debug, Serialize, Deserialize)]
pub struct Exercise {
    pub id: i64,
    pub name: String,
    pub xp_per_rep: i32,
    pub total_xp: i64,      // XP earned for this specific exercise
    pub current_level: i32, // Level for this exercise (1-99)
    pub icon: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExerciseLog {
    pub id: i64,
    pub exercise_id: i64,
    pub reps: i32,
    pub xp_earned: i32,
    pub logged_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserStats {
    pub total_xp: i64,    // Sum of all exercise XP
    pub total_level: i32, // Sum of all exercise levels
    pub current_streak: i32,
    pub longest_streak: i32,
    pub last_exercise_date: Option<String>,
    pub exercise_count: i32, // Number of exercises (skills)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Achievement {
    pub id: i64,
    pub key: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub unlocked_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub reminder_enabled: bool,
    pub reminder_interval_minutes: i32,
    pub sound_enabled: bool,
    pub daily_goal_xp: i32,
    pub theme_mode: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LogExerciseResult {
    pub xp_earned: i32,
    pub new_exercise_level: i32,
    pub leveled_up: bool,
}

// ============ XP Calculations (RuneScape-style) ============

fn xp_for_level(level: i32) -> i64 {
    if level <= 1 {
        return 0;
    }
    let mut total: f64 = 0.0;
    for i in 1..level {
        total += (i as f64) + 300.0 * 2.0_f64.powf((i as f64) / 7.0);
    }
    (total / 4.0).floor() as i64
}

fn level_from_xp(xp: i64) -> i32 {
    let mut level = 1;
    while xp_for_level(level + 1) <= xp && level < 99 {
        level += 1;
    }
    level
}

// ============ Database Initialization ============

fn init_database(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
        -- Exercises table with per-exercise XP tracking
        CREATE TABLE IF NOT EXISTS exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            xp_per_rep INTEGER DEFAULT 10,
            total_xp INTEGER DEFAULT 0,
            current_level INTEGER DEFAULT 1,
            icon TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Exercise logs
        CREATE TABLE IF NOT EXISTS exercise_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exercise_id INTEGER NOT NULL,
            reps INTEGER NOT NULL,
            xp_earned INTEGER NOT NULL,
            logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (exercise_id) REFERENCES exercises(id)
        );

        -- User stats (streak tracking only, levels calculated from exercises)
        CREATE TABLE IF NOT EXISTS user_stats (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            last_exercise_date DATE
        );

        -- Achievements
        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            unlocked_at DATETIME
        );

        -- Settings
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        ",
    )?;

    // Migration: Add total_xp and current_level columns if they don't exist
    let _ = conn.execute(
        "ALTER TABLE exercises ADD COLUMN total_xp INTEGER DEFAULT 0",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE exercises ADD COLUMN current_level INTEGER DEFAULT 1",
        [],
    );

    // Seed default exercises - desk/office friendly, no equipment needed
    let default_exercises: Vec<(&str, i32, &str)> = vec![
        // Upper body
        ("Pushups", 10, "fitness_center"),
        ("Arm Circles", 3, "self_improvement"),
        // Core
        ("Sit-ups", 8, "self_improvement"),
        ("Crunches", 6, "self_improvement"),
        ("Plank (10 sec)", 5, "self_improvement"),
        ("Leg Raises", 8, "self_improvement"),
        ("Mountain Climbers", 10, "self_improvement"),
        // Lower body
        ("Squats", 8, "fitness_center"),
        ("Lunges", 10, "fitness_center"),
        ("Calf Raises", 4, "fitness_center"),
        ("Wall Sit (10 sec)", 4, "fitness_center"),
        ("Side Leg Raises", 6, "fitness_center"),
        ("Step-ups", 8, "fitness_center"),
        // Cardio
        ("Jumping Jacks", 6, "directions_run"),
        ("High Knees", 6, "directions_run"),
        ("Burpees", 15, "directions_run"),
        ("Stair Climbs", 10, "directions_run"),
        ("Marching in Place", 4, "directions_run"),
        // Stretches & Mobility (great for desk workers)
        ("Neck Stretches", 2, "accessibility"),
        ("Shoulder Shrugs", 3, "accessibility"),
        ("Wrist Circles", 2, "accessibility"),
        ("Toe Touches", 4, "accessibility"),
        ("Hip Circles", 3, "accessibility"),
        ("Torso Twists", 3, "accessibility"),
        ("Ankle Rotations", 2, "accessibility"),
        ("Cat-Cow Stretch", 3, "accessibility"),
        ("Chest Opener", 3, "accessibility"),
        ("Quad Stretch", 3, "accessibility"),
    ];

    for (name, xp, icon) in default_exercises {
        conn.execute(
            "INSERT OR IGNORE INTO exercises (name, xp_per_rep, icon, total_xp, current_level) VALUES (?, ?, ?, 0, 1)",
            params![name, xp, icon],
        )?;
    }

    // Seed user stats
    conn.execute(
        "INSERT OR IGNORE INTO user_stats (id, current_streak, longest_streak) VALUES (1, 0, 0)",
        [],
    )?;

    // Seed achievements
    let achievements = vec![
        (
            "first_exercise",
            "First Steps",
            "Complete your first exercise",
        ),
        (
            "hundred_pushups",
            "Century",
            "Complete 100 pushups in a single day",
        ),
        (
            "week_streak",
            "Dedicated",
            "Maintain a 7-day exercise streak",
        ),
        (
            "month_streak",
            "Committed",
            "Maintain a 30-day exercise streak",
        ),
        ("skill_10", "Rising Star", "Get any exercise to level 10"),
        (
            "skill_25",
            "Fitness Warrior",
            "Get any exercise to level 25",
        ),
        ("skill_50", "Legend", "Get any exercise to level 50"),
        ("total_100", "Century Club", "Reach 100 total level"),
        (
            "variety",
            "Well-Rounded",
            "Log 5 different types of exercises",
        ),
    ];

    for (key, name, desc) in achievements {
        conn.execute(
            "INSERT OR IGNORE INTO achievements (key, name, description) VALUES (?, ?, ?)",
            params![key, name, desc],
        )?;
    }

    // Seed default settings
    let default_settings = vec![
        ("reminder_enabled", "true"),
        ("reminder_interval_minutes", "120"),
        ("sound_enabled", "true"),
        ("daily_goal_xp", "500"),
    ];

    for (key, value) in default_settings {
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            params![key, value],
        )?;
    }

    Ok(())
}

// ============ Tauri Commands ============

#[tauri::command]
fn get_exercises(state: State<DbState>) -> Result<Vec<Exercise>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, xp_per_rep, COALESCE(total_xp, 0), COALESCE(current_level, 1), icon, created_at FROM exercises ORDER BY current_level DESC, total_xp DESC")
        .map_err(|e| e.to_string())?;

    let exercises = stmt
        .query_map([], |row| {
            Ok(Exercise {
                id: row.get(0)?,
                name: row.get(1)?,
                xp_per_rep: row.get(2)?,
                total_xp: row.get(3)?,
                current_level: row.get(4)?,
                icon: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(exercises)
}

#[tauri::command]
fn add_exercise(state: State<DbState>, name: String, xp_per_rep: i32) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO exercises (name, xp_per_rep, total_xp, current_level) VALUES (?, ?, 0, 1)",
        params![name, xp_per_rep],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_exercise(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM exercise_logs WHERE exercise_id = ?",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM exercises WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn log_exercise(
    state: State<DbState>,
    exercise_id: i64,
    reps: i32,
) -> Result<LogExerciseResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get exercise info
    let (xp_per_rep, old_xp, old_level): (i32, i64, i32) = conn
        .query_row(
            "SELECT xp_per_rep, COALESCE(total_xp, 0), COALESCE(current_level, 1) FROM exercises WHERE id = ?",
            params![exercise_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| e.to_string())?;

    let xp_earned = xp_per_rep * reps;
    let new_xp = old_xp + xp_earned as i64;
    let new_level = level_from_xp(new_xp);
    let leveled_up = new_level > old_level;

    // Log the exercise (use localtime for correct timezone)
    conn.execute(
        "INSERT INTO exercise_logs (exercise_id, reps, xp_earned, logged_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
        params![exercise_id, reps, xp_earned],
    )
    .map_err(|e| e.to_string())?;

    // Update exercise XP and level
    conn.execute(
        "UPDATE exercises SET total_xp = ?, current_level = ? WHERE id = ?",
        params![new_xp, new_level, exercise_id],
    )
    .map_err(|e| e.to_string())?;

    // Update streak
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let last_date: Option<String> = conn
        .query_row(
            "SELECT last_exercise_date FROM user_stats WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(None);

    let (current_streak, longest_streak): (i32, i32) = conn
        .query_row(
            "SELECT current_streak, longest_streak FROM user_stats WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or((0, 0));

    let new_streak = match &last_date {
        Some(date) => {
            if date == &today {
                current_streak
            } else {
                let yesterday = (chrono::Local::now() - chrono::Duration::days(1))
                    .format("%Y-%m-%d")
                    .to_string();
                if date == &yesterday {
                    current_streak + 1
                } else {
                    1
                }
            }
        }
        None => 1,
    };
    let new_longest = std::cmp::max(new_streak, longest_streak);

    conn.execute(
        "UPDATE user_stats SET current_streak = ?, longest_streak = ?, last_exercise_date = ? WHERE id = 1",
        params![new_streak, new_longest, today],
    )
    .map_err(|e| e.to_string())?;

    // Calculate total level for achievements
    let total_level: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(current_level), 0) FROM exercises",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Check achievements
    check_achievements(&conn, new_level, new_streak, total_level)?;

    Ok(LogExerciseResult {
        xp_earned,
        new_exercise_level: new_level,
        leveled_up,
    })
}

fn check_achievements(
    conn: &Connection,
    exercise_level: i32,
    streak: i32,
    total_level: i32,
) -> Result<(), String> {
    let today = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // First exercise achievement
    let log_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM exercise_logs", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if log_count == 1 {
        conn.execute(
            "UPDATE achievements SET unlocked_at = ? WHERE key = 'first_exercise' AND unlocked_at IS NULL",
            params![today],
        )
        .map_err(|e| e.to_string())?;
    }

    // Skill level achievements (any single exercise)
    if exercise_level >= 10 {
        conn.execute(
            "UPDATE achievements SET unlocked_at = ? WHERE key = 'skill_10' AND unlocked_at IS NULL",
            params![today],
        )
        .map_err(|e| e.to_string())?;
    }
    if exercise_level >= 25 {
        conn.execute(
            "UPDATE achievements SET unlocked_at = ? WHERE key = 'skill_25' AND unlocked_at IS NULL",
            params![today],
        )
        .map_err(|e| e.to_string())?;
    }
    if exercise_level >= 50 {
        conn.execute(
            "UPDATE achievements SET unlocked_at = ? WHERE key = 'skill_50' AND unlocked_at IS NULL",
            params![today],
        )
        .map_err(|e| e.to_string())?;
    }

    // Total level achievement
    if total_level >= 100 {
        conn.execute(
            "UPDATE achievements SET unlocked_at = ? WHERE key = 'total_100' AND unlocked_at IS NULL",
            params![today],
        )
        .map_err(|e| e.to_string())?;
    }

    // Streak achievements
    if streak >= 7 {
        conn.execute(
            "UPDATE achievements SET unlocked_at = ? WHERE key = 'week_streak' AND unlocked_at IS NULL",
            params![today],
        )
        .map_err(|e| e.to_string())?;
    }
    if streak >= 30 {
        conn.execute(
            "UPDATE achievements SET unlocked_at = ? WHERE key = 'month_streak' AND unlocked_at IS NULL",
            params![today],
        )
        .map_err(|e| e.to_string())?;
    }

    // Variety achievement
    let distinct_exercises: i32 = conn
        .query_row(
            "SELECT COUNT(DISTINCT exercise_id) FROM exercise_logs",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if distinct_exercises >= 5 {
        conn.execute(
            "UPDATE achievements SET unlocked_at = ? WHERE key = 'variety' AND unlocked_at IS NULL",
            params![today],
        )
        .map_err(|e| e.to_string())?;
    }

    // Century achievement (100 pushups in a day)
    let today_date = chrono::Local::now().format("%Y-%m-%d").to_string();
    let pushups_today: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(reps), 0) FROM exercise_logs el
             JOIN exercises e ON el.exercise_id = e.id
             WHERE e.name = 'Pushups' AND DATE(el.logged_at) = ?",
            params![today_date],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if pushups_today >= 100 {
        conn.execute(
            "UPDATE achievements SET unlocked_at = ? WHERE key = 'hundred_pushups' AND unlocked_at IS NULL",
            params![today],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn get_stats(state: State<DbState>) -> Result<UserStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Calculate totals from exercises
    let (total_xp, total_level, exercise_count): (i64, i32, i32) = conn
        .query_row(
            "SELECT COALESCE(SUM(total_xp), 0), COALESCE(SUM(current_level), 0), COUNT(*) FROM exercises",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap_or((0, 0, 0));

    // Get streak info
    let (current_streak, longest_streak, last_exercise_date): (i32, i32, Option<String>) = conn
        .query_row(
            "SELECT current_streak, longest_streak, last_exercise_date FROM user_stats WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap_or((0, 0, None));

    Ok(UserStats {
        total_xp,
        total_level,
        current_streak,
        longest_streak,
        last_exercise_date,
        exercise_count,
    })
}

#[tauri::command]
fn get_achievements(state: State<DbState>) -> Result<Vec<Achievement>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, key, name, description, icon, unlocked_at FROM achievements ORDER BY id",
        )
        .map_err(|e| e.to_string())?;

    let achievements = stmt
        .query_map([], |row| {
            Ok(Achievement {
                id: row.get(0)?,
                key: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                icon: row.get(4)?,
                unlocked_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(achievements)
}

#[tauri::command]
fn get_exercise_history(state: State<DbState>, days: i32) -> Result<Vec<ExerciseLog>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, exercise_id, reps, xp_earned, logged_at FROM exercise_logs
             WHERE logged_at >= datetime('now', 'localtime', ? || ' days') ORDER BY logged_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let days_param = format!("-{}", days);
    let logs = stmt
        .query_map([days_param], |row| {
            Ok(ExerciseLog {
                id: row.get(0)?,
                exercise_id: row.get(1)?,
                reps: row.get(2)?,
                xp_earned: row.get(3)?,
                logged_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(logs)
}

#[tauri::command]
fn get_settings(state: State<DbState>) -> Result<Settings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let get_setting = |key: &str, default: &str| -> String {
        conn.query_row(
            "SELECT value FROM settings WHERE key = ?",
            params![key],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| default.to_string())
    };

    let theme_mode_str = get_setting("theme_mode", "dark");
    Ok(Settings {
        reminder_enabled: get_setting("reminder_enabled", "true") == "true",
        reminder_interval_minutes: get_setting("reminder_interval_minutes", "120")
            .parse()
            .unwrap_or(120),
        sound_enabled: get_setting("sound_enabled", "true") == "true",
        daily_goal_xp: get_setting("daily_goal_xp", "500").parse().unwrap_or(500),
        theme_mode: Some(theme_mode_str),
    })
}

#[tauri::command]
fn update_setting(state: State<DbState>, key: String, value: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ============ Export/Import Data ============

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub exercises: Vec<Exercise>,
    pub exercise_logs: Vec<ExerciseLog>,
    pub user_stats: UserStats,
    pub achievements: Vec<Achievement>,
    pub settings: Settings,
}

#[tauri::command]
fn export_data(state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get all exercises
    let mut stmt = conn
        .prepare("SELECT id, name, xp_per_rep, COALESCE(total_xp, 0), COALESCE(current_level, 1), icon, created_at FROM exercises")
        .map_err(|e| e.to_string())?;
    let exercises: Vec<Exercise> = stmt
        .query_map([], |row| {
            Ok(Exercise {
                id: row.get(0)?,
                name: row.get(1)?,
                xp_per_rep: row.get(2)?,
                total_xp: row.get(3)?,
                current_level: row.get(4)?,
                icon: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Get all logs
    let mut stmt = conn
        .prepare("SELECT id, exercise_id, reps, xp_earned, logged_at FROM exercise_logs")
        .map_err(|e| e.to_string())?;
    let exercise_logs: Vec<ExerciseLog> = stmt
        .query_map([], |row| {
            Ok(ExerciseLog {
                id: row.get(0)?,
                exercise_id: row.get(1)?,
                reps: row.get(2)?,
                xp_earned: row.get(3)?,
                logged_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Get stats
    let (total_xp, total_level, exercise_count): (i64, i32, i32) = conn
        .query_row(
            "SELECT COALESCE(SUM(total_xp), 0), COALESCE(SUM(current_level), 0), COUNT(*) FROM exercises",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap_or((0, 0, 0));

    let (current_streak, longest_streak, last_exercise_date): (i32, i32, Option<String>) = conn
        .query_row(
            "SELECT current_streak, longest_streak, last_exercise_date FROM user_stats WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap_or((0, 0, None));

    let user_stats = UserStats {
        total_xp,
        total_level,
        current_streak,
        longest_streak,
        last_exercise_date,
        exercise_count,
    };

    // Get achievements
    let mut stmt = conn
        .prepare("SELECT id, key, name, description, icon, unlocked_at FROM achievements")
        .map_err(|e| e.to_string())?;
    let achievements: Vec<Achievement> = stmt
        .query_map([], |row| {
            Ok(Achievement {
                id: row.get(0)?,
                key: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                icon: row.get(4)?,
                unlocked_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Get settings
    let get_setting = |key: &str, default: &str| -> String {
        conn.query_row(
            "SELECT value FROM settings WHERE key = ?",
            params![key],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| default.to_string())
    };

    let settings = Settings {
        reminder_enabled: get_setting("reminder_enabled", "true") == "true",
        reminder_interval_minutes: get_setting("reminder_interval_minutes", "120")
            .parse()
            .unwrap_or(120),
        sound_enabled: get_setting("sound_enabled", "true") == "true",
        daily_goal_xp: get_setting("daily_goal_xp", "500").parse().unwrap_or(500),
        theme_mode: Some(get_setting("theme_mode", "dark")),
    };

    let export_data = ExportData {
        version: "1.0.0".to_string(),
        exported_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        exercises,
        exercise_logs,
        user_stats,
        achievements,
        settings,
    };

    serde_json::to_string_pretty(&export_data).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_data(state: State<DbState>, json_data: String) -> Result<(), String> {
    let data: ExportData =
        serde_json::from_str(&json_data).map_err(|e| format!("Invalid data format: {}", e))?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Clear existing data
    conn.execute_batch(
        "
        DELETE FROM exercise_logs;
        DELETE FROM exercises;
        UPDATE user_stats SET current_streak = 0, longest_streak = 0, last_exercise_date = NULL WHERE id = 1;
        UPDATE achievements SET unlocked_at = NULL;
        ",
    )
    .map_err(|e| e.to_string())?;

    // Import exercises
    for exercise in &data.exercises {
        conn.execute(
            "INSERT INTO exercises (id, name, xp_per_rep, total_xp, current_level, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                exercise.id,
                exercise.name,
                exercise.xp_per_rep,
                exercise.total_xp,
                exercise.current_level,
                exercise.icon,
                exercise.created_at
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    // Import exercise logs
    for log in &data.exercise_logs {
        conn.execute(
            "INSERT INTO exercise_logs (id, exercise_id, reps, xp_earned, logged_at) VALUES (?, ?, ?, ?, ?)",
            params![log.id, log.exercise_id, log.reps, log.xp_earned, log.logged_at],
        )
        .map_err(|e| e.to_string())?;
    }

    // Update user stats
    conn.execute(
        "UPDATE user_stats SET current_streak = ?, longest_streak = ?, last_exercise_date = ? WHERE id = 1",
        params![
            data.user_stats.current_streak,
            data.user_stats.longest_streak,
            data.user_stats.last_exercise_date
        ],
    )
    .map_err(|e| e.to_string())?;

    // Update achievements
    for achievement in &data.achievements {
        if achievement.unlocked_at.is_some() {
            conn.execute(
                "UPDATE achievements SET unlocked_at = ? WHERE key = ?",
                params![achievement.unlocked_at, achievement.key],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    // Update settings
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('reminder_enabled', ?)",
        params![data.settings.reminder_enabled.to_string()],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('reminder_interval_minutes', ?)",
        params![data.settings.reminder_interval_minutes.to_string()],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('sound_enabled', ?)",
        params![data.settings.sound_enabled.to_string()],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('daily_goal_xp', ?)",
        params![data.settings.daily_goal_xp.to_string()],
    )
    .map_err(|e| e.to_string())?;
    if let Some(theme_mode) = &data.settings.theme_mode {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('theme_mode', ?)",
            params![theme_mode],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn reset_all_data(state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "
        DELETE FROM exercise_logs;
        DELETE FROM exercises;
        UPDATE user_stats SET current_streak = 0, longest_streak = 0, last_exercise_date = NULL WHERE id = 1;
        UPDATE achievements SET unlocked_at = NULL;
        ",
    )
    .map_err(|e| e.to_string())?;

    // Re-seed default exercises - desk/office friendly, no equipment needed
    let default_exercises: Vec<(&str, i32, &str)> = vec![
        // Upper body
        ("Pushups", 10, "fitness_center"),
        ("Arm Circles", 3, "self_improvement"),
        // Core
        ("Sit-ups", 8, "self_improvement"),
        ("Crunches", 6, "self_improvement"),
        ("Plank (10 sec)", 5, "self_improvement"),
        ("Leg Raises", 8, "self_improvement"),
        ("Mountain Climbers", 10, "self_improvement"),
        // Lower body
        ("Squats", 8, "fitness_center"),
        ("Lunges", 10, "fitness_center"),
        ("Calf Raises", 4, "fitness_center"),
        ("Wall Sit (10 sec)", 4, "fitness_center"),
        ("Side Leg Raises", 6, "fitness_center"),
        ("Step-ups", 8, "fitness_center"),
        // Cardio
        ("Jumping Jacks", 6, "directions_run"),
        ("High Knees", 6, "directions_run"),
        ("Burpees", 15, "directions_run"),
        ("Stair Climbs", 10, "directions_run"),
        ("Marching in Place", 4, "directions_run"),
        // Stretches & Mobility (great for desk workers)
        ("Neck Stretches", 2, "accessibility"),
        ("Shoulder Shrugs", 3, "accessibility"),
        ("Wrist Circles", 2, "accessibility"),
        ("Toe Touches", 4, "accessibility"),
        ("Hip Circles", 3, "accessibility"),
        ("Torso Twists", 3, "accessibility"),
        ("Ankle Rotations", 2, "accessibility"),
        ("Cat-Cow Stretch", 3, "accessibility"),
        ("Chest Opener", 3, "accessibility"),
        ("Quad Stretch", 3, "accessibility"),
    ];

    for (name, xp, icon) in default_exercises {
        conn.execute(
            "INSERT INTO exercises (name, xp_per_rep, icon, total_xp, current_level) VALUES (?, ?, ?, 0, 1)",
            params![name, xp, icon],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ============ System Tray Setup ============

fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open = MenuItem::with_id(app, "open", "Open Dashboard", true, None::<&str>)?;
    let quick_log_window = MenuItem::with_id(
        app,
        "quick_log_window",
        "Quick Log... (Ctrl+Shift+Alt+G)",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", "Quit GeekFit", true, None::<&str>)?;

    // Quick Log submenu with popular exercises
    // Format: "log_{exercise_id}_{reps}" - we'll parse this in the event handler

    // Pushups submenu
    let pushups_5 = MenuItem::with_id(app, "log_1_5", "5 reps", true, None::<&str>)?;
    let pushups_10 = MenuItem::with_id(app, "log_1_10", "10 reps", true, None::<&str>)?;
    let pushups_20 = MenuItem::with_id(app, "log_1_20", "20 reps", true, None::<&str>)?;
    let pushups_menu = Submenu::with_items(
        app,
        "Pushups",
        true,
        &[&pushups_5, &pushups_10, &pushups_20],
    )?;

    // Squats submenu
    let squats_5 = MenuItem::with_id(app, "log_8_5", "5 reps", true, None::<&str>)?;
    let squats_10 = MenuItem::with_id(app, "log_8_10", "10 reps", true, None::<&str>)?;
    let squats_20 = MenuItem::with_id(app, "log_8_20", "20 reps", true, None::<&str>)?;
    let squats_menu =
        Submenu::with_items(app, "Squats", true, &[&squats_5, &squats_10, &squats_20])?;

    // Sit-ups submenu
    let situps_5 = MenuItem::with_id(app, "log_3_5", "5 reps", true, None::<&str>)?;
    let situps_10 = MenuItem::with_id(app, "log_3_10", "10 reps", true, None::<&str>)?;
    let situps_20 = MenuItem::with_id(app, "log_3_20", "20 reps", true, None::<&str>)?;
    let situps_menu =
        Submenu::with_items(app, "Sit-ups", true, &[&situps_5, &situps_10, &situps_20])?;

    // Jumping Jacks submenu
    let jj_10 = MenuItem::with_id(app, "log_14_10", "10 reps", true, None::<&str>)?;
    let jj_20 = MenuItem::with_id(app, "log_14_20", "20 reps", true, None::<&str>)?;
    let jj_50 = MenuItem::with_id(app, "log_14_50", "50 reps", true, None::<&str>)?;
    let jj_menu = Submenu::with_items(app, "Jumping Jacks", true, &[&jj_10, &jj_20, &jj_50])?;

    // Stretches submenu (quick desk stretches)
    let neck_5 = MenuItem::with_id(app, "log_19_5", "5 reps", true, None::<&str>)?;
    let neck_10 = MenuItem::with_id(app, "log_19_10", "10 reps", true, None::<&str>)?;
    let neck_menu = Submenu::with_items(app, "Neck Stretches", true, &[&neck_5, &neck_10])?;

    let wrist_5 = MenuItem::with_id(app, "log_21_5", "5 reps", true, None::<&str>)?;
    let wrist_10 = MenuItem::with_id(app, "log_21_10", "10 reps", true, None::<&str>)?;
    let wrist_menu = Submenu::with_items(app, "Wrist Circles", true, &[&wrist_5, &wrist_10])?;

    let shoulder_5 = MenuItem::with_id(app, "log_20_5", "5 reps", true, None::<&str>)?;
    let shoulder_10 = MenuItem::with_id(app, "log_20_10", "10 reps", true, None::<&str>)?;
    let shoulder_menu =
        Submenu::with_items(app, "Shoulder Shrugs", true, &[&shoulder_5, &shoulder_10])?;

    // Stretches parent submenu
    let stretches_menu = Submenu::with_items(
        app,
        "Stretches",
        true,
        &[&neck_menu, &wrist_menu, &shoulder_menu],
    )?;

    let separator1 = PredefinedMenuItem::separator(app)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let separator3 = PredefinedMenuItem::separator(app)?;

    // Main Quick Log submenu
    let quick_log_menu = Submenu::with_items(
        app,
        "Quick Log",
        true,
        &[
            &pushups_menu,
            &squats_menu,
            &situps_menu,
            &jj_menu,
            &separator1,
            &stretches_menu,
        ],
    )?;

    let menu = Menu::with_items(
        app,
        &[
            &open,
            &quick_log_window,
            &separator2,
            &quick_log_menu,
            &separator3,
            &quit,
        ],
    )?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("GeekFit - Stay fit while coding!")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let event_id = event.id.as_ref();

            // Handle quick log events (format: log_{exercise_id}_{reps})
            if event_id.starts_with("log_") {
                let parts: Vec<&str> = event_id.split('_').collect();
                if parts.len() == 3 {
                    if let (Ok(exercise_id), Ok(reps)) = (parts[1].parse::<i64>(), parts[2].parse::<i32>()) {
                        // Log the exercise using the database
                        if let Some(db_state) = app.try_state::<DbState>() {
                            if let Ok(conn) = db_state.0.lock() {
                                // Get exercise name for notification
                                let exercise_name: String = conn
                                    .query_row(
                                        "SELECT name FROM exercises WHERE id = ?",
                                        params![exercise_id],
                                        |row| row.get(0),
                                    )
                                    .unwrap_or_else(|_| "Exercise".to_string());

                                // Get exercise XP info
                                if let Ok((xp_per_rep, old_xp, old_level)) = conn.query_row::<(i32, i64, i32), _, _>(
                                    "SELECT xp_per_rep, COALESCE(total_xp, 0), COALESCE(current_level, 1) FROM exercises WHERE id = ?",
                                    params![exercise_id],
                                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                                ) {
                                    let xp_earned = xp_per_rep * reps;
                                    let new_xp = old_xp + xp_earned as i64;
                                    let new_level = level_from_xp(new_xp);
                                    let leveled_up = new_level > old_level;

                                    // Log the exercise
                                    let _ = conn.execute(
                                        "INSERT INTO exercise_logs (exercise_id, reps, xp_earned, logged_at) VALUES (?, ?, ?, datetime('now', 'localtime'))",
                                        params![exercise_id, reps, xp_earned],
                                    );

                                    // Update exercise XP and level
                                    let _ = conn.execute(
                                        "UPDATE exercises SET total_xp = ?, current_level = ? WHERE id = ?",
                                        params![new_xp, new_level, exercise_id],
                                    );

                                    // Update streak
                                    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
                                    let last_date: Option<String> = conn
                                        .query_row(
                                            "SELECT last_exercise_date FROM user_stats WHERE id = 1",
                                            [],
                                            |row| row.get(0),
                                        )
                                        .unwrap_or(None);

                                    let (current_streak, longest_streak): (i32, i32) = conn
                                        .query_row(
                                            "SELECT current_streak, longest_streak FROM user_stats WHERE id = 1",
                                            [],
                                            |row| Ok((row.get(0)?, row.get(1)?)),
                                        )
                                        .unwrap_or((0, 0));

                                    let new_streak = match &last_date {
                                        Some(date) => {
                                            if date == &today {
                                                current_streak
                                            } else {
                                                let yesterday = (chrono::Local::now() - chrono::Duration::days(1))
                                                    .format("%Y-%m-%d")
                                                    .to_string();
                                                if date == &yesterday {
                                                    current_streak + 1
                                                } else {
                                                    1
                                                }
                                            }
                                        }
                                        None => 1,
                                    };
                                    let new_longest = std::cmp::max(new_streak, longest_streak);

                                    let _ = conn.execute(
                                        "UPDATE user_stats SET current_streak = ?, longest_streak = ?, last_exercise_date = ? WHERE id = 1",
                                        params![new_streak, new_longest, today],
                                    );

                                    // Send notification
                                    let title = if leveled_up {
                                        format!("Level Up! {} is now Lv{}", exercise_name, new_level)
                                    } else {
                                        format!("Logged {} x {}", exercise_name, reps)
                                    };
                                    let body = format!("+{} XP | Streak: {} days", xp_earned, new_streak);

                                    // Emit event to frontend to refresh stats
                                    let _ = app.emit("exercise-logged", ());

                                    // Show system notification
                                    use tauri_plugin_notification::NotificationExt;
                                    let _ = app.notification()
                                        .builder()
                                        .title(&title)
                                        .body(&body)
                                        .show();
                                }
                            }
                        }
                    }
                }
                return;
            }

            // Handle other menu events
            match event_id {
                "open" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quick_log_window" => {
                    // Emit event to frontend to open quick log dialog
                    let _ = app.emit("global-quick-log", ());
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

// ============ Global Shortcut Setup ============

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn setup_global_shortcuts(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_global_shortcut::{
        Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
    };

    // Register Ctrl+Shift+Alt+G for quick log
    let shortcut = Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::SHIFT | Modifiers::ALT),
        Code::KeyG,
    );

    // First try to unregister in case it was previously registered
    let _ = app.global_shortcut().unregister(shortcut);

    // Register the shortcut with explicit state handling
    match app
        .global_shortcut()
        .on_shortcut(shortcut, |app, _shortcut, event| {
            // Only trigger on key press, not release
            if event.state == ShortcutState::Pressed {
                log::info!("Global shortcut Ctrl+Shift+Alt+G triggered");

                // Show and focus the window (unminimize if needed)
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.show();
                    let _ = window.set_focus();
                }

                // Emit event to frontend to open quick log
                if let Err(e) = app.emit("global-quick-log", ()) {
                    log::error!("Failed to emit global-quick-log event: {}", e);
                }
            }
        }) {
        Ok(_) => {
            log::info!("Successfully registered global shortcut Ctrl+Shift+Alt+G");
        }
        Err(e) => {
            log::error!("Failed to register global shortcut Ctrl+Shift+Alt+G: {}", e);
        }
    }

    Ok(())
}

// ============ App Entry Point ============

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build());

    // Add logging in debug mode
    if cfg!(debug_assertions) {
        builder = builder.plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Debug)
                .build(),
        );
    }

    builder
        .setup(|app| {
            // Initialize database
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;
            let db_path = app_dir.join("geekfit.db");

            let conn = Connection::open(db_path).expect("Failed to open database");
            init_database(&conn).expect("Failed to initialize database");

            app.manage(DbState(Mutex::new(conn)));

            // Setup system tray
            setup_tray(app.handle())?;

            // Setup global shortcuts (desktop only)
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            setup_global_shortcuts(app.handle())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_exercises,
            add_exercise,
            delete_exercise,
            log_exercise,
            get_stats,
            get_achievements,
            get_exercise_history,
            get_settings,
            update_setting,
            export_data,
            import_data,
            reset_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ============ Tests ============

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xp_for_level_1() {
        assert_eq!(xp_for_level(1), 0);
    }

    #[test]
    fn test_xp_for_level_2() {
        // Level 2 should require some XP
        let xp = xp_for_level(2);
        assert!(xp > 0);
        assert!(xp < 100); // Should be relatively small
    }

    #[test]
    fn test_xp_increases_with_level() {
        // XP requirements should increase with each level
        for level in 2..99 {
            assert!(
                xp_for_level(level + 1) > xp_for_level(level),
                "XP for level {} should be greater than level {}",
                level + 1,
                level
            );
        }
    }

    #[test]
    fn test_xp_for_level_99() {
        // Level 99 should require significant XP (RuneScape style)
        let xp = xp_for_level(99);
        assert!(xp > 10_000_000, "Level 99 should require over 10M XP");
    }

    #[test]
    fn test_level_from_xp_zero() {
        assert_eq!(level_from_xp(0), 1);
    }

    #[test]
    fn test_level_from_xp_basic() {
        // With 0 XP, should be level 1
        assert_eq!(level_from_xp(0), 1);

        // With some XP, should level up
        let xp_for_2 = xp_for_level(2);
        assert_eq!(level_from_xp(xp_for_2), 2);
        assert_eq!(level_from_xp(xp_for_2 - 1), 1);
    }

    #[test]
    fn test_level_from_xp_max() {
        // Even with huge XP, max level is 99
        assert_eq!(level_from_xp(100_000_000), 99);
        assert_eq!(level_from_xp(i64::MAX / 2), 99);
    }

    #[test]
    fn test_level_xp_roundtrip() {
        // For each level, getting XP for that level and converting back should give same level
        for level in 1..=99 {
            let xp = xp_for_level(level);
            assert_eq!(
                level_from_xp(xp),
                level,
                "XP {} should give level {}",
                xp,
                level
            );
        }
    }

    #[test]
    fn test_database_initialization() {
        // Test that database initializes without error
        let conn = Connection::open_in_memory().unwrap();
        assert!(init_database(&conn).is_ok());
    }

    #[test]
    fn test_default_exercises_created() {
        let conn = Connection::open_in_memory().unwrap();
        init_database(&conn).unwrap();

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM exercises", [], |row| row.get(0))
            .unwrap();

        // Should have default exercises
        assert!(
            count > 20,
            "Should have at least 20 default exercises, got {}",
            count
        );
    }

    #[test]
    fn test_default_achievements_created() {
        let conn = Connection::open_in_memory().unwrap();
        init_database(&conn).unwrap();

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM achievements", [], |row| row.get(0))
            .unwrap();

        // Should have achievements
        assert!(
            count >= 9,
            "Should have at least 9 achievements, got {}",
            count
        );
    }

    #[test]
    fn test_user_stats_initialized() {
        let conn = Connection::open_in_memory().unwrap();
        init_database(&conn).unwrap();

        let (streak, longest): (i32, i32) = conn
            .query_row(
                "SELECT current_streak, longest_streak FROM user_stats WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();

        assert_eq!(streak, 0);
        assert_eq!(longest, 0);
    }

    #[test]
    fn test_settings_initialized() {
        let conn = Connection::open_in_memory().unwrap();
        init_database(&conn).unwrap();

        let reminder: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'reminder_enabled'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(reminder, "true");
    }
}
