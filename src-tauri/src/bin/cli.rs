// GeekFit CLI - Terminal interface for logging exercises
// For terminal lovers who want to log without leaving their flow

use clap::{Parser, Subcommand};
use colored::*;
use rusqlite::{params, Connection};
use std::path::PathBuf;

/// GeekFit CLI - Gamified fitness tracker for your terminal
#[derive(Parser)]
#[command(name = "geekfit")]
#[command(author = "GeekFit")]
#[command(version = "1.0.0")]
#[command(about = "Log exercises and track your fitness progress from the terminal", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Log an exercise (e.g., geekfit log pushups 20)
    Log {
        /// Exercise name (case-insensitive, partial match supported)
        exercise: String,
        /// Number of reps
        reps: i32,
    },
    /// Show your current stats
    Stats,
    /// List all exercises with levels
    List,
    /// Show recent exercise history
    History {
        /// Number of days to show (default: 7)
        #[arg(short, long, default_value = "7")]
        days: i32,
    },
    /// Quick log with fuzzy exercise matching
    Quick {
        /// Search term for exercise
        search: String,
    },
    /// Show today's progress
    Today,
    /// Show achievements
    Achievements,
}

// XP calculation (same as main app)
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

fn get_db_path() -> PathBuf {
    // Use the same data directory as Tauri app
    let app_dir = if cfg!(target_os = "windows") {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("com.geekfit.app")
    } else if cfg!(target_os = "macos") {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("com.geekfit.app")
    } else {
        // Linux
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("com.geekfit.app")
    };

    app_dir.join("geekfit.db")
}

fn open_database() -> Result<Connection, String> {
    let db_path = get_db_path();

    if !db_path.exists() {
        return Err(format!(
            "Database not found at {:?}\nMake sure you've run the GeekFit app at least once.",
            db_path
        ));
    }

    Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))
}

fn find_exercise(conn: &Connection, search: &str) -> Result<(i64, String, i32), String> {
    let search_lower = search.to_lowercase();

    // Try exact match first
    let result: Result<(i64, String, i32), _> = conn.query_row(
        "SELECT id, name, xp_per_rep FROM exercises WHERE LOWER(name) = ?",
        params![search_lower],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    );

    if let Ok(exercise) = result {
        return Ok(exercise);
    }

    // Try partial match
    let pattern = format!("%{}%", search_lower);
    let result: Result<(i64, String, i32), _> = conn.query_row(
        "SELECT id, name, xp_per_rep FROM exercises WHERE LOWER(name) LIKE ? LIMIT 1",
        params![pattern],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    );

    match result {
        Ok(exercise) => Ok(exercise),
        Err(_) => Err(format!("No exercise found matching '{}'", search)),
    }
}

fn log_exercise(
    conn: &Connection,
    exercise_id: i64,
    reps: i32,
) -> Result<(i32, i32, bool), String> {
    // Get current exercise stats
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

    // Log the exercise
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

    Ok((xp_earned, new_level, leveled_up))
}

fn print_level_bar(level: i32, xp: i64) -> String {
    let xp_for_current = xp_for_level(level);
    let xp_for_next = xp_for_level(level + 1);
    let progress = if level >= 99 {
        1.0
    } else {
        (xp - xp_for_current) as f64 / (xp_for_next - xp_for_current) as f64
    };

    let bar_width = 20;
    let filled = (progress * bar_width as f64) as usize;
    let empty = bar_width - filled;

    format!(
        "[{}{}] {:>3}%",
        "=".repeat(filled).green(),
        " ".repeat(empty),
        (progress * 100.0) as i32
    )
}

fn format_xp(xp: i64) -> String {
    if xp >= 1_000_000 {
        format!("{:.1}M", xp as f64 / 1_000_000.0)
    } else if xp >= 1000 {
        format!("{:.1}K", xp as f64 / 1000.0)
    } else {
        format!("{}", xp)
    }
}

fn get_title_for_level(level: i32) -> &'static str {
    match level {
        0..=4 => "Novice Geek",
        5..=9 => "Fitness Apprentice",
        10..=19 => "Gym Initiate",
        20..=29 => "Strength Seeker",
        30..=39 => "Endurance Elite",
        40..=49 => "Fitness Warrior",
        _ => "Legendary Geek",
    }
}

