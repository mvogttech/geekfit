import { createTheme } from "@mui/material/styles";

// GeekFit Dark Theme
// Inspired by gaming/MMORPG aesthetics
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#00BCD4", // Cyan/Teal accent
      light: "#4DD0E1",
      dark: "#0097A7",
    },
    secondary: {
      main: "#FF9800", // Orange accent
      light: "#FFB74D",
      dark: "#F57C00",
    },
    background: {
      default: "#121212",
      paper: "#1E1E1E",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#B3B3B3",
    },
    error: {
      main: "#CF6679",
    },
    warning: {
      main: "#FFB74D",
    },
    success: {
      main: "#81C784",
    },
    info: {
      main: "#64B5F6",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
        },
      },
    },
  },
});

export default theme;
