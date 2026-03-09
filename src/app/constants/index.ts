/** Background colour palette cycled across sticky gallery sections. */
export const PALETTE = [
    "#A0C1B5",
    "#AF3C3F",
    "#B597B0",
    "#198948",
    "#E2CEBB",
    "#AF9786",
    "#0281AD",
    "#B77F3E",
    "#CFC47B",
    "#7E6259",
    "#CB968E"
];

/**
 * Fixed seed for the Fisher–Yates media shuffle.
 * Keeping this constant ensures the gallery order is identical on every visit
 * and across server/client hydration.
 */
export const SHUFFLE_SEED = 125;

/** Public contact e-mail shown in the page footer. */
export const CONTACT_EMAIL = "matthewparisien4@gmail.com";

/**
 * Colours used by ZigzagButton's letter-cycling hover animation.
 * These match the CSS custom properties --color-1 … --color-5 in globals.css.
 */
export const ANIMATION_COLORS = ["#EE4E2B", "#F3BE21", "#009563", "#F7D9D3", "#5266AB"];

