// Exercise types - each exercise has its own level like RuneScape skills
export interface Exercise {
  id: number;
  name: string;
  xp_per_rep: number;
  total_xp: number;       // XP earned for this specific exercise
  current_level: number;  // Level for this exercise (1-99)
  icon: string | null;
  created_at: string;
}

// Default exercise for onboarding selection
export interface DefaultExercise {
  name: string;
  xp_per_rep: number;
  icon: string;
  category: string;
}

// Exercise log types
export interface ExerciseLog {
  id: number;
  exercise_id: number;
  reps: number;
  xp_earned: number;
  logged_at: string;
}

// Result from logging an exercise
export interface LogExerciseResult {
  xp_earned: number;
  new_exercise_level: number;
  leveled_up: boolean;
}

// User stats - totals calculated from all exercises
export interface UserStats {
  total_xp: number;           // Sum of all exercise XP
  total_level: number;        // Sum of all exercise levels
  current_streak: number;
  longest_streak: number;
  last_exercise_date: string | null;
  exercise_count: number;     // Number of exercises (skills)
}

// Achievement types
export interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  unlocked_at: string | null;
}

// Settings
export interface Settings {
  reminder_enabled: boolean;
  reminder_interval_minutes: number;
  sound_enabled: boolean;
  daily_goal_xp: number;
  theme_mode?: string;
}

// Title tiers based on total level (sum of all exercise levels)
export const TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: "Novice Geek" },
  { minLevel: 10, title: "Fitness Apprentice" },
  { minLevel: 25, title: "Gym Initiate" },
  { minLevel: 50, title: "Strength Seeker" },
  { minLevel: 100, title: "Endurance Elite" },
  { minLevel: 200, title: "Fitness Warrior" },
  { minLevel: 500, title: "Legendary Geek" },
];

export function getTitleForLevel(totalLevel: number): string {
  for (let i = TITLES.length - 1; i >= 0; i--) {
    if (totalLevel >= TITLES[i].minLevel) {
      return TITLES[i].title;
    }
  }
  return TITLES[0].title;
}
