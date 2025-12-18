import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Chip,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { invoke } from "@tauri-apps/api/core";
import { Achievement } from "../types";

// Achievement definitions with icons
const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_exercise: "🎯",
  hundred_pushups: "💯",
  week_streak: "🔥",
  month_streak: "🌟",
  level_10: "⭐",
  level_25: "🏆",
  level_50: "👑",
  variety: "🎨",
};

// Default achievements for display
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 1,
    key: "first_exercise",
    name: "First Steps",
    description: "Complete your first exercise",
    icon: null,
    unlocked_at: null,
  },
  {
    id: 2,
    key: "hundred_pushups",
    name: "Century",
    description: "Complete 100 pushups in a single day",
    icon: null,
    unlocked_at: null,
  },
  {
    id: 3,
    key: "week_streak",
    name: "Dedicated",
    description: "Maintain a 7-day exercise streak",
    icon: null,
    unlocked_at: null,
  },
  {
    id: 4,
    key: "month_streak",
    name: "Committed",
    description: "Maintain a 30-day exercise streak",
    icon: null,
    unlocked_at: null,
  },
  {
    id: 5,
    key: "level_10",
    name: "Rising Star",
    description: "Reach level 10",
    icon: null,
    unlocked_at: null,
  },
  {
    id: 6,
    key: "level_25",
    name: "Fitness Warrior",
    description: "Reach level 25",
    icon: null,
    unlocked_at: null,
  },
  {
    id: 7,
    key: "level_50",
    name: "Legend",
    description: "Reach level 50",
    icon: null,
    unlocked_at: null,
  },
  {
    id: 8,
    key: "variety",
    name: "Well-Rounded",
    description: "Log 5 different types of exercises",
    icon: null,
    unlocked_at: null,
  },
];

export default function Achievements() {
  const [achievements, setAchievements] =
    useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const data = await invoke<Achievement[]>("get_achievements");
        setAchievements(data);
      } catch (error) {
        console.error("Failed to fetch achievements:", error);
        setAchievements(DEFAULT_ACHIEVEMENTS);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked_at).length;
  const totalCount = achievements.length;

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
          Achievements
        </Typography>
        <Chip
          icon={<EmojiEventsIcon />}
          label={`${unlockedCount} / ${totalCount} Unlocked`}
          color="primary"
          variant="outlined"
        />
      </Box>

      <Grid container spacing={2}>
        {achievements.map((achievement) => {
          const isUnlocked = !!achievement.unlocked_at;
          const icon = ACHIEVEMENT_ICONS[achievement.key] ?? "🏅";

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={achievement.id}>
              <Card
                sx={{
                  position: "relative",
                  border: isUnlocked
                    ? "1px solid rgba(0, 188, 212, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isUnlocked
                    ? "linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 188, 212, 0.02) 100%)"
                    : "none",
                  opacity: isUnlocked ? 1 : 0.6,
                  transition: "all 0.3s",
                  "&:hover": {
                    opacity: 1,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        fontSize: 40,
                        filter: isUnlocked ? "none" : "grayscale(100%)",
                        opacity: isUnlocked ? 1 : 0.5,
                      }}
                    >
                      {icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="h6" fontWeight={600}>
                          {achievement.name}
                        </Typography>
                        {!isUnlocked && (
                          <LockIcon
                            fontSize="small"
                            sx={{ color: "text.secondary" }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        mb={1}
                      >
                        {achievement.description}
                      </Typography>
                      {isUnlocked && achievement.unlocked_at && (
                        <Typography variant="caption" color="primary">
                          Unlocked{" "}
                          {new Date(
                            achievement.unlocked_at
                          ).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Trophy Case Summary */}
      <Card sx={{ mt: 4, p: 3 }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5" fontWeight={600} mb={2}>
            Trophy Case
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 3,
              flexWrap: "wrap",
            }}
          >
            {achievements
              .filter((a) => a.unlocked_at)
              .map((achievement) => (
                <Box
                  key={achievement.id}
                  sx={{
                    fontSize: 48,
                    p: 1,
                    borderRadius: 2,
                    background: "rgba(0, 188, 212, 0.1)",
                    border: "1px solid rgba(0, 188, 212, 0.3)",
                  }}
                  title={achievement.name}
                >
                  {ACHIEVEMENT_ICONS[achievement.key] ?? "🏅"}
                </Box>
              ))}
            {unlockedCount === 0 && (
              <Typography color="text.secondary">
                Complete achievements to display them here!
              </Typography>
            )}
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
