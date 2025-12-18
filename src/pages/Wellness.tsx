import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Chip,
  Stack,
  Tooltip,
  Divider,
  TextField,
  InputAdornment,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import AccessibilityNewIcon from "@mui/icons-material/AccessibilityNew";
import PsychologyIcon from "@mui/icons-material/Psychology";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useWellness, ERGONOMIC_TIPS } from "../contexts/WellnessContext";

export default function Wellness() {
  const {
    settings,
    stats,
    updateSettings,
    logWater,
    resetWater,
    isInFocusMode,
    ergonomicTip,
    refreshTip,
  } = useWellness();

  const waterProgress = (stats.waterIntake / settings.hydrationGoal) * 100;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Wellness Hub
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Take care of your body while you code. Healthy developer = productive developer.
      </Typography>

      <Grid container spacing={3}>
        {/* Focus Mode Status */}
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              background: isInFocusMode
                ? "linear-gradient(135deg, rgba(129, 199, 132, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%)"
                : undefined,
              borderColor: isInFocusMode ? "success.main" : undefined,
              borderWidth: isInFocusMode ? 1 : 0,
              borderStyle: "solid",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <PsychologyIcon
                  sx={{
                    fontSize: 40,
                    color: isInFocusMode ? "success.main" : "text.secondary",
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {isInFocusMode ? "Focus Mode Active" : "Focus Mode"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isInFocusMode
                      ? "You're in the zone! Reminders are paused to avoid interruptions."
                      : "Detects when you're focused and pauses wellness reminders."}
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.focusModeEnabled}
                      onChange={(e) =>
                        updateSettings("focusModeEnabled", e.target.checked)
                      }
                    />
                  }
                  label=""
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Hydration Tracking */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <LocalDrinkIcon color="info" />
                <Typography variant="h6" fontWeight={600}>
                  Hydration Tracker
                </Typography>
              </Box>

              <Box sx={{ textAlign: "center", py: 2 }}>
                <Box sx={{ position: "relative", display: "inline-block" }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      border: "8px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${Math.min(waterProgress, 100)}%`,
                        backgroundColor: "info.main",
                        opacity: 0.3,
                        transition: "height 0.3s",
                      }}
                    />
                    <Typography variant="h4" fontWeight={700} color="info.main">
                      {stats.waterIntake}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  of {settings.hydrationGoal} glasses today
                </Typography>

                {waterProgress >= 100 && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Daily goal reached!"
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 1,
                  mt: 2,
                }}
              >
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<AddIcon />}
                  onClick={logWater}
                >
                  Log Water
                </Button>
                <Button variant="outlined" size="small" onClick={resetWater}>
                  Reset
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.hydrationEnabled}
                    onChange={(e) =>
                      updateSettings("hydrationEnabled", e.target.checked)
                    }
                    size="small"
                  />
                }
                label="Reminders"
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Every
                </Typography>
                <TextField
                  value={settings.hydrationInterval}
                  onChange={(e) =>
                    updateSettings(
                      "hydrationInterval",
                      Math.max(15, parseInt(e.target.value) || 60)
                    )
                  }
                  type="number"
                  size="small"
                  disabled={!settings.hydrationEnabled}
                  slotProps={{
                    input: {
                      endAdornment: <InputAdornment position="end">min</InputAdornment>,
                    },
                  }}
                  sx={{ width: 100 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Eye Care (20-20-20) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <VisibilityIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Eye Care (20-20-20)
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "rgba(0, 188, 212, 0.08)",
                  mb: 2,
                }}
              >
                <Typography variant="body2" fontWeight={600} mb={1}>
                  The 20-20-20 Rule
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Every <strong>20 minutes</strong>, look at something{" "}
                  <strong>20 feet away</strong> for <strong>20 seconds</strong>.
                  This helps reduce eye strain from screen time.
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.eyeCareEnabled}
                    onChange={(e) =>
                      updateSettings("eyeCareEnabled", e.target.checked)
                    }
                  />
                }
                label="Enable eye break reminders"
                sx={{ display: "block", mb: 2 }}
              />

              <Typography variant="body2" color="text.secondary" mb={1}>
                Reminder interval
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {[15, 20, 30, 45].map((mins) => (
                  <Chip
                    key={mins}
                    label={`${mins} min`}
                    onClick={() => updateSettings("eyeCareInterval", mins)}
                    color={settings.eyeCareInterval === mins ? "primary" : "default"}
                    disabled={!settings.eyeCareEnabled}
                    clickable
                    size="small"
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Posture Reminders */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <AccessibilityNewIcon color="secondary" />
                <Typography variant="h6" fontWeight={600}>
                  Posture Check
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" mb={2}>
                Regular reminders to check your posture, roll your shoulders, and
                sit up straight.
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.postureEnabled}
                    onChange={(e) =>
                      updateSettings("postureEnabled", e.target.checked)
                    }
                  />
                }
                label="Enable posture reminders"
                sx={{ display: "block", mb: 2 }}
              />

              <Typography variant="body2" color="text.secondary" mb={1}>
                Reminder interval
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {[30, 45, 60, 90].map((mins) => (
                  <Chip
                    key={mins}
                    label={`${mins} min`}
                    onClick={() => updateSettings("postureInterval", mins)}
                    color={settings.postureInterval === mins ? "secondary" : "default"}
                    disabled={!settings.postureEnabled}
                    clickable
                    size="small"
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Ergonomic Tip */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <TipsAndUpdatesIcon color="warning" />
                  <Typography variant="h6" fontWeight={600}>
                    Ergonomic Tip
                  </Typography>
                </Box>
                <Tooltip title="Get another tip">
                  <IconButton onClick={refreshTip} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "rgba(255, 183, 77, 0.08)",
                  border: "1px solid rgba(255, 183, 77, 0.2)",
                  minHeight: 80,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography variant="body1">{ergonomicTip}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* All Ergonomic Tips */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Ergonomic Tips Library
              </Typography>

              <Grid container spacing={2}>
                {["posture", "eyes", "movement", "hydration", "desk", "general"].map(
                  (category) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          height: "100%",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          fontWeight={600}
                          mb={1}
                          sx={{ textTransform: "capitalize" }}
                        >
                          {category}
                        </Typography>
                        {ERGONOMIC_TIPS.filter((t) => t.category === category)
                          .slice(0, 2)
                          .map((tip, i) => (
                            <Typography
                              key={i}
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1, fontSize: 12 }}
                            >
                              • {tip.tip}
                            </Typography>
                          ))}
                      </Box>
                    </Grid>
                  )
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
