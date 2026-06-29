import { escapeTypstString } from "../utils/escape-typst";

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
  meta: Record<string, FieldValue>;
  options: Record<string, FieldValue>;
  body: string;
  /** Global page paper baseline; adapters may override via their own set page. */
  pagePreset?: string;
};

// Code-block styling shared by every template: Typst's native `raw`
// highlighting (theme: auto) plus a monospace stack and a light framed block.
// Line numbers / custom themes (Codly, Zebraw, .tmTheme) are intentionally out
// of scope for now.
const RAW_BLOCK_STYLE = [
  `#set raw(theme: auto, tab-size: 2)`,
  `#show raw: set text(font: ("JetBrains Mono", "Noto Sans Mono", "Latin Modern Mono"), size: 0.88em)`,
  `#show raw.where(block: true): block.with(`,
  `  fill: rgb("#F7F7F8"),`,
  `  stroke: rgb("#E5E7EB"),`,
  `  inset: 10pt,`,
  `  width: 100%,`,
  `  breakable: true,`,
  `)`,
].join("\n");

/**
 * Build the Typst entry file. The renderer recognizes one contract for every
 * template — `anvil-template(meta, options, body)` — and lets each adapter
 * translate that into the underlying package's real API.
 */
export function buildTypstEntry(input: BuildTypstEntryInput): string {
  const lines = [
    `#import "${input.adapterRelPath}": anvil-template`,
    ``,
  ];

  if (input.pagePreset) {
    lines.push(`#set page(paper: "${input.pagePreset}")`, ``);
  }

  lines.push(
    `#show: anvil-template.with(`,
    `  meta: ${dictToTypst(input.meta)},`,
    `  options: ${dictToTypst(input.options)},`,
    `)`,
    ``,
    RAW_BLOCK_STYLE,
    ``,
    input.body,
    ``,
  );

  return lines.join("\n");
}
