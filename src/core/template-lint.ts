// Template font lint.
//
// Templates own layout; fonts are owned by templates/shared/anvil-fonts.typ and
// the renderer wrapper. This lint flags any template that tries to set fonts
// itself or names a forbidden (commercial / off-policy) family.
//
// Note: comments are stripped before matching so a `// … font …` note doesn't
// trip the rules. Adapters that merely forward an upstream package's own API
// are not the target here — the patterns look for Typst `set`/`show` font
// overrides and banned family names in the template source.

export type LintRule = {
  label: string;
  pattern: RegExp;
};

export const FORBIDDEN_TEMPLATE_PATTERNS: LintRule[] = [
  { label: "global font override (#set text(font:))", pattern: /#?\bset\s+text\s*\([^)]*font\s*:/ },
  { label: "local font override (#text(font:))", pattern: /#?\btext\s*\([^)]*font\s*:/ },
  { label: "raw show override (#show raw:)", pattern: /#?\bshow\s+raw\b[^\n]*:/ },
  { label: "math show override (#show math.equation:)", pattern: /#?\bshow\s+math\.equation\s*:/ },
  { label: "Times New Roman", pattern: /Times\s+New\s+Roman/i },
  { label: "Calibri", pattern: /Calibri/i },
  { label: "Cambria", pattern: /Cambria/i },
  { label: "Sabon", pattern: /Sabon/i },
  { label: "cwTeX", pattern: /cwTeX/i },
];

const LINE_COMMENT = "//";

/** Strip line (`//`) comments so notes don't false-trip the font-policy rules. */
function stripTypstComments(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const idx = line.indexOf(LINE_COMMENT);
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");
}

export function lintTemplateSource(source: string, filePath: string): string[] {
  const code = stripTypstComments(source);
  const errors: string[] = [];
  for (const rule of FORBIDDEN_TEMPLATE_PATTERNS) {
    if (rule.pattern.test(code)) {
      errors.push(`${filePath}: forbidden template pattern: ${rule.label}`);
    }
  }
  return errors;
}
