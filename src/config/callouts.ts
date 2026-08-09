export type CalloutKind = {
  id: string;
  accent: string;
  background: string;
};

// The 12 supported callout kinds. Keep this list in sync with
// anvilnote-web's src/config/callouts.ts and templates/shared/anvil-callout.typ
// (the Typst-side palette actually used at render time).
export const CALLOUT_KINDS: CalloutKind[] = [
  { id: "note", accent: "#448AFF", background: "#E5ECF8" },
  { id: "abstract", accent: "#00B0FF", background: "#DEF0F8" },
  { id: "info", accent: "#00B8D4", background: "#DEF1F4" },
  { id: "tip", accent: "#00BFA5", background: "#DEF1EF" },
  { id: "success", accent: "#01C853", background: "#DEF2E6" },
  { id: "question", accent: "#64DD17", background: "#E8F5E0" },
  { id: "warning", accent: "#FF9100", background: "#F8EDDE" },
  { id: "failure", accent: "#FF5252", background: "#F8E6E6" },
  { id: "danger", accent: "#FF1744", background: "#F8E0E5" },
  { id: "bug", accent: "#F50057", background: "#F7DEE7" },
  { id: "example", accent: "#7C4DFF", background: "#EBE6F8" },
  { id: "quote", accent: "#9E9E9E", background: "#EEEEEE" },
];

export const DEFAULT_CALLOUT_KIND = "note";

// A 13th, deliberately-not-in-CALLOUT_KINDS option -- mirrors
// anvilnote-web's src/config/callouts.ts exactly (see that file's own
// comment): "custom" has no fixed accent/background of its own, both come
// from the document's own customAccent attr (background computed from it,
// not stored) at render time via computeCustomBackground below.
export const CUSTOM_CALLOUT_KIND = "custom";

const CALLOUT_KIND_IDS = new Set(CALLOUT_KINDS.map((k) => k.id));

export function normalizeCalloutKind(value: string | undefined | null): string {
  if (value === CUSTOM_CALLOUT_KIND) return value;
  if (value && CALLOUT_KIND_IDS.has(value)) return value;
  return DEFAULT_CALLOUT_KIND;
}

// Plain HSL<->hex math, not a library -- this repo's dist/cli.js is a
// standalone esbuild bundle with no node_modules at runtime, so this stays
// dependency-free rather than pulling in the `color` package the web repo
// already had on hand for the same computation.
function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// PDF has no dark mode, so only the light background needs computing here
// (unlike anvilnote-web's own computeCustomPalette, which also derives a
// darkBackground) -- same formula (S 50% L 92%), same reasoning: see
// anvilnote-web's src/config/callouts.ts for where these numbers came from.
export function computeCustomBackground(accentHex: string): string {
  return hslToHex(hexToHue(accentHex), 50, 92);
}

// Mirrors anvilnote-web's src/config/callouts.ts readableTextColor /
// isBackgroundDark / accentOrReadableTextColor exactly (same formulas, same
// thresholds, same reasoning documented there in full) -- the web editor's
// own live preview and this PDF export need to agree on when a callout's
// text needs to go light, or a dark custom accent/background pairing (only
// reachable through the "custom" kind's free-form color pickers) reads fine
// on screen and unreadable in the exported PDF, or vice versa.
function relativeLuminance(hex: string): number {
  const gammaCorrect = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const r = gammaCorrect(parseInt(hex.slice(1, 3), 16) / 255);
  const g = gammaCorrect(parseInt(hex.slice(3, 5), 16) / 255);
  const b = gammaCorrect(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(luminanceA: number, luminanceB: number): number {
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableTextColor(backgroundHex: string): string {
  const bgLuminance = relativeLuminance(backgroundHex);
  return contrastRatio(bgLuminance, 1) >= contrastRatio(bgLuminance, 0) ? "#FFFFFF" : "#0A0A0A";
}

// Same 0.4 threshold as anvilnote-web -- see that file's own comment for
// where it came from (a wide empirically-measured gap between all 12
// presets' light backgrounds (0.778-0.878) and dark backgrounds
// (0.033-0.068), any value in between works).
const DARK_BACKGROUND_LUMINANCE_THRESHOLD = 0.4;

export function isBackgroundDark(backgroundHex: string): boolean {
  return relativeLuminance(backgroundHex) < DARK_BACKGROUND_LUMINANCE_THRESHOLD;
}

// Same 1.2 threshold as anvilnote-web -- see that file's own comment: NOT
// the WCAG AA 4.5:1 floor (none of the 12 real presets' own accent/
// background pairs clear that, measured directly), and NOT "just under the
// lowest accepted preset" either (1.56, "question") -- a real reported bug
// pairing measured at 1.74, HIGHER than that, so no cutoff between 1.56 and
// some higher value can separate "accepted existing design" from "the
// reported bug". Deliberately low: only catches genuinely pathological
// near-identical pairings, never any of the 12 presets.
const MIN_ACCEPTABLE_TITLE_CONTRAST = 1.2;

export function accentOrReadableTextColor(accentHex: string, backgroundHex: string): string {
  const contrast = contrastRatio(relativeLuminance(accentHex), relativeLuminance(backgroundHex));
  return contrast >= MIN_ACCEPTABLE_TITLE_CONTRAST ? accentHex : readableTextColor(backgroundHex);
}
