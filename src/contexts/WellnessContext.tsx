import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";

// Wellness settings interface
interface WellnessSettings {
  eyeCareEnabled: boolean;
  eyeCareInterval: number; // in minutes (default 20 for 20-20-20 rule)
  hydrationEnabled: boolean;
  hydrationInterval: number; // in minutes
  hydrationGoal: number; // glasses per day
  postureEnabled: boolean;
  postureInterval: number; // in minutes
  focusModeEnabled: boolean;
  focusModeThreshold: number; // minutes of activity before reminder
}

interface WellnessStats {
  waterIntake: number; // glasses today
  lastEyeBreak: Date | null;
  lastPostureCheck: Date | null;
  focusMinutesToday: number;
  lastActivityTime: Date;
}

interface WellnessContextType {
  settings: WellnessSettings;
  stats: WellnessStats;
  updateSettings: (key: keyof WellnessSettings, value: boolean | number) => void;
  logWater: () => void;
  resetWater: () => void;
  acknowledgeEyeBreak: () => void;
  acknowledgePostureCheck: () => void;
  isInFocusMode: boolean;
  ergonomicTip: string;
  refreshTip: () => void;
}

const defaultSettings: WellnessSettings = {
  eyeCareEnabled: true,
  eyeCareInterval: 20,
  hydrationEnabled: true,
  hydrationInterval: 60,
  hydrationGoal: 8,
  postureEnabled: true,
  postureInterval: 45,
  focusModeEnabled: true,
  focusModeThreshold: 90,
};

const defaultStats: WellnessStats = {
  waterIntake: 0,
  lastEyeBreak: null,
  lastPostureCheck: null,
  focusMinutesToday: 0,
  lastActivityTime: new Date(),
};

// Ergonomic tips database
const ERGONOMIC_TIPS = [
  {
    category: "posture",
    tip: "Keep your feet flat on the floor or on a footrest. Your thighs should be parallel to the ground.",
  },
  {
    category: "posture",
    tip: "Your monitor should be an arm's length away, with the top of the screen at or slightly below eye level.",
  },
  {
    category: "posture",
    tip: "Keep your shoulders relaxed and your elbows close to your body at a 90-degree angle.",
  },
  {
    category: "posture",
    tip: "Avoid slouching - imagine a string pulling you up from the top of your head.",
  },
  {
    category: "posture",
    tip: "Your wrists should be in a neutral position while typing, not bent up or down.",
  },
  {
    category: "eyes",
    tip: "Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.",
  },
  {
    category: "eyes",
    tip: "Reduce screen glare by positioning your monitor perpendicular to windows.",
  },
  {
    category: "eyes",
    tip: "Blink often! We tend to blink less when looking at screens, causing dry eyes.",
  },
  {
    category: "eyes",
    tip: "Consider using a blue light filter or glasses to reduce eye strain.",
  },
  {
    category: "movement",
    tip: "Stand up and stretch every 30-60 minutes. Your body isn't designed for prolonged sitting.",
  },
  {
    category: "movement",
    tip: "Try a standing desk or alternate between sitting and standing throughout the day.",
  },
  {
    category: "movement",
    tip: "Take a short walk during phone calls or while thinking through a problem.",
  },
  {
    category: "hydration",
    tip: "Keep a water bottle at your desk and set reminders to drink regularly.",
  },
  {
    category: "hydration",
    tip: "Dehydration can cause fatigue and reduced concentration. Aim for 8 glasses a day.",
  },
  {
    category: "desk",
    tip: "Your keyboard and mouse should be at the same level, keeping your wrists straight.",
  },
  {
    category: "desk",
    tip: "Use a document holder next to your monitor to avoid constant neck turning.",
  },
  {
    category: "desk",
    tip: "Ensure your chair provides good lumbar support for your lower back.",
  },
  {
    category: "general",
    tip: "Take micro-breaks: Look away from screen, stretch fingers, roll shoulders - even 30 seconds helps.",
  },
  {
    category: "general",
    tip: "Natural lighting is best. If not possible, use warm-toned artificial light.",
  },
  {
    category: "general",
    tip: "Keep frequently used items within arm's reach to avoid repetitive stretching.",
  },
];

const WellnessContext = createContext<WellnessContextType | null>(null);

