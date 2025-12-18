import { ExerciseLog, Exercise } from "../types";

export interface PersonalRecord {
  exerciseId: number;
  exerciseName: string;
  type: "single_session" | "daily_total" | "streak";
  value: number;
  date: string;
  isNew?: boolean;
}

export interface DailyStats {
  date: string;
  totalXp: number;
  totalReps: number;
  exerciseBreakdown: Record<number, { reps: number; xp: number }>;
}

// Calculate personal records from exercise logs
export function calculatePersonalRecords(
  logs: ExerciseLog[],
  exercises: Exercise[]
): PersonalRecord[] {
  const records: PersonalRecord[] = [];

  // Group logs by exercise
  const logsByExercise = logs.reduce((acc, log) => {
    if (!acc[log.exercise_id]) {
      acc[log.exercise_id] = [];
    }
    acc[log.exercise_id].push(log);
    return acc;
  }, {} as Record<number, ExerciseLog[]>);

  // Calculate single session records (most reps in one log)
  for (const [exerciseId, exerciseLogs] of Object.entries(logsByExercise)) {
    const exercise = exercises.find((e) => e.id === Number(exerciseId));
    if (!exercise) continue;

    // Best single session
    const bestSession = exerciseLogs.reduce(
      (best, log) => (log.reps > best.reps ? log : best),
      exerciseLogs[0]
    );

    if (bestSession) {
      records.push({
        exerciseId: Number(exerciseId),
        exerciseName: exercise.name,
        type: "single_session",
        value: bestSession.reps,
        date: bestSession.logged_at,
      });
    }

    // Best daily total
    const logsByDay = exerciseLogs.reduce((acc, log) => {
      const day = new Date(log.logged_at).toDateString();
      if (!acc[day]) {
        acc[day] = { reps: 0, date: log.logged_at };
      }
      acc[day].reps += log.reps;
      return acc;
    }, {} as Record<string, { reps: number; date: string }>);

    const bestDay = Object.values(logsByDay).reduce(
      (best, day) => (day.reps > best.reps ? day : best),
      Object.values(logsByDay)[0]
    );

    if (bestDay && bestDay.reps > (bestSession?.reps ?? 0)) {
      records.push({
        exerciseId: Number(exerciseId),
        exerciseName: exercise.name,
        type: "daily_total",
        value: bestDay.reps,
        date: bestDay.date,
      });
    }
  }

  return records;
}

// Check if a new log sets a personal record
export function checkForNewRecord(
  newLog: ExerciseLog,
  allLogs: ExerciseLog[],
  exercises: Exercise[]
): PersonalRecord | null {
  const exercise = exercises.find((e) => e.id === newLog.exercise_id);
  if (!exercise) return null;

  // Get all previous logs for this exercise (excluding the new one)
  const previousLogs = allLogs.filter(
    (log) => log.exercise_id === newLog.exercise_id && log.id !== newLog.id
  );

  // Check single session record
  const previousBest = previousLogs.reduce(
    (best, log) => Math.max(best, log.reps),
    0
  );

  if (newLog.reps > previousBest && previousBest > 0) {
    return {
      exerciseId: newLog.exercise_id,
      exerciseName: exercise.name,
      type: "single_session",
      value: newLog.reps,
      date: newLog.logged_at,
      isNew: true,
    };
  }

  // Check daily total record
  const today = new Date(newLog.logged_at).toDateString();
  const todayTotal =
    previousLogs
      .filter((log) => new Date(log.logged_at).toDateString() === today)
      .reduce((sum, log) => sum + log.reps, 0) + newLog.reps;

  const previousDailyBests = previousLogs.reduce((acc, log) => {
    const day = new Date(log.logged_at).toDateString();
    if (day !== today) {
      acc[day] = (acc[day] || 0) + log.reps;
    }
    return acc;
  }, {} as Record<string, number>);

  const previousBestDaily = Math.max(0, ...Object.values(previousDailyBests));

  if (todayTotal > previousBestDaily && previousBestDaily > 0) {
    return {
      exerciseId: newLog.exercise_id,
      exerciseName: exercise.name,
      type: "daily_total",
      value: todayTotal,
      date: newLog.logged_at,
      isNew: true,
    };
  }

  return null;
}

// Get daily statistics
export function getDailyStats(logs: ExerciseLog[]): DailyStats[] {
  const statsByDay = logs.reduce((acc, log) => {
    const day = new Date(log.logged_at).toDateString();
    if (!acc[day]) {
      acc[day] = {
        date: day,
        totalXp: 0,
        totalReps: 0,
        exerciseBreakdown: {},
      };
    }
    acc[day].totalXp += log.xp_earned;
    acc[day].totalReps += log.reps;

    if (!acc[day].exerciseBreakdown[log.exercise_id]) {
      acc[day].exerciseBreakdown[log.exercise_id] = { reps: 0, xp: 0 };
    }
    acc[day].exerciseBreakdown[log.exercise_id].reps += log.reps;
    acc[day].exerciseBreakdown[log.exercise_id].xp += log.xp_earned;

    return acc;
  }, {} as Record<string, DailyStats>);

  return Object.values(statsByDay).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// Get weekly summary
export function getWeeklySummary(logs: ExerciseLog[], exercises: Exercise[]) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weekLogs = logs.filter(
    (log) => new Date(log.logged_at) >= oneWeekAgo
  );

  const totalXp = weekLogs.reduce((sum, log) => sum + log.xp_earned, 0);
  const totalReps = weekLogs.reduce((sum, log) => sum + log.reps, 0);
  const uniqueDays = new Set(
    weekLogs.map((log) => new Date(log.logged_at).toDateString())
  ).size;

  const exerciseBreakdown = weekLogs.reduce((acc, log) => {
    const exercise = exercises.find((e) => e.id === log.exercise_id);
    if (exercise) {
      if (!acc[exercise.name]) {
        acc[exercise.name] = { reps: 0, xp: 0 };
      }
      acc[exercise.name].reps += log.reps;
      acc[exercise.name].xp += log.xp_earned;
    }
    return acc;
  }, {} as Record<string, { reps: number; xp: number }>);

  return {
    totalXp,
    totalReps,
    activeDays: uniqueDays,
    exerciseBreakdown,
    logCount: weekLogs.length,
  };
}
