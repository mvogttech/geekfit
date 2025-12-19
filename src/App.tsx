import { Routes, Route } from "react-router-dom";
import { Box } from "@mui/material";
import { UserProvider } from "./contexts/UserContext";
import { ExerciseProvider, useExercises } from "./contexts/ExerciseContext";
import { WellnessProvider } from "./contexts/WellnessContext";
import { LocaleProvider } from "./contexts/LocaleContext";
import Sidebar from "./components/Layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Exercises from "./pages/Exercises";
import Achievements from "./pages/Achievements";
import History from "./pages/History";
import Settings from "./pages/Settings";
import WeeklyWrapUp from "./pages/WeeklyWrapUp";
import Wellness from "./pages/Wellness";
import QuickLogDialog from "./components/QuickLogDialog";
import KeyboardShortcutsDialog from "./components/KeyboardShortcutsDialog";
import Onboarding, { useOnboarding } from "./components/Onboarding";
import { useGlobalHotkey } from "./hooks/useGlobalHotkey";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

const SIDEBAR_WIDTH = 220;

function AppContent() {
  const { quickLogOpen, closeQuickLog } = useGlobalHotkey();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { refreshExercises } = useExercises();

  const {
    shortcutsDialogOpen,
    setShortcutsDialogOpen,
  } = useKeyboardShortcuts({
    onShowShortcuts: () => setShortcutsDialogOpen(true),
  });

  const handleOnboardingComplete = () => {
    completeOnboarding();
    // Refresh exercises after onboarding saves the selected exercises
    refreshExercises();
  };

  return (
    <>
      {/* Onboarding for first-time users */}
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

      <Box sx={{ display: "flex", height: "100vh" }}>
        {/* Sidebar Navigation */}
        <Sidebar width={SIDEBAR_WIDTH} />

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: 2,
            px: 3,
            backgroundColor: "background.default",
            overflowY: "auto",
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/history" element={<History />} />
            <Route path="/weekly" element={<WeeklyWrapUp />} />
            <Route path="/wellness" element={<Wellness />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
      </Box>

      {/* Global Quick Log Dialog (Ctrl+Shift+Alt+G) */}
      <QuickLogDialog open={quickLogOpen} onClose={closeQuickLog} soundEnabled={true} />

      {/* Keyboard Shortcuts Dialog (Ctrl+/) */}
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
      />
    </>
  );
}

function App() {
  return (
    <LocaleProvider>
      <UserProvider>
        <ExerciseProvider>
          <WellnessProvider>
            <AppContent />
          </WellnessProvider>
        </ExerciseProvider>
      </UserProvider>
    </LocaleProvider>
  );
}

export default App;
