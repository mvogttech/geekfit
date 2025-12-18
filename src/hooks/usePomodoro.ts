import { useState, useEffect, useCallback, useRef } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

export type PomodoroPhase = "work" | "break" | "idle";

interface PomodoroState {
  phase: PomodoroPhase;
  timeRemaining: number; // in seconds
  isRunning: boolean;
  sessionsCompleted: number;
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
}

const DEFAULT_WORK_DURATION = 25; // minutes
const DEFAULT_BREAK_DURATION = 5; // minutes

export function usePomodoro() {
  const [state, setState] = useState<PomodoroState>({
    phase: "idle",
    timeRemaining: DEFAULT_WORK_DURATION * 60,
    isRunning: false,
    sessionsCompleted: 0,
    workDuration: DEFAULT_WORK_DURATION,
    breakDuration: DEFAULT_BREAK_DURATION,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Play a pleasant chime
      oscillator.frequency.value = 523.25; // C5
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);

      // Second tone
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 659.25; // E5
        osc2.type = "sine";
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.5);
      }, 200);
    } catch (error) {
      console.warn("Audio not available:", error);
    }
  }, []);

  // Send system notification
  const sendPomodoroNotification = useCallback(async (title: string, body: string) => {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }
      if (permissionGranted) {
        await sendNotification({ title, body });
      }
    } catch (error) {
      console.warn("Notification not available:", error);
    }
  }, []);

  // Handle phase transitions
  const transitionPhase = useCallback(() => {
    setState((prev) => {
      if (prev.phase === "work") {
        // Work complete - start break
        playNotificationSound();
        sendPomodoroNotification(
          "Time for a break! 💪",
          "Great focus session! Take 5 minutes to do some exercises."
        );
        return {
          ...prev,
          phase: "break",
          timeRemaining: prev.breakDuration * 60,
          sessionsCompleted: prev.sessionsCompleted + 1,
        };
      } else if (prev.phase === "break") {
        // Break complete - back to work
        playNotificationSound();
        sendPomodoroNotification(
          "Break's over! 🚀",
          "Time to get back to work. You've got this!"
        );
        return {
          ...prev,
          phase: "work",
          timeRemaining: prev.workDuration * 60,
        };
      }
      return prev;
    });
  }, [playNotificationSound, sendPomodoroNotification]);

  // Timer tick
  useEffect(() => {
    if (state.isRunning && state.timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.timeRemaining <= 1) {
            transitionPhase();
            return prev;
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [state.isRunning, state.timeRemaining, transitionPhase]);

  // Start the timer
  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      phase: prev.phase === "idle" ? "work" : prev.phase,
      timeRemaining: prev.phase === "idle" ? prev.workDuration * 60 : prev.timeRemaining,
    }));
  }, []);

  // Pause the timer
  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  // Reset the timer
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setState((prev) => ({
      ...prev,
      phase: "idle",
      timeRemaining: prev.workDuration * 60,
      isRunning: false,
    }));
  }, []);

  // Skip to next phase
  const skip = useCallback(() => {
    transitionPhase();
  }, [transitionPhase]);

  // Update durations
  const setWorkDuration = useCallback((minutes: number) => {
    setState((prev) => ({
      ...prev,
      workDuration: minutes,
      timeRemaining: prev.phase === "work" || prev.phase === "idle" ? minutes * 60 : prev.timeRemaining,
    }));
  }, []);

  const setBreakDuration = useCallback((minutes: number) => {
    setState((prev) => ({
      ...prev,
      breakDuration: minutes,
      timeRemaining: prev.phase === "break" ? minutes * 60 : prev.timeRemaining,
    }));
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    ...state,
    formattedTime: formatTime(state.timeRemaining),
    start,
    pause,
    reset,
    skip,
    setWorkDuration,
    setBreakDuration,
  };
}
