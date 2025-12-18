import { createTheme, ThemeOptions } from "@mui/material";

export type ThemeId =
  | "geekfit-dark"
  | "geekfit-light"
  | "dracula"
  | "nord"
  | "monokai"
  | "solarized-dark"
  | "solarized-light"
  | "github-dark"
  | "one-dark"
  | "catppuccin";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  mode: "dark" | "light";
  preview: {
    bg: string;
    primary: string;
    secondary: string;
  };
}

export const THEME_CONFIGS: ThemeConfig[] = [
  {
    id: "geekfit-dark",
    name: "GeekFit Dark",
    mode: "dark",
    preview: { bg: "#121212", primary: "#00BCD4", secondary: "#FF9800" },
  },
  {
    id: "geekfit-light",
    name: "GeekFit Light",
    mode: "light",
    preview: { bg: "#F5F5F5", primary: "#0097A7", secondary: "#F57C00" },
  },
  {
    id: "dracula",
    name: "Dracula",
    mode: "dark",
    preview: { bg: "#282a36", primary: "#bd93f9", secondary: "#ff79c6" },
  },
  {
    id: "nord",
    name: "Nord",
    mode: "dark",
    preview: { bg: "#2e3440", primary: "#88c0d0", secondary: "#81a1c1" },
  },
  {
    id: "monokai",
    name: "Monokai",
    mode: "dark",
    preview: { bg: "#272822", primary: "#a6e22e", secondary: "#f92672" },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    mode: "dark",
    preview: { bg: "#002b36", primary: "#2aa198", secondary: "#cb4b16" },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    mode: "light",
    preview: { bg: "#fdf6e3", primary: "#2aa198", secondary: "#cb4b16" },
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    mode: "dark",
    preview: { bg: "#0d1117", primary: "#58a6ff", secondary: "#f78166" },
  },
  {
    id: "one-dark",
    name: "One Dark",
    mode: "dark",
    preview: { bg: "#282c34", primary: "#61afef", secondary: "#e06c75" },
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    mode: "dark",
    preview: { bg: "#1e1e2e", primary: "#89b4fa", secondary: "#f5c2e7" },
  },
];

const baseThemeOptions: Partial<ThemeOptions> = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
        },
      },
    },
  },
};

