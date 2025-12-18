import { useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import XIcon from "@mui/icons-material/X";
import { toPng } from "html-to-image";
import { Exercise, ExerciseLog, getTitleForLevel } from "../types";
import { formatXp, getExerciseIcon } from "../utils/xp";

interface ShareCardProps {
  open: boolean;
  onClose: () => void;
  stats: {
    totalLevel: number;
    totalXp: number;
    currentStreak: number;
    todayXp: number;
  };
  todayLogs: ExerciseLog[];
  exercises: Exercise[];
}

export default function ShareCard({
  open,
  onClose,
  stats,
  todayLogs,
  exercises,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Aggregate today's exercises
  const todaySummary = todayLogs.reduce((acc, log) => {
    const exercise = exercises.find((e) => e.id === log.exercise_id);
    if (exercise) {
      if (!acc[exercise.name]) {
        acc[exercise.name] = { reps: 0, xp: 0, icon: getExerciseIcon(exercise.name) };
      }
      acc[exercise.name].reps += log.reps;
      acc[exercise.name].xp += log.xp_earned;
    }
    return acc;
  }, {} as Record<string, { reps: number; xp: number; icon: string }>);

  const title = getTitleForLevel(stats.totalLevel);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const generateImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#121212",
      });
      return dataUrl;
    } catch (error) {
      console.error("Failed to generate image:", error);
      return null;
    }
  };

  const handleCopyImage = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) {
      setSnackbar({ open: true, message: "Failed to generate image", severity: "error" });
      return;
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setSnackbar({ open: true, message: "Image copied to clipboard!", severity: "success" });
    } catch (error) {
      console.error("Failed to copy:", error);
      setSnackbar({ open: true, message: "Failed to copy image", severity: "error" });
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) {
      setSnackbar({ open: true, message: "Failed to generate image", severity: "error" });
      return;
    }

    const link = document.createElement("a");
    link.download = `geekfit-${new Date().toISOString().split("T")[0]}.png`;
    link.href = dataUrl;
    link.click();
    setSnackbar({ open: true, message: "Image downloaded!", severity: "success" });
  };

  const handleShareTwitter = () => {
    const exerciseList = Object.entries(todaySummary)
      .slice(0, 3)
      .map(([name, data]) => `${data.icon} ${data.reps} ${name}`)
      .join("\n");

    const text = `Today's workout with GeekFit:

${exerciseList}

+${formatXp(stats.todayXp)} XP earned
${stats.currentStreak > 0 ? `🔥 ${stats.currentStreak} day streak` : ""}
Level ${stats.totalLevel} • ${title}

#GeekFit #Fitness #Developer`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleCopyText = () => {
    const exerciseList = Object.entries(todaySummary)
      .map(([name, data]) => `${data.icon} ${data.reps} ${name}`)
      .join("\n");

    const text = `Today's workout with GeekFit:

${exerciseList}

+${formatXp(stats.todayXp)} XP earned
${stats.currentStreak > 0 ? `🔥 ${stats.currentStreak} day streak` : ""}
Level ${stats.totalLevel} • ${title}`;

    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: "Text copied to clipboard!", severity: "success" });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShareIcon />
            Share Your Progress
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {/* The shareable card */}
          <Box
            ref={cardRef}
            sx={{
              p: 3,
              borderRadius: 3,
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
              border: "1px solid rgba(0, 188, 212, 0.3)",
              fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}
          >
            {/* Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography fontSize={24}>🏋️</Typography>
                <Typography variant="h6" fontWeight={700} color="primary">
                  GeekFit
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {today}
              </Typography>
            </Box>

            {/* Exercises */}
            {Object.keys(todaySummary).length > 0 ? (
              <Box sx={{ mb: 3 }}>
                {Object.entries(todaySummary).map(([name, data]) => (
                  <Box
                    key={name}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <Typography fontSize={20}>{data.icon}</Typography>
                    <Typography fontWeight={600} sx={{ flex: 1 }}>
                      {data.reps} {name}
                    </Typography>
                    <Typography variant="body2" color="primary">
                      +{formatXp(data.xp)} XP
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 3, mb: 3 }}>
                <Typography color="text.secondary">No exercises logged today yet</Typography>
              </Box>
            )}

            {/* Stats row */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                p: 2,
                borderRadius: 2,
                backgroundColor: "rgba(0, 188, 212, 0.1)",
                border: "1px solid rgba(0, 188, 212, 0.2)",
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h5" fontWeight={700} color="secondary">
                  +{formatXp(stats.todayXp)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  XP Today
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  {stats.currentStreak}🔥
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Streak
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h5" fontWeight={700} color="primary">
                  {stats.totalLevel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Level
                </Typography>
              </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="primary" fontWeight={600}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                geekfit.app
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
          <Tooltip title="Copy image to clipboard">
            <Button
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyImage}
            >
              Copy Image
            </Button>
          </Tooltip>
          <Tooltip title="Download as PNG">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download
            </Button>
          </Tooltip>
          <Tooltip title="Share on X/Twitter">
            <Button
              variant="outlined"
              startIcon={<XIcon />}
              onClick={handleShareTwitter}
              sx={{ borderColor: "#1DA1F2", color: "#1DA1F2" }}
            >
              Share on X
            </Button>
          </Tooltip>
          <Tooltip title="Copy text summary">
            <Button variant="text" onClick={handleCopyText}>
              Copy Text
            </Button>
          </Tooltip>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
