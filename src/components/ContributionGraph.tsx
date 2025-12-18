import { useMemo } from "react";
import { Box, Typography, Tooltip, useTheme } from "@mui/material";

interface ContributionGraphProps {
  data: { date: string; count: number; xp: number }[];
  weeks?: number;
}

export default function ContributionGraph({
  data,
  weeks = 52,
}: ContributionGraphProps) {
  const theme = useTheme();

  // Generate the grid data for the last N weeks
  const gridData = useMemo(() => {
    const today = new Date();
    const days: {
      date: string;
      count: number;
      xp: number;
      dayOfWeek: number;
      weekIndex: number;
    }[] = [];

    // Create a map for quick lookup
    const dataMap = new Map(data.map((d) => [d.date, d]));

    // Calculate the start date (go back N weeks from today, align to Sunday)
    const totalDays = weeks * 7;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - totalDays + 1);
    // Align to the nearest Sunday before
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let i = 0; i < totalDays + today.getDay() + 1; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      if (currentDate > today) break;

      const dateStr = currentDate.toISOString().split("T")[0];
      const entry = dataMap.get(dateStr);
      const dayOfWeek = currentDate.getDay();
      const weekIndex = Math.floor(i / 7);

      days.push({
        date: dateStr,
        count: entry?.count || 0,
        xp: entry?.xp || 0,
        dayOfWeek,
        weekIndex,
      });
    }

    return days;
  }, [data, weeks]);

  // Get max count for intensity calculation
  const maxCount = useMemo(() => {
    return Math.max(...gridData.map((d) => d.count), 1);
  }, [gridData]);

  // Get intensity level (0-4)
  const getIntensity = (count: number): number => {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  // GitHub-style green colors
  const getColor = (intensity: number): string => {
    const colors = [
      theme.palette.mode === "dark" ? "#161b22" : "#ebedf0", // Level 0
      "#0e4429", // Level 1
      "#006d32", // Level 2
      "#26a641", // Level 3
      "#39d353", // Level 4
    ];
    return colors[intensity];
  };

  // Group by weeks
  const weekGroups = useMemo(() => {
    const groups: typeof gridData[] = [];
    let currentWeek: typeof gridData = [];

    gridData.forEach((day, index) => {
      if (day.dayOfWeek === 0 && currentWeek.length > 0) {
        groups.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });

    if (currentWeek.length > 0) {
      groups.push(currentWeek);
    }

    return groups;
  }, [gridData]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    gridData.forEach((day) => {
      const date = new Date(day.date);
      const month = date.getMonth();
      if (month !== lastMonth) {
        labels.push({
          month: date.toLocaleString("default", { month: "short" }),
          weekIndex: day.weekIndex,
        });
        lastMonth = month;
      }
    });

    return labels;
  }, [gridData]);

  const cellSize = 12;
  const cellGap = 3;

  // Calculate stats
  const totalExercises = gridData.reduce((sum, d) => sum + d.count, 0);
  const totalXp = gridData.reduce((sum, d) => sum + d.xp, 0);
  const activeDays = gridData.filter((d) => d.count > 0).length;
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = gridData.length - 1; i >= 0; i--) {
      if (gridData[i].count > 0) {
        streak++;
      } else if (i < gridData.length - 1) {
        // Allow today to be 0 if yesterday had activity
        break;
      }
    }
    return streak;
  }, [gridData]);

  return (
    <Box>
      {/* Stats row */}
      <Box
        sx={{
          display: "flex",
          gap: 3,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700} color="primary">
            {totalExercises.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            exercises this year
          </Typography>
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} color="secondary">
            {totalXp.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            XP earned
          </Typography>
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} color="success.main">
            {activeDays}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            active days
          </Typography>
        </Box>
      </Box>

      {/* Month labels */}
      <Box
        sx={{
          display: "flex",
          ml: "32px",
          mb: 0.5,
          fontSize: 10,
          color: "text.secondary",
        }}
      >
        {monthLabels.map((label, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              left: 32 + label.weekIndex * (cellSize + cellGap),
            }}
          >
            {label.month}
          </Box>
        ))}
      </Box>

      {/* Graph container */}
      <Box sx={{ display: "flex", position: "relative", mt: 3 }}>
        {/* Day labels */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            mr: 1,
            fontSize: 10,
            color: "text.secondary",
          }}
        >
          {["", "Mon", "", "Wed", "", "Fri", ""].map((day, i) => (
            <Box
              key={i}
              sx={{
                height: cellSize + cellGap,
                display: "flex",
                alignItems: "center",
              }}
            >
              {day}
            </Box>
          ))}
        </Box>

        {/* Grid */}
        <Box
          sx={{
            display: "flex",
            gap: `${cellGap}px`,
            overflowX: "auto",
            pb: 1,
          }}
        >
          {weekGroups.map((week, weekIndex) => (
            <Box
              key={weekIndex}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: `${cellGap}px`,
              }}
            >
              {/* Pad the first week if needed */}
              {weekIndex === 0 &&
                Array(week[0]?.dayOfWeek || 0)
                  .fill(null)
                  .map((_, i) => (
                    <Box
                      key={`pad-${i}`}
                      sx={{
                        width: cellSize,
                        height: cellSize,
                      }}
                    />
                  ))}
              {week.map((day) => (
                <Tooltip
                  key={day.date}
                  title={
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="body2" fontWeight={600}>
                        {day.count} exercise{day.count !== 1 ? "s" : ""}
                      </Typography>
                      <Typography variant="caption">
                        {day.xp} XP on{" "}
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Typography>
                    </Box>
                  }
                  arrow
                >
                  <Box
                    sx={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: "2px",
                      backgroundColor: getColor(getIntensity(day.count)),
                      cursor: "pointer",
                      transition: "transform 0.1s",
                      "&:hover": {
                        transform: "scale(1.2)",
                      },
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Legend */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 0.5,
          mt: 1,
          fontSize: 10,
          color: "text.secondary",
        }}
      >
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <Box
            key={level}
            sx={{
              width: cellSize,
              height: cellSize,
              borderRadius: "2px",
              backgroundColor: getColor(level),
            }}
          />
        ))}
        <span>More</span>
      </Box>
    </Box>
  );
}