const themes: Record<ThemeId, ThemeOptions> = {
  "geekfit-dark": {
    ...baseThemeOptions,
    palette: {
      mode: "dark",
      primary: { main: "#00BCD4", light: "#4DD0E1", dark: "#0097A7" },
      secondary: { main: "#FF9800", light: "#FFB74D", dark: "#F57C00" },
      background: { default: "#121212", paper: "#1E1E1E" },
      text: { primary: "#FFFFFF", secondary: "#B3B3B3" },
      error: { main: "#CF6679" },
      warning: { main: "#FFB74D" },
      success: { main: "#81C784" },
      info: { main: "#64B5F6" },
    },
  },
  "geekfit-light": {
    ...baseThemeOptions,
    palette: {
      mode: "light",
      primary: { main: "#0097A7", light: "#00BCD4", dark: "#006064" },
      secondary: { main: "#F57C00", light: "#FF9800", dark: "#E65100" },
      background: { default: "#F5F5F5", paper: "#FFFFFF" },
      text: { primary: "#212121", secondary: "#757575" },
      error: { main: "#D32F2F" },
      warning: { main: "#F57C00" },
      success: { main: "#388E3C" },
      info: { main: "#1976D2" },
    },
  },
  dracula: {
    ...baseThemeOptions,
    palette: {
      mode: "dark",
      primary: { main: "#bd93f9", light: "#caa9fa", dark: "#9d79d9" },
      secondary: { main: "#ff79c6", light: "#ff92d0", dark: "#e566b0" },
      background: { default: "#282a36", paper: "#44475a" },
      text: { primary: "#f8f8f2", secondary: "#6272a4" },
      error: { main: "#ff5555" },
      warning: { main: "#ffb86c" },
      success: { main: "#50fa7b" },
      info: { main: "#8be9fd" },
    },
  },
  nord: {
    ...baseThemeOptions,
    palette: {
      mode: "dark",
      primary: { main: "#88c0d0", light: "#8fbcbb", dark: "#81a1c1" },
      secondary: { main: "#81a1c1", light: "#88c0d0", dark: "#5e81ac" },
      background: { default: "#2e3440", paper: "#3b4252" },
      text: { primary: "#eceff4", secondary: "#d8dee9" },
      error: { main: "#bf616a" },
      warning: { main: "#ebcb8b" },
      success: { main: "#a3be8c" },
      info: { main: "#5e81ac" },
    },
  },
  monokai: {
    ...baseThemeOptions,
    palette: {
      mode: "dark",
      primary: { main: "#a6e22e", light: "#b8f040", dark: "#8bc420" },
      secondary: { main: "#f92672", light: "#fa4d8a", dark: "#d91d62" },
      background: { default: "#272822", paper: "#3e3d32" },
      text: { primary: "#f8f8f2", secondary: "#75715e" },
      error: { main: "#f92672" },
      warning: { main: "#e6db74" },
      success: { main: "#a6e22e" },
      info: { main: "#66d9ef" },
    },
  },
  "solarized-dark": {
    ...baseThemeOptions,
    palette: {
      mode: "dark",
      primary: { main: "#2aa198", light: "#35c4ba", dark: "#1f7a73" },
      secondary: { main: "#cb4b16", light: "#dc6030", dark: "#a33c11" },
      background: { default: "#002b36", paper: "#073642" },
      text: { primary: "#839496", secondary: "#657b83" },
      error: { main: "#dc322f" },
      warning: { main: "#b58900" },
      success: { main: "#859900" },
      info: { main: "#268bd2" },
    },
  },
  "solarized-light": {
    ...baseThemeOptions,
    palette: {
      mode: "light",
      primary: { main: "#2aa198", light: "#35c4ba", dark: "#1f7a73" },
      secondary: { main: "#cb4b16", light: "#dc6030", dark: "#a33c11" },
      background: { default: "#fdf6e3", paper: "#eee8d5" },
      text: { primary: "#657b83", secondary: "#839496" },
      error: { main: "#dc322f" },
      warning: { main: "#b58900" },
      success: { main: "#859900" },
      info: { main: "#268bd2" },
    },
  },
  "github-dark": {
    ...baseThemeOptions,
    palette: {
      mode: "dark",
      primary: { main: "#58a6ff", light: "#79b8ff", dark: "#388bfd" },
      secondary: { main: "#f78166", light: "#ffa28b", dark: "#ea6045" },
      background: { default: "#0d1117", paper: "#161b22" },
      text: { primary: "#c9d1d9", secondary: "#8b949e" },
      error: { main: "#f85149" },
      warning: { main: "#d29922" },
      success: { main: "#3fb950" },
      info: { main: "#58a6ff" },
    },
  },
  "one-dark": {
    ...baseThemeOptions,
    palette: {
      mode: "dark",
      primary: { main: "#61afef", light: "#7ec0f3", dark: "#4a9be0" },
      secondary: { main: "#e06c75", light: "#e78991", dark: "#d35560" },
      background: { default: "#282c34", paper: "#21252b" },
      text: { primary: "#abb2bf", secondary: "#5c6370" },
      error: { main: "#e06c75" },
      warning: { main: "#e5c07b" },
      success: { main: "#98c379" },
      info: { main: "#61afef" },
    },
  },
  catppuccin: {
    ...baseThemeOptions,
    palette: {
      mode: "dark",
      primary: { main: "#89b4fa", light: "#b4d0fb", dark: "#5e9af8" },
      secondary: { main: "#f5c2e7", light: "#f8d4ed", dark: "#f0a0d8" },
      background: { default: "#1e1e2e", paper: "#313244" },
      text: { primary: "#cdd6f4", secondary: "#a6adc8" },
      error: { main: "#f38ba8" },
      warning: { main: "#fab387" },
      success: { main: "#a6e3a1" },
      info: { main: "#89dceb" },
    },
  },
};

export function getTheme(themeId: ThemeId) {
  return createTheme(themes[themeId] || themes["geekfit-dark"]);
}

export function getThemeConfig(themeId: ThemeId): ThemeConfig {
  return (
    THEME_CONFIGS.find((t) => t.id === themeId) || THEME_CONFIGS[0]
  );
}
