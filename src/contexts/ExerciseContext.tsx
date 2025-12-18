import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Exercise, ExerciseLog, LogExerciseResult } from "../types";
import { useUser } from "./UserContext";

interface ExerciseContextType {
  exercises: Exercise[];
  recentLogs: ExerciseLog[];
  loading: boolean;
  refreshExercises: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  refreshData: () => Promise<void>;
  addExercise: (name: string, xpPerRep: number) => Promise<void>;
  deleteExercise: (id: number) => Promise<void>;
  logExercise: (exerciseId: number, reps: number) => Promise<LogExerciseResult>;
}

const ExerciseContext = createContext<ExerciseContextType | null>(null);

// Default exercises for when backend isn't ready
const defaultExercises: Exercise[] = [
  {
    id: 1,
    name: "Pushups",
    xp_per_rep: 10,
    total_xp: 0,
    current_level: 1,
    icon: "fitness_center",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Sit-ups",
    xp_per_rep: 8,
    total_xp: 0,
    current_level: 1,
    icon: "self_improvement",
    created_at: new Date().toISOString(),
  },
];

export function ExerciseProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recentLogs, setRecentLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshStats } = useUser();

  const refreshExercises = useCallback(async () => {
    try {
      const data = await invoke<Exercise[]>("get_exercises");
      setExercises(data);
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
      setExercises(defaultExercises);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const data = await invoke<ExerciseLog[]>("get_exercise_history", {
        days: 30,
      });
      setRecentLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      setRecentLogs([]);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([refreshExercises(), refreshLogs()]);
  }, [refreshExercises, refreshLogs]);

  const addExercise = async (name: string, xpPerRep: number) => {
    try {
      await invoke("add_exercise", { name, xpPerRep });
      await Promise.all([refreshExercises(), refreshStats()]);
    } catch (error) {
      console.error("Failed to add exercise:", error);
      throw error;
    }
  };

  const deleteExercise = async (id: number) => {
    try {
      await invoke("delete_exercise", { id });
      await Promise.all([refreshExercises(), refreshStats()]);
    } catch (error) {
      console.error("Failed to delete exercise:", error);
      throw error;
    }
  };

  const logExercise = async (
    exerciseId: number,
    reps: number
  ): Promise<LogExerciseResult> => {
    try {
      const result = await invoke<LogExerciseResult>("log_exercise", {
        exerciseId,
        reps,
      });
      await Promise.all([refreshStats(), refreshLogs(), refreshExercises()]);
      return result;
    } catch (error) {
      console.error("Failed to log exercise:", error);
      throw error;
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([refreshExercises(), refreshLogs()]);
      setLoading(false);
    };
    init();

    // Listen for exercise logged events from system tray
    const unlisten = listen("exercise-logged", () => {
      refreshData();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refreshExercises, refreshLogs, refreshData]);

  return (
    <ExerciseContext.Provider
      value={{
        exercises,
        recentLogs,
        loading,
        refreshExercises,
        refreshLogs,
        refreshData,
        addExercise,
        deleteExercise,
        logExercise,
      }}
    >
      {children}
    </ExerciseContext.Provider>
  );
}

export function useExercises() {
  const context = useContext(ExerciseContext);
  if (!context) {
    throw new Error("useExercises must be used within an ExerciseProvider");
  }
  return context;
}
