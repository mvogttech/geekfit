// Sound effects using Web Audio API
// These generate synthesized sounds - no external files needed

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Play a tone with given frequency and duration
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3
) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn("Audio not available:", error);
  }
}

// Level up sound - ascending arpeggio
export function playLevelUpSound() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, "square", 0.2), i * 100);
  });
}

// Achievement unlocked - triumphant fanfare
export function playAchievementSound() {
  const notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, "triangle", 0.25), i * 150);
  });
  // Final chord
  setTimeout(() => {
    playTone(523.25, 0.5, "triangle", 0.2);
    playTone(659.25, 0.5, "triangle", 0.2);
    playTone(783.99, 0.5, "triangle", 0.2);
  }, 600);
}

// XP gained - quick positive blip
export function playXpSound() {
  playTone(880, 0.1, "sine", 0.15);
  setTimeout(() => playTone(1108.73, 0.15, "sine", 0.1), 50);
}

// Personal record - special celebration sound
export function playPersonalRecordSound() {
  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, "sawtooth", 0.15), i * 80);
  });
}

// Streak sound - warm ascending
export function playStreakSound() {
  playTone(329.63, 0.15, "triangle", 0.2); // E4
  setTimeout(() => playTone(415.30, 0.15, "triangle", 0.2), 100); // G#4
  setTimeout(() => playTone(523.25, 0.2, "triangle", 0.2), 200); // C5
}

// Quest complete - cheerful jingle
export function playQuestCompleteSound() {
  playTone(587.33, 0.1, "square", 0.15); // D5
  setTimeout(() => playTone(659.25, 0.1, "square", 0.15), 80); // E5
  setTimeout(() => playTone(783.99, 0.2, "square", 0.2), 160); // G5
}

// Error/fail sound
export function playErrorSound() {
  playTone(200, 0.2, "sawtooth", 0.2);
  setTimeout(() => playTone(150, 0.3, "sawtooth", 0.15), 150);
}

// Button click - subtle
export function playClickSound() {
  playTone(600, 0.05, "sine", 0.1);
}

// Daily goal complete
export function playDailyGoalSound() {
  const notes = [523.25, 587.33, 659.25, 783.99, 880]; // C5 to A5
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, "triangle", 0.2), i * 100);
  });
}

// Reminder notification sound - gentle attention-getter
export function playReminderSound() {
  playTone(440, 0.15, "sine", 0.2); // A4
  setTimeout(() => playTone(554.37, 0.15, "sine", 0.2), 150); // C#5
  setTimeout(() => playTone(659.25, 0.2, "sine", 0.25), 300); // E5
}
