import { useEffect, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";

export function useGlobalHotkey() {
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  useEffect(() => {
    // Listen for the global-quick-log event from Tauri
    const unlisten = listen("global-quick-log", () => {
      setQuickLogOpen(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const closeQuickLog = useCallback(() => {
    setQuickLogOpen(false);
  }, []);

  return {
    quickLogOpen,
    setQuickLogOpen,
    closeQuickLog,
  };
}
