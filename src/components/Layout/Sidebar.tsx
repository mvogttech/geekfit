import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TimelineIcon from "@mui/icons-material/Timeline";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";
import SpaIcon from "@mui/icons-material/Spa";
import SettingsIcon from "@mui/icons-material/Settings";
import { useUser } from "../../contexts/UserContext";
import { getTitleForLevel } from "../../types";
import { formatXp } from "../../utils/xp";

interface SidebarProps {
  width: number;
}

const navItems = [
  { path: "/", label: "Dashboard", icon: <DashboardIcon /> },
  { path: "/exercises", label: "Exercises", icon: <FitnessCenterIcon /> },
  { path: "/achievements", label: "Achievements", icon: <EmojiEventsIcon /> },
  { path: "/history", label: "History", icon: <TimelineIcon /> },
  { path: "/weekly", label: "Weekly Wrap-Up", icon: <CalendarViewWeekIcon /> },
  { path: "/wellness", label: "Wellness", icon: <SpaIcon /> },
  { path: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

export default function Sidebar({ width }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { stats } = useUser();

  const totalLevel = stats?.total_level ?? 2;
  const totalXp = stats?.total_xp ?? 0;
  const exerciseCount = stats?.exercise_count ?? 2;
  const title = getTitleForLevel(totalLevel);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          backgroundColor: "background.paper",
          borderRight: "none",
        },
      }}
    >
      {/* User Level Card */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: "rgba(0, 188, 212, 0.08)",
            border: "1px solid rgba(0, 188, 212, 0.2)",
          }}
        >
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              Total Level
            </Typography>
            <Typography variant="body2" color="primary" fontWeight={600}>
              {totalLevel}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Total XP
            </Typography>
            <Typography variant="body2" color="primary">
              {formatXp(totalXp)}
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary">
            {exerciseCount} skills tracked
          </Typography>

          <Typography
            variant="subtitle2"
            color="primary"
            sx={{ mt: 1, fontWeight: 600 }}
          >
            {title}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

      {/* Navigation */}
      <List sx={{ px: 1, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                "&.Mui-selected": {
                  backgroundColor: "rgba(0, 188, 212, 0.12)",
                  "&:hover": {
                    backgroundColor: "rgba(0, 188, 212, 0.18)",
                  },
                },
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path
                      ? "primary.main"
                      : "text.secondary",
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  color:
                    location.pathname === item.path
                      ? "primary.main"
                      : "text.primary",
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Streak at bottom */}
      <Box sx={{ mt: "auto", p: 2 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: "rgba(3, 218, 198, 0.08)",
            border: "1px solid rgba(3, 218, 198, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography fontSize={24}>🔥</Typography>
          <Box>
            <Typography variant="body2" color="secondary" fontWeight={600}>
              {stats?.current_streak ?? 0} Day Streak
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Best: {stats?.longest_streak ?? 0} days
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
