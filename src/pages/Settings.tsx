import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Fade,
  Tooltip,
  useMediaQuery,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import NotificationsIcon from "@mui/icons-material/Notifications";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import PaletteIcon from "@mui/icons-material/Palette";
import LanguageIcon from "@mui/icons-material/Language";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import BugReportIcon from "@mui/icons-material/BugReport";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import GitHubIcon from "@mui/icons-material/GitHub";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { version } from "../../package.json";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useUser } from "../contexts/UserContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLocale } from "../contexts/LocaleContext";
import { useOnboarding } from "../components/Onboarding";
import { ThemeId } from "../themes";
import {
  playReminderSound,
  playLevelUpSound,
  playAchievementSound,
  playXpSound,
} from "../utils/sounds";

export default function Settings() {
  const { settings, updateSettings, refreshStats } = useUser();
  const { themeId, setTheme, availableThemes } = useTheme();
  const { locale, setLocale, supportedLocales } = useLocale();
  const { resetOnboarding } = useOnboarding();
  const isWideScreen = useMediaQuery("(min-width:900px)");

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reminderEnabled = settings?.reminder_enabled ?? true;
  const reminderInterval = settings?.reminder_interval_minutes ?? 120;
  const soundEnabled = settings?.sound_enabled ?? true;
  const dailyGoal = settings?.daily_goal_xp ?? 500;

  const showSaved = () => {
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  };

  const handleReminderToggle = async () => {
    await updateSettings("reminder_enabled", String(!reminderEnabled));
    showSaved();
  };

  const handleSoundToggle = async () => {
    await updateSettings("sound_enabled", String(!soundEnabled));
    showSaved();
  };

  const handleIntervalChange = async (_: Event, value: number | number[]) => {
    const interval = Array.isArray(value) ? value[0] : value;
    await updateSettings("reminder_interval_minutes", String(interval));
    showSaved();
  };

  const handleIntervalInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Math.min(240, Math.max(15, parseInt(e.target.value) || 30));
    await updateSettings("reminder_interval_minutes", String(value));
    showSaved();
  };

  const handleGoalChange = async (_: Event, value: number | number[]) => {
    const goal = Array.isArray(value) ? value[0] : value;
    await updateSettings("daily_goal_xp", String(goal));
    showSaved();
  };

  const handleGoalInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Math.min(5000, Math.max(50, parseInt(e.target.value) || 500));
    await updateSettings("daily_goal_xp", String(value));
    showSaved();
  };

  const handlePresetInterval = async (minutes: number) => {
    await updateSettings("reminder_interval_minutes", String(minutes));
    showSaved();
  };

  const handlePresetGoal = async (xp: number) => {
    await updateSettings("daily_goal_xp", String(xp));
    showSaved();
  };

  const handleThemeChange = (newThemeId: ThemeId) => {
    setTheme(newThemeId);
    showSaved();
  };

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale as any);
    showSaved();
  };

  const handleTestNotification = async () => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }

      if (permissionGranted) {
        sendNotification({
          title: "GeekFit Reminder",
          body: "Time for a quick exercise break! Your body will thank you.",
        });
        if (soundEnabled) {
          playReminderSound();
        }
        setSnackbar({
          open: true,
          message: "Test notification sent!",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: "Notification permission denied",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Failed to send test notification:", error);
      setSnackbar({
        open: true,
        message: "Failed to send notification",
        severity: "error",
      });
    }
  };

  const handleTestNotificationType = async (type: string) => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }

      if (!permissionGranted) {
        setSnackbar({
          open: true,
          message: "Notification permission denied",
          severity: "error",
        });
        return;
      }

      const notifications: Record<string, { title: string; body: string; sound: () => void }> = {
        exercise: {
          title: "Exercise Reminder",
          body: "Time for a quick exercise break! Your body will thank you.",
          sound: playReminderSound,
        },
        eyeCare: {
          title: "Eye Care - 20-20-20 Rule",
          body: "Look at something 20 feet away for 20 seconds. Your eyes need a break!",
          sound: playReminderSound,
        },
        hydration: {
          title: "Hydration Reminder",
          body: "Time to drink some water! Stay hydrated for better focus.",
          sound: playReminderSound,
        },
        posture: {
          title: "Posture Check",
          body: "Sit up straight! Good posture prevents back pain and improves energy.",
          sound: playReminderSound,
        },
        levelUp: {
          title: "Level Up!",
          body: "Congratulations! Pushups reached Level 15! Keep up the great work!",
          sound: playLevelUpSound,
        },
        achievement: {
          title: "Achievement Unlocked!",
          body: "You've earned 'Dedicated' - Maintain a 7-day exercise streak!",
          sound: playAchievementSound,
        },
      };

      const notification = notifications[type];
      if (notification) {
        sendNotification({
          title: notification.title,
          body: notification.body,
        });
        if (soundEnabled) {
          notification.sound();
        }
        setSnackbar({
          open: true,
          message: `${notification.title} notification sent!`,
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Failed to send test notification:", error);
      setSnackbar({
        open: true,
        message: "Failed to send notification",
        severity: "error",
      });
    }
  };

  const handleExportData = async () => {
    try {
      const data = await invoke<string>("export_data");
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `geekfit-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSnackbar({
        open: true,
        message: "Data exported successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Failed to export data:", error);
      setSnackbar({
        open: true,
        message: "Failed to export data",
        severity: "error",
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setImportData(content);
        setImportDialogOpen(true);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportConfirm = async () => {
    try {
      await invoke("import_data", { jsonData: importData });
      await refreshStats();
      setSnackbar({
        open: true,
        message: "Data imported successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Failed to import data:", error);
      setSnackbar({
        open: true,
        message: `Failed to import: ${error}`,
        severity: "error",
      });
    } finally {
      setImportDialogOpen(false);
      setImportData("");
    }
  };

  const handleResetData = async () => {
    try {
      await invoke("reset_all_data");
      // Clear onboarding flag so it shows again on relaunch
      localStorage.removeItem("geekfit_onboarding_complete");
      // Relaunch the app to start fresh with onboarding
      await relaunch();
    } catch (error) {
      console.error("Failed to reset data:", error);
      setSnackbar({
        open: true,
        message: "Failed to reset data",
        severity: "error",
      });
      setResetDialogOpen(false);
    }
  };

  const handlePlaySoundPreview = (soundType: string) => {
    switch (soundType) {
      case "reminder":
        playReminderSound();
        break;
      case "levelup":
        playLevelUpSound();
        break;
      case "achievement":
        playAchievementSound();
        break;
      case "xp":
        playXpSound();
        break;
    }
  };

  const handleReplayOnboarding = () => {
    resetOnboarding();
    setSnackbar({
      open: true,
      message: "Onboarding will show on next refresh",
      severity: "info",
    });
  };

  const SectionCard = ({
    icon,
    title,
    description,
    children,
    disabled = false,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <Card
      sx={{
        height: "100%",
        opacity: disabled ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Box sx={{ color: "primary.main" }}>{icon}</Box>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {description}
        </Typography>
        <Box
          sx={{
            opacity: disabled ? 0.5 : 1,
            pointerEvents: disabled ? "none" : "auto",
          }}
        >
          {children}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Settings
        </Typography>
        <Fade in={savedIndicator}>
          <Chip
            icon={<CheckCircleIcon />}
            label="Settings saved"
            color="success"
            size="small"
            variant="outlined"
          />
        </Fade>
      </Box>

      <Grid container spacing={3}>
        {/* Theme Selection */}
        <Grid size={{ xs: 12, md: isWideScreen ? 6 : 12 }}>
          <SectionCard
            icon={<PaletteIcon />}
            title="Appearance"
            description="Choose your preferred color theme"
          >
            <Typography variant="subtitle2" fontWeight={600} mb={2}>
              Select Theme
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                gap: 1.5,
              }}
            >
              {availableThemes.map((theme) => (
                <Tooltip key={theme.id} title={theme.name}>
                  <Box
                    onClick={() => handleThemeChange(theme.id)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "2px solid",
                      borderColor:
                        themeId === theme.id ? "primary.main" : "divider",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "primary.main",
                        transform: "scale(1.02)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 0.5, mb: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          backgroundColor: theme.preview.bg,
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      />
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          backgroundColor: theme.preview.primary,
                        }}
                      />
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          backgroundColor: theme.preview.secondary,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: 10 }}>
                      {theme.name}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Box>
          </SectionCard>
        </Grid>

        {/* Language Selection */}
        <Grid size={{ xs: 12, md: isWideScreen ? 6 : 12 }}>
          <SectionCard
            icon={<LanguageIcon />}
            title="Language"
            description="Choose your preferred language"
          >
            <FormControl fullWidth size="small">
              <InputLabel>Language</InputLabel>
              <Select
                value={locale}
                label="Language"
                onChange={(e) => handleLocaleChange(e.target.value)}
              >
                {supportedLocales.map((loc) => (
                  <MenuItem key={loc.code} value={loc.code}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span>{loc.flag}</span>
                      <span>{loc.nativeName}</span>
                      {loc.code !== "en" && loc.code !== "es" && (
                        <Chip label="Coming soon" size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" mt={2}>
              Help translate GeekFit to more languages on GitHub!
            </Typography>
          </SectionCard>
        </Grid>

        {/* Sound Settings */}
        <Grid size={{ xs: 12, md: isWideScreen ? 6 : 12 }}>
          <SectionCard
            icon={<VolumeUpIcon />}
            title="Sound Effects"
            description="Control audio feedback for achievements and actions"
          >
            <FormControlLabel
              control={
                <Switch
                  checked={soundEnabled}
                  onChange={handleSoundToggle}
                  color="primary"
                />
              }
              label="Enable sound effects"
              sx={{ mb: 2, display: "block" }}
            />

            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Preview Sounds
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[
                { key: "reminder", label: "Reminder" },
                { key: "levelup", label: "Level Up" },
                { key: "achievement", label: "Achievement" },
                { key: "xp", label: "XP" },
              ].map((sound) => (
                <Chip
                  key={sound.key}
                  icon={<PlayArrowIcon />}
                  label={sound.label}
                  onClick={() => handlePlaySoundPreview(sound.key)}
                  disabled={!soundEnabled}
                  clickable
                  size="small"
                />
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        {/* Reminders */}
        <Grid size={{ xs: 12, md: isWideScreen ? 6 : 12 }}>
          <SectionCard
            icon={<NotificationsIcon />}
            title="Exercise Reminders"
            description="Get notified to take exercise breaks during work"
          >
            <FormControlLabel
              control={
                <Switch
                  checked={reminderEnabled}
                  onChange={handleReminderToggle}
                  color="primary"
                />
              }
              label="Enable reminders"
              sx={{ mb: 2, display: "block" }}
            />

            <Box sx={{ opacity: reminderEnabled ? 1 : 0.4 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Reminder Interval
              </Typography>
              <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
                {[30, 60, 90, 120].map((mins) => (
                  <Chip
                    key={mins}
                    label={mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    onClick={() => handlePresetInterval(mins)}
                    color={reminderInterval === mins ? "primary" : "default"}
                    disabled={!reminderEnabled}
                    clickable
                    size="small"
                  />
                ))}
              </Stack>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Slider
                  value={reminderInterval}
                  onChange={handleIntervalChange}
                  min={15}
                  max={240}
                  step={15}
                  disabled={!reminderEnabled}
                  sx={{ flex: 1 }}
                />
                <TextField
                  value={reminderInterval}
                  onChange={handleIntervalInputChange}
                  type="number"
                  size="small"
                  disabled={!reminderEnabled}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">min</InputAdornment>
                      ),
                    },
                  }}
                  sx={{ width: 100 }}
                />
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={handleTestNotification}
                disabled={!reminderEnabled}
                sx={{ mt: 2 }}
              >
                Test Notification
              </Button>
            </Box>
          </SectionCard>
        </Grid>

        {/* Daily Goal */}
        <Grid size={{ xs: 12, md: isWideScreen ? 6 : 12 }}>
          <SectionCard
            icon={<TrackChangesIcon />}
            title="Daily Goal"
            description="Set your target XP to earn each day"
          >
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Quick Presets
            </Typography>
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
              {[200, 500, 1000, 2000].map((xp) => (
                <Chip
                  key={xp}
                  label={`${xp} XP`}
                  onClick={() => handlePresetGoal(xp)}
                  color={dailyGoal === xp ? "primary" : "default"}
                  clickable
                  size="small"
                />
              ))}
            </Stack>

            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Custom Goal
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Slider
                value={dailyGoal}
                onChange={handleGoalChange}
                min={50}
                max={5000}
                step={50}
                sx={{ flex: 1 }}
              />
              <TextField
                value={dailyGoal}
                onChange={handleGoalInputChange}
                type="number"
                size="small"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">XP</InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 110 }}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" mt={1}>
              <Tooltip title="Based on default exercise XP values">
                <InfoIcon
                  sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }}
                />
              </Tooltip>
              ~{Math.round(dailyGoal / 80)} pushups or ~
              {Math.round(dailyGoal / 60)} sit-ups worth
            </Typography>
          </SectionCard>
        </Grid>

        {/* Keyboard Shortcuts Info */}
        <Grid size={{ xs: 12, md: isWideScreen ? 6 : 12 }}>
          <SectionCard
            icon={<KeyboardIcon />}
            title="Keyboard Shortcuts"
            description="Navigate quickly with keyboard shortcuts"
          >
            <Typography variant="body2" mb={2}>
              Press <Chip label="Ctrl + /" size="small" sx={{ mx: 0.5 }} /> to
              see all available keyboard shortcuts.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Global shortcut{" "}
              <Chip label="Ctrl + Shift + Alt + G" size="small" sx={{ mx: 0.5 }} />{" "}
              works even when GeekFit is minimized!
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={handleReplayOnboarding}
            >
              Replay Onboarding Tutorial
            </Button>
          </SectionCard>
        </Grid>

        {/* Data Management */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Box sx={{ color: "primary.main" }}>
                  <DownloadIcon />
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  Data Management
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Export your data for backup or import from a previous backup
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      height: "100%",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={600} mb={1}>
                      Export Data
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Download all your data as a JSON file.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={handleExportData}
                    >
                      Export Backup
                    </Button>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      height: "100%",
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={600} mb={1}>
                      Import Data
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      Restore from a backup file.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<UploadIcon />}
                      onClick={handleImportClick}
                    >
                      Import Backup
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".json"
                      style={{ display: "none" }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Dev Tools */}
        {import.meta.env.DEV && (
          <Grid size={{ xs: 12 }}>
            <Card
              sx={{
                borderColor: "warning.main",
                borderWidth: 1,
                borderStyle: "solid",
              }}
            >
              <CardContent>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}
                >
                  <BugReportIcon color="warning" />
                  <Typography variant="h6" fontWeight={600} color="warning.main">
                    Developer Tools
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                  Test Notifications
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => handleTestNotificationType("exercise")}
                  >
                    Exercise Reminder
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => handleTestNotificationType("eyeCare")}
                  >
                    Eye Care (20-20-20)
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => handleTestNotificationType("hydration")}
                  >
                    Hydration
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => handleTestNotificationType("posture")}
                  >
                    Posture Check
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => handleTestNotificationType("levelUp")}
                  >
                    Level Up
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => handleTestNotificationType("achievement")}
                  >
                    Achievement
                  </Button>
                </Stack>

                <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                  Test Sounds
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    icon={<PlayArrowIcon />}
                    label="Reminder"
                    onClick={() => playReminderSound()}
                    clickable
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                  <Chip
                    icon={<PlayArrowIcon />}
                    label="Level Up"
                    onClick={() => playLevelUpSound()}
                    clickable
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                  <Chip
                    icon={<PlayArrowIcon />}
                    label="Achievement"
                    onClick={() => playAchievementSound()}
                    clickable
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                  <Chip
                    icon={<PlayArrowIcon />}
                    label="XP Gain"
                    onClick={() => playXpSound()}
                    clickable
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Danger Zone */}
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              borderColor: "error.main",
              borderWidth: 1,
              borderStyle: "solid",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Box sx={{ color: "error.main" }}>
                  <DeleteForeverIcon />
                </Box>
                <Typography variant="h6" fontWeight={600} color="error">
                  Danger Zone
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Irreversible actions that will permanently affect your data
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Reset All Data
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Delete all exercises, logs, achievements, and stats.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setResetDialogOpen(true)}
                >
                  Reset Data
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* About */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Box sx={{ color: "primary.main" }}>
                  <InfoIcon />
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  About GeekFit
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Version {version}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                A gamified fitness tracker for programmers. Level up your fitness
                with XP, achievements, and streaks!
              </Typography>
              <Box
                onClick={() => openUrl("https://github.com/mvogttech/geekfit")}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  mt: 1.5,
                  color: "text.secondary",
                  cursor: "pointer",
                  transition: "color 0.2s",
                  "&:hover": {
                    color: "primary.main",
                  },
                }}
              >
                <GitHubIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">
                  Open source on GitHub - contributions welcome!
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialogs */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset All Data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all your exercises, logs, achievements,
            and progress. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleResetData}>
            Reset Everything
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
      >
        <DialogTitle>Import Data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will replace all your current data with the imported backup.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={handleImportConfirm}
          >
            Import Data
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
