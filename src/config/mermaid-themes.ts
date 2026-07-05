// Mirrors anvilnote-web's src/lib/tiptap/mermaid.ts exactly — "monochrome"
// is an app-level concept, not a real Mermaid theme name, resolved the same
// way on both sides (theme "base" + themeVariables forcing every color role
// to black/white/gray) so a diagram renders identically in the editor
// preview and the exported PDF. Keep these two files in sync by hand.
export const MERMAID_THEMES = ["default", "base", "dark", "forest", "neutral", "monochrome"] as const;
export type MermaidTheme = (typeof MERMAID_THEMES)[number];

export function normalizeMermaidTheme(value: unknown): MermaidTheme {
  return typeof value === "string" && (MERMAID_THEMES as readonly string[]).includes(value)
    ? (value as MermaidTheme)
    : "default";
}

export const MONOCHROME_THEME_VARIABLES: Record<string, string> = {
  background: "#ffffff",
  primaryColor: "#ffffff",
  primaryTextColor: "#000000",
  primaryBorderColor: "#000000",
  lineColor: "#000000",
  secondaryColor: "#ffffff",
  tertiaryColor: "#ffffff",
  textColor: "#000000",
};

export function isCustomizableTheme(theme: MermaidTheme): boolean {
  return theme === "base";
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Resolves a node's theme + primaryColor into merman's own theme-name /
 *  themeVariables split — see mermaid()'s signature in the bundled
 *  @preview/merman package. */
export function resolveMermaidThemeArgs(
  theme: MermaidTheme,
  primaryColor: string | null | undefined,
): { themeName: string; themeVariables: Record<string, string> | null } {
  if (theme === "monochrome") {
    return { themeName: "base", themeVariables: MONOCHROME_THEME_VARIABLES };
  }
  if (theme === "base" && typeof primaryColor === "string" && HEX_COLOR_PATTERN.test(primaryColor)) {
    return { themeName: "base", themeVariables: { primaryColor } };
  }
  return { themeName: theme, themeVariables: null };
}
