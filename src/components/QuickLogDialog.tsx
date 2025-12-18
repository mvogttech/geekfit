import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Grid,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useExercises } from "../contexts/ExerciseContext";
import { useUser } from "../contexts/UserContext";
import { getExerciseIcon, getLevelTier, TIER_COLORS } from "../utils/xp";
import { playXpSound } from "../utils/sounds";
import { celebrateLevelUp } from "../utils/confetti";
import { Exercise } from "../types";

interface QuickLogDialogProps {
  open: boolean;
  onClose: () => void;
  soundEnabled?: boolean;
}

export default function QuickLogDialog({
  open,
  onClose,
  soundEnabled = true,
}: QuickLogDialogProps) {
  const { exercises, logExercise, refreshData } = useExercises();
  const { refreshStats } = useUser();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [reps, setReps] = useState(10);
  const [logging, setLogging] = useState(false);
  const [lastResult, setLastResult] = useState<{ xp: number; leveledUp: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedExercise(null);
      setReps(10);
      setLastResult(null);
    }
  }, [open]);

  // Focus on reps input when exercise is selected
  useEffect(() => {
    if (selectedExercise && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [selectedExercise]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Number keys 1-9 to select exercise
      if (!selectedExercise && e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key) - 1;
        if (index < exercises.length) {
          setSelectedExercise(exercises[index]);
        }
      }

      // Enter to log
      if (selectedExercise && e.key === "Enter") {
        handleLog();
      }

      // Escape to go back or close
      if (e.key === "Escape") {
        if (selectedExercise) {
          setSelectedExercise(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedExercise, exercises, reps]);

  const handleLog = async () => {
    if (!selectedExercise || logging) return;

    setLogging(true);
    try {
      const result = await logExercise(selectedExercise.id, reps);
      if (result) {
        setLastResult({ xp: result.xp_earned, leveledUp: result.leveled_up });

        if (soundEnabled) {
          playXpSound();
        }

        if (result.leveled_up) {
          celebrateLevelUp();
        }

        await refreshData();
        await refreshStats();

        // Auto close after success
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to log:", error);
    }
    setLogging(false);
  };

  // Show first 9 exercises for quick selection
  const quickExercises = exercises.slice(0, 9);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "background.paper",
          border: "1px solid rgba(0, 188, 212, 0.3)",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Quick Log
          </Typography>
          <Chip
            size="small"
            label="Ctrl+Shift+Alt+G"
            sx={{
              backgroundColor: "rgba(0, 188, 212, 0.1)",
              color: "primary.main",
              fontSize: 10,
            }}
          />
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {lastResult ? (
          // Success state
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h2" color="primary" fontWeight={800}>
              +{lastResult.xp}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              XP Earned!
            </Typography>
            {lastResult.leveledUp && (
              <Typography variant="body1" color="warning.main" sx={{ mt: 2 }}>
                Level Up! 🎉
              </Typography>
            )}
          </Box>
        ) : !selectedExercise ? (
          // Exercise selection
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Select an exercise (press 1-9):
            </Typography>
            <Grid container spacing={1}>
              {quickExercises.map((exercise, i) => {
                const tier = getLevelTier(exercise.current_level);
                const tierColors = TIER_COLORS[tier];

                return (
                  <Grid size={{ xs: 4 }} key={exercise.id}>
                    <Box
                      onClick={() => setSelectedExercise(exercise)}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        cursor: "pointer",
                        textAlign: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        transition: "all 0.15s ease",
                        position: "relative",
                        "&:hover": {
                          backgroundColor: `${tierColors.main}20`,
                          borderColor: tierColors.main,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      {/* Keyboard hint */}
                      <Typography
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 8,
                          fontSize: 10,
                          color: "text.secondary",
                          fontFamily: "monospace",
                        }}
                      >
                        {i + 1}
                      </Typography>

                      <Typography fontSize={28}>
                        {getExerciseIcon(exercise.name)}
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={500}
                        noWrap
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        {exercise.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Lv.{exercise.current_level}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ) : (
          // Reps input
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mb: 3 }}>
              <Typography fontSize={40}>{getExerciseIcon(selectedExercise.name)}</Typography>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {selectedExercise.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  +{selectedExercise.xp_per_rep} XP per rep
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <IconButton
                onClick={() => setReps((prev) => Math.max(1, prev - 5))}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
                }}
              >
                <RemoveIcon />
              </IconButton>

              <TextField
                inputRef={inputRef}
                type="number"
                value={reps}
                onChange={(e) => setReps(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, style: { textAlign: "center", fontSize: 32, fontWeight: 700 } }}
                sx={{
                  width: 120,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "primary.main" },
                  },
                }}
              />

              <IconButton
                onClick={() => setReps((prev) => prev + 5)}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
                }}
              >
                <AddIcon />
              </IconButton>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Total: +{reps * selectedExercise.xp_per_rep} XP
            </Typography>
          </Box>
        )}
      </DialogContent>

      {selectedExercise && !lastResult && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedExercise(null)} color="inherit">
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleLog}
            disabled={logging}
            sx={{ px: 4 }}
          >
            {logging ? "Logging..." : "Log Exercise (Enter)"}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
