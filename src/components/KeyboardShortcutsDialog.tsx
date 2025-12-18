import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import { SHORTCUTS, formatShortcut, Shortcut } from "../hooks/useKeyboardShortcuts";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsDialog({
  open,
  onClose,
}: KeyboardShortcutsDialogProps) {
  const categories = [
    { key: "navigation", label: "Navigation" },
    { key: "actions", label: "Actions" },
    { key: "dialogs", label: "Dialogs" },
    { key: "general", label: "General" },
  ] as const;

  const ShortcutRow = ({ shortcut }: { shortcut: Shortcut }) => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 1,
      }}
    >
      <Typography variant="body2">{shortcut.description}</Typography>
      <Chip
        label={formatShortcut(shortcut)}
        size="small"
        sx={{
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: 11,
          backgroundColor: "background.default",
          border: "1px solid",
          borderColor: "divider",
        }}
      />
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <KeyboardIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Keyboard Shortcuts
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Use these shortcuts to navigate quickly and perform actions without
          leaving your keyboard.
        </Typography>

        {categories.map((category, index) => {
          const categoryShortcuts = SHORTCUTS.filter(
            (s) => s.category === category.key
          );

          if (categoryShortcuts.length === 0) return null;

          return (
            <Box key={category.key} sx={{ mb: index < categories.length - 1 ? 3 : 0 }}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="primary"
                mb={1}
              >
                {category.label}
              </Typography>
              <Box
                sx={{
                  backgroundColor: "background.paper",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  px: 2,
                }}
              >
                {categoryShortcuts.map((shortcut, i) => (
                  <Box key={shortcut.key + shortcut.modifiers.join("")}>
                    <ShortcutRow shortcut={shortcut} />
                    {i < categoryShortcuts.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}

        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            backgroundColor: "rgba(0, 188, 212, 0.08)",
            border: "1px solid rgba(0, 188, 212, 0.2)",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            <strong>Tip:</strong> The global shortcut{" "}
            <Chip
              label="Ctrl + Shift + Alt + G"
              size="small"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                height: 20,
              }}
            />{" "}
            works even when GeekFit is minimized, so you can quickly log exercises
            from anywhere!
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
