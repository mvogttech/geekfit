// Collectible badges with artwork and rarity tiers
export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon name
  rarity: BadgeRarity;
  category: "milestone" | "streak" | "skill" | "special" | "wellness";
  condition: string; // Human-readable unlock condition
  xpBonus?: number;
}

// Rarity colors
export const RARITY_COLORS: Record<BadgeRarity, { bg: string; border: string; text: string }> = {
  common: { bg: "rgba(158, 158, 158, 0.1)", border: "#9e9e9e", text: "#9e9e9e" },
  uncommon: { bg: "rgba(76, 175, 80, 0.1)", border: "#4caf50", text: "#4caf50" },
  rare: { bg: "rgba(33, 150, 243, 0.1)", border: "#2196f3", text: "#2196f3" },
  epic: { bg: "rgba(156, 39, 176, 0.1)", border: "#9c27b0", text: "#9c27b0" },
  legendary: { bg: "rgba(255, 152, 0, 0.1)", border: "#ff9800", text: "#ff9800" },
};

export const BADGES: Badge[] = [
  // Milestone badges
  {
    id: "first_steps",
    key: "first_exercise",
    name: "First Steps",
    description: "Complete your first exercise",
    icon: "👶",
    rarity: "common",
    category: "milestone",
    condition: "Complete 1 exercise",
  },
  {
    id: "getting_started",
    key: "ten_exercises",
    name: "Getting Started",
    description: "Complete 10 exercises total",
    icon: "🚶",
    rarity: "common",
    category: "milestone",
    condition: "Complete 10 exercises",
  },
  {
    id: "centurion",
    key: "hundred_exercises",
    name: "Centurion",
    description: "Complete 100 exercises total",
    icon: "💯",
    rarity: "uncommon",
    category: "milestone",
    condition: "Complete 100 exercises",
  },
  {
    id: "thousand_club",
    key: "thousand_exercises",
    name: "Thousand Club",
    description: "Complete 1,000 exercises total",
    icon: "🏆",
    rarity: "rare",
    category: "milestone",
    condition: "Complete 1,000 exercises",
  },
  {
    id: "legend",
    key: "ten_thousand_exercises",
    name: "Living Legend",
    description: "Complete 10,000 exercises total",
    icon: "👑",
    rarity: "legendary",
    category: "milestone",
    condition: "Complete 10,000 exercises",
  },

  // Streak badges
  {
    id: "week_warrior",
    key: "week_streak",
    name: "Week Warrior",
    description: "Maintain a 7-day exercise streak",
    icon: "🔥",
    rarity: "uncommon",
    category: "streak",
    condition: "7-day streak",
  },
  {
    id: "fortnight_fighter",
    key: "fortnight_streak",
    name: "Fortnight Fighter",
    description: "Maintain a 14-day exercise streak",
    icon: "⚡",
    rarity: "rare",
    category: "streak",
    condition: "14-day streak",
  },
  {
    id: "monthly_master",
    key: "month_streak",
    name: "Monthly Master",
    description: "Maintain a 30-day exercise streak",
    icon: "🌟",
    rarity: "epic",
    category: "streak",
    condition: "30-day streak",
  },
  {
    id: "quarterly_champion",
    key: "quarter_streak",
    name: "Quarterly Champion",
    description: "Maintain a 90-day exercise streak",
    icon: "💎",
    rarity: "epic",
    category: "streak",
    condition: "90-day streak",
  },
  {
    id: "yearly_legend",
    key: "year_streak",
    name: "Yearly Legend",
    description: "Maintain a 365-day exercise streak",
    icon: "🏅",
    rarity: "legendary",
    category: "streak",
    condition: "365-day streak",
  },

  // Skill level badges
  {
    id: "apprentice",
    key: "skill_10",
    name: "Apprentice",
    description: "Get any exercise to level 10",
    icon: "📈",
    rarity: "uncommon",
    category: "skill",
    condition: "Level 10 in any skill",
  },
  {
    id: "journeyman",
    key: "skill_25",
    name: "Journeyman",
    description: "Get any exercise to level 25",
    icon: "💪",
    rarity: "rare",
    category: "skill",
    condition: "Level 25 in any skill",
  },
  {
    id: "expert",
    key: "skill_50",
    name: "Expert",
    description: "Get any exercise to level 50",
    icon: "🎯",
    rarity: "epic",
    category: "skill",
    condition: "Level 50 in any skill",
  },
  {
    id: "master",
    key: "skill_75",
    name: "Master",
    description: "Get any exercise to level 75",
    icon: "🏋️",
    rarity: "epic",
    category: "skill",
    condition: "Level 75 in any skill",
  },
  {
    id: "grandmaster",
    key: "skill_99",
    name: "Grandmaster",
    description: "Get any exercise to level 99 (max)",
    icon: "⭐",
    rarity: "legendary",
    category: "skill",
    condition: "Level 99 in any skill",
  },

  // Total level badges
  {
    id: "total_century",
    key: "total_100",
    name: "Century Club",
    description: "Reach 100 total level",
    icon: "🎖️",
    rarity: "rare",
    category: "skill",
    condition: "100 total level",
  },
  {
    id: "total_500",
    key: "total_500",
    name: "Half Millennium",
    description: "Reach 500 total level",
    icon: "🌠",
    rarity: "epic",
    category: "skill",
    condition: "500 total level",
  },
  {
    id: "total_1000",
    key: "total_1000",
    name: "Millennial",
    description: "Reach 1,000 total level",
    icon: "✨",
    rarity: "legendary",
    category: "skill",
    condition: "1,000 total level",
  },

  // Special badges
  {
    id: "variety",
    key: "variety",
    name: "Jack of All Trades",
    description: "Log 5 different types of exercises",
    icon: "🎭",
    rarity: "uncommon",
    category: "special",
    condition: "Log 5 different exercises",
  },
  {
    id: "variety_master",
    key: "variety_15",
    name: "Renaissance Geek",
    description: "Log 15 different types of exercises",
    icon: "🎨",
    rarity: "rare",
    category: "special",
    condition: "Log 15 different exercises",
  },
  {
    id: "century_pushups",
    key: "hundred_pushups",
    name: "Push It Real Good",
    description: "Complete 100 pushups in a single day",
    icon: "💥",
    rarity: "rare",
    category: "special",
    condition: "100 pushups in one day",
  },
  {
    id: "early_bird",
    key: "early_bird",
    name: "Early Bird",
    description: "Exercise before 7 AM",
    icon: "🌅",
    rarity: "uncommon",
    category: "special",
    condition: "Exercise before 7 AM",
  },
  {
    id: "night_owl",
    key: "night_owl",
    name: "Night Owl",
    description: "Exercise after 11 PM",
    icon: "🦉",
    rarity: "uncommon",
    category: "special",
    condition: "Exercise after 11 PM",
  },
  {
    id: "weekend_warrior",
    key: "weekend_warrior",
    name: "Weekend Warrior",
    description: "Exercise every day of a weekend",
    icon: "📅",
    rarity: "common",
    category: "special",
    condition: "Exercise Sat & Sun",
  },

  // Wellness badges
  {
    id: "hydrated",
    key: "hydration_goal",
    name: "Well Hydrated",
    description: "Reach your daily water goal",
    icon: "💧",
    rarity: "common",
    category: "wellness",
    condition: "Reach daily water goal",
  },
  {
    id: "hydration_week",
    key: "hydration_week",
    name: "Water Week",
    description: "Reach water goal 7 days in a row",
    icon: "🌊",
    rarity: "uncommon",
    category: "wellness",
    condition: "7-day hydration streak",
  },
  {
    id: "eye_saver",
    key: "eye_breaks_10",
    name: "Eye Saver",
    description: "Take 10 eye breaks in one day",
    icon: "👁️",
    rarity: "uncommon",
    category: "wellness",
    condition: "10 eye breaks in a day",
  },
  {
    id: "posture_pro",
    key: "posture_checks_10",
    name: "Posture Pro",
    description: "Complete 10 posture checks in one day",
    icon: "🧘",
    rarity: "uncommon",
    category: "wellness",
    condition: "10 posture checks in a day",
  },
  {
    id: "balanced_life",
    key: "all_wellness",
    name: "Balanced Life",
    description: "Use all wellness features in one day",
    icon: "⚖️",
    rarity: "rare",
    category: "wellness",
    condition: "Use all wellness features",
  },
];

// Get badge by key
export function getBadgeByKey(key: string): Badge | undefined {
  return BADGES.find((b) => b.key === key);
}

// Get badges by category
export function getBadgesByCategory(category: Badge["category"]): Badge[] {
  return BADGES.filter((b) => b.category === category);
}

// Get badges by rarity
export function getBadgesByRarity(rarity: BadgeRarity): Badge[] {
  return BADGES.filter((b) => b.rarity === rarity);
}
