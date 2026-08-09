import { escapeTypstString, escapeTypstText } from "../utils/escape-typst";
import type { FontChoices } from "../config/fonts";
import type { WatermarkFontFamily } from "../types/render-input";

export type { FontChoices };

// Resolved by render-document.ts before this module ever sees it -- image
// vs. text is already decided, the image (if any) has already been written
// into buildDir with its opacity pre-baked into the PNG's own alpha channel
// (see utils/watermark-image.ts; Typst's image() has no opacity parameter),
// and a null/default image has already been swapped for the bundled
// AnvilNote icon. This module's only job is emitting the Typst placement.
export type ResolvedWatermark = {
  type: "image" | "text";
  /** Filename inside buildDir, e.g. "watermark-image.png". Only for type: "image". */
  imageFilename?: string;
  /** Only for type: "text". */
  text?: string;
  rotationDeg: number;
  /** Only used for type: "text" (as a fill alpha) -- image opacity is already baked in. */
  opacityPercent: number;
  applyToFirstPage: boolean;
  fontFamily: WatermarkFontFamily;
  /** Applies to both types -- percent of the baseline size (image: 12cm
   *  width, text: 64pt), 100 = baseline. */
  sizePercent?: number;
};

const WATERMARK_IMAGE_BASE_WIDTH_CM = 12;
const WATERMARK_TEXT_BASE_SIZE_PT = 64;

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
  /** anvil-question.typ import path relative to the entry file. */
  sharedQuestionsRelPath: string;
  /** anvil-overrides.typ import path relative to the entry file. */
  sharedOverridesRelPath: string;
  /** Whether the renderer should wrap the template with apply-anvil-fonts. */
  usesAnvilFontWrapper?: boolean;
  /** When true, numberedHeadings/margin*Cm are applied via a generic
   *  `#show: apply-anvil-overrides.with(...)` rule nested right after
   *  `#show: anvil-template.with(...)` (so it wins), instead of being
   *  threaded as named arguments into anvil-template() itself. See
   *  template-loader.ts's usesSharedOverrides doc comment — false only
   *  for plain-note, which has its own native mechanism. */
  usesSharedOverrides?: boolean;
  /** "sidenote" templates need that symbol imported from the adapter into
   *  the entry file's scope, since the generated `body` calls it directly
   *  as `#sidenote[...]` — "footnote" needs nothing (Typst builtin). */
  footnoteStyle?: "footnote" | "sidenote";
  /** Resolved, validated font choices. */
  fonts: FontChoices;
  meta: Record<string, FieldValue>;
  options: Record<string, FieldValue>;
  body: string;
  /** Whether `body` contains a #mermaid(...) call — only then is
   *  @preview/merman imported, so a document with no mermaid blocks doesn't
   *  depend on that package (and its offline cache, see anvilnote-desktop's
   *  TYPST_PACKAGE_CACHE_PATH wiring) being present at all. */
  usesMermaid?: boolean;
  /** Same reasoning as usesMermaid above, for @preview/subpar (side-by-side
   *  image rows / imageRow). */
  usesSubpar?: boolean;
  /** Global page paper baseline; adapters may override via their own set page. */
  pagePreset?: string;
  /** Only set when the active template's manifest declares
   *  supportsNumberedHeadings — undefined means "don't emit the
   *  argument at all" (not "emit false"), since the receiving
   *  template's own function default (numbered-headings: true) should
   *  apply when this feature isn't wired for that template yet. */
  numberedHeadings?: boolean;
  /** Same "undefined = don't emit" pattern as numberedHeadings above, gated
   *  by the active template's manifest supportsCustomMargins — each is an
   *  independent partial override (a caller may set only marginTopCm and
   *  leave the rest at the template's own built-in default). Values are cm;
   *  emitted with a literal "cm" unit suffix so the receiving template gets
   *  an actual Typst length, not a bare number. */
  marginTopCm?: number;
  marginBottomCm?: number;
  marginLeftCm?: number;
  marginRightCm?: number;
  /** Absent/undefined when the watermark is disabled -- emits no Typst code at all. */
  watermark?: ResolvedWatermark;
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

