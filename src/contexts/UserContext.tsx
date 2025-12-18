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
import { UserStats, Settings } from "../types";

interface UserContextType {
  stats: UserStats | null;
  settings: Settings | null;
  loading: boolean;
  refreshStats: () => Promise<void>;
  updateSettings: (key: string, value: string) => Promise<void>;
}

const defaultStats: UserStats = {
  total_xp: 0,
  total_level: 2,  // Default 2 exercises at level 1 each
  current_streak: 0,
  longest_streak: 0,
  last_exercise_date: null,
  exercise_count: 2,
};

const defaultSettings: Settings = {
  reminder_enabled: true,
  reminder_interval_minutes: 120,
  sound_enabled: true,
  daily_goal_xp: 500,
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    try {
      const userStats = await invoke<UserStats>("get_stats");
      setStats(userStats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      // Use defaults if backend not ready
      setStats(defaultStats);
    }
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = await invoke<Settings>("get_settings");
      setSettings(userSettings);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setSettings(defaultSettings);
    }
  };

  const updateSettings = async (key: string, value: string) => {
    try {
      await invoke("update_setting", { key, value });
      await loadSettings();
    } catch (error) {
      console.error("Failed to update setting:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([refreshStats(), loadSettings()]);
      setLoading(false);
    };
    init();

    // Listen for exercise logged events from system tray
    const unlisten = listen("exercise-logged", () => {
      refreshStats();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refreshStats]);

  return (
    <UserContext.Provider
      value={{
        stats,
        settings,
        loading,
        refreshStats,
        updateSettings,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
