// AnvilNote font preset configuration.
//
// Single source of truth for the Typst font stacks the renderer enforces on
// every document. Templates control layout; fonts are owned here and in
// templates/shared/anvil-fonts.typ (the two must stay in sync). System fonts
// are intentionally ignored at compile time, so every family listed below must
// resolve from the bundled `fonts/` directory.

export const FONT_PRESET_VERSION = "0.1.0";
export const FONT_BUNDLE = "anvilnote-default";

export type MathMode = "default" | "garamond";

/** User-switchable display font for the author/date line. */
export type DateFont = "playfair" | "tai-heritage";
export const DEFAULT_DATE_FONT: DateFont = "playfair";

/** Primary document language; moves that language's face to the front of every stack. */
export type PrimaryLang = "zh" | "en" | "ja" | "ko" | "th";
/** Primary CJK face for title/heading (sans/rounded role). */
export type TitleFace = "taiwan-pearl" | "source-han";
/** Primary CJK face for body/meta (serif role). */
export type BodyFace = "song" | "kai";

/** The complete set of user font choices that drive the stack builder. */
export type FontChoices = {
  primaryLang: PrimaryLang;
  titleFace: TitleFace;
  bodyFace: BodyFace;
  dateFace: DateFont;
  mathFace: MathMode;
};

export const DEFAULT_FONT_CHOICES: FontChoices = {
  primaryLang: "zh",
  titleFace: "taiwan-pearl",
  bodyFace: "song",
  dateFace: "playfair",
  mathFace: "default",
};

const PRIMARY_LANGS: PrimaryLang[] = ["zh", "en", "ja", "ko", "th"];
const TITLE_FACES: TitleFace[] = ["taiwan-pearl", "source-han"];
const BODY_FACES: BodyFace[] = ["song", "kai"];
const DATE_FACES: DateFont[] = ["playfair", "tai-heritage"];
const MATH_FACES: MathMode[] = ["default", "garamond"];

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Resolve validated font choices from a template options dict. Unknown / missing
 * values fall back to the AnvilNote defaults; legacy `mathMode` is honored.
 */
export function resolveFontChoices(
  options: Record<string, string | boolean | null | undefined>,
): FontChoices {
  return {
    primaryLang: pick(options.primaryLang, PRIMARY_LANGS, DEFAULT_FONT_CHOICES.primaryLang),
    titleFace:
      typeof options.titleFont === "string" && options.titleFont === "swei"
        ? "taiwan-pearl"
        : pick(options.titleFont, TITLE_FACES, DEFAULT_FONT_CHOICES.titleFace),
    bodyFace: pick(options.bodyFont, BODY_FACES, DEFAULT_FONT_CHOICES.bodyFace),
    dateFace: pick(options.dateFont, DATE_FACES, DEFAULT_FONT_CHOICES.dateFace),
    mathFace: pick(options.mathMode, MATH_FACES, DEFAULT_FONT_CHOICES.mathFace),
  };
}

export type FontPresetKey =
  | "title"
  | "meta"
  | "body"
  | "heading"
  | "code"
  | "math-default"
  | "math-garamond"
  | "date-playfair"
  | "date-tai-heritage";

export type FontPreset = {
  key: FontPresetKey;
  label: string;
  typstStack: Array<string | { name: string; covers?: string }>;
};

export const FONT_PRESETS: Record<FontPresetKey, FontPreset> = {
  title: {
    key: "title",
    label: "Title",
    typstStack: [
      "Roboto",
      "TaiwanPearl",
      "思源黑體 TW",
      "Noto Sans",
      "Noto Sans JP",
      "Noto Sans KR",
      "Noto Sans Thai",
    ],
  },

  meta: {
    key: "meta",
    label: "Author / Date",
    typstStack: [
      "TW-MOE-Std-Song",
      "Tinos",
      "Noto Serif JP",
      "Noto Serif KR",
      "Noto Serif Thai",
      "Noto Serif",
    ],
  },

  body: {
    key: "body",
    label: "Body",
    typstStack: [
      "TW-MOE-Std-Song",
      "Tinos",
      "Noto Serif JP",
      "Noto Serif KR",
      "Noto Serif Thai",
      "Noto Serif",
    ],
  },

  heading: {
    key: "heading",
    label: "Heading",
    typstStack: [
      "Roboto",
      "TaiwanPearl",
      "思源黑體 TW",
      "Noto Sans",
      "Noto Sans JP",
      "Noto Sans KR",
      "Noto Sans Thai",
    ],
  },

  code: {
    key: "code",
    label: "Code",
    typstStack: ["JetBrains Mono", "Noto Sans Mono"],
  },

  "math-default": {
    key: "math-default",
    label: "Math Default",
    typstStack: ["New Computer Modern Math"],
  },

  "math-garamond": {
    key: "math-garamond",
    label: "Math Garamond",
    typstStack: ["Garamond-Math"],
  },

  // Switchable author/date display faces. Latin/numbers use the chosen display
  // face; CJK falls back through the serif (meta) stack.
  "date-playfair": {
    key: "date-playfair",
    label: "Date · Playfair Display",
    typstStack: [
      "Playfair Display",
      "TW-MOE-Std-Song",
      "Noto Serif JP",
      "Noto Serif KR",
      "Noto Serif Thai",
      "Noto Serif",
    ],
  },

  "date-tai-heritage": {
    key: "date-tai-heritage",
    label: "Date · Tai Heritage Pro",
    typstStack: [
      "Tai Heritage Pro",
      "TW-MOE-Std-Song",
      "Noto Serif JP",
      "Noto Serif KR",
      "Noto Serif Thai",
      "Noto Serif",
    ],
  },
};

export function getFontPreset(key: FontPresetKey): FontPreset {
  return FONT_PRESETS[key];
}

/** Map the user-facing dateFont option to its preset key. */
export function dateFontPresetKey(dateFont: DateFont): FontPresetKey {
  return dateFont === "tai-heritage" ? "date-tai-heritage" : "date-playfair";
}

function stackEntryName(entry: string | { name: string; covers?: string }): string {
  return typeof entry === "string" ? entry : entry.name;
}

/** Escape a font family name for embedding inside a Typst string literal. */
function typstFontName(name: string): string {
  return `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Return a Typst tuple literal for a preset's font stack, e.g.
 * `("Roboto", "TaiwanPearl", …)`. A single-entry stack still renders as
 * a one-tuple `("JetBrains Mono",)` so it stays a valid `font:` array value.
 */
export function getTypstFontStack(key: FontPresetKey): string {
  const names = FONT_PRESETS[key].typstStack.map(stackEntryName).map(typstFontName);
  if (names.length === 1) {
    return `(${names[0]},)`;
  }
  return `(${names.join(", ")})`;
}

/** Families that must be present in the bundle for a full-coverage render. */
export const REQUIRED_FONT_FAMILIES: string[] = [
  "TW-MOE-Std-Kai",
  "TW-MOE-Std-Song",
  "思源黑體 TW",
  "TaiwanPearl",
  "Tinos",
  "Noto Sans",
  "Noto Serif",
  "Noto Sans JP",
  "Noto Serif JP",
  "Noto Sans KR",
  "Noto Serif KR",
  "Noto Sans Thai",
  "Noto Serif Thai",
  "Roboto",
  "JetBrains Mono",
  "Noto Sans Mono",
  "New Computer Modern Math",
  "EB Garamond",
  "Garamond-Math",
  "Playfair Display",
  "Tai Heritage Pro",
];
