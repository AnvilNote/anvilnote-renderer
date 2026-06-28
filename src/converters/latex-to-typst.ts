// tex2typst is ESM-only; the renderer compiles to CommonJS. Load it once via a
// dynamic import (the supported CJS→ESM path) and cache the function so the
// block/inline converters can stay synchronous.
type Tex2Typst = (latex: string) => string;

let converter: Tex2Typst | null = null;

/** Must be awaited once (e.g. at render start) before any latexToTypstMath call. */
export async function ensureMathLoaded(): Promise<void> {
  if (!converter) {
    const mod = await import("tex2typst");
    converter = mod.tex2typst;
  }
}

/**
 * Convert a LaTeX math string to Typst math markup (the inside of `$ … $`).
 * Math is authored in LaTeX in the editor and translated at render time.
 *
 * On any conversion error — or if the converter hasn't been loaded — we fall
 * back to the raw LaTeX as text so one malformed formula can't abort the whole
 * document render.
 */
export function latexToTypstMath(latex: string): { typst: string; ok: boolean } {
  const source = latex.trim();
  if (!source) {
    return { typst: "", ok: true };
  }
  if (!converter) {
    return { typst: source, ok: false };
  }
  try {
    return { typst: converter(source), ok: true };
  } catch {
    return { typst: source, ok: false };
  }
}