// tiptap-to-typst.ts's blockquote case always emits `#quote(block: true,
// attribution: ...)[...]` (quotes: true is NOT used — the quoted passage
// itself no longer gets a "" wrapper, per explicit feedback reversing an
// earlier decision). Two overrides, both scoped to block quotes only:
//   1. Zero horizontal pad — block: true (needed for the attribution param
//      to render at all; confirmed via a real compile that quotes: true
//      alone silently drops a passed attribution) defaults to an indented
//      layout, which isn't wanted here.
//   2. Fully replace the built-in attribution rendering. Typst's own
//      quote() unconditionally prepends a single "—" before whatever
//      `attribution:` content is passed — confirmed via a real compile
//      that passing "—— Mark Twain" as the attribution renders "— ——
//      Mark Twain" (the built-in dash PLUS the caller's own). The desired
//      look is a Chinese-style double em-dash "——" and nothing else, so
//      the built-in mechanism is bypassed entirely: this show rule reads
//      `it.body`/`it.attribution` directly and renders the dash itself.
const QUOTE_STYLE = [
  `#show quote.where(block: true): set pad(x: 0pt)`,
  `#show quote.where(block: true): it => {`,
  `  it.body`,
  `  if it.attribution != none {`,
  `    align(right)[——#h(0.2em)#it.attribution]`,
  `  }`,
  `}`,
].join("\n");

// Identifiers imported from anvil-fonts.typ for the watermark's independent
// text-face choice (a user setting, unrelated to the document's own
// primary-lang-driven title/body stacks).
const WATERMARK_FONT_IDENT: Record<WatermarkFontFamily, string> = {
  serif: "body-fonts",
  sans: "title-fonts",
  rounded: "watermark-rounded-fonts",
};

// `#set page(background: ...)` repeats on every page (Typst lays the
// background content out fresh per page), which is exactly the "tiled
// across the whole export" behavior a watermark needs without looping
// per-page manually. The `context` block reads the CURRENT page number at
// layout time so applyToFirstPage can skip page 1 without needing a second
// document pass. Declared right before `body` (same spot as QUOTE_STYLE
// above) so it nests inside both the template's own page setup and
// apply-anvil-fonts, per this file's "declared later -> nests deeper ->
// wins" rule.
function buildWatermarkStyle(w: ResolvedWatermark): string {
  const alpha255 = Math.round((Math.max(0, Math.min(100, w.opacityPercent)) / 100) * 255);
  const guard = w.applyToFirstPage ? `true` : `counter(page).get().first() != 1`;
  const scale = Math.max(0, (w.sizePercent ?? 100) / 100);

  if (w.type === "image") {
    const widthCm = Math.round(WATERMARK_IMAGE_BASE_WIDTH_CM * scale * 100) / 100;
    return [
      `#set page(background: context {`,
      `  if ${guard} {`,
      `    place(`,
      `      center + horizon,`,
      `      rotate(${w.rotationDeg}deg, image("${escapeTypstString(w.imageFilename ?? "")}", width: ${widthCm}cm)),`,
      `    )`,
      `  }`,
      `})`,
    ].join("\n");
  }

  // `page(background: ...)` lays its content out against the full page frame
  // rather than an auto-sizing flow region, so `box(width: auto, text(...))`
  // -- which reliably prevents wrap in ordinary document flow -- still wraps
  // (and hyphen-breaks mid-word) here once the text hits the page edge.
  // Confirmed via a real compile: only explicitly `measure()`-ing the text's
  // own intrinsic width first and sizing the box to that exact value keeps
  // it on one line, since the box can no longer fall back to auto-sizing
  // against the surrounding (finite) region.
  const textSizePt = Math.round(WATERMARK_TEXT_BASE_SIZE_PT * scale * 100) / 100;
  return [
    `#set page(background: context {`,
    `  if ${guard} {`,
    `    let watermark-text = text(font: ${WATERMARK_FONT_IDENT[w.fontFamily]}, size: ${textSizePt}pt, fill: rgb(0, 0, 0, ${alpha255}))[${escapeTypstText(w.text ?? "")}]`,
    `    let watermark-size = measure(watermark-text)`,
    `    place(`,
    `      center + horizon,`,
    `      rotate(${w.rotationDeg}deg, box(width: watermark-size.width, watermark-text)),`,
    `    )`,
    `  }`,
    `})`,
  ].join("\n");
}

/**
 * Build the Typst entry file. The renderer recognizes one contract for every
 * template — `anvil-template(meta, options, body)` — and lets each adapter
 * translate that into the underlying package's real API.
 */
