import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Button,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import DownloadIcon from "@mui/icons-material/Download";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { toPng } from "html-to-image";
import { useExercises } from "../contexts/ExerciseContext";
import { useUser } from "../contexts/UserContext";
import { getExerciseIcon, getLevelTier, TIER_COLORS, formatXp } from "../utils/xp";
import { calculatePersonalRecords, PersonalRecord } from "../utils/records";
import { celebrateAchievement } from "../utils/confetti";
import { ExerciseLog, Exercise } from "../types";

interface WeeklyStats {
  totalXp: number;
  totalReps: number;
  activeDays: number;
  logCount: number;
  exerciseBreakdown: Record<string, { reps: number; xp: number; levelGained: number }>;
  personalRecords: PersonalRecord[];
}

function getWeekDates(weeksAgo: number = 0): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start

  const mondayThisWeek = new Date(now);
  mondayThisWeek.setDate(now.getDate() - diff - (weeksAgo * 7));
  mondayThisWeek.setHours(0, 0, 0, 0);

  const sundayThisWeek = new Date(mondayThisWeek);
  sundayThisWeek.setDate(mondayThisWeek.getDate() + 6);
  sundayThisWeek.setHours(23, 59, 59, 999);

  const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    start: mondayThisWeek,
    end: sundayThisWeek,
    label: weeksAgo === 0
      ? "This Week"
      : weeksAgo === 1
        ? "Last Week"
        : `${formatDate(mondayThisWeek)} - ${formatDate(sundayThisWeek)}`,
  };
}

function calculateWeeklyStats(
  logs: ExerciseLog[],
  exercises: Exercise[],
  weekStart: Date,
  weekEnd: Date
): WeeklyStats {
  const weekLogs = logs.filter(log => {
    const logDate = new Date(log.logged_at);
    return logDate >= weekStart && logDate <= weekEnd;
  });

  const totalXp = weekLogs.reduce((sum, log) => sum + log.xp_earned, 0);
  const totalReps = weekLogs.reduce((sum, log) => sum + log.reps, 0);
  const activeDays = new Set(
    weekLogs.map(log => new Date(log.logged_at).toDateString())
  ).size;

  const exerciseBreakdown: Record<string, { reps: number; xp: number; levelGained: number }> = {};

  weekLogs.forEach(log => {
    const exercise = exercises.find(e => e.id === log.exercise_id);
    if (exercise) {
      if (!exerciseBreakdown[exercise.name]) {
        exerciseBreakdown[exercise.name] = { reps: 0, xp: 0, levelGained: 0 };
      }
      exerciseBreakdown[exercise.name].reps += log.reps;
      exerciseBreakdown[exercise.name].xp += log.xp_earned;
    }
  });

  // Calculate personal records set this week
  const weekRecords = calculatePersonalRecords(weekLogs, exercises);
  const allRecords = calculatePersonalRecords(logs, exercises);

  // Find records that were set this week (value matches week's best)
  const personalRecords = weekRecords.filter(weekRecord => {
    const allTimeRecord = allRecords.find(
      r => r.exerciseId === weekRecord.exerciseId && r.type === weekRecord.type
    );
    return allTimeRecord && allTimeRecord.value === weekRecord.value;
  });

  return {
    totalXp,
    totalReps,
    activeDays,
    logCount: weekLogs.length,
    exerciseBreakdown,
    personalRecords,
  };
}

function TrendIndicator({ current, previous, suffix = "" }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0) {
    return current > 0 ? (
      <Chip
        size="small"
        icon={<TrendingUpIcon />}
        label="New!"
        color="success"
        sx={{ height: 24 }}
      />
    ) : null;
  }

  const percentChange = ((current - previous) / previous) * 100;

  if (Math.abs(percentChange) < 1) {
    return (
      <Chip
        size="small"
        icon={<TrendingFlatIcon />}
        label="Same"
        sx={{ height: 24, backgroundColor: "rgba(255,255,255,0.1)" }}
      />
    );
  }

  const isUp = percentChange > 0;
  return (
    <Chip
      size="small"
      icon={isUp ? <TrendingUpIcon /> : <TrendingDownIcon />}
      label={`${isUp ? "+" : ""}${percentChange.toFixed(0)}%${suffix}`}
      color={isUp ? "success" : "warning"}
      sx={{ height: 24 }}
    />
  );
}

