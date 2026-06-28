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
 */
export function dictToTypst(dict: Record<string, FieldValue>): string {
  const entries = Object.entries(dict);
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
    input.body,
    ``,
  );

  return lines.join("\n");
}
