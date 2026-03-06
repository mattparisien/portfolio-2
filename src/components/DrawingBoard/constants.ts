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

export const BG_COLOR = "#f5f0e8";

// ── Presence / multiplayer ────────────────────────────────────────────────

export const CURSOR_COLORS= [
  "#E4649D","#0053A3", "#00A23D", "#A0D921", "#FFABC2", "#F65C2C", "#5F2D3C", "#0E7AA9", "#328B77",
] as const;

export const CURSOR_ADJECTIVES = [
  "Sickening", "Gagged", "Snatched", "Fierce", "Serving",
  "Campy", "Shady", "Iconic", "Lewky", "Extra",
  "Delusional", "Unclocked", "Opulent", "Messy", "Legendary",
] as const;

export const CURSOR_ANIMALS = [
  "Lewk", "Realness", "Moment", "Situation", "Fantasy",
  "Villain", "Era", "Creature", "Bestie", "Legend",
  "Diva", "Witch", "Slayful", "Gaggina", "Creature",
] as const;

export function getOrCreateUser(): { name: string } {
  if (typeof window === "undefined") return { name: "User" };
  const stored = sessionStorage.getItem("lb_user");
  if (stored) return JSON.parse(stored) as { name: string };
  const name = `${CURSOR_ADJECTIVES[Math.floor(Math.random() * CURSOR_ADJECTIVES.length)]} ${CURSOR_ANIMALS[Math.floor(Math.random() * CURSOR_ANIMALS.length)]}`;
  const user = { name };
  sessionStorage.setItem("lb_user", JSON.stringify(user));
  return user;
}
