// Localization system for GeekFit
// Simple context-based i18n that's easy to extend

export type Locale = "en" | "es" | "fr" | "de" | "pt" | "ja" | "zh" | "ko";

export interface LocaleInfo {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
];

// Translation keys organized by section
export interface Translations {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    close: string;
    confirm: string;
    loading: string;
    error: string;
    success: string;
    settings: string;
    level: string;
    xp: string;
    streak: string;
    today: string;
    yesterday: string;
    thisWeek: string;
    total: string;
  };

  // Navigation
  nav: {
    dashboard: string;
    exercises: string;
    achievements: string;
    history: string;
    weekly: string;
    wellness: string;
    settings: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    welcomeBack: string;
    todayProgress: string;
    quickLog: string;
    recentActivity: string;
    noActivity: string;
    dailyGoal: string;
    currentStreak: string;
    longestStreak: string;
    totalXp: string;
    totalLevel: string;
  };

  // Exercises
  exercises: {
    title: string;
    addExercise: string;
    exerciseName: string;
    xpPerRep: string;
    logExercise: string;
    reps: string;
    deleteConfirm: string;
  };

  // Achievements
  achievements: {
    title: string;
    unlocked: string;
    locked: string;
    progress: string;
    rarity: {
      common: string;
      uncommon: string;
      rare: string;
      epic: string;
      legendary: string;
    };
  };

  // Wellness
  wellness: {
    title: string;
    hydration: string;
    eyeCare: string;
    posture: string;
    focusMode: string;
    ergonomicTips: string;
    glassesOfWater: string;
    dailyGoalReached: string;
    logWater: string;
    twentyTwentyRule: string;
    postureCheck: string;
  };

  // Settings
  settings: {
    title: string;
    appearance: string;
    theme: string;
    language: string;
    reminders: string;
    enableReminders: string;
    reminderInterval: string;
    sound: string;
    enableSound: string;
    dailyGoal: string;
    dangerZone: string;
    resetData: string;
    resetWarning: string;
    exportData: string;
    importData: string;
  };

  // Onboarding
  onboarding: {
    welcome: string;
    skip: string;
    next: string;
    back: string;
    getStarted: string;
  };

  // Notifications
  notifications: {
    exerciseReminder: string;
    eyeBreak: string;
    hydrationReminder: string;
    postureCheck: string;
    levelUp: string;
    achievementUnlocked: string;
  };
}

// English translations (default)
const en: Translations = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    close: "Close",
    confirm: "Confirm",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    settings: "Settings",
    level: "Level",
    xp: "XP",
    streak: "Streak",
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    total: "Total",
  },
  nav: {
    dashboard: "Dashboard",
    exercises: "Exercises",
    achievements: "Achievements",
    history: "History",
    weekly: "Weekly Wrap-Up",
    wellness: "Wellness",
    settings: "Settings",
  },
  dashboard: {
    title: "Dashboard",
    welcomeBack: "Welcome back!",
    todayProgress: "Today's Progress",
    quickLog: "Quick Log",
    recentActivity: "Recent Activity",
    noActivity: "No activity yet today",
    dailyGoal: "Daily Goal",
    currentStreak: "Current Streak",
    longestStreak: "Longest Streak",
    totalXp: "Total XP",
    totalLevel: "Total Level",
  },
  exercises: {
    title: "Exercises",
    addExercise: "Add Exercise",
    exerciseName: "Exercise Name",
    xpPerRep: "XP per Rep",
    logExercise: "Log Exercise",
    reps: "Reps",
    deleteConfirm: "Are you sure you want to delete this exercise?",
  },
  achievements: {
    title: "Achievements",
    unlocked: "Unlocked",
    locked: "Locked",
    progress: "Progress",
    rarity: {
      common: "Common",
      uncommon: "Uncommon",
      rare: "Rare",
      epic: "Epic",
      legendary: "Legendary",
    },
  },
  wellness: {
    title: "Wellness Hub",
    hydration: "Hydration",
    eyeCare: "Eye Care",
    posture: "Posture",
    focusMode: "Focus Mode",
    ergonomicTips: "Ergonomic Tips",
    glassesOfWater: "glasses of water",
    dailyGoalReached: "Daily goal reached!",
    logWater: "Log Water",
    twentyTwentyRule:
      "Every 20 minutes, look at something 20 feet away for 20 seconds.",
    postureCheck: "Time to check your posture!",
  },
  settings: {
    title: "Settings",
    appearance: "Appearance",
    theme: "Theme",
    language: "Language",
    reminders: "Reminders",
    enableReminders: "Enable reminders",
    reminderInterval: "Reminder interval",
    sound: "Sound",
    enableSound: "Enable sound effects",
    dailyGoal: "Daily Goal",
    dangerZone: "Danger Zone",
    resetData: "Reset All Data",
    resetWarning:
      "This will permanently delete all your data. This cannot be undone.",
    exportData: "Export Data",
    importData: "Import Data",
  },
  onboarding: {
    welcome: "Welcome to GeekFit!",
    skip: "Skip",
    next: "Next",
    back: "Back",
    getStarted: "Get Started",
  },
  notifications: {
    exerciseReminder: "Time for a quick exercise break!",
    eyeBreak: "Eye break time! Look at something 20 feet away.",
    hydrationReminder: "Time to drink some water!",
    postureCheck: "Posture check! Sit up straight.",
    levelUp: "Level Up!",
    achievementUnlocked: "Achievement Unlocked!",
  },
};