export default function WeeklyWrapUp() {
  const { exercises, recentLogs: logs } = useExercises();
  const { stats } = useUser();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [copying, setCopying] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const thisWeek = getWeekDates(0);
  const lastWeek = getWeekDates(1);

  const thisWeekStats = calculateWeeklyStats(logs, exercises, thisWeek.start, thisWeek.end);
  const lastWeekStats = calculateWeeklyStats(logs, exercises, lastWeek.start, lastWeek.end);

  // Sort exercises by XP earned this week
  const sortedExercises = Object.entries(thisWeekStats.exerciseBreakdown)
    .sort((a, b) => b[1].xp - a[1].xp);

  const topExercise = sortedExercises[0];

  const handleCopyToClipboard = async () => {
    if (!shareCardRef.current) return;

    setCopying(true);
    try {
      const dataUrl = await toPng(shareCardRef.current, {
        backgroundColor: "#121212",
        pixelRatio: 2,
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      setShowShareSuccess(true);
      celebrateAchievement();
      setTimeout(() => setShowShareSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
    setCopying(false);
  };

  const handleDownload = async () => {
    if (!shareCardRef.current) return;

    try {
      const dataUrl = await toPng(shareCardRef.current, {
        backgroundColor: "#121212",
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `geekfit-week-${thisWeek.start.toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to download:", error);
    }
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const activeDaySet = new Set(
    logs
      .filter(log => {
        const logDate = new Date(log.logged_at);
        return logDate >= thisWeek.start && logDate <= thisWeek.end;
      })
      .map(log => new Date(log.logged_at).getDay())
  );

  // Convert to Monday-based index
  const activeDaysMap = Array.from(activeDaySet).map(d => d === 0 ? 6 : d - 1);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary">
            Weekly Wrap-Up
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {thisWeek.start.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - {thisWeek.end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Copy as image">
            <IconButton
              onClick={handleCopyToClipboard}
              disabled={copying}
              sx={{
                backgroundColor: showShareSuccess ? "success.main" : "rgba(0, 188, 212, 0.1)",
                "&:hover": { backgroundColor: "rgba(0, 188, 212, 0.2)" },
              }}
            >
              {showShareSuccess ? <ShareIcon color="inherit" /> : <ContentCopyIcon color="primary" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Download as PNG">
            <IconButton
              onClick={handleDownload}
              sx={{
                backgroundColor: "rgba(0, 188, 212, 0.1)",
                "&:hover": { backgroundColor: "rgba(0, 188, 212, 0.2)" },
              }}
            >
              <DownloadIcon color="primary" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Shareable Card */}
      <Paper
        ref={shareCardRef}
        sx={{
          p: 3,
          mb: 3,
          background: "linear-gradient(135deg, rgba(0, 188, 212, 0.1), rgba(18, 18, 18, 1))",
          border: "1px solid rgba(0, 188, 212, 0.3)",
        }}
      >
        {/* Week Activity Strip */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 3 }}>
          {weekDays.map((day, i) => (
            <Box
              key={day}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: activeDaysMap.includes(i)
                  ? "primary.main"
                  : "rgba(255, 255, 255, 0.05)",
                border: activeDaysMap.includes(i)
                  ? "none"
                  : "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <Typography
                variant="caption"
                fontWeight={activeDaysMap.includes(i) ? 700 : 400}
                color={activeDaysMap.includes(i) ? "background.default" : "text.secondary"}
              >
                {day}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Main Stats Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h3" fontWeight={800} color="primary">
                {formatXp(thisWeekStats.totalXp)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                XP Earned
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <TrendIndicator current={thisWeekStats.totalXp} previous={lastWeekStats.totalXp} />
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h3" fontWeight={800} color="secondary.main">
                {thisWeekStats.totalReps.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Reps
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <TrendIndicator current={thisWeekStats.totalReps} previous={lastWeekStats.totalReps} />
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h3" fontWeight={800} color="warning.main">
                {thisWeekStats.activeDays}/7
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Days
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <TrendIndicator current={thisWeekStats.activeDays} previous={lastWeekStats.activeDays} />
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h3" fontWeight={800} sx={{ color: "#FF6B6B" }}>
                {thisWeekStats.logCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Workouts
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <TrendIndicator current={thisWeekStats.logCount} previous={lastWeekStats.logCount} />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Top Exercise */}
        {topExercise && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "rgba(0, 188, 212, 0.1)",
              border: "1px solid rgba(0, 188, 212, 0.2)",
              textAlign: "center",
            }}
          >
            <Typography variant="overline" color="text.secondary">
              Top Exercise This Week
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mt: 1 }}>
              <Typography fontSize={40}>{getExerciseIcon(topExercise[0])}</Typography>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {topExercise[0]}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {topExercise[1].reps.toLocaleString()} reps • {formatXp(topExercise[1].xp)} XP
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* GeekFit Branding */}
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mt: 3, gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Generated with
          </Typography>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{
              background: "linear-gradient(90deg, #00BCD4, #03DAC6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            GeekFit
          </Typography>
          <Typography variant="caption" color="text.secondary">
            💪
          </Typography>
        </Box>
      </Paper>

      {/* Detailed Breakdown */}
      <Grid container spacing={3}>
        {/* Exercise Breakdown */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Exercise Breakdown
            </Typography>

            {sortedExercises.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No exercises logged this week yet. Get moving! 💪
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sortedExercises.map(([name, data]) => {
                  const exercise = exercises.find(e => e.name === name);
                  const tier = exercise ? getLevelTier(exercise.current_level) : "bronze";
                  const tierColors = TIER_COLORS[tier];

                  return (
                    <Box key={name}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography fontSize={24}>{getExerciseIcon(name)}</Typography>
                          <Typography fontWeight={500}>{name}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {data.reps.toLocaleString()} reps
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={100}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: tierColors.main,
                            borderRadius: 1,
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        +{formatXp(data.xp)} XP
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Personal Records & Stats */}
        <Grid size={{ xs: 12, md: 5 }}>
          {/* Personal Records This Week */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <EmojiEventsIcon sx={{ color: "#FFD700" }} />
              <Typography variant="h6" fontWeight={600}>
                Records This Week
              </Typography>
            </Box>

            {thisWeekStats.personalRecords.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={2}>
                No new personal records this week
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {thisWeekStats.personalRecords.map((record, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: "rgba(255, 215, 0, 0.1)",
                      border: "1px solid rgba(255, 215, 0, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography fontSize={20}>{getExerciseIcon(record.exerciseName)}</Typography>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {record.exerciseName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.type === "single_session" ? "Single Session" : "Daily Total"}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="h6" fontWeight={700} color="warning.main">
                      {record.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          {/* Streak & Overall Stats */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Overall Progress
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: "rgba(255, 152, 0, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <WhatshotIcon sx={{ color: "warning.main" }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    {stats?.current_streak ?? 0} Days
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current Streak
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary">Total Level</Typography>
                <Typography fontWeight={600} color="primary">
                  {stats?.total_level ?? 0}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary">All-Time XP</Typography>
                <Typography fontWeight={600} color="primary">
                  {formatXp(stats?.total_xp ?? 0)}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary">Best Streak</Typography>
                <Typography fontWeight={600}>
                  {stats?.longest_streak ?? 0} days
                </Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary">Skills Tracked</Typography>
                <Typography fontWeight={600}>
                  {exercises.length}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Week-over-Week Comparison */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Week-over-Week Comparison
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="overline" color="text.secondary">This Week</Typography>
            <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
              <Box>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {formatXp(thisWeekStats.totalXp)}
                </Typography>
                <Typography variant="body2" color="text.secondary">XP</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} color="secondary.main">
                  {thisWeekStats.totalReps.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">Reps</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {thisWeekStats.activeDays}
                </Typography>
                <Typography variant="body2" color="text.secondary">Days</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="overline" color="text.secondary">Last Week</Typography>
            <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ opacity: 0.5 }}>
                  {formatXp(lastWeekStats.totalXp)}
                </Typography>
                <Typography variant="body2" color="text.secondary">XP</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ opacity: 0.5 }}>
                  {lastWeekStats.totalReps.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">Reps</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ opacity: 0.5 }}>
                  {lastWeekStats.activeDays}
                </Typography>
                <Typography variant="body2" color="text.secondary">Days</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
