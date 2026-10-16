export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "kripto.appearance.v1";
export const TAB_BAR_HEIGHT = 72;
export const getTabContentPadding = (bottomInset: number) =>
  TAB_BAR_HEIGHT + Math.max(bottomInset, 16) + 32;

const dark = {
  background: "#10131b",
  surface: "#1a1f2b",
  elevated: "#252b39",
  text: "#f4f5fa",
  muted: "#a3aec2",
  primary: "#f0c45c",
  primarySoft: "#363126",
  action: "#f0c45c",
  onPrimary: "#171a22",
  accent: "#aca2ff",
  switchThumb: "#ffffff",
  border: "#30384b",
  danger: "#ff8591",
  dangerSoft: "#36232e",
  onDanger: "#171a22",
  success: "#6ed6ad",
  successSoft: "#1b332f",
  overlay: "rgba(0,0,0,0.65)",
};

export type ThemeColors = { [Key in keyof typeof dark]: string };

const light: ThemeColors = {
  background: "#f5f6fa",
  surface: "#ffffff",
  elevated: "#eceef5",
  text: "#182032",
  muted: "#5c667b",
  primary: "#855b0d",
  primarySoft: "#fff3d8",
  action: "#f0c45c",
  onPrimary: "#171a22",
  accent: "#6650b9",
  switchThumb: "#ffffff",
  border: "#d8deea",
  danger: "#b32b46",
  dangerSoft: "#fff0f2",
  onDanger: "#ffffff",
  success: "#167348",
  successSoft: "#e6f5ee",
  overlay: "rgba(16,19,27,0.35)",
};

export const themeColors: Record<ThemeMode, ThemeColors> = { dark, light };

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}