export function WellnessProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WellnessSettings>(defaultSettings);
  const [stats, setStats] = useState<WellnessStats>(defaultStats);
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await invoke<Record<string, string>>("get_wellness_settings");
        if (result) {
          setSettings({
            eyeCareEnabled: result.eye_care_enabled !== "false",
            eyeCareInterval: parseInt(result.eye_care_interval) || 20,
            hydrationEnabled: result.hydration_enabled !== "false",
            hydrationInterval: parseInt(result.hydration_interval) || 60,
            hydrationGoal: parseInt(result.hydration_goal) || 8,
            postureEnabled: result.posture_enabled !== "false",
            postureInterval: parseInt(result.posture_interval) || 45,
            focusModeEnabled: result.focus_mode_enabled !== "false",
            focusModeThreshold: parseInt(result.focus_mode_threshold) || 90,
          });
        }
      } catch {
        // Use defaults
      }

      // Load today's water intake
      const savedWater = localStorage.getItem("geekfit_water_today");
      const savedDate = localStorage.getItem("geekfit_water_date");
      const today = new Date().toDateString();

      if (savedDate === today && savedWater) {
        setStats(prev => ({ ...prev, waterIntake: parseInt(savedWater) }));
      }
    };

    loadSettings();
  }, []);

  // Note: Reminder notifications are now handled by the Rust backend
  // This runs even when the app window is hidden/minimized to tray
  // Reset backend timers when settings change
  useEffect(() => {
    // Reset all reminder timers when app starts to sync with backend
    invoke("reset_reminder_timer", { reminderType: "all" }).catch(() => {
      // Ignore errors - backend may not be ready yet
    });
  }, []);

  // Focus mode detection - track keyboard/mouse activity
  useEffect(() => {
    if (!settings.focusModeEnabled) {
      setIsInFocusMode(false);
      return;
    }

    let activityTimeout: ReturnType<typeof setTimeout>;
    let focusStartTime: Date | null = null;

    const handleActivity = () => {
      setStats(prev => ({ ...prev, lastActivityTime: new Date() }));

      // If we weren't in focus mode, start tracking
      if (!focusStartTime) {
        focusStartTime = new Date();
      }

      // Clear existing timeout
      clearTimeout(activityTimeout);

      // If no activity for 5 minutes, exit focus mode
      activityTimeout = setTimeout(() => {
        setIsInFocusMode(false);
        focusStartTime = null;
      }, 5 * 60 * 1000);

      // Check if we've been active long enough to enter focus mode
      if (focusStartTime) {
        const focusMinutes = (Date.now() - focusStartTime.getTime()) / 60000;
        if (focusMinutes >= 10) {
          // 10 minutes of continuous activity = focus mode
          setIsInFocusMode(true);
        }
      }
    };

    window.addEventListener("keydown", handleActivity);
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("click", handleActivity);

    return () => {
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("click", handleActivity);
      clearTimeout(activityTimeout);
    };
  }, [settings.focusModeEnabled]);

  const updateSettings = useCallback(
    async (key: keyof WellnessSettings, value: boolean | number) => {
      setSettings(prev => ({ ...prev, [key]: value }));

      // Convert key to snake_case for backend
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      try {
        await invoke("update_setting", { key: `wellness_${snakeKey}`, value: String(value) });
      } catch (error) {
        console.error("Failed to save wellness setting:", error);
      }
    },
    []
  );

  const logWater = useCallback(() => {
    setStats(prev => {
      const newIntake = prev.waterIntake + 1;
      localStorage.setItem("geekfit_water_today", String(newIntake));
      localStorage.setItem("geekfit_water_date", new Date().toDateString());
      return { ...prev, waterIntake: newIntake };
    });
    // Reset backend hydration timer
    invoke("reset_reminder_timer", { reminderType: "hydration" }).catch(() => {});
  }, []);

  const resetWater = useCallback(() => {
    setStats(prev => ({ ...prev, waterIntake: 0 }));
    localStorage.setItem("geekfit_water_today", "0");
    localStorage.setItem("geekfit_water_date", new Date().toDateString());
  }, []);

  const acknowledgeEyeBreak = useCallback(() => {
    setStats(prev => ({ ...prev, lastEyeBreak: new Date() }));
    // Reset backend timer so next reminder is delayed
    invoke("reset_reminder_timer", { reminderType: "eye_care" }).catch(() => {});
  }, []);

  const acknowledgePostureCheck = useCallback(() => {
    setStats(prev => ({ ...prev, lastPostureCheck: new Date() }));
    // Reset backend timer so next reminder is delayed
    invoke("reset_reminder_timer", { reminderType: "posture" }).catch(() => {});
  }, []);

  const refreshTip = useCallback(() => {
    setCurrentTipIndex(Math.floor(Math.random() * ERGONOMIC_TIPS.length));
  }, []);

  return (
    <WellnessContext.Provider
      value={{
        settings,
        stats,
        updateSettings,
        logWater,
        resetWater,
        acknowledgeEyeBreak,
        acknowledgePostureCheck,
        isInFocusMode,
        ergonomicTip: ERGONOMIC_TIPS[currentTipIndex].tip,
        refreshTip,
      }}
    >
      {children}
    </WellnessContext.Provider>
  );
}

export function useWellness() {
  const context = useContext(WellnessContext);
  if (!context) {
    throw new Error("useWellness must be used within a WellnessProvider");
  }
  return context;
}

// Export tips for use elsewhere
export { ERGONOMIC_TIPS };
