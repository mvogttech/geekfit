import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { ThemeId, getTheme, getThemeConfig, THEME_CONFIGS } from "../themes";

interface ThemeContextType {
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  isDark: boolean;
  availableThemes: typeof THEME_CONFIGS;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>("geekfit-dark");

  // Load theme preference from settings
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await invoke<{ theme_mode?: string }>("get_settings");
        if (settings.theme_mode && THEME_CONFIGS.some(t => t.id === settings.theme_mode)) {
          setThemeId(settings.theme_mode as ThemeId);
        }
      } catch {
        // Default to geekfit-dark
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newThemeId: ThemeId) => {
    setThemeId(newThemeId);
    try {
      await invoke("update_setting", { key: "theme_mode", value: newThemeId });
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const themeConfig = getThemeConfig(themeId);

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        setTheme,
        isDark: themeConfig.mode === "dark",
        availableThemes: THEME_CONFIGS,
      }}
    >
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeContextProvider");
  }
  return context;
}
