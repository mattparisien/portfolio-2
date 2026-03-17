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

// ── Presence / multiplayer ────────────────────────────────────────────────

export const CURSOR_COLORS= [
  "#E4649D","#0973d6", "#00A23D", "#A0D921", "#FFABC2", "#7241a1", "#5F2D3C", "#0E7AA9", "#328B77", "#F17EDD", "#DED7B9"
] as const;


export const CURSOR_NAMES = [
 "Rainbow Racket",
  "Velvet Vagenda",
  "Glitter Riot",
  "Lavender Voltage",
  "Campy Sprite",
  "Sapphic Snack",
  "Disco Invert",
  "Pronoun Punk",
  "Femme Feral",
  "Gender Goblin",
  "Twinkling Chaos",
  "Dyke Deluxe",
  "Club Crybaby",
  "Lilac Outlaw",
  "Glitter Anarchy",
  "Camp Coven",
  "Queer Quasar",
  "Velvet Butch",
  "Riot Princess",
  "Fruity Hex",
  "Moonlight Dyke",
  "Fairycore Femme",
  "Zesty Afterdark",
  "Glam Gremlin",
  "Orchid Outcast",
  "Lipstick Leftist",
  "Pansy Power",
  "Gay Darling",
  "Queerly Beloved",
  "Bratty Bi",
  "Slay Torque",
  "Prism Trouble",
  "Neon Tender",
  "Babygay Fever",
  "Disco Havoc",
  "Glitter Bender",
  "Camp Stardust",
  "Sapphic Voltage",
  "Fruity Menace",
  "Lavender Mischief",
  "Queer Eclipse",
  "Velvet Tantrum",
  "Glitter Hex",
  "Pansy Riot",
  "Rainbow Static",
  "Disco Serpent",
  "Lilac Fever",
  "Camp Darling",
  "Twinkle Vandal",
  "Gender Racket"
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
