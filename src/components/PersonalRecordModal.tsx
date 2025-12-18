import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { celebratePersonalRecord } from "../utils/confetti";
import { playPersonalRecordSound } from "../utils/sounds";
import { PersonalRecord } from "../utils/records";
import { getExerciseIcon } from "../utils/xp";

interface PersonalRecordModalProps {
  open: boolean;
  onClose: () => void;
  record: PersonalRecord | null;
  soundEnabled?: boolean;
}

export default function PersonalRecordModal({
  open,
  onClose,
  record,
  soundEnabled = true,
}: PersonalRecordModalProps) {
  useEffect(() => {
    if (open && record) {
      celebratePersonalRecord();
      if (soundEnabled) {
        playPersonalRecordSound();
      }
    }
  }, [open, record, soundEnabled]);

  if (!record) return null;

  const icon = getExerciseIcon(record.exerciseName);
  const recordTypeLabel =
    record.type === "single_session"
      ? "Single Session Record"
      : "Daily Total Record";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          background: "linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(0,0,0,0.9))",
          border: "2px solid #FFD700",
          boxShadow: "0 0 60px rgba(255, 215, 0, 0.3)",
        },
      }}
    >
      <DialogContent sx={{ textAlign: "center", py: 5, px: 6 }}>
        {/* Trophy icon */}
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.1))",
            border: "3px solid #FFD700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 0 30px rgba(255, 215, 0, 0.4)",
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 50, color: "#FFD700" }} />
        </Box>

        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            color: "#FFD700",
            textShadow: "0 0 20px rgba(255, 215, 0, 0.5)",
            mb: 2,
          }}
        >
          NEW RECORD!
        </Typography>

        <Typography variant="overline" color="text.secondary">
          {recordTypeLabel}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            my: 3,
          }}
        >
          <Typography fontSize={40}>{icon}</Typography>
          <Box>
            <Typography variant="h3" fontWeight={800} color="warning.main">
              {record.value}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {record.exerciseName}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={3}>
          You've set a new personal best!
        </Typography>

        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            backgroundColor: "#FFD700",
            color: "#1a1a1a",
            fontWeight: 600,
            px: 4,
            "&:hover": {
              backgroundColor: "#FFC107",
            },
          }}
        >
          Keep Going!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