fn cmd_log(exercise: &str, reps: i32) {
    let conn = match open_database() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{} {}", "Error:".red().bold(), e);
            std::process::exit(1);
        }
    };

    let (exercise_id, exercise_name, _xp_per_rep) = match find_exercise(&conn, exercise) {
        Ok(e) => e,
        Err(e) => {
            eprintln!("{} {}", "Error:".red().bold(), e);
            eprintln!(
                "\nUse {} to see available exercises.",
                "geekfit list".cyan()
            );
            std::process::exit(1);
        }
    };

    match log_exercise(&conn, exercise_id, reps) {
        Ok((xp_earned, new_level, leveled_up)) => {
            println!();
            println!(
                "{}  {} {} x {}",
                "+".green().bold(),
                "Logged".green().bold(),
                exercise_name.white().bold(),
                reps.to_string().cyan()
            );
            println!(
                "   {} {} XP",
                "+".yellow(),
                xp_earned.to_string().yellow().bold()
            );

            if leveled_up {
                println!();
                println!(
                    "   {} {} is now level {}!",
                    "LEVEL UP!".magenta().bold(),
                    exercise_name.white(),
                    new_level.to_string().magenta().bold()
                );
            }
            println!();
        }
        Err(e) => {
            eprintln!("{} Failed to log exercise: {}", "Error:".red().bold(), e);
            std::process::exit(1);
        }
    }
}

fn cmd_stats() {
    let conn = match open_database() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{} {}", "Error:".red().bold(), e);
            std::process::exit(1);
        }
    };

    // Get totals
    let (total_xp, total_level, exercise_count): (i64, i32, i32) = conn
        .query_row(
            "SELECT COALESCE(SUM(total_xp), 0), COALESCE(SUM(current_level), 0), COUNT(*) FROM exercises",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap_or((0, 0, 0));

    let (current_streak, longest_streak): (i32, i32) = conn
        .query_row(
            "SELECT current_streak, longest_streak FROM user_stats WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or((0, 0));

    let title = get_title_for_level(total_level / exercise_count.max(1));

    println!();
    println!("{}", " GEEKFIT STATS ".on_blue().white().bold());
    println!();
    println!("  {}  {}", "Title:".dimmed(), title.cyan().bold());
    println!(
        "  {}  {}",
        "Total Level:".dimmed(),
        total_level.to_string().green().bold()
    );
    println!(
        "  {}  {}",
        "Total XP:".dimmed(),
        format_xp(total_xp).yellow().bold()
    );
    println!(
        "  {}  {}",
        "Skills:".dimmed(),
        format!("{} exercises tracked", exercise_count).white()
    );
    println!();
    println!(
        "  {}  {} days",
        "Current Streak:".dimmed(),
        current_streak.to_string().magenta().bold()
    );
    println!(
        "  {}  {} days",
        "Longest Streak:".dimmed(),
        longest_streak.to_string().white()
    );
    println!();
}

fn cmd_list() {
    let conn = match open_database() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{} {}", "Error:".red().bold(), e);
            std::process::exit(1);
        }
    };

    let mut stmt = conn
        .prepare(
            "SELECT name, xp_per_rep, COALESCE(total_xp, 0), COALESCE(current_level, 1)
             FROM exercises ORDER BY current_level DESC, total_xp DESC",
        )
        .expect("Failed to prepare statement");

    let exercises: Vec<(String, i32, i64, i32)> = stmt
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })
        .expect("Failed to query exercises")
        .filter_map(|r| r.ok())
        .collect();

    println!();
    println!("{}", " EXERCISES ".on_green().black().bold());
    println!();
    println!(
        "  {:<22} {:>5} {:>6} {:>8}  {}",
        "Name".dimmed(),
        "Level".dimmed(),
        "XP/Rep".dimmed(),
        "Total XP".dimmed(),
        "Progress".dimmed()
    );
    println!("  {}", "-".repeat(70).dimmed());

    for (name, xp_per_rep, total_xp, level) in exercises {
        let level_str = format!("Lv{}", level);
        let level_colored = if level >= 50 {
            level_str.magenta().bold()
        } else if level >= 25 {
            level_str.yellow()
        } else if level >= 10 {
            level_str.cyan()
        } else {
            level_str.white()
        };

        println!(
            "  {:<22} {:>5} {:>6} {:>8}  {}",
            name.white(),
            level_colored,
            xp_per_rep.to_string().dimmed(),
            format_xp(total_xp).yellow(),
            print_level_bar(level, total_xp)
        );
    }
    println!();
}

