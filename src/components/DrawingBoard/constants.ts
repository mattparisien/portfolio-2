export const BOARD_ID = "main";

export const COLORS = [
  "#000000",
  "#ffffff",
  "#ff3cac",
  "#784ba0",
  "#2b86c5",
  "#00e5ff",
  "#ff6b6b",
  "#ffd93d",
  "#6bcb77",
  "#ff922b",
] as const;

export const BRUSH_SIZES = [2, 5, 10, 20, 40] as const;

export const BG_COLOR = "#F6F6F6";

// ── Presence / multiplayer ────────────────────────────────────────────────

export const CURSOR_COLORS= [
  "#E4649D","#0973d6", "#00A23D", "#A0D921", "#FFABC2", "#7241a1", "#5F2D3C", "#0E7AA9", "#328B77", "#F17EDD", "#DED7B9"
] as const;

export const CURSOR_NAMES = [
   "serve",
  "slay",
  "werk",
  "shade",
  "read",
  "reading",
  "tea",
  "spill",
  "sickening",
  "snatched",
  "cunty",
  "camp",
  "fierce",
  "iconic",
  "legendary",
  "mother",
  "mothering",
  "ate",
  "gagged",
  "clocked",
  "trade",
  "vogue",
  "ballroom",
  "runway",
  "category",
  "face",
  "realness",
  "yassified",
  "boots",
  "kiki",
  "glam",
  "diva",
  "femme",
  "twirl",
  "stunt",
  "drama",
  "fantasy",
  "extra",
  "fab"
] as const;

export function getOrCreateUser(): { name: string } {
  if (typeof window === "undefined") return { name: "User" };
  const stored = sessionStorage.getItem("lb_user");
  if (stored) return JSON.parse(stored) as { name: string };
  const name = `${CURSOR_NAMES[Math.floor(Math.random() * CURSOR_NAMES.length)]}`;
  const user = { name };
  sessionStorage.setItem("lb_user", JSON.stringify(user));
  return user;
}
