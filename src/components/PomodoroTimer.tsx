import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  CircularProgress,
  Tooltip,
  Collapse,
  Chip,
  Button,
  Slider,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SettingsIcon from "@mui/icons-material/Settings";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import { usePomodoro, PomodoroPhase } from "../hooks/usePomodoro";

interface PomodoroTimerProps {
  compact?: boolean;
  onExerciseBreak?: () => void;
}

const PHASE_COLORS: Record<PomodoroPhase, { main: string; bg: string }> = {
  work: { main: "#00BCD4", bg: "rgba(0, 188, 212, 0.1)" },
  break: { main: "#4CAF50", bg: "rgba(76, 175, 80, 0.1)" },
  idle: { main: "#9E9E9E", bg: "rgba(158, 158, 158, 0.1)" },
};

const PHASE_LABELS: Record<PomodoroPhase, string> = {
  work: "Focus Time",
  break: "Exercise Break",
  idle: "Ready to Start",
};

export default function PomodoroTimer({ compact = false, onExerciseBreak }: PomodoroTimerProps) {
  const {
    phase,
    timeRemaining,
    isRunning,
    sessionsCompleted,
    workDuration,
    breakDuration,
    formattedTime,
    start,
    pause,
    reset,
    skip,
    setWorkDuration,
    setBreakDuration,
  } = usePomodoro();

  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const colors = PHASE_COLORS[phase];
  const totalSeconds = phase === "work" ? workDuration * 60 : phase === "break" ? breakDuration * 60 : workDuration * 60;
  const progress = ((totalSeconds - timeRemaining) / totalSeconds) * 100;

  if (compact) {
    return (
      <Paper
        sx={{
          p: 1.5,
          backgroundColor: colors.bg,
          border: `1px solid ${colors.main}40`,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ position: "relative", display: "inline-flex" }}>
              <CircularProgress
                variant="determinate"
                value={progress}
                size={40}
                thickness={4}
                sx={{ color: colors.main }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: "absolute",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="caption" fontWeight={700} fontSize={10}>
                  {formattedTime.split(":")[0]}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ color: colors.main }}>
                {PHASE_LABELS[phase]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formattedTime}
              </Typography>
            </Box>
          </Box>

          <Box>
            <IconButton
              size="small"
              onClick={isRunning ? pause : start}
              sx={{ color: colors.main }}
            >
              {isRunning ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        overflow: "hidden",
        backgroundColor: "background.paper",
        border: `1px solid ${colors.main}40`,
      }}
    >
      {/* Main Timer Display */}
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          background: `linear-gradient(180deg, ${colors.bg}, transparent)`,
        }}
      >
        {/* Phase indicator */}
        <Chip
          size="small"
          label={PHASE_LABELS[phase]}
          sx={{
            backgroundColor: `${colors.main}20`,
            color: colors.main,
            fontWeight: 600,
            mb: 2,
          }}
        />

        {/* Circular Timer */}
        <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
          <CircularProgress
            variant="determinate"
            value={100}
            size={160}
            thickness={2}
            sx={{ color: "rgba(255, 255, 255, 0.05)" }}
          />
          <CircularProgress
            variant="determinate"
            value={progress}
            size={160}
            thickness={2}
            sx={{
              color: colors.main,
              position: "absolute",
              left: 0,
              top: 0,
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="h3"
              fontWeight={700}
              sx={{ fontFamily: "monospace", color: colors.main }}
            >
              {formattedTime}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {phase === "work" ? "Focus" : phase === "break" ? "Break" : "Ready"}
            </Typography>
          </Box>
        </Box>

        {/* Control Buttons */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
          <Tooltip title="Reset">
            <IconButton
              onClick={reset}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              <RestartAltIcon />
            </IconButton>
          </Tooltip>

          <IconButton
            onClick={isRunning ? pause : start}
            sx={{
              backgroundColor: colors.main,
              color: "#121212",
              width: 56,
              height: 56,
              "&:hover": { backgroundColor: colors.main, filter: "brightness(1.1)" },
            }}
          >
            {isRunning ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
          </IconButton>

          <Tooltip title="Skip">
            <IconButton
              onClick={skip}
              disabled={phase === "idle"}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              <SkipNextIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Sessions Completed */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Sessions completed: <strong>{sessionsCompleted}</strong>
          </Typography>
        </Box>

        {/* Exercise Break Prompt */}
        {phase === "break" && onExerciseBreak && (
          <Button
            variant="outlined"
            startIcon={<FitnessCenterIcon />}
            onClick={onExerciseBreak}
            sx={{
              mt: 2,
              borderColor: "#4CAF50",
              color: "#4CAF50",
              "&:hover": {
                borderColor: "#4CAF50",
                backgroundColor: "rgba(76, 175, 80, 0.1)",
              },
            }}
          >
            Log Exercise
          </Button>
        )}
      </Box>

      {/* Expandable Settings */}
      <Box
        sx={{
          px: 2,
          py: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          cursor: "pointer",
        }}
        onClick={() => setShowSettings(!showSettings)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SettingsIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            Timer Settings
          </Typography>
        </Box>
        {showSettings ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </Box>

      <Collapse in={showSettings}>
        <Box sx={{ px: 3, pb: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Work Duration: {workDuration} min
            </Typography>
            <Slider
              value={workDuration}
              onChange={(_, value) => setWorkDuration(value as number)}
              min={5}
              max={60}
              step={5}
              marks={[
                { value: 15, label: "15" },
                { value: 25, label: "25" },
                { value: 45, label: "45" },
              ]}
              sx={{ color: "#00BCD4" }}
            />
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Break Duration: {breakDuration} min
            </Typography>
            <Slider
              value={breakDuration}
              onChange={(_, value) => setBreakDuration(value as number)}
              min={1}
              max={15}
              step={1}
              marks={[
                { value: 5, label: "5" },
                { value: 10, label: "10" },
              ]}
              sx={{ color: "#4CAF50" }}
            />
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}
