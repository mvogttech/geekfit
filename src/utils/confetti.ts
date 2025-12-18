import confetti from "canvas-confetti";

// Level up celebration - big confetti burst
export function celebrateLevelUp() {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ["#00BCD4", "#03DAC6", "#FF9800", "#FFD700"];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

// Achievement unlocked - stars burst from center
export function celebrateAchievement() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#FFD700", "#FFA500", "#FF6347"],
    shapes: ["star"],
  });
}

// Personal record - quick burst
export function celebratePersonalRecord() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors: ["#00BCD4", "#4DD0E1", "#80DEEA"],
  });
}

// Streak milestone - fire colors
export function celebrateStreak() {
  const end = Date.now() + 1500;

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 90,
      spread: 45,
      origin: { x: 0.5, y: 1 },
      colors: ["#FF6B00", "#FF9500", "#FFD000", "#FF4500"],
      gravity: 0.8,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

// Daily goal complete
export function celebrateDailyGoal() {
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.5 },
    colors: ["#03DAC6", "#00BCD4", "#4DD0E1"],
  });
}

// Quest complete - small celebration
export function celebrateQuestComplete() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.6 },
    colors: ["#FF9800", "#FFB74D", "#FFC107"],
  });
}