fn cmd_history(days: i32) {
    let conn = match open_database() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{} {}", "Error:".red().bold(), e);
            std::process::exit(1);
        }
    };

    let days_param = format!("-{}", days);
    let mut stmt = conn
        .prepare(
            "SELECT e.name, el.reps, el.xp_earned, el.logged_at
             FROM exercise_logs el
             JOIN exercises e ON el.exercise_id = e.id
             WHERE el.logged_at >= datetime('now', 'localtime', ? || ' days')
             ORDER BY el.logged_at DESC
             LIMIT 50",
        )
        .expect("Failed to prepare statement");

    let logs: Vec<(String, i32, i32, String)> = stmt
        .query_map([days_param], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })
        .expect("Failed to query logs")
        .filter_map(|r| r.ok())
        .collect();

    println!();
    println!(
        "{}",
        format!(" LAST {} DAYS ", days).on_yellow().black().bold()
    );
    println!();

    if logs.is_empty() {
        println!(
            "  {} No exercises logged in the last {} days.",
            "!".yellow(),
            days
        );
        println!(
            "  Use {} to log an exercise.",
            "geekfit log <exercise> <reps>".cyan()
        );
    } else {
        println!(
            "  {:<20} {:>6} {:>8} {}",
            "Exercise".dimmed(),
            "Reps".dimmed(),
            "XP".dimmed(),
            "When".dimmed()
        );
        println!("  {}", "-".repeat(55).dimmed());

        for (name, reps, xp, logged_at) in logs {
            // Parse and format date
            let date_str = if let Ok(parsed) =
                chrono::NaiveDateTime::parse_from_str(&logged_at, "%Y-%m-%d %H:%M:%S")
            {
                let now = chrono::Local::now().naive_local();
                let diff = now.date() - parsed.date();

                if diff.num_days() == 0 {
                    format!("Today {}", parsed.format("%H:%M"))
                } else if diff.num_days() == 1 {
                    format!("Yesterday {}", parsed.format("%H:%M"))
                } else {
                    parsed.format("%b %d %H:%M").to_string()
                }
            } else {
                logged_at
            };

            println!(
                "  {:<20} {:>6} {:>8} {}",
                name.white(),
                reps.to_string().cyan(),
                format!("+{}", xp).yellow(),
                date_str.dimmed()
            );
        }
    }
    println!();
}