// Spanish translations
const es: Translations = {
  common: {
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    add: "Añadir",
    close: "Cerrar",
    confirm: "Confirmar",
    loading: "Cargando...",
    error: "Error",
    success: "Éxito",
    settings: "Configuración",
    level: "Nivel",
    xp: "XP",
    streak: "Racha",
    today: "Hoy",
    yesterday: "Ayer",
    thisWeek: "Esta Semana",
    total: "Total",
  },
  nav: {
    dashboard: "Panel",
    exercises: "Ejercicios",
    achievements: "Logros",
    history: "Historial",
    weekly: "Resumen Semanal",
    wellness: "Bienestar",
    settings: "Configuración",
  },
  dashboard: {
    title: "Panel",
    welcomeBack: "¡Bienvenido de nuevo!",
    todayProgress: "Progreso de Hoy",
    quickLog: "Registro Rápido",
    recentActivity: "Actividad Reciente",
    noActivity: "Sin actividad hoy",
    dailyGoal: "Meta Diaria",
    currentStreak: "Racha Actual",
    longestStreak: "Mejor Racha",
    totalXp: "XP Total",
    totalLevel: "Nivel Total",
  },
  exercises: {
    title: "Ejercicios",
    addExercise: "Añadir Ejercicio",
    exerciseName: "Nombre del Ejercicio",
    xpPerRep: "XP por Rep",
    logExercise: "Registrar Ejercicio",
    reps: "Repeticiones",
    deleteConfirm: "¿Estás seguro de que quieres eliminar este ejercicio?",
  },
  achievements: {
    title: "Logros",
    unlocked: "Desbloqueado",
    locked: "Bloqueado",
    progress: "Progreso",
    rarity: {
      common: "Común",
      uncommon: "Poco Común",
      rare: "Raro",
      epic: "Épico",
      legendary: "Legendario",
    },
  },
  wellness: {
    title: "Centro de Bienestar",
    hydration: "Hidratación",
    eyeCare: "Cuidado Ocular",
    posture: "Postura",
    focusMode: "Modo Enfoque",
    ergonomicTips: "Consejos Ergonómicos",
    glassesOfWater: "vasos de agua",
    dailyGoalReached: "¡Meta diaria alcanzada!",
    logWater: "Registrar Agua",
    twentyTwentyRule:
      "Cada 20 minutos, mira algo a 20 pies de distancia durante 20 segundos.",
    postureCheck: "¡Hora de revisar tu postura!",
  },
  settings: {
    title: "Configuración",
    appearance: "Apariencia",
    theme: "Tema",
    language: "Idioma",
    reminders: "Recordatorios",
    enableReminders: "Activar recordatorios",
    reminderInterval: "Intervalo de recordatorio",
    sound: "Sonido",
    enableSound: "Activar efectos de sonido",
    dailyGoal: "Meta Diaria",
    dangerZone: "Zona de Peligro",
    resetData: "Restablecer Datos",
    resetWarning:
      "Esto eliminará permanentemente todos tus datos. No se puede deshacer.",
    exportData: "Exportar Datos",
    importData: "Importar Datos",
  },
  onboarding: {
    welcome: "¡Bienvenido a GeekFit!",
    skip: "Saltar",
    next: "Siguiente",
    back: "Atrás",
    getStarted: "Comenzar",
  },
  notifications: {
    exerciseReminder: "¡Hora de un descanso para ejercicio!",
    eyeBreak: "¡Descanso ocular! Mira algo a 20 pies de distancia.",
    hydrationReminder: "¡Hora de beber agua!",
    postureCheck: "¡Revisión de postura! Siéntate derecho.",
    levelUp: "¡Subiste de Nivel!",
    achievementUnlocked: "¡Logro Desbloqueado!",
  },
};

// All translations
const translations: Record<Locale, Translations> = {
  en,
  es,
  // Placeholder for other languages - they'll fall back to English
  fr: en,
  de: en,
  pt: en,
  ja: en,
  zh: en,
  ko: en,
};

export function getTranslations(locale: Locale): Translations {
  return translations[locale] || translations.en;
}

export function getLocaleInfo(locale: Locale): LocaleInfo {
  return SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];
}
