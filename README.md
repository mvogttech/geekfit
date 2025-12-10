# Geekfit

A lightweight, cross-platform gamified fitness tracker for programmers. Stay fit while you code!

```
   ____           _    __ _ _
  / ___| ___  ___| | _/ _(_) |_
 | |  _ / _ \/ _ \ |/ / |_| | __|
 | |_| |  __/  __/   <|  _| | |_
  \____|\___|\___|_|\_\_| |_|\__|

  [===========O===========]  <- Your fitness dumbbell!
```

## Features

- **Modern GUI**: Clean, dark-themed interface with dashboard, exercises, badges, history, and settings tabs
- **System Tray Integration**: Runs silently in your system tray (or menu bar on macOS) with quick access menu
- **Smart Reminders**: Configurable exercise reminders during work hours with random or fixed intervals
- **Gamification**:
  - Points for each completed exercise
  - 6 levels from "Newbie Coder" to "CTO"
  - 10 achievement badges to unlock
  - Streak tracking for consistency
- **5 Exercise Types**: Push-ups, Squats, Planks, Jumping Jacks, Stretches
- **Cross-Platform**: Windows, macOS, and Linux support
- **Desktop Notifications**: Native notifications for reminders and achievements
- **Persistent Progress**: All data saved locally in JSON format

## Screenshots

The app features a modern dark-themed GUI:

- **Dashboard**: View your level, points, streak, and today's progress
- **Exercises**: Log exercises with one click, view lifetime stats
- **Badges**: Track your achievement progress
- **History**: Browse your exercise history by day
- **Settings**: Configure reminders, work hours, active days, and enabled exercises

## Quick Start

### Prerequisites

- Rust 1.70 or later
- On Linux: `libappindicator3-dev`, `libnotify-dev`, and OpenGL libraries

### Build & Run

```bash
# Clone or navigate to the project
cd geekfit

# Build in release mode (optimized, smaller binary)
cargo build --release

# Run the application
cargo run --release

# Or run the built binary directly
./target/release/geekfit      # Linux/macOS
.\target\release\geekfit.exe  # Windows
```

### Development

```bash
# Build in debug mode
cargo build

# Run with verbose logging
RUST_LOG=debug cargo run

# Run tests
cargo test
```

## Usage

1. **Launch**: Run the application - it starts with a system tray icon
2. **Tray Icon**: Right-click the tray icon to access the menu:
   - **View Progress**: Opens the main GUI window
   - **Log Exercise**: Quick-log an exercise from the submenu
   - **Reminders Enabled**: Toggle exercise reminders on/off
   - **Settings**: Opens the GUI with settings tab
   - **About**: Shows app information
   - **Quit**: Exit the application
3. **GUI Window**: Click "View Progress" or "Settings" to open the main window with:
   - Dashboard with level progress and stats
   - Exercise logging with confirmation
   - Badge collection view
   - Exercise history
   - Full settings configuration

## Configuration

Configuration is stored in a TOML file at:
- **Windows**: `%APPDATA%\geekfit\config.toml`
- **macOS**: `~/Library/Application Support/geekfit/config.toml`
- **Linux**: `~/.config/geekfit/config.toml`

### Default Configuration

```toml
[general]
start_minimized = true
launch_on_startup = false
log_level = "info"

[reminders]
min_interval_minutes = 60
max_interval_minutes = 120
use_random_intervals = true
work_start_hour = 9
work_end_hour = 17
active_days = [1, 2, 3, 4, 5]  # Monday-Friday
enabled = true

[exercises]
enabled_exercises = ["PushUps", "Squats", "Planks"]

[notifications]
enabled = true
play_sound = true
timeout_seconds = 10
```

You can also configure all settings through the GUI Settings tab.

## Data Storage

Progress data is stored as JSON at:
- **Windows**: `%APPDATA%\geekfit\progress.json`
- **macOS**: `~/Library/Application Support/geekfit/progress.json`
- **Linux**: `~/.local/share/geekfit/progress.json`

## Levels & Points

| Level | Title | Points Required |
|-------|-------|-----------------|
| 1 | Newbie Coder | 0 |
| 2 | Junior Dev | 101 |
| 3 | Mid-Level Engineer | 501 |
| 4 | Senior Dev | 1,501 |
| 5 | Tech Lead | 5,001 |
| 6 | CTO | 15,001 |

### Points per Exercise

| Exercise | Default Reps | Points |
|----------|--------------|--------|
| Push-ups | 10 | 10 |
| Squats | 15 | 10 |
| Planks | 1 | 15 |
| Jumping Jacks | 20 | 8 |
| Stretches | 5 | 5 |

## Badges

| Badge | Description |
|-------|-------------|
| First Commit | Complete your first exercise |
| Weekend Warrior | Exercise on a weekend |
| Marathon Coder | 7-day exercise streak |
| Century Club | 100 total exercises |
| Early Bird | Exercise before 9 AM |
| Night Owl | Exercise after 9 PM |
| Diversified Portfolio | Complete all exercise types |
| Consistent Shipper | 30-day streak |
| 1K Push-ups Club | 1000 total push-ups |
| Iron Will | 100 plank sessions |

## Platform Notes

### Windows
- Notifications use Windows Toast notifications
- System tray icon appears in the notification area
- GUI uses native Windows rendering

### macOS
- Notifications use Notification Center
- Icon appears in the menu bar
- GUI uses native macOS rendering

### Linux
- Requires `libappindicator3` for system tray
- Requires a notification daemon (e.g., `dunst`, GNOME, KDE)
- GUI requires OpenGL support
- Install dependencies:
  ```bash
  # Debian/Ubuntu
  sudo apt install libappindicator3-dev libnotify-dev libxcb-render0-dev libxcb-shape0-dev libxcb-xfixes0-dev

  # Fedora
  sudo dnf install libappindicator-gtk3-devel libnotify-devel

  # Arch
  sudo pacman -S libappindicator-gtk3 libnotify
  ```

## Project Structure

```
geekfit/
├── Cargo.toml          # Dependencies and build config
├── README.md           # This file
└── src/
    ├── main.rs         # Entry point and event loop
    ├── config.rs       # TOML configuration management
    ├── gui.rs          # egui-based graphical interface
    ├── models.rs       # Data models (exercises, levels, badges)
    ├── notifications.rs # Cross-platform notifications
    ├── scheduler.rs    # Background reminder timer
    ├── storage.rs      # JSON data persistence
    └── tray.rs         # System tray integration
```

## Dependencies

| Crate | Purpose |
|-------|---------|
| `eframe` / `egui` | Cross-platform GUI framework |
| `tray-icon` | Cross-platform system tray |
| `muda` | Menu bar and context menus |
| `notify-rust` | Desktop notifications |
| `serde` + `serde_json` | Data serialization |
| `toml` | Configuration file parsing |
| `chrono` | Date/time handling |
| `dirs` | Cross-platform directories |
| `rand` | Random interval generation |
| `log` + `env_logger` | Logging |
| `thiserror` + `anyhow` | Error handling |
| `image` | Icon handling |

## License

MIT License - feel free to use and modify!

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`cargo test`)
5. Submit a pull request

---

*Stay fit, write great code!*
