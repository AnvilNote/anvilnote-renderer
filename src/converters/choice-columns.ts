// Same heuristic as anvilnote-web's src/lib/question-choices.ts (v3 —
// typed entries, not plain strings, since a choice can now be an image
// or block-math equation, not just text) and
// anvilnote-docx-exporter's src/markdown/question-choices.ts. No shared
// package between these three repos — kept in sync manually, same
// convention already established for this feature's earlier text-only
// version.
export type ChoiceEntry =
  | { kind: "text"; text: string }
  | { kind: "image" }
  | { kind: "blockMath" };

const IMAGE_OR_MATH_NOMINAL_WIDTH = 20;

export function displayWidth(s: string): number {
  let w = 0;
  for (const c of Array.from(s)) {
    const cp = c.codePointAt(0);
    w += cp !== undefined && cp >= 0x2e80 ? 2 : 1;
  }
  return w;
}

function entryWidth(entry: ChoiceEntry): number {
  return entry.kind === "text" ? displayWidth(entry.text) : IMAGE_OR_MATH_NOMINAL_WIDTH;
}

function isEntryEmpty(entry: ChoiceEntry): boolean {
  return entry.kind === "text" && entry.text.trim() === "";
}

export function choiceColumns(entries: ChoiceEntry[]): 1 | 2 | 4 {
  const nonEmpty = entries.filter((e) => !isEntryEmpty(e));
  if (nonEmpty.length === 0) return 4;
  const avg = nonEmpty.reduce((sum, e) => sum + entryWidth(e), 0) / nonEmpty.length;
  if (avg <= 14) return 4;
  if (avg <= 28) return 2;
  return 1;
}