fn cmd_today() {
    let conn = match open_database() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{} {}", "Error:".red().bold(), e);
            std::process::exit(1);
        }
    };

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    // Get today's XP
    let today_xp: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(xp_earned), 0) FROM exercise_logs WHERE DATE(logged_at) = ?",
            params![today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Get daily goal
    let daily_goal: i64 = conn
        .query_row(
            "SELECT COALESCE(value, '500') FROM settings WHERE key = 'daily_goal_xp'",
            [],
            |row| {
                let val: String = row.get(0)?;
                Ok(val.parse::<i64>().unwrap_or(500))
            },
        )
        .unwrap_or(500);

    // Get today's exercises
    let mut stmt = conn
        .prepare(
            "SELECT e.name, SUM(el.reps), SUM(el.xp_earned)
             FROM exercise_logs el
             JOIN exercises e ON el.exercise_id = e.id
             WHERE DATE(el.logged_at) = ?
             GROUP BY e.name
             ORDER BY SUM(el.xp_earned) DESC",
        )
        .expect("Failed to prepare statement");

    let exercises: Vec<(String, i32, i32)> = stmt
        .query_map([&today], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .expect("Failed to query")
        .filter_map(|r| r.ok())
        .collect();

    let progress = (today_xp as f64 / daily_goal as f64).min(1.0);
    let bar_width = 30;
    let filled = (progress * bar_width as f64) as usize;
    let empty = bar_width - filled;

    println!();
    println!("{}", " TODAY'S PROGRESS ".on_cyan().black().bold());
    println!();

    let bar_char = if progress >= 1.0 {
        "=".green()
    } else {
        "=".yellow()
    };
    let progress_bar = format!(
        "  [{}{}] {} / {} XP",
        bar_char.to_string().repeat(filled),
        " ".repeat(empty),
        format_xp(today_xp).yellow().bold(),
        format_xp(daily_goal)
    );
    println!("{}", progress_bar);

    if progress >= 1.0 {
        println!("  {} Daily goal achieved!", "***".green().bold());
    } else {
        println!(
            "  {} {} XP to go",
            "->".dimmed(),
            format_xp(daily_goal - today_xp)
        );
    }

    if !exercises.is_empty() {
        println!();
        println!("  {}", "Today's activities:".dimmed());
        for (name, reps, xp) in exercises {
            println!(
                "    {} {} x {} ({} XP)",
                "+".green(),
                name.white(),
                reps.to_string().cyan(),
                xp.to_string().yellow()
            );
        }
    } else {
        println!();
        println!("  {} No exercises logged today yet.", "!".yellow());
    }
    println!();
}

fn cmd_quick(search: &str) {
    let conn = match open_database() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{} {}", "Error:".red().bold(), e);
            std::process::exit(1);
        }
    };

    let pattern = format!("%{}%", search.to_lowercase());
    let mut stmt = conn
        .prepare(
            "SELECT name, xp_per_rep, COALESCE(current_level, 1)
             FROM exercises
             WHERE LOWER(name) LIKE ?
             ORDER BY current_level DESC
             LIMIT 10",
        )
        .expect("Failed to prepare statement");

    let exercises: Vec<(String, i32, i32)> = stmt
        .query_map([&pattern], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .expect("Failed to query")
        .filter_map(|r| r.ok())
        .collect();

    println!();
    if exercises.is_empty() {
        println!("{} No exercises found matching '{}'", "!".yellow(), search);
    } else {
        println!(
            "{} exercises matching '{}':",
            exercises.len().to_string().green(),
            search.cyan()
        );
        println!();
        for (i, (name, xp_per_rep, level)) in exercises.iter().enumerate() {
            println!(
                "  {}. {} (Lv{}, {} XP/rep)",
                (i + 1).to_string().dimmed(),
                name.white().bold(),
                level.to_string().cyan(),
                xp_per_rep.to_string().yellow()
            );
        }
        println!();
        println!(
            "Log with: {}",
            format!("geekfit log \"{}\" <reps>", exercises[0].0).cyan()
        );
    }
    println!();
}

fn cmd_achievements() {
    let conn = match open_database() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{} {}", "Error:".red().bold(), e);
            std::process::exit(1);
        }
    };

    let mut stmt = conn
        .prepare("SELECT name, description, unlocked_at FROM achievements ORDER BY unlocked_at IS NULL, id")
        .expect("Failed to prepare statement");

    let achievements: Vec<(String, Option<String>, Option<String>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .expect("Failed to query")
        .filter_map(|r| r.ok())
        .collect();

    let unlocked_count = achievements.iter().filter(|(_, _, u)| u.is_some()).count();

    println!();
    println!("{}", " ACHIEVEMENTS ".on_magenta().white().bold());
    println!();
    println!(
        "  {} / {} unlocked",
        unlocked_count.to_string().green().bold(),
        achievements.len()
    );
    println!();

    for (name, description, unlocked_at) in achievements {
        let icon = if unlocked_at.is_some() {
            "***".green()
        } else {
            "[ ]".dimmed()
        };

        let name_colored = if unlocked_at.is_some() {
            name.yellow().bold()
        } else {
            name.dimmed()
        };

        let desc = description.unwrap_or_default();
        let desc_colored = if unlocked_at.is_some() {
            desc.white()
        } else {
            desc.dimmed()
        };

        println!("  {} {} - {}", icon, name_colored, desc_colored);
    }
    println!();
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Log { exercise, reps } => cmd_log(&exercise, reps),
        Commands::Stats => cmd_stats(),
        Commands::List => cmd_list(),
        Commands::History { days } => cmd_history(days),
        Commands::Today => cmd_today(),
        Commands::Quick { search } => cmd_quick(&search),
        Commands::Achievements => cmd_achievements(),
    }
}
