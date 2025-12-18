import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { ExerciseLog } from "../types";
import { useExercises } from "../contexts/ExerciseContext";

interface LogWithExercise extends ExerciseLog {
  exercise_name?: string;
}

export default function History() {
  const { exercises } = useExercises();
  const [logs, setLogs] = useState<LogWithExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const data = await invoke<ExerciseLog[]>("get_exercise_history", {
          days,
        });
        // Map exercise names
        const logsWithNames = data.map((log) => ({
          ...log,
          exercise_name:
            exercises.find((e) => e.id === log.exercise_id)?.name ?? "Unknown",
        }));
        setLogs(logsWithNames);
      } catch (error) {
        console.error("Failed to fetch history:", error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [days, exercises]);

  // Calculate daily totals
  const dailyTotals = logs.reduce(
    (acc, log) => {
      const date = new Date(log.logged_at).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { xp: 0, reps: 0, count: 0 };
      }
      acc[date].xp += log.xp_earned;
      acc[date].reps += log.reps;
      acc[date].count += 1;
      return acc;
    },
    {} as Record<string, { xp: number; reps: number; count: number }>
  );

  const totalXp = logs.reduce((sum, log) => sum + log.xp_earned, 0);
  const totalReps = logs.reduce((sum, log) => sum + log.reps, 0);

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          History
        </Typography>
        <ToggleButtonGroup
          value={days}
          exclusive
          onChange={(_, newDays) => newDays && setDays(newDays)}
          size="small"
        >
          <ToggleButton value={7}>7 Days</ToggleButton>
          <ToggleButton value={30}>30 Days</ToggleButton>
          <ToggleButton value={90}>90 Days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Total XP ({days} days)
            </Typography>
            <Typography variant="h4" color="primary" fontWeight={700}>
              {totalXp.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Total Reps
            </Typography>
            <Typography variant="h4" color="secondary" fontWeight={700}>
              {totalReps.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 150 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Exercises Logged
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {logs.length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Daily Breakdown */}
      <Typography variant="h6" fontWeight={600} mb={2}>
        Daily Breakdown
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
        {Object.entries(dailyTotals)
          .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
          .slice(0, 7)
          .map(([date, data]) => (
            <Chip
              key={date}
              label={`${date}: ${data.xp} XP`}
              color="primary"
              variant="outlined"
            />
          ))}
      </Box>

      {/* Activity Log Table */}
      <Typography variant="h6" fontWeight={600} mb={2}>
        Activity Log
      </Typography>
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Exercise</TableCell>
              <TableCell align="right">Reps</TableCell>
              <TableCell align="right">XP Earned</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No exercise logs in the last {days} days
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs
                .sort(
                  (a, b) =>
                    new Date(b.logged_at).getTime() -
                    new Date(a.logged_at).getTime()
                )
                .map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.logged_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.exercise_name}</TableCell>
                    <TableCell align="right">{log.reps}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`+${log.xp_earned} XP`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
