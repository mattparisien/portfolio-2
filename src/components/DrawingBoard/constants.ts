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

export const CURSOR_COLORS = [
  "#359ED7", "#FE7336", "#68FFB0", "#E4FF98", "#C5B9FF",
  "#FF00E7", "#FEC8C2", "#FF3737", "#4D4BFD", "#711B1C",
] as const;

export const CURSOR_ADJECTIVES = [
  "Cosmic", "Sleepy", "Bouncy", "Fuzzy", "Glitchy",
  "Sneaky", "Turbo", "Neon", "Silent", "Wobbly",
] as const;

export const CURSOR_ANIMALS = [
  "Panda", "Walrus", "Ferret", "Gecko", "Narwhal",
  "Capybara", "Axolotl", "Quokka", "Lemur", "Tapir",
] as const;

export function getOrCreateUser(): { name: string; color: string } {
  if (typeof window === "undefined") return { name: "User", color: CURSOR_COLORS[0] };
  const stored = sessionStorage.getItem("lb_user");
  if (stored) return JSON.parse(stored) as { name: string; color: string };
  const name  = `${CURSOR_ADJECTIVES[Math.floor(Math.random() * CURSOR_ADJECTIVES.length)]} ${CURSOR_ANIMALS[Math.floor(Math.random() * CURSOR_ANIMALS.length)]}`;
  const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  const user  = { name, color };
  sessionStorage.setItem("lb_user", JSON.stringify(user));
  return user;
}