export function buildTypstEntry(input: BuildTypstEntryInput): string {
  const f = input.fonts;
  const usesAnvilFontWrapper = input.usesAnvilFontWrapper ?? true;
  const usesSharedOverrides = input.usesSharedOverrides ?? false;

  const adapterSymbols =
    input.footnoteStyle === "sidenote" ? "anvil-template, sidenote" : "anvil-template";

  const lines = [
    `#import "${input.sharedFontsRelPath}": ${usesAnvilFontWrapper ? "apply-anvil-fonts, " : ""}anvil-font-stacks${input.watermark ? ", body-fonts, title-fonts, watermark-rounded-fonts" : ""}`,
    `#import "${input.sharedCalloutsRelPath}": callout, proof`,
    `#import "${input.sharedQuestionsRelPath}": question-item, choices, answer-lines, answer-blank, answer-choice-image, question-blank, inline-blank`,
    ...(usesSharedOverrides ? [`#import "${input.sharedOverridesRelPath}": apply-anvil-overrides`] : []),
    ...(input.usesMermaid ? [`#import "@preview/merman:0.1.0": mermaid`] : []),
    ...(input.usesSubpar ? [`#import "@preview/subpar:0.2.2"`] : []),
    `#import "${input.adapterRelPath}": ${adapterSymbols}`,
    ``,
  ];

  if (input.pagePreset) {
    lines.push(`#set page(paper: "${input.pagePreset}")`, ``);
  }

  // Emitted here -- BEFORE `#show: anvil-template.with(...)` -- rather than
  // down by QUOTE_STYLE with the other universal style constants. Templates
  // that generate their own cover/TOC page (e.g. plain-note) do so from
  // WITHIN that show rule's call, using the `body` show-rule chains into as
  // their own function's `body` parameter; anything textually placed AFTER
  // that call only takes effect once the template's function reaches the
  // point where it re-inserts `body`, which for a cover-page template is
  // already page 2+. Confirmed via a real compile: with this rule placed
  // where QUOTE_STYLE lives, `applyToFirstPage: true` still produced no
  // watermark on plain-note's page 1. `context` defers evaluation to actual
  // per-page layout time regardless of where the `set` rule is declared, so
  // moving it this early doesn't change the applyToFirstPage skip logic --
  // it just makes the style active for every page from the start, including
  // ones a template generates before ever reaching the shared `body`.
  if (input.watermark) {
    lines.push(buildWatermarkStyle(input.watermark), ``);
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
    ...(!usesSharedOverrides && input.numberedHeadings !== undefined
      ? [`  numbered-headings: ${input.numberedHeadings},`]
      : []),
    ...(!usesSharedOverrides && input.marginTopCm !== undefined
      ? [`  margin-top: ${input.marginTopCm}cm,`]
      : []),
    ...(!usesSharedOverrides && input.marginBottomCm !== undefined
      ? [`  margin-bottom: ${input.marginBottomCm}cm,`]
      : []),
    ...(!usesSharedOverrides && input.marginLeftCm !== undefined
      ? [`  margin-left: ${input.marginLeftCm}cm,`]
      : []),
    ...(!usesSharedOverrides && input.marginRightCm !== undefined
      ? [`  margin-right: ${input.marginRightCm}cm,`]
      : []),
    // plain-note (the only !usesSharedOverrides template) hardcodes its own
    // page-paper default and, unlike margin/numbered-headings, actually
    // calls `set page(paper: ...)` itself -- confirmed via a real compile
    // that the top-level `#set page(paper: input.pagePreset)` above gets
    // silently overridden by that internal call. Threading it as a native
    // param here (same mechanism as margin-top etc.) lets plain-note apply
    // it BEFORE generating its own title/TOC pages, so the whole document
    // (not just `body`) gets the requested paper size.
    ...(!usesSharedOverrides && input.pagePreset
      ? [`  page-paper: "${input.pagePreset}",`]
      : []),
    `)`,
    ``,
  );

  // Nests INSIDE anvil-template (declared after it -> deeper -> wins), same
  // ordering rule apply-anvil-fonts below relies on. Only emitted for
  // templates whose anvil-template() doesn't natively accept these named
  // args (see usesSharedOverrides doc comment above).
  if (usesSharedOverrides) {
    lines.push(
      `#show: apply-anvil-overrides.with(`,
      ...(input.numberedHeadings !== undefined
        ? [`  numbered-headings: ${input.numberedHeadings},`]
        : []),
      ...(input.marginTopCm !== undefined ? [`  margin-top: ${input.marginTopCm}cm,`] : []),
      ...(input.marginBottomCm !== undefined
        ? [`  margin-bottom: ${input.marginBottomCm}cm,`]
        : []),
      ...(input.marginLeftCm !== undefined ? [`  margin-left: ${input.marginLeftCm}cm,`] : []),
      ...(input.marginRightCm !== undefined ? [`  margin-right: ${input.marginRightCm}cm,`] : []),
      `)`,
      ``,
    );
  }

  if (usesAnvilFontWrapper) {
    lines.push(`#show: apply-anvil-fonts.with(stacks: _stacks)`, ``);
  }

  lines.push(
    RAW_BLOCK_STYLE,
    ``,
    FOOTNOTE_STYLE,
    ``,
    QUOTE_STYLE,
    ``,
    input.body,
    ``,
  );

  return lines.join("\n");
}
