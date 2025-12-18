import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ShareIcon from "@mui/icons-material/Share";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import { useUser } from "../contexts/UserContext";
import { useExercises } from "../contexts/ExerciseContext";
import { getTitleForLevel, LogExerciseResult } from "../types";
import {
  formatXp,
  xpProgress,
  getLevelTier,
  TIER_COLORS,
  getExerciseIcon,
} from "../utils/xp";
import { checkForNewRecord, PersonalRecord } from "../utils/records";
import { playXpSound, playQuestCompleteSound, playDailyGoalSound } from "../utils/sounds";
import { celebrateQuestComplete, celebrateDailyGoal } from "../utils/confetti";
import ShareCard from "../components/ShareCard";
import LevelUpModal from "../components/LevelUpModal";
import PersonalRecordModal from "../components/PersonalRecordModal";

export default function Dashboard() {
  const { stats, settings, loading: statsLoading } = useUser();
  const {
    exercises,
    recentLogs,
    logExercise,
    loading: exercisesLoading,
  } = useExercises();

  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);
  const [reps, setReps] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logging, setLogging] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false);

  // Level up modal
  const [levelUpModal, setLevelUpModal] = useState<{
    open: boolean;
    exerciseName: string;
    newLevel: number;
  }>({ open: false, exerciseName: "", newLevel: 1 });

  // Personal record modal
  const [prModal, setPrModal] = useState<{
    open: boolean;
    record: PersonalRecord | null;
  }>({ open: false, record: null });

  // Track completed quests for celebration
  const [previousQuestsCompleted, setPreviousQuestsCompleted] = useState(0);
  const [previousDailyGoalMet, setPreviousDailyGoalMet] = useState(false);

  const loading = statsLoading || exercisesLoading;
  const totalLevel = stats?.total_level ?? 2;
  const totalXp = stats?.total_xp ?? 0;
  const currentStreak = stats?.current_streak ?? 0;
  const exerciseCount = stats?.exercise_count ?? 2;
  const title = getTitleForLevel(totalLevel);
  const dailyGoal = settings?.daily_goal_xp ?? 500;
  const soundEnabled = settings?.sound_enabled ?? true;

  // Calculate today's XP from recent logs
  const todayXp = useMemo(() => {
    const today = new Date().toDateString();
    return recentLogs
      .filter((log) => new Date(log.logged_at).toDateString() === today)
      .reduce((sum, log) => sum + log.xp_earned, 0);
  }, [recentLogs]);

  // Today's logs for sharing
  const todayLogs = useMemo(() => {
    const today = new Date().toDateString();
    return recentLogs.filter(
      (log) => new Date(log.logged_at).toDateString() === today
    );
  }, [recentLogs]);

  // Calculate "Power Level" - a gamified composite score
  const powerLevel = useMemo(() => {
    const baseScore = totalLevel * 100;
    const xpBonus = Math.floor(totalXp / 100);
    const streakBonus = currentStreak * 50;
    return baseScore + xpBonus + streakBonus;
  }, [totalLevel, totalXp, currentStreak]);

  // Daily quests
  const dailyQuests = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogsFiltered = recentLogs.filter(
      (log) => new Date(log.logged_at).toDateString() === today
    );
    const uniqueExercisesToday = new Set(todayLogsFiltered.map((l) => l.exercise_id))
      .size;

    return [
      {
        id: "daily_xp",
        name: "XP Grinder",
        description: `Earn ${dailyGoal} XP today`,
        progress: todayXp,
        target: dailyGoal,
        completed: todayXp >= dailyGoal,
        xpReward: 50,
      },
      {
        id: "log_exercises",
        name: "Variety Pack",
        description: "Log 3 different exercises",
        progress: uniqueExercisesToday,
        target: 3,
        completed: uniqueExercisesToday >= 3,
        xpReward: 30,
      },
      {
        id: "maintain_streak",
        name: "Consistency",
        description: "Keep your streak alive",
        progress: todayLogsFiltered.length > 0 ? 1 : 0,
        target: 1,
        completed: todayLogsFiltered.length > 0,
        xpReward: 20,
      },
    ];
  }, [recentLogs, todayXp, dailyGoal]);

  const completedQuests = dailyQuests.filter((q) => q.completed).length;

  // Celebrate quest completion
  useEffect(() => {
    if (completedQuests > previousQuestsCompleted && previousQuestsCompleted > 0) {
      celebrateQuestComplete();
      if (soundEnabled) {
        playQuestCompleteSound();
      }
    }
    setPreviousQuestsCompleted(completedQuests);
  }, [completedQuests, previousQuestsCompleted, soundEnabled]);

  // Celebrate daily goal completion
  useEffect(() => {
    const dailyGoalMet = todayXp >= dailyGoal;
    if (dailyGoalMet && !previousDailyGoalMet) {
      celebrateDailyGoal();
      if (soundEnabled) {
        playDailyGoalSound();
      }
    }
    setPreviousDailyGoalMet(dailyGoalMet);
  }, [todayXp, dailyGoal, previousDailyGoalMet, soundEnabled]);

  // Get current hour for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleLogClick = useCallback((exerciseId: number) => {
    setSelectedExercise(exerciseId);
    setReps(10);
    setDialogOpen(true);
  }, []);

  const handleLog = async () => {
    if (selectedExercise === null) return;

    setLogging(true);
    try {
      const result: LogExerciseResult = await logExercise(selectedExercise, reps);
      const exerciseName =
        exercises.find((e) => e.id === selectedExercise)?.name ?? "Exercise";

      // Play XP sound
      if (soundEnabled) {
        playXpSound();
      }

      // Check for level up
      if (result.leveled_up) {
        setDialogOpen(false);
        setLevelUpModal({
          open: true,
          exerciseName,
          newLevel: result.new_exercise_level,
        });
      } else {
        // Check for personal record
        const newLog = {
          id: Date.now(),
          exercise_id: selectedExercise,
          reps,
          xp_earned: result.xp_earned,
          logged_at: new Date().toISOString(),
        };
        const newRecord = checkForNewRecord(newLog, recentLogs, exercises);

        if (newRecord) {
          setDialogOpen(false);
          setPrModal({ open: true, record: newRecord });
        } else {
          setSnackbar({
            open: true,
            message: `+${result.xp_earned} XP earned!`,
            severity: "success",
          });
          setDialogOpen(false);
        }
      }
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to log exercise",
        severity: "error",
      });
    } finally {
      setLogging(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if in input field or dialog is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        dialogOpen ||
        levelUpModal.open ||
        prModal.open ||
        shareOpen
      ) {
        return;
      }

      // Number keys 1-9 to quick-select exercises
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && num <= exercises.length) {
        handleLogClick(exercises[num - 1].id);
      }

      // 'S' key to open share dialog
      if (e.key.toLowerCase() === "s" && !e.ctrlKey && !e.metaKey) {
        setShareOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exercises, dialogOpen, levelUpModal.open, prModal.open, shareOpen, handleLogClick]);

  const selectedExerciseData = exercises.find(
    (e) => e.id === selectedExercise
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Terminal-style Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: "monospace",
            color: "text.secondary",
            fontSize: 14,
            mb: 0.5,
          }}
        >
          {"> "}
          <Box component="span" sx={{ color: "primary.main" }}>
            {getGreeting()}
          </Box>
          , {title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            Dashboard
            <Chip
              label={`PWR ${powerLevel.toLocaleString()}`}
              size="small"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                backgroundColor: "rgba(0, 188, 212, 0.2)",
                color: "primary.main",
                border: "1px solid rgba(0, 188, 212, 0.4)",
              }}
            />
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Keyboard shortcuts: 1-9 to log exercises, S to share">
              <IconButton size="small" sx={{ opacity: 0.5 }}>
                <KeyboardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share your progress">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ShareIcon />}
                onClick={() => setShareOpen(true)}
              >
                Share
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Main Stats Grid */}
      <Grid container spacing={3} mb={4}>
        {/* Character Card */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            sx={{
              background:
                "linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)",
              border: "1px solid rgba(0, 188, 212, 0.3)",
              height: "100%",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", gap: 3 }}>
                {/* Level Emblem */}
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, rgba(0, 188, 212, 0.3), rgba(0, 188, 212, 0.1))",
                    border: "3px solid",
                    borderColor: "primary.main",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 30px rgba(0, 188, 212, 0.3)",
                  }}
                >
                  <Typography
                    variant="h3"
                    fontWeight={800}
                    color="primary"
                    sx={{ lineHeight: 1 }}
                  >
                    {totalLevel}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: "monospace", fontSize: 10 }}
                  >
                    LEVEL
                  </Typography>
                </Box>

                {/* Stats */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h5"
                    color="primary"
                    fontWeight={700}
                    mb={1}
                  >
                    {title}
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 1,
                      fontFamily: "monospace",
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        TOTAL_XP
                      </Typography>
                      <Typography fontWeight={600} color="secondary.main">
                        {formatXp(totalXp)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        SKILLS
                      </Typography>
                      <Typography fontWeight={600}>{exerciseCount}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        STREAK
                      </Typography>
                      <Typography fontWeight={600} color="warning.main">
                        {currentStreak}d 🔥
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        PWR_LVL
                      </Typography>
                      <Typography fontWeight={600} color="primary.main">
                        {powerLevel.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Progress */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              height: "100%",
              background:
                "linear-gradient(135deg, rgba(3, 218, 198, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)",
              border: "1px solid rgba(3, 218, 198, 0.3)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontFamily: "monospace" }}
              >
                {"// TODAY'S PROGRESS"}
              </Typography>

              <Box sx={{ mt: 2, mb: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="h4" fontWeight={700} color="secondary">
                    {formatXp(todayXp)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    / {formatXp(dailyGoal)} XP
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (todayXp / dailyGoal) * 100)}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "rgba(3, 218, 198, 0.2)",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      background:
                        "linear-gradient(90deg, #03DAC6, #00BCD4)",
                    },
                  }}
                />
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontFamily: "monospace" }}
              >
                {todayXp >= dailyGoal
                  ? "✓ DAILY GOAL COMPLETE!"
                  : `${formatXp(dailyGoal - todayXp)} XP remaining`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Quests */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card
            sx={{
              height: "100%",
              background:
                "linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)",
              border: "1px solid rgba(255, 152, 0, 0.3)",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontFamily: "monospace" }}
              >
                {"// DAILY QUESTS"}
              </Typography>
              <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                {completedQuests}/{dailyQuests.length}
              </Typography>

              <Box sx={{ mt: 2 }}>
                {dailyQuests.map((quest) => (
                  <Box
                    key={quest.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                      opacity: quest.completed ? 0.6 : 1,
                    }}
                  >
                    {quest.completed ? (
                      <CheckCircleIcon
                        sx={{ fontSize: 18, color: "success.main" }}
                      />
                    ) : (
                      <RadioButtonUncheckedIcon
                        sx={{ fontSize: 18, color: "text.secondary" }}
                      />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        sx={{
                          textDecoration: quest.completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {quest.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace", fontSize: 10 }}
                      >
                        {quest.progress}/{quest.target}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Skills Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          fontWeight={600}
          mb={2}
          sx={{
            fontFamily: "monospace",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box component="span" sx={{ color: "primary.main" }}>
            {">>"}
          </Box>{" "}
          SKILLS
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            (Press 1-{Math.min(9, exercises.length)} to quick-log)
          </Typography>
        </Typography>

        <Grid container spacing={2}>
          {exercises.map((exercise, index) => {
            const tier = getLevelTier(exercise.current_level);
            const tierColors = TIER_COLORS[tier];
            const icon = getExerciseIcon(exercise.name);
            const progress = xpProgress(exercise.total_xp);
            const progressPercent = Math.min(
              100,
              Math.floor((progress.current / progress.needed) * 100)
            );

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={exercise.id}>
                <Card
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: tierColors.bg,
                    border: `1px solid ${tierColors.main}33`,
                    position: "relative",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: `0 8px 24px ${tierColors.glow}`,
                      borderColor: tierColors.main,
                    },
                  }}
                  onClick={() => handleLogClick(exercise.id)}
                >
                  {/* Keyboard shortcut badge */}
                  {index < 9 && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        width: 20,
                        height: 20,
                        borderRadius: 1,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "text.secondary",
                      }}
                    >
                      {index + 1}
                    </Box>
                  )}
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 1.5,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            backgroundColor: "rgba(0, 0, 0, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                          }}
                        >
                          {icon}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {exercise.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: tierColors.main, fontFamily: "monospace" }}
                          >
                            +{exercise.xp_per_rep} XP/rep
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={`${exercise.current_level}`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          minWidth: 36,
                          backgroundColor: tierColors.main,
                          color:
                            tier === "silver" || tier === "platinum"
                              ? "#1a1a1a"
                              : "#fff",
                          boxShadow: `0 2px 8px ${tierColors.glow}`,
                        }}
                      />
                    </Box>

                    {/* Progress bar */}
                    <Box sx={{ mb: 1.5 }}>
                      <Box
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "rgba(0, 0, 0, 0.3)",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${progressPercent}%`,
                            background: `linear-gradient(90deg, ${tierColors.main}, ${tierColors.main}aa)`,
                            borderRadius: 3,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          textAlign: "right",
                          mt: 0.5,
                          fontFamily: "monospace",
                          fontSize: 10,
                        }}
                      >
                        {formatXp(progress.current)}/{formatXp(progress.needed)}
                      </Typography>
                    </Box>

                    <Button
                      variant="contained"
                      fullWidth
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLogClick(exercise.id);
                      }}
                      sx={{
                        backgroundColor: tierColors.main,
                        color:
                          tier === "silver" || tier === "platinum"
                            ? "#1a1a1a"
                            : "#fff",
                        fontWeight: 600,
                        "&:hover": {
                          backgroundColor: tierColors.main,
                          filter: "brightness(1.1)",
                        },
                      }}
                    >
                      Log
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Activity Log */}
      {recentLogs.length > 0 && (
        <Box>
          <Typography
            variant="h6"
            fontWeight={600}
            mb={2}
            sx={{
              fontFamily: "monospace",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box component="span" sx={{ color: "primary.main" }}>
              {">>"}
            </Box>{" "}
            ACTIVITY_LOG
          </Typography>

          <Card
            sx={{
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box
                sx={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {recentLogs.slice(0, 10).map((log) => {
                  const exercise = exercises.find(
                    (e) => e.id === log.exercise_id
                  );
                  const time = new Date(log.logged_at);
                  const timeStr = time.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const dateStr = time.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <Box
                      key={log.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        py: 0.75,
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        "&:last-child": { borderBottom: "none" },
                      }}
                    >
                      <Typography
                        sx={{
                          color: "text.secondary",
                          fontSize: 11,
                          minWidth: 90,
                        }}
                      >
                        [{dateStr} {timeStr}]
                      </Typography>
                      <Typography sx={{ color: "success.main" }}>
                        +{log.xp_earned}
                      </Typography>
                      <Typography color="text.secondary">XP</Typography>
                      <Typography color="text.secondary">—</Typography>
                      <Typography>
                        {exercise?.name ?? "Unknown"} ({log.reps} reps)
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Log Exercise Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography fontSize={28}>
              {selectedExerciseData
                ? getExerciseIcon(selectedExerciseData.name)
                : "🎯"}
            </Typography>
            <Box>
              <Typography variant="h6">
                Log {selectedExerciseData?.name ?? "Exercise"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                +{selectedExerciseData?.xp_per_rep ?? 0} XP per rep
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              py: 3,
            }}
          >
            <IconButton
              color="primary"
              onClick={() => setReps(Math.max(1, reps - 5))}
              size="large"
              sx={{
                backgroundColor: "rgba(0, 188, 212, 0.1)",
                "&:hover": { backgroundColor: "rgba(0, 188, 212, 0.2)" },
              }}
            >
              <RemoveIcon />
            </IconButton>
            <TextField
              type="number"
              value={reps}
              onChange={(e) =>
                setReps(Math.max(1, parseInt(e.target.value) || 1))
              }
              sx={{ width: 100 }}
              inputProps={{
                min: 1,
                style: { textAlign: "center", fontSize: 24 },
              }}
            />
            <IconButton
              color="primary"
              onClick={() => setReps(reps + 5)}
              size="large"
              sx={{
                backgroundColor: "rgba(0, 188, 212, 0.1)",
                "&:hover": { backgroundColor: "rgba(0, 188, 212, 0.2)" },
              }}
            >
              <AddIcon />
            </IconButton>
          </Box>
          <Typography
            variant="h5"
            textAlign="center"
            color="primary"
            fontWeight={600}
          >
            +{(selectedExerciseData?.xp_per_rep ?? 0) * reps} XP
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLog}
            disabled={logging}
            startIcon={logging ? <CircularProgress size={16} /> : <AddIcon />}
            size="large"
          >
            Log {reps} Reps
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Card Dialog */}
      <ShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        stats={{
          totalLevel,
          totalXp,
          currentStreak,
          todayXp,
        }}
        todayLogs={todayLogs}
        exercises={exercises}
      />

      {/* Level Up Modal */}
      <LevelUpModal
        open={levelUpModal.open}
        onClose={() => setLevelUpModal({ ...levelUpModal, open: false })}
        exerciseName={levelUpModal.exerciseName}
        newLevel={levelUpModal.newLevel}
        soundEnabled={soundEnabled}
      />

      {/* Personal Record Modal */}
      <PersonalRecordModal
        open={prModal.open}
        onClose={() => setPrModal({ open: false, record: null })}
        record={prModal.record}
        soundEnabled={soundEnabled}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ fontWeight: 500 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
