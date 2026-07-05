// Per-language cross-reference display text: what a crossRef pointing at a
// figure/table/equation renders as, based on the DOCUMENT's own language
// (template.options.primaryLang — the same field anvilnote-web's font
// picker uses, e.g. "圖" for zh drives the taiwan-pearl/song font stack)
// — NOT the UI locale of whoever is currently editing. A document written
// in Chinese should still say "圖 1" in its own exported PDF even if the
// editor's interface happens to be displayed in Japanese.
//
// Keep in sync with anvilnote-web's messages/*.json editor.crossRef.labels
// — same strings, just not literally shared code (this repo doesn't depend
// on anvilnote-web's dependency graph, same reasoning as config/callouts.ts
// duplicating anvilnote-web's callout palette instead of importing it).
//
// Figure/table: "{supplement} {number}" (space, no parens — "圖 1"/"Figure
// 1"). Equation: "{supplement} ({number})" (space AND parens — "式
// (1)"/"Equation (1)") — deliberately different from figure/table, per an
// explicit design decision, not an oversight. Headings have no supplement
// at all; a heading crossRef is just the heading's own text.
export type CrossRefPrimaryLang = "zh" | "en" | "ja" | "ko" | "th";

const SUPPLEMENTS: Record<CrossRefPrimaryLang, { figure: string; table: string; equation: string }> = {
  zh: { figure: "圖", table: "表", equation: "式" },
  en: { figure: "Figure", table: "Table", equation: "Equation" },
  ja: { figure: "図", table: "表", equation: "式" },
  ko: { figure: "그림", table: "표", equation: "식" },
  th: { figure: "รูปที่", table: "ตารางที่", equation: "สมการ" },
};

const DEFAULT_PRIMARY_LANG: CrossRefPrimaryLang = "zh";

function normalizePrimaryLang(value: string | undefined): CrossRefPrimaryLang {
  return value && value in SUPPLEMENTS ? (value as CrossRefPrimaryLang) : DEFAULT_PRIMARY_LANG;
}

// `value` is the already-resolved number string (e.g. "1") — this only
// formats it, it never computes it. Numbers come from anvilnote-web's
// cross-ref.ts, the single source of truth for "which number is this the
// Nth of" (see tiptap-to-typst.ts's resolver for why the renderer doesn't
// recompute this itself). A named equation's refName is only a readable
// label in the editor's @ suggestion list — resolvedValue is always the
// plain sequence number regardless, confirmed directly with the user
// (a named equation's crossRef still shows "式 (1)", not the name).
export function formatCrossRefLabel(
  kind: "figure" | "figureSub" | "table" | "equation" | "heading",
  value: string,
  primaryLang: string | undefined,
): string {
  if (kind === "heading") return value;

  const lang = normalizePrimaryLang(primaryLang);
  // figureSub's value already comes pre-formatted as "1 (a)" (see
  // anvilnote-web's cross-ref.ts numbering pass) — it shares "figure"'s
  // own supplement and plain "{supplement} {value}" join, not equation's
  // parenthesized one.
  const supplement = SUPPLEMENTS[lang][kind === "figureSub" ? "figure" : kind];
  return kind === "equation" ? `${supplement} (${value})` : `${supplement} ${value}`;
}
