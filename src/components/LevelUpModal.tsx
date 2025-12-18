import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
} from "@mui/material";
import { getLevelTier, TIER_COLORS } from "../utils/xp";
import { celebrateLevelUp } from "../utils/confetti";
import { playLevelUpSound } from "../utils/sounds";

interface LevelUpModalProps {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  newLevel: number;
  soundEnabled?: boolean;
}

export default function LevelUpModal({
  open,
  onClose,
  exerciseName,
  newLevel,
  soundEnabled = true,
}: LevelUpModalProps) {
  const tier = getLevelTier(newLevel);
  const tierColors = TIER_COLORS[tier];

  useEffect(() => {
    if (open) {
      celebrateLevelUp();
      if (soundEnabled) {
        playLevelUpSound();
      }
    }
  }, [open, soundEnabled]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          background: `linear-gradient(135deg, ${tierColors.bg}, rgba(0,0,0,0.9))`,
          border: `2px solid ${tierColors.main}`,
          boxShadow: `0 0 60px ${tierColors.glow}`,
          overflow: "visible",
        },
      }}
    >
      <DialogContent sx={{ textAlign: "center", py: 5, px: 6 }}>
        {/* Glowing level badge */}
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${tierColors.main}40, ${tierColors.main}20)`,
            border: `4px solid ${tierColors.main}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: `0 0 40px ${tierColors.glow}, inset 0 0 20px ${tierColors.glow}`,
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%, 100%": {
                boxShadow: `0 0 40px ${tierColors.glow}, inset 0 0 20px ${tierColors.glow}`,
              },
              "50%": {
                boxShadow: `0 0 60px ${tierColors.glow}, inset 0 0 30px ${tierColors.glow}`,
              },
            },
          }}
        >
          <Typography
            variant="h2"
            fontWeight={800}
            sx={{ color: tierColors.main, lineHeight: 1 }}
          >
            {newLevel}
          </Typography>
        </Box>

        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            color: tierColors.main,
            textShadow: `0 0 20px ${tierColors.glow}`,
            mb: 1,
          }}
        >
          LEVEL UP!
        </Typography>

        <Typography variant="h6" color="text.primary" mb={1}>
          {exerciseName}
        </Typography>

        <Typography variant="body1" color="text.secondary" mb={3}>
          You've reached level {newLevel}!
        </Typography>

        <Box
          sx={{
            display: "inline-block",
            px: 2,
            py: 0.5,
            borderRadius: 2,
            backgroundColor: `${tierColors.main}30`,
            border: `1px solid ${tierColors.main}50`,
            mb: 3,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: tierColors.main,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {tier} Tier
          </Typography>
        </Box>

        <Box>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              backgroundColor: tierColors.main,
              color: tier === "silver" || tier === "platinum" ? "#1a1a1a" : "#fff",
              fontWeight: 600,
              px: 4,
              "&:hover": {
                backgroundColor: tierColors.main,
                filter: "brightness(1.1)",
              },
            }}
          >
            Awesome!
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
