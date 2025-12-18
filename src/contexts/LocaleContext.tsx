import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Locale,
  Translations,
  getTranslations,
  SUPPORTED_LOCALES,
  LocaleInfo,
} from "../i18n";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  supportedLocales: LocaleInfo[];
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Load locale from settings
  useEffect(() => {
    const loadLocale = async () => {
      try {
        // Try to get from settings
        const settings = await invoke<{ locale?: string }>("get_settings");
        if (
          settings.locale &&
          SUPPORTED_LOCALES.some((l) => l.code === settings.locale)
        ) {
          setLocaleState(settings.locale as Locale);
          return;
        }
      } catch {
        // Fall back to browser locale
      }

      // Try browser locale
      const browserLocale = navigator.language.split("-")[0] as Locale;
      if (SUPPORTED_LOCALES.some((l) => l.code === browserLocale)) {
        setLocaleState(browserLocale);
      }
    };

    loadLocale();
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      await invoke("update_setting", { key: "locale", value: newLocale });
    } catch (error) {
      console.error("Failed to save locale:", error);
    }
  }, []);

  const t = getTranslations(locale);

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        t,
        supportedLocales: SUPPORTED_LOCALES,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
