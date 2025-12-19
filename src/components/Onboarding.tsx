import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  Fade,
  Paper,
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import CloseIcon from "@mui/icons-material/Close";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { invoke } from "@tauri-apps/api/core";
import { DefaultExercise } from "../types";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  tips?: string[];
  isExerciseSelection?: boolean;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Welcome to GeekFit!",
    description:
      "A gamified fitness tracker designed for programmers. Level up your health while you code!",
    icon: <FitnessCenterIcon sx={{ fontSize: 60 }} />,
    tips: [
      "Track exercises right from your desktop",
      "Earn XP and level up like in an RPG",
      "Build healthy habits without leaving your IDE",
    ],
  },
  {
    title: "Level Up Your Exercises",
    description:
      "Each exercise type has its own level. The more you do, the higher you level up - just like skills in RuneScape!",
    icon: <TrendingUpIcon sx={{ fontSize: 60 }} />,
    tips: [
      "XP formula is inspired by RuneScape",
      "Level 99 is the max for each skill",
      "Your total level is the sum of all exercise levels",
    ],
  },
  {
    title: "Earn Achievements",
    description:
      "Unlock badges and achievements as you progress. From common to legendary - collect them all!",
    icon: <EmojiEventsIcon sx={{ fontSize: 60 }} />,
    tips: [
      "5 rarity tiers: Common to Legendary",
      "Streak achievements for consistency",
      "Special badges for unique accomplishments",
    ],
  },
  {
    title: "Smart Reminders",
    description:
      "Get notified to take exercise breaks. GeekFit detects when you're focused and won't interrupt your flow.",
    icon: <NotificationsActiveIcon sx={{ fontSize: 60 }} />,
    tips: [
      "Customizable reminder intervals",
      "Focus mode pauses notifications",
      "Eye care reminders (20-20-20 rule)",
    ],
  },
  {
    title: "Wellness Features",
    description:
      "More than just exercise tracking. Stay hydrated, check your posture, and take care of your eyes.",
    icon: <LocalDrinkIcon sx={{ fontSize: 60 }} />,
    tips: [
      "Hydration tracking with daily goals",
      "Posture check reminders",
      "Ergonomic tips for desk workers",
    ],
  },
  {
    title: "Keyboard Shortcuts",
    description:
      "Quick actions at your fingertips. Use Ctrl+Shift+Alt+G anywhere to quickly log an exercise!",
    icon: <KeyboardIcon sx={{ fontSize: 60 }} />,
    tips: [
      "Ctrl+Shift+Alt+G: Quick log (global)",
      "Ctrl+/: View all shortcuts",
      "Navigate with keyboard-first design",
    ],
  },
  {
    title: "Choose Your Exercises",
    description:
      "Select the exercises you want to track. You can always add or remove exercises later from the Exercises page.",
    icon: <CheckCircleIcon sx={{ fontSize: 60 }} />,
    isExerciseSelection: true,
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [open, setOpen] = useState(true);
  const [defaultExercises, setDefaultExercises] = useState<DefaultExercise[]>(
    []
  );
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(
    new Set()
  );
  const [saving, setSaving] = useState(false);
  const theme = useTheme();

  const maxSteps = ONBOARDING_STEPS.length;
  const currentStep = ONBOARDING_STEPS[activeStep];

  // Fetch default exercises on mount
  useEffect(() => {
    invoke<DefaultExercise[]>("get_default_exercises").then((exercises) => {
      setDefaultExercises(exercises);
      // No exercises selected by default - user must choose
    });
  }, []);

  const handleNext = () => {
    if (activeStep === maxSteps - 1) {
      handleComplete();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save selected exercises to backend
      await invoke("complete_initial_setup", {
        selectedExercises: Array.from(selectedExercises),
      });
      setOpen(false);
      localStorage.setItem("geekfit_onboarding_complete", "true");
      onComplete();
    } catch (error) {
      console.error("Failed to save exercise selection:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const toggleExercise = (name: string) => {
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    const categoryExercises = defaultExercises.filter(
      (e) => e.category === category
    );
    const allSelected = categoryExercises.every((e) =>
      selectedExercises.has(e.name)
    );
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      categoryExercises.forEach((e) => {
        if (allSelected) {
          next.delete(e.name);
        } else {
          next.add(e.name);
        }
      });
      return next;
    });
  };

  // Group exercises by category
  const exercisesByCategory = defaultExercises.reduce(
    (acc, exercise) => {
      if (!acc[exercise.category]) {
        acc[exercise.category] = [];
      }
      acc[exercise.category].push(exercise);
      return acc;
    },
    {} as Record<string, DefaultExercise[]>
  );

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1,
        }}
      >
        <IconButton onClick={handleSkip} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* Header with gradient */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            py: 4,
            px: 3,
            textAlign: "center",
            color: "white",
          }}
        >
          <Fade in key={activeStep}>
            <Box>
              <Box sx={{ mb: 2, opacity: 0.9 }}>{currentStep.icon}</Box>
              <Typography variant="h5" fontWeight={700}>
                {currentStep.title}
              </Typography>
            </Box>
          </Fade>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3, maxHeight: currentStep.isExerciseSelection ? 400 : "auto", overflowY: "auto" }}>
          <Fade in key={`content-${activeStep}`}>
            <Box>
              <Typography
                variant="body1"
                color="text.secondary"
                textAlign="center"
                mb={3}
              >
                {currentStep.description}
              </Typography>

              {/* Exercise Selection UI */}
              {currentStep.isExerciseSelection ? (
                <Box>
                  {Object.entries(exercisesByCategory).map(
                    ([category, exercises]) => {
                      const allSelected = exercises.every((e) =>
                        selectedExercises.has(e.name)
                      );
                      return (
                        <Box key={category} sx={{ mb: 2.5 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 1.5,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              fontWeight={700}
                              color="text.primary"
                              sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem" }}
                            >
                              {category}
                            </Typography>
                            <Typography
                              variant="caption"
                              onClick={() => toggleCategory(category)}
                              sx={{
                                cursor: "pointer",
                                color: "primary.main",
                                fontWeight: 600,
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {allSelected ? "Deselect All" : "Select All"}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                              gap: 1.5,
                            }}
                          >
                            {exercises.map((exercise) => {
                              const isSelected = selectedExercises.has(
                                exercise.name
                              );
                              return (
                                <Paper
                                  key={exercise.name}
                                  onClick={() => toggleExercise(exercise.name)}
                                  elevation={isSelected ? 8 : 0}
                                  sx={{
                                    p: 1.5,
                                    cursor: "pointer",
                                    borderRadius: 2,
                                    border: 1,
                                    borderColor: isSelected
                                      ? "primary.main"
                                      : alpha(theme.palette.divider, 0.3),
                                    backgroundColor: isSelected
                                      ? alpha(theme.palette.primary.main, 0.15)
                                      : alpha(theme.palette.background.paper, 0.6),
                                    transition: "all 0.2s ease",
                                    position: "relative",
                                    overflow: "hidden",
                                    boxShadow: isSelected
                                      ? `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}, 0 0 40px ${alpha(theme.palette.primary.main, 0.2)}, inset 0 0 20px ${alpha(theme.palette.primary.main, 0.1)}`
                                      : "none",
                                    "&:hover": {
                                      borderColor: "primary.main",
                                      transform: "translateY(-2px)",
                                      boxShadow: isSelected
                                        ? `0 0 25px ${alpha(theme.palette.primary.main, 0.5)}, 0 0 50px ${alpha(theme.palette.primary.main, 0.25)}`
                                        : `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`,
                                    },
                                    "&::before": isSelected ? {
                                      content: '""',
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      height: "2px",
                                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                                    } : {},
                                  }}
                                >
                                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                    <Typography
                                      variant="body2"
                                      fontWeight={isSelected ? 600 : 500}
                                      sx={{
                                        color: isSelected ? "primary.main" : "text.primary",
                                        lineHeight: 1.3,
                                        flex: 1,
                                      }}
                                    >
                                      {exercise.name}
                                    </Typography>
                                    {isSelected && (
                                      <CheckCircleIcon
                                        sx={{
                                          fontSize: 18,
                                          color: "primary.main",
                                          ml: 0.5,
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: isSelected ? alpha(theme.palette.primary.main, 0.8) : "text.secondary",
                                      fontWeight: 500,
                                      mt: 0.5,
                                      display: "block",
                                    }}
                                  >
                                    {exercise.xp_per_rep} XP/rep
                                  </Typography>
                                </Paper>
                              );
                            })}
                          </Box>
                        </Box>
                      );
                    }
                  )}
                  <Box
                    sx={{
                      mt: 2,
                      pt: 2,
                      borderTop: 1,
                      borderColor: "divider",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="primary.main"
                    >
                      {selectedExercises.size}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      of {defaultExercises.length} exercises selected
                    </Typography>
                  </Box>
                </Box>
              ) : (
                /* Tips */
                currentStep.tips && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: "background.default",
                    }}
                  >
                    {currentStep.tips.map((tip, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          mb:
                            index < (currentStep.tips?.length ?? 0) - 1
                              ? 1.5
                              : 0,
                        }}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            backgroundColor: "primary.main",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Typography variant="body2">{tip}</Typography>
                      </Box>
                    ))}
                  </Paper>
                )
              )}
            </Box>
          </Fade>
        </Box>

        {/* Stepper */}
        <Box sx={{ px: 3, pb: 3 }}>
          {/* Progress dots */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 1,
              mb: 2,
            }}
          >
            {ONBOARDING_STEPS.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: index === activeStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    index <= activeStep ? "primary.main" : "divider",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </Box>

          {/* Navigation buttons */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || saving}
              startIcon={<KeyboardArrowLeft />}
            >
              Back
            </Button>

            <Button onClick={handleSkip} color="inherit" disabled={saving}>
              Skip
            </Button>

            <Button
              variant="contained"
              onClick={handleNext}
              disabled={saving || (currentStep.isExerciseSelection && selectedExercises.size === 0)}
              endIcon={
                saving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : activeStep === maxSteps - 1 ? null : (
                  <KeyboardArrowRight />
                )
              }
            >
              {activeStep === maxSteps - 1
                ? saving
                  ? "Saving..."
                  : "Get Started"
                : "Next"}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if onboarding should be shown
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem("geekfit_onboarding_complete");
    setShowOnboarding(!completed);
    setIsLoading(false);
  }, []);

  const completeOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("geekfit_onboarding_complete", "true");
  };

  const resetOnboarding = () => {
    localStorage.removeItem("geekfit_onboarding_complete");
    setShowOnboarding(true);
  };

  return { showOnboarding, isLoading, completeOnboarding, resetOnboarding };
}
