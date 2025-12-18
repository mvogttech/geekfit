import { useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import { toPng } from "html-to-image";

interface FitnessCommitCardProps {
  exerciseName: string;
  reps: number;
  xpEarned: number;
  level: number;
  streak: number;
  commitHash?: string;
  timestamp?: Date;
}

// Generate a fake git-style commit hash
function generateCommitHash(): string {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 7; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// Generate a commit-style message
function generateCommitMessage(exerciseName: string, reps: number): string {
  const actions = [
    `feat(fitness): complete ${reps} ${exerciseName.toLowerCase()}`,
    `chore(health): perform ${reps}x ${exerciseName.toLowerCase()}`,
    `perf(body): optimize with ${reps} ${exerciseName.toLowerCase()}`,
    `refactor(muscles): ${reps} ${exerciseName.toLowerCase()} reps`,
    `fix(sedentary): apply ${reps} ${exerciseName.toLowerCase()}`,
  ];
  return actions[Math.floor(Math.random() * actions.length)];
}

export default function FitnessCommitCard({
  exerciseName,
  reps,
  xpEarned,
  level,
  streak,
  commitHash = generateCommitHash(),
  timestamp = new Date(),
}: FitnessCommitCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const cardRef = useRef<HTMLDivElement>(null);

  const commitMessage = generateCommitMessage(exerciseName, reps);
  const formattedTime = timestamp.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleShare = () => {
    setDialogOpen(true);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: "#0d1117",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `fitness-commit-${commitHash}.png`;
      link.href = dataUrl;
      link.click();
      setSnackbar({ open: true, message: "Image downloaded!" });
    } catch (error) {
      console.error("Failed to generate image:", error);
      setSnackbar({ open: true, message: "Failed to download image" });
    }
  };

  const handleCopyText = () => {
    const text = `${commitMessage}

+${xpEarned} XP | Level ${level} | ${streak} day streak

#GeekFit #DeveloperFitness`;

    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: "Copied to clipboard!" });
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ShareIcon />}
        onClick={handleShare}
      >
        Share Commit
      </Button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Share Your Fitness Commit
          <IconButton
            onClick={() => setDialogOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {/* The shareable card */}
          <Box
            ref={cardRef}
            sx={{
              p: 3,
              borderRadius: 2,
              background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
              border: "1px solid #30363d",
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            }}
          >
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#39d353",
                }}
              />
              <Typography
                sx={{
                  color: "#8b949e",
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
              >
                GeekFit • {formattedTime}
              </Typography>
            </Box>

            {/* Commit message */}
            <Typography
              sx={{
                color: "#c9d1d9",
                fontSize: 16,
                fontWeight: 600,
                mb: 2,
                fontFamily: "inherit",
              }}
            >
              {commitMessage}
            </Typography>

            {/* Stats row */}
            <Box
              sx={{
                display: "flex",
                gap: 3,
                mb: 2,
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Typography sx={{ color: "#39d353", fontSize: 14 }}>
                  +{xpEarned}
                </Typography>
                <Typography sx={{ color: "#8b949e", fontSize: 12 }}>XP</Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Typography sx={{ color: "#58a6ff", fontSize: 14 }}>
                  Lvl {level}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Typography sx={{ color: "#f0883e", fontSize: 14 }}>
                  {streak} day streak
                </Typography>
              </Box>
            </Box>

            {/* Commit hash */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                pt: 2,
                borderTop: "1px solid #30363d",
              }}
            >
              <Typography
                sx={{
                  color: "#8b949e",
                  fontSize: 11,
                  fontFamily: "inherit",
                }}
              >
                commit
              </Typography>
              <Typography
                sx={{
                  color: "#58a6ff",
                  fontSize: 11,
                  fontFamily: "inherit",
                }}
              >
                {commitHash}
              </Typography>
            </Box>

            {/* Branding */}
            <Box sx={{ mt: 2, textAlign: "right" }}>
              <Typography
                sx={{
                  color: "#484f58",
                  fontSize: 10,
                  fontFamily: "inherit",
                }}
              >
                geekfit.dev
              </Typography>
            </Box>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "center" }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download Image
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyText}
            >
              Copy Text
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success">{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}

// Standalone component for generating cards from log data
export function FitnessCommitGenerator({
  logs,
  exercises,
  stats,
}: {
  logs: { exercise_id: number; reps: number; xp_earned: number; logged_at: string }[];
  exercises: { id: number; name: string; current_level: number }[];
  stats: { current_streak: number };
}) {
  if (logs.length === 0) return null;

  const latestLog = logs[0];
  const exercise = exercises.find((e) => e.id === latestLog.exercise_id);

  if (!exercise) return null;

  return (
    <FitnessCommitCard
      exerciseName={exercise.name}
      reps={latestLog.reps}
      xpEarned={latestLog.xp_earned}
      level={exercise.current_level}
      streak={stats.current_streak}
      timestamp={new Date(latestLog.logged_at)}
    />
  );
}
