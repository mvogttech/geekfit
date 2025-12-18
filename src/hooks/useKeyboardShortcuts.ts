import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

export interface Shortcut {
  key: string;
  modifiers: ("ctrl" | "shift" | "alt" | "meta")[];
  description: string;
  category: "navigation" | "actions" | "dialogs" | "general";
  action?: () => void;
}

// Define all keyboard shortcuts
export const SHORTCUTS: Shortcut[] = [
  // Navigation
  {
    key: "1",
    modifiers: ["ctrl"],
    description: "Go to Dashboard",
    category: "navigation",
  },
  {
    key: "2",
    modifiers: ["ctrl"],
    description: "Go to Exercises",
    category: "navigation",
  },
  {
    key: "3",
    modifiers: ["ctrl"],
    description: "Go to Achievements",
    category: "navigation",
  },
  {
    key: "4",
    modifiers: ["ctrl"],
    description: "Go to History",
    category: "navigation",
  },
  {
    key: "5",
    modifiers: ["ctrl"],
    description: "Go to Weekly Wrap-Up",
    category: "navigation",
  },
  {
    key: "6",
    modifiers: ["ctrl"],
    description: "Go to Wellness",
    category: "navigation",
  },
  {
    key: ",",
    modifiers: ["ctrl"],
    description: "Go to Settings",
    category: "navigation",
  },

  // Actions
  {
    key: "g",
    modifiers: ["ctrl", "shift"],
    description: "Quick Log (Global)",
    category: "actions",
  },
  {
    key: "n",
    modifiers: ["ctrl"],
    description: "New Exercise",
    category: "actions",
  },
  {
    key: "w",
    modifiers: ["ctrl"],
    description: "Log Water",
    category: "actions",
  },

  // Dialogs
  {
    key: "/",
    modifiers: ["ctrl"],
    description: "Show Keyboard Shortcuts",
    category: "dialogs",
  },
  {
    key: "Escape",
    modifiers: [],
    description: "Close Dialog / Cancel",
    category: "dialogs",
  },

  // General
  {
    key: "r",
    modifiers: ["ctrl", "shift"],
    description: "Refresh Data",
    category: "general",
  },
];

interface UseKeyboardShortcutsOptions {
  onQuickLog?: () => void;
  onNewExercise?: () => void;
  onLogWater?: () => void;
  onShowShortcuts?: () => void;
  onRefresh?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const navigate = useNavigate();
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key, ctrlKey, shiftKey, altKey, metaKey } = event;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to blur
        if (key === "Escape") {
          target.blur();
        }
        return;
      }

      // Navigation shortcuts (Ctrl + number)
      if (ctrlKey && !shiftKey && !altKey) {
        switch (key) {
          case "1":
            event.preventDefault();
            navigate("/");
            break;
          case "2":
            event.preventDefault();
            navigate("/exercises");
            break;
          case "3":
            event.preventDefault();
            navigate("/achievements");
            break;
          case "4":
            event.preventDefault();
            navigate("/history");
            break;
          case "5":
            event.preventDefault();
            navigate("/weekly");
            break;
          case "6":
            event.preventDefault();
            navigate("/wellness");
            break;
          case ",":
            event.preventDefault();
            navigate("/settings");
            break;
          case "/":
            event.preventDefault();
            setShortcutsDialogOpen(true);
            options.onShowShortcuts?.();
            break;
          case "n":
            event.preventDefault();
            options.onNewExercise?.();
            break;
          case "w":
            event.preventDefault();
            options.onLogWater?.();
            break;
        }
      }

      // Ctrl + Shift shortcuts
      if (ctrlKey && shiftKey && !altKey) {
        switch (key.toLowerCase()) {
          case "r":
            event.preventDefault();
            options.onRefresh?.();
            break;
          // Note: Ctrl+Shift+Alt+G is handled globally by Tauri
        }
      }

      // Escape to close dialogs
      if (key === "Escape") {
        setShortcutsDialogOpen(false);
      }
    },
    [navigate, options]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcutsDialogOpen,
    setShortcutsDialogOpen,
    shortcuts: SHORTCUTS,
  };
}

// Format shortcut for display
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];

  if (shortcut.modifiers.includes("ctrl")) parts.push("Ctrl");
  if (shortcut.modifiers.includes("shift")) parts.push("Shift");
  if (shortcut.modifiers.includes("alt")) parts.push("Alt");
  if (shortcut.modifiers.includes("meta")) parts.push("Cmd");

  // Format the key
  let keyDisplay = shortcut.key;
  if (shortcut.key === "Escape") keyDisplay = "Esc";
  if (shortcut.key === ",") keyDisplay = ",";
  if (shortcut.key === "/") keyDisplay = "/";
  if (shortcut.key.length === 1) keyDisplay = shortcut.key.toUpperCase();

  parts.push(keyDisplay);

  return parts.join(" + ");
}
