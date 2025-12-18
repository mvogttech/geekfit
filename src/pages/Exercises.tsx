import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useExercises } from "../contexts/ExerciseContext";
import {
  formatXp,
  xpProgress,
  getLevelTier,
  TIER_COLORS,
  getExerciseIcon,
} from "../utils/xp";
import { Exercise, LogExerciseResult } from "../types";

export default function Exercises() {
  const { exercises, addExercise, deleteExercise, logExercise, loading } =
    useExercises();

  // Add exercise dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newXp, setNewXp] = useState(10);
  const [saving, setSaving] = useState(false);

  // Quick log dialog
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [reps, setReps] = useState(10);
  const [logging, setLogging] = useState(false);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuExercise, setMenuExercise] = useState<Exercise | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  const handleAdd = async () => {
    if (!newName.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter an exercise name",
        severity: "error",
      });
      return;
    }

    setSaving(true);
    try {
      await addExercise(newName.trim(), newXp);
      setSnackbar({
        open: true,
        message: `${newName} added successfully!`,
        severity: "success",
      });
      setAddDialogOpen(false);
      setNewName("");
      setNewXp(10);
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to add exercise",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!menuExercise) return;
    try {
      await deleteExercise(menuExercise.id);
      setSnackbar({
        open: true,
        message: `${menuExercise.name} deleted`,
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to delete exercise",
        severity: "error",
      });
    }
    setMenuAnchor(null);
    setMenuExercise(null);
  };

  const handleQuickLog = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setReps(10);
    setLogDialogOpen(true);
  };

  const handleLog = async () => {
    if (!selectedExercise) return;

    setLogging(true);
    try {
      const result: LogExerciseResult = await logExercise(
        selectedExercise.id,
        reps
      );
      let message = `+${result.xp_earned} XP for ${selectedExercise.name}!`;
      if (result.leveled_up) {
        message = `Level up! ${selectedExercise.name} is now level ${result.new_exercise_level}! +${result.xp_earned} XP`;
      }
      setSnackbar({
        open: true,
        message,
        severity: result.leveled_up ? "info" : "success",
      });
      setLogDialogOpen(false);
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to log exercise",
        severity: "error",
      });
    } finally {
      setLogging(false);
    }
  };

  const openMenu = (
    event: React.MouseEvent<HTMLElement>,
    exercise: Exercise
  ) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuExercise(exercise);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Exercises
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Exercise
        </Button>
      </Box>

      <Grid container spacing={3}>
        {exercises.map((exercise) => {
          const tier = getLevelTier(exercise.current_level);
          const tierColors = TIER_COLORS[tier];
          const icon = getExerciseIcon(exercise.name);
          const progress = xpProgress(exercise.total_xp);
          const progressPercent = Math.min(
            100,
            Math.floor((progress.current / progress.needed) * 100)
          );
          const totalReps = Math.floor(exercise.total_xp / exercise.xp_per_rep);

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={exercise.id}>
              <Card
                sx={{
                  border: `1px solid ${tierColors.main}33`,
                  background: tierColors.bg,
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: tierColors.main,
                    boxShadow: `0 8px 32px ${tierColors.glow}`,
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  {/* Header: Icon, Name, Level Badge, Menu */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          backgroundColor: "rgba(0, 0, 0, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 24,
                        }}
                      >
                        {icon}
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {exercise.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          +{exercise.xp_per_rep} XP per rep
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {/* Level Badge */}
                      <Chip
                        label={`Lv. ${exercise.current_level}`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          backgroundColor: tierColors.main,
                          color:
                            tier === "silver" || tier === "platinum"
                              ? "#1a1a1a"
                              : "#fff",
                          boxShadow: `0 2px 8px ${tierColors.glow}`,
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => openMenu(e, exercise)}
                        sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* XP Progress Bar */}
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Progress to Lv. {exercise.current_level + 1}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: tierColors.main, fontWeight: 600 }}
                      >
                        {formatXp(progress.current)} / {formatXp(progress.needed)} XP
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${progressPercent}%`,
                          background: `linear-gradient(90deg, ${tierColors.main}, ${tierColors.main}aa)`,
                          borderRadius: 4,
                          transition: "width 0.5s ease",
                          boxShadow: `0 0 10px ${tierColors.glow}`,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Stats Row */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 2,
                      py: 1.5,
                      px: 2,
                      borderRadius: 2,
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ color: tierColors.main }}
                      >
                        {totalReps.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Reps
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{ color: tierColors.main }}
                      >
                        {formatXp(exercise.total_xp)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total XP
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h6" fontWeight={700} color="text.primary">
                        {new Date(exercise.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Started
                      </Typography>
                    </Box>
                  </Box>

                  {/* Quick Log Button */}
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<AddIcon />}
                    onClick={() => handleQuickLog(exercise)}
                    sx={{
                      backgroundColor: tierColors.main,
                      color:
                        tier === "silver" || tier === "platinum"
                          ? "#1a1a1a"
                          : "#fff",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: tierColors.main,
                        filter: "brightness(1.1)",
                        boxShadow: `0 4px 16px ${tierColors.glow}`,
                      },
                    }}
                  >
                    Log Exercise
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {exercises.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Card
              sx={{
                p: 4,
                textAlign: "center",
                border: "2px dashed rgba(255, 255, 255, 0.1)",
              }}
            >
              <Typography variant="h6" color="text.secondary" mb={2}>
                No exercises yet
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add Your First Exercise
              </Button>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Menu for exercise actions */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Exercise</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add Exercise Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add New Exercise</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Exercise Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            margin="normal"
            placeholder="e.g., Squats, Planks, Lunges"
          />
          <TextField
            fullWidth
            type="number"
            label="XP per Rep"
            value={newXp}
            onChange={(e) => setNewXp(Math.max(1, parseInt(e.target.value) || 1))}
            margin="normal"
            inputProps={{ min: 1 }}
            helperText="Higher XP for harder exercises"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            Add Exercise
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Log Dialog */}
      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography fontSize={28}>
              {selectedExercise ? getExerciseIcon(selectedExercise.name) : "🎯"}
            </Typography>
            <Box>
              <Typography variant="h6">
                Log {selectedExercise?.name ?? "Exercise"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                +{selectedExercise?.xp_per_rep ?? 0} XP per rep
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              py: 3,
            }}
          >
            <IconButton
              color="primary"
              onClick={() => setReps(Math.max(1, reps - 5))}
              size="large"
              sx={{
                backgroundColor: "rgba(0, 188, 212, 0.1)",
                "&:hover": { backgroundColor: "rgba(0, 188, 212, 0.2)" },
              }}
            >
              <RemoveIcon />
            </IconButton>
            <TextField
              type="number"
              value={reps}
              onChange={(e) => setReps(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ width: 100 }}
              inputProps={{ min: 1, style: { textAlign: "center", fontSize: 24 } }}
            />
            <IconButton
              color="primary"
              onClick={() => setReps(reps + 5)}
              size="large"
              sx={{
                backgroundColor: "rgba(0, 188, 212, 0.1)",
                "&:hover": { backgroundColor: "rgba(0, 188, 212, 0.2)" },
              }}
            >
              <AddIcon />
            </IconButton>
          </Box>
          <Typography
            variant="h5"
            textAlign="center"
            color="primary"
            fontWeight={600}
          >
            +{(selectedExercise?.xp_per_rep ?? 0) * reps} XP
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLogDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleLog}
            disabled={logging}
            startIcon={logging ? <CircularProgress size={16} /> : <AddIcon />}
            size="large"
          >
            Log {reps} Reps
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ fontWeight: 500 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
