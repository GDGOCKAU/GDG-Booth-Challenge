export const GOOGLE = { blue: "#4285F4", red: "#EA4335", yellow: "#FBBC04", green: "#34A853" };
export const PRIMARY = { base: "#3A7CF5", hover: "#2563EB", tintLight: "#E8F0FE", tintDark: "#1A2E4B" };

export const DIFFICULTY_THEMES = {
  Easy: { color: GOOGLE.green, text: "#FFFFFF" },
  Medium: { color: GOOGLE.yellow, text: "#1C1B1F" },
  Hard: { color: GOOGLE.blue, text: "#FFFFFF" },
  Impossible: { color: GOOGLE.red, text: "#FFFFFF" },
};

export function difficultyTheme(value = "Medium") {
  return DIFFICULTY_THEMES[value] || DIFFICULTY_THEMES.Medium;
}

const LIGHT = { bg: "#F8F9FA", surface: "#FFFFFF", surfaceAlt: "#F1F3F4", border: "#E0E0E0", textPrimary: "#1C1B1F", textSecondary: "#3C4043", textMuted: "#5F6368", textFaint: "#9AA0A6", primaryTint: "#E8F0FE" };
const DARK = { bg: "#121212", surface: "#1E1E1E", surfaceAlt: "#2A2A2A", border: "#333333", textPrimary: "#E0E0E0", textSecondary: "#CCCCCC", textMuted: "#AAAAAA", textFaint: "#888888", primaryTint: "#1A2E4B" };

export const theme = (darkMode) => darkMode ? DARK : LIGHT;
export const AVATAR_COLORS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];
export function colorForName(name = "") { let hash = 0; for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash); return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]; }
export function initials(name = "") { return name.trim().split(/[\s_-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "G"; }
