/**
 * RuneScape-inspired XP formula for leveling
 * XP required for each level follows an exponential curve
 */

// Calculate total XP required to reach a specific level
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;

  let total = 0;
  for (let i = 1; i < level; i++) {
    total += Math.floor(i + 300 * Math.pow(2, i / 7));
  }
  return Math.floor(total / 4);
}

// Calculate current level from total XP
export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp && level < 99) {
    level++;
  }
  return level;
}

// Calculate XP progress within current level (0-100%)
export function xpProgressPercent(totalXp: number): number {
  const currentLevel = levelFromXp(totalXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);

  if (nextLevelXp === currentLevelXp) return 100;

  const xpIntoLevel = totalXp - currentLevelXp;
  const xpNeededForLevel = nextLevelXp - currentLevelXp;

  return Math.min(100, Math.floor((xpIntoLevel / xpNeededForLevel) * 100));
}

// Get XP remaining until next level
export function xpToNextLevel(totalXp: number): number {
  const currentLevel = levelFromXp(totalXp);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXp - totalXp);
}

// Format large numbers with K/M suffix
export function formatXp(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

// Get XP into current level and XP needed for next level
export function xpProgress(totalXp: number): { current: number; needed: number } {
  const currentLevel = levelFromXp(totalXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);

  return {
    current: totalXp - currentLevelXp,
    needed: nextLevelXp - currentLevelXp,
  };
}

// Level tier colors (RuneScape-inspired)
export type LevelTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

export function getLevelTier(level: number): LevelTier {
  if (level >= 99) return "master";
  if (level >= 75) return "diamond";
  if (level >= 50) return "platinum";
  if (level >= 25) return "gold";
  if (level >= 10) return "silver";
  return "bronze";
}

export const TIER_COLORS: Record<LevelTier, { main: string; bg: string; glow: string }> = {
  bronze: {
    main: "#CD7F32",
    bg: "rgba(205, 127, 50, 0.15)",
    glow: "rgba(205, 127, 50, 0.4)",
  },
  silver: {
    main: "#C0C0C0",
    bg: "rgba(192, 192, 192, 0.15)",
    glow: "rgba(192, 192, 192, 0.4)",
  },
  gold: {
    main: "#FFD700",
    bg: "rgba(255, 215, 0, 0.15)",
    glow: "rgba(255, 215, 0, 0.4)",
  },
  platinum: {
    main: "#E5E4E2",
    bg: "rgba(229, 228, 226, 0.15)",
    glow: "rgba(229, 228, 226, 0.4)",
  },
  diamond: {
    main: "#B9F2FF",
    bg: "rgba(185, 242, 255, 0.15)",
    glow: "rgba(185, 242, 255, 0.4)",
  },
  master: {
    main: "#FF4500",
    bg: "linear-gradient(135deg, rgba(255, 69, 0, 0.2), rgba(255, 215, 0, 0.2))",
    glow: "rgba(255, 69, 0, 0.5)",
  },
};

// Default exercise icons - comprehensive mapping for all exercises
export const EXERCISE_ICONS: Record<string, string> = {
  // Upper body
  pushups: "💪",
  "push-ups": "💪",
  "arm circles": "🔄",

  // Core
  "sit-ups": "🏋️",
  situps: "🏋️",
  crunches: "🏋️",
  "plank (10 sec)": "🧘",
  plank: "🧘",
  planks: "🧘",
  "leg raises": "🦵",
  "mountain climbers": "⛰️",

  // Lower body
  squats: "🦵",
  lunges: "🏃",
  "calf raises": "🦶",
  "wall sit (10 sec)": "🧱",
  "wall sit": "🧱",
  "side leg raises": "🦵",
  "step-ups": "📶",

  // Cardio
  "jumping jacks": "⭐",
  "high knees": "🦵",
  burpees: "🔥",
  "stair climbs": "🪜",
  "marching in place": "🚶",
  running: "🏃",
  walking: "🚶",

  // Stretches & Mobility
  "neck stretches": "🦒",
  "shoulder shrugs": "🤷",
  "wrist circles": "⌨️",
  "toe touches": "🦶",
  "hip circles": "💃",
  "torso twists": "🔄",
  "ankle rotations": "🦶",
  "cat-cow stretch": "🐱",
  "chest opener": "🫁",
  "quad stretch": "🦵",
  yoga: "🧘",
  stretching: "🤸",

  // Fallback
  default: "🎯",
};

export function getExerciseIcon(name: string): string {
  const key = name.toLowerCase();
  return EXERCISE_ICONS[key] || EXERCISE_ICONS.default;
}

// Sample XP values for testing
// Level 1: 0 XP
// Level 2: 83 XP
// Level 5: 388 XP
// Level 10: 1,154 XP
// Level 20: 4,470 XP
// Level 30: 13,363 XP
// Level 50: 101,333 XP
