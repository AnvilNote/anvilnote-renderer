import { escapeTypstString } from "../utils/escape-typst";
import type { FontChoices } from "../config/fonts";

export type { FontChoices };

export type FieldValue = string | boolean | null | undefined;

/** Serialize a single normalized field value to a Typst literal. */
export function fieldValueToTypst(value: FieldValue): string {
  if (value === null || value === undefined || value === "") {
    return "none";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return `"${escapeTypstString(String(value))}"`;
}

/**
 * Serialize a normalized meta/options dict to a Typst dictionary literal.
 * Field keys are camelCase identifiers (valid Typst dict keys); empty dicts
 * render as `(:)`. Adapters read values via `.at(key, default: ...)`.
 *
 * Empty optional fields (null / undefined / "") are OMITTED rather than emitted
 * as `key: none`. Emitting `none` overrides the adapter's declared default
 * (e.g. `meta.at("author", default: ())`), which can break downstream calls
 * like `set document(author: none)`. Omitting lets the default apply. Booleans
 * (including `false`) are kept since they are meaningful values.
 */
export function dictToTypst(dict: Record<string, FieldValue>): string {
  const entries = Object.entries(dict).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  if (entries.length === 0) {
    return "(:)";
  }
  const body = entries
    .map(([key, value]) => `${key}: ${fieldValueToTypst(value)}`)
    .join(", ");
  return `(${body})`;
}

export type BuildTypstEntryInput = {
  /** Adapter import path relative to the entry file (e.g. "../../template.typ"). */
  adapterRelPath: string;
  /** anvil-fonts.typ import path relative to the entry file. */
  sharedFontsRelPath: string;
  /** anvil-callout.typ import path relative to the entry file. */
  sharedCalloutsRelPath: string;
  /** Whether the renderer should wrap the template with apply-anvil-fonts. */
  usesAnvilFontWrapper?: boolean;
  /** "sidenote" templates need that symbol imported from the adapter into
   *  the entry file's scope, since the generated `body` calls it directly
   *  as `#sidenote[...]` — "footnote" needs nothing (Typst builtin). */
  footnoteStyle?: "footnote" | "sidenote";
  /** Resolved, validated font choices. */
  fonts: FontChoices;
  meta: Record<string, FieldValue>;
  options: Record<string, FieldValue>;
  body: string;
  /** Global page paper baseline; adapters may override via their own set page. */
  pagePreset?: string;
};

// Code-block styling shared by every template: Typst's native `raw`
// highlighting (theme: auto) plus a light framed block. The monospace font
// stack is owned by the AnvilNote font wrapper (anvil-fonts.typ), not here, so
// the font policy stays in one place. Line numbers / custom themes (Codly,
// Zebraw, .tmTheme) are intentionally out of scope for now.
const RAW_BLOCK_STYLE = [
  `#set raw(theme: auto, tab-size: 2)`,
  `#show raw.where(block: true): block.with(`,
  `  fill: rgb("#F7F7F8"),`,
  `  stroke: rgb("#E5E7EB"),`,
  `  inset: 10pt,`,
  `  width: 100%,`,
  `  breakable: true,`,
  `)`,
].join("\n");

// Typst's default footnote reference marker sits a little low relative to
// the surrounding text; raise it slightly (negative baseline = up) so it
// reads as a proper superscript across every template.
const FOOTNOTE_STYLE = [`#show footnote: set text(baseline: -0.3em)`].join("\n");

/**
 * Build the Typst entry file. The renderer recognizes one contract for every
 * template — `anvil-template(meta, options, body)` — and lets each adapter
 * translate that into the underlying package's real API.
 */
export function buildTypstEntry(input: BuildTypstEntryInput): string {
  const f = input.fonts;
  const usesAnvilFontWrapper = input.usesAnvilFontWrapper ?? true;

  const adapterSymbols =
    input.footnoteStyle === "sidenote" ? "anvil-template, sidenote" : "anvil-template";

  const lines = [
    `#import "${input.sharedFontsRelPath}": ${usesAnvilFontWrapper ? "apply-anvil-fonts, " : ""}anvil-font-stacks`,
    `#import "${input.sharedCalloutsRelPath}": callout, proof`,
    `#import "${input.adapterRelPath}": ${adapterSymbols}`,
    ``,
  ];

  if (input.pagePreset) {
    lines.push(`#set page(paper: "${input.pagePreset}")`, ``);
  }

  // Resolve every role stack once from the user's scalar choices. The same dict
  // drives the universal body wrapper AND is handed to the template so its own
  // title / author / date chrome uses the matching stacks.
  lines.push(
    `#let _stacks = anvil-font-stacks(`,
    `  primary-lang: "${f.primaryLang}",`,
    `  title-face: "${f.titleFace}",`,
    `  body-face: "${f.bodyFace}",`,
    `  date-face: "${f.dateFace}",`,
    `  math-face: "${f.mathFace}",`,
    `)`,
    ``,
  );

  // Order matters. `#show: A` then `#show: B` then C composes as A(B(C)), so a
  // rule declared LATER nests deeper. The template (often a third-party
  // @preview package) sets its own fonts inside its show rule; to make the
  // AnvilNote font policy WIN for the document body, apply-anvil-fonts must nest
  // INSIDE the template — i.e. be declared AFTER it. The template owns layout
  // and draws its title/author/date chrome from the `fonts` dict; everything in
  // `body` (paragraphs, headings, code, math) is forced onto the chosen stacks.
  lines.push(
    `#show: anvil-template.with(`,
    `  meta: ${dictToTypst(input.meta)},`,
    `  options: ${dictToTypst(input.options)},`,
    `  fonts: _stacks,`,
    `)`,
    ``,
  );

  if (usesAnvilFontWrapper) {
    lines.push(`#show: apply-anvil-fonts.with(stacks: _stacks)`, ``);
  }

  lines.push(
    RAW_BLOCK_STYLE,
    ``,
    FOOTNOTE_STYLE,
    ``,
    input.body,
    ``,
  );

  return lines.join("\n");
}
