import { latexToTypstMath } from "./latex-to-typst";
import { createTypstRawBlock } from "./code-block";
import { escapeTypstString, escapeTypstText, sanitizeTypstLabel } from "../utils/escape-typst";
import { normalizeCalloutKind } from "../config/callouts";
import { proofLabel } from "../config/proof-labels";
import { formatCrossRefLabel } from "../config/cross-ref-labels";

// Converts a Tiptap document (the canonical anvilnote-web source format) to
// Typst markup. The web app stores content wrapped as a single-element array
// holding the Tiptap `doc` node: [{ type: "doc", content: [...] }]. Math nodes
// carry their LaTeX in `attrs.latex`; it is translated to Typst math here.

type TiptapNode = {
  type?: unknown;
  text?: unknown;
  attrs?: Record<string, unknown>;
  content?: unknown;
  marks?: unknown;
};

// A decoded inline image the caller must write next to the entry file before
// compiling, so Typst's `image("filename")` resolves.
export type ImageAsset = { filename: string; base64: string };

type TiptapToTypstOptions = {
  /** Shifts every heading level so templates whose visible structure starts
   *  below H1 line up. Clamped to 1..6. */
  headingOffset?: number;
  /** Filled with decoded data-URL images encountered during conversion. */
  images?: ImageAsset[];
  /** Typst function footnoteReference nodes render as — see
   *  template.ts's footnoteStyle. Defaults to Typst's native #footnote. */
  footnoteStyle?: "footnote" | "sidenote";
  /** The document's own language (template.options.primaryLang — see
   *  cross-ref-labels.ts), for formatting crossRef display text ("圖 1" vs
   *  "Figure 1"). Independent of anything UI-locale related. */
  primaryLang?: string;
};

// Collector for the current conversion (the CLI runs one conversion at a time).
let imageSink: ImageAsset[] | null = null;
let footnoteStyle: "footnote" | "sidenote" = "footnote";
let primaryLang: string | undefined;

// Maps a footnote's `data-id` to its rendered Typst content, built once per
// conversion from the trailing `footnotes` node (see tiptapToTypst). Typst's
// #footnote[...] takes its content inline at the reference's position — the
// opposite shape of tiptap-footnotes' DOM (a separate trailing list the
// reference points at by id) — so references are resolved through this map
// instead of rendering the footnotes list as a visible block.
let footnoteMap: Map<string, string> | null = null;

// Every targetId pointed at by at least one crossRef node anywhere in the
// document, built once per conversion by buildReferencedIds. Mirrors
// anvilnote-web's cross-ref.ts numbering plugin exactly: figures/tables
// always get a Typst label+figure wrapper (matching the editor, which
// numbers every one unconditionally), but a blockMath node only gets
// wrapped with Typst's own equation numbering enabled when its id appears
// here — an unreferenced equation stays a bare, unnumbered `$ ... $`,
// exactly like the editor never shows "(N)" next to one nothing points at.
let referencedTargetIds: Set<string> | null = null;

function collectReferencedIds(nodes: TiptapNode[], out: Set<string>): void {
  for (const node of nodes) {
    if (node.type === "crossRef") {
      const targetId = node.attrs?.targetId;
      if (typeof targetId === "string") out.add(targetId);
    }
    if (node.content !== undefined) {
      collectReferencedIds(asNodes(node.content), out);
    }
  }
}

// A stable id (AnvilNote's own crypto.randomUUID, from cross-ref.ts)
// sanitized into Typst's <name> label syntax. `undefined` when the node
// has no id at all (documents created before the cross-ref feature shipped
// never got one backfilled until reopened in the editor) — those targets
// simply aren't referenceable from a crossRef yet, so no label is emitted
// for them and rendering proceeds exactly as it did before this feature.
function typstLabelFor(node: TiptapNode): string | undefined {
  const id = node.attrs?.id;
  return typeof id === "string" && id ? sanitizeTypstLabel(id) : undefined;
}

const IMAGE_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  // Typst 0.14+ can embed a PDF directly via image() — see AnvilNote-web's
  // image.ts: a PDF "image" is stored as a PNG `src` (for the browser's
  // <img>-based editor preview, which can't display application/pdf at
  // all) plus the original PDF in `pdfSrc`, preferred here for the vector-
  // quality export.
  "application/pdf": "pdf",
};

// Figure/table captions are a plain string attribute (an <input> in the
// editor, not ProseMirror content), so lightweight math support there works
// by convention: $$...$$ segments get converted through the same LaTeX ->
// Typst math pipeline as everywhere else, and everything outside them is
// escaped as plain text — matches anvilnote-web's caption-math.ts render
// path exactly (same delimiter, same "leave a segment that fails to parse
// as literal escaped text" fallback) so a caption reads the same in the
// editor and the exported PDF.
const CAPTION_MATH_PATTERN = /\$\$([^$\n]+?)\$\$/g;

function renderCaptionText(caption: string): string {
  let out = "";
  let lastIndex = 0;
  for (const match of caption.matchAll(CAPTION_MATH_PATTERN)) {
    const [full, latex] = match;
    const index = match.index ?? 0;
    out += escapeTypstText(caption.slice(lastIndex, index));
    const { typst, ok } = latexToTypstMath(latex);
    out += ok ? `$${typst}$` : escapeTypstText(full);
    lastIndex = index + full.length;
  }
  out += escapeTypstText(caption.slice(lastIndex));
  return out;
}

function renderImage(node: TiptapNode): string {
  const pdfSrc = typeof node.attrs?.pdfSrc === "string" ? node.attrs.pdfSrc : "";
  const src = pdfSrc || (typeof node.attrs?.src === "string" ? node.attrs.src : "");
  if (!src) return "";

  const alignAttr = String(node.attrs?.align ?? "center");
  const align = ["left", "center", "right"].includes(alignAttr)
    ? alignAttr
    : "center";
  const width = typeof node.attrs?.width === "number" ? node.attrs.width : null;
  const caption =
    typeof node.attrs?.caption === "string" ? node.attrs.caption.trim() : "";

  // Only inline data URLs can be embedded; Typst can't fetch remote URLs.
  const match = src.match(/^data:(image\/[a-z0-9.+-]+|application\/pdf);base64,(.+)$/i);
  if (!match || !imageSink) {
    return "";
  }

  // No `?? "png"` fallback: an unrecognized MIME means these bytes are some
  // format IMAGE_MIME_EXT doesn't know how to label, and guessing "png"
  // would hand Typst real GIF/WebP/whatever bytes under a .png name it then
  // fails to decode — skip instead of embedding something broken.
  const ext = IMAGE_MIME_EXT[match[1].toLowerCase()];
  if (!ext) return "";
  const filename = `image-${imageSink.length}.${ext}`;
  imageSink.push({ filename, base64: match[2] });

  const widthArg = width != null ? `, width: ${width}%` : "";
  const imageSrc = `image("${filename}"${widthArg})`;
  const label = typstLabelFor(node);
  const labelSuffix = label ? ` <${label}>` : "";

  // Always wrapped in #figure — even with no caption (Typst allows omitting
  // it) — not just when captioned: anvilnote-web's cross-ref.ts numbers
  // EVERY image node unconditionally, regardless of whether it has a
  // caption, so Typst's own figure counter (which only increments for
  // actual #figure elements) has to see every image the same way or a
  // referenced image's number would drift out of sync with what the
  // editor showed for it.
  if (!caption) {
    return `#align(${align})[#figure(${imageSrc})${labelSuffix}]`;
  }
  return `#align(${align})[#figure(${imageSrc}, caption: [${renderCaptionText(caption)}])${labelSuffix}]`;
}

function asNodes(content: unknown): TiptapNode[] {
  return Array.isArray(content) ? (content as TiptapNode[]) : [];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** True for the wrapped Tiptap doc: an array whose first node is type "doc". */
export function isTiptapContent(content: unknown): boolean {
  return (
    Array.isArray(content) &&
    !!content[0] &&
    typeof content[0] === "object" &&
    (content[0] as TiptapNode).type === "doc"
  );
}

function attrLatex(node: TiptapNode): string {
  const attrs = node.attrs ?? {};
  for (const key of ["latex", "formula", "equation", "value"]) {
    const value = attrs[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return typeof node.text === "string" ? node.text : "";
}

function indentLines(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => (line ? prefix + line : line))
    .join("\n");
}

// --- inline -----------------------------------------------------------------

type Mark = { type?: unknown; attrs?: Record<string, unknown> };

function renderTextNode(node: TiptapNode): string {
  const raw = typeof node.text === "string" ? node.text : "";
  if (!raw) {
    return "";
  }
  const marks: Mark[] = Array.isArray(node.marks) ? (node.marks as Mark[]) : [];
  const isCode = marks.some((mark) => mark?.type === "code");

  // Code marks wrap the raw text (only \ and " need escaping in a string
  // literal); everything else is escaped for Typst markup.
  let out = isCode ? `#raw("${escapeTypstString(raw)}")` : escapeTypstText(raw);

  for (const mark of marks) {
    switch (mark?.type) {
      case "bold":
        out = `#strong[${out}]`;
        break;
      case "italic":
        out = `#emph[${out}]`;
        break;
      case "strike":
        out = `#strike[${out}]`;
        break;
      case "underline":
        out = `#underline[${out}]`;
        break;
      case "link": {
        const href = mark.attrs?.href;
        if (typeof href === "string" && href) {
          out = `#link("${escapeTypstString(href)}")[${out}]`;
        }
        break;
      }
      case "textStyle": {
        // Per-block text color set from the block handle. Only accept #rrggbb so
        // a malformed value can't break `rgb(...)` and abort the render.
        const color = mark.attrs?.color;
        if (typeof color === "string" && /^#?[0-9a-f]{6}$/i.test(color)) {
          const hex = color.startsWith("#") ? color.slice(1) : color;
          out = `#text(fill: rgb("${hex}"))[${out}]`;
        }
        break;
      }
      default:
        break;
    }
  }

  return out;
}

export function inlineToTypst(content: unknown): string {
  if (typeof content === "string") {
    return escapeTypstText(content);
  }
  return asNodes(content)
    .map((node) => {
      if (typeof node === "string") {
        return escapeTypstText(node);
      }
      if (!node || typeof node !== "object") {
        return "";
      }
      const type = node.type;
      if (type === "text") {
        return renderTextNode(node);
      }
      if (type === "inlineMath" || type === "math") {
        const latex = attrLatex(node);
        if (!latex.trim()) {
          return "";
        }
        // No surrounding spaces keeps it inline. Degrade to raw source on
        // conversion failure so one bad formula can't abort the render.
        const { typst, ok } = latexToTypstMath(latex);
        return ok ? `$${typst}$` : `#raw("${escapeTypstString(latex)}")`;
      }
      if (type === "hardBreak") {
        return " \\ ";
      }
      if (type === "footnoteReference") {
        const id = node.attrs?.["data-id"];
        const inner = typeof id === "string" ? footnoteMap?.get(id) : undefined;
        // A reference whose footnote content is missing (shouldn't happen —
        // the extension keeps them in sync — but degrade quietly rather than
        // aborting the render) is dropped rather than emitting an empty
        // #footnote[], which Typst would still number.
        return inner !== undefined ? `#${footnoteStyle}[${inner}]` : "";
      }
      if (type === "crossRef") {
        // Reads the crossRef node's OWN resolvedKind/resolvedValue attrs —
        // already computed and stored by anvilnote-web's cross-ref.ts
        // resolver plugin the last time the document was edited/saved —
        // rather than recomputing "which number is this" here. That keeps
        // exactly one source of truth for the numbering logic (figures
        // numbered unconditionally, equations only if referenced, etc.);
        // duplicating it renderer-side would risk the two drifting apart.
        //
        // A plain #link(<label>)[...], not Typst's own @label mechanism:
        // @ref's automatic supplement+numbering composition doesn't
        // include the parenthesized equation format ("式 (1)" / "Equation
        // (1)") this app's design calls for — verified by a real Typst
        // compile showing `@eq` rendering as "式 1" with the numbering's
        // own parens silently dropped, not "式 (1)". Manually formatting
        // resolvedValue via cross-ref-labels.ts and linking to the label
        // sidesteps that limitation entirely and, as a bonus, keeps this
        // PDF text identical to what the editor's own NodeView showed.
        const targetId = node.attrs?.targetId;
        const broken = Boolean(node.attrs?.broken);
        const resolvedKind = node.attrs?.resolvedKind;
        const resolvedValue = node.attrs?.resolvedValue;
        if (
          broken ||
          typeof targetId !== "string" ||
          typeof resolvedKind !== "string" ||
          typeof resolvedValue !== "string"
        ) {
          // A dangling reference (target deleted) or one from a doc saved
          // before this feature existed (never resolved, so these attrs
          // are still null) — degrades to nothing rather than emitting an
          // unresolvable Typst label reference, which is a compile error,
          // not a silently-broken link the way a dangling web hyperlink
          // would be.
          return "";
        }
        const label = sanitizeTypstLabel(targetId);
        const text = formatCrossRefLabel(
          resolvedKind as "figure" | "table" | "equation" | "heading",
          resolvedValue,
          primaryLang,
        );
        return `#link(<${label}>)[${escapeTypstText(text)}]`;
      }
      return "";
    })
    .reduce((joined, part) => joined + joinInlineTypstParts(joined, part), "");
}

// A markup-mode expression call ending in `]` (#strong[...], #link(...)[...],
// crossRef's #link[...], etc.) directly followed by literal text starting
// with "(" is a Typst parser trap: it reads the "(" as the start of that
// same expression's argument list rather than as plain text — confirmed via
// a real `typst compile` on `#strong[有界函數 ](bounded function)`, which
// fails with "error: expected comma" (Typst tries to parse "bounded
// function" as call arguments). This is exactly the "bold term (English
// gloss)" pattern common in bilingual notes, so it's a real user-facing
// crash, not a contrived case. A U+200B zero-width space between the two
// breaks the parse without changing anything visible in the PDF.
function joinInlineTypstParts(previous: string, next: string): string {
  if (previous.endsWith("]") && next.startsWith("(")) {
    return "\u200b" + next;
  }
  return next;
}

// --- blocks -----------------------------------------------------------------

function textContent(content: unknown): string {
  return asNodes(content)
    .map((node) =>
      typeof node.text === "string" ? node.text : textContent(node.content),
    )
    .join("");
}

function renderList(node: TiptapNode, offset: number, marker: "-" | "+"): string {
  const lines: string[] = [];
  for (const item of asNodes(node.content)) {
    const inlineParts: string[] = [];
    const nestedParts: string[] = [];
    for (const child of asNodes(item.content)) {
      if (
        child.type === "bulletList" ||
        child.type === "orderedList" ||
        child.type === "taskList"
      ) {
        nestedParts.push(indentLines(renderBlock(child, offset), "  "));
      } else {
        inlineParts.push(renderBlock(child, offset));
      }
    }
    lines.push(`${marker} ${inlineParts.join(" ").trim()}`.trim());
    lines.push(...nestedParts);
  }
  return lines.join("\n");
}

function renderTaskList(node: TiptapNode, offset: number): string {
  const lines: string[] = [];
  for (const item of asNodes(node.content)) {
    const checked = item.attrs?.checked === true;
    const inner = asNodes(item.content)
      .map((child) => renderBlock(child, offset))
      .join(" ")
      .trim();
    lines.push(`- ${checked ? "☑" : "☐"} ${inner}`.trim());
  }
  return lines.join("\n");
}

function renderCells(
  cells: TiptapNode[],
  offset: number,
  bold: boolean,
): string[] {
  return cells.map((cell) => {
    const inner = renderBlocks(asNodes(cell.content), offset)
      .replace(/\s*\n+\s*/g, " ")
      .trim();
    return bold && inner ? `[*${inner}*]` : `[${inner}]`;
  });
}

function renderTable(node: TiptapNode, offset: number): string {
  const rows = asNodes(node.content).filter((row) => row.type === "tableRow");
  if (rows.length === 0) {
    return "";
  }
  const columns = asNodes(rows[0].content).length || 1;
  const variant =
    node.attrs?.variant === "three-line" ? "three-line" : "normal";
  const alignAttr = String(node.attrs?.align ?? "center");
  const align = ["left", "center", "right"].includes(alignAttr)
    ? alignAttr
    : "center";
  const caption =
    typeof node.attrs?.caption === "string" ? node.attrs.caption.trim() : "";

  // The first row is a header row when all its cells are header cells.
  const firstCells = asNodes(rows[0].content);
  const hasHeader =
    firstCells.length > 0 &&
    firstCells.every((cell) => cell.type === "tableHeader");
  const bodyRows = hasHeader ? rows.slice(1) : rows;

  const headerCells = hasHeader ? renderCells(firstCells, offset, true) : [];
  const bodyCells: string[] = [];
  for (const row of bodyRows) {
    bodyCells.push(...renderCells(asNodes(row.content), offset, false));
  }

  const args: string[] = [`columns: ${columns}`];
  if (variant === "three-line") {
    // Booktabs 三線表: no grid; rules at top, under the header, and bottom.
    args.push("stroke: none", "align: left + horizon");
    args.push("table.hline(stroke: 1pt)");
    if (headerCells.length) {
      args.push(`table.header(${headerCells.join(", ")})`);
      args.push("table.hline(stroke: 0.5pt)");
    }
    args.push(...bodyCells);
    args.push("table.hline(stroke: 1pt)");
  } else {
    if (headerCells.length) {
      args.push(`table.header(${headerCells.join(", ")})`);
    }
    args.push(...bodyCells);
  }

  const tableSrc = `table(\n  ${args.join(",\n  ")},\n)`;
  const label = typstLabelFor(node);
  const labelSuffix = label ? ` <${label}>` : "";

  // Always wrapped in #figure(kind: table, ...) — even with no caption —
  // for the same reason renderImage always wraps in #figure now: the
  // editor numbers every table node unconditionally (cross-ref.ts), so
  // Typst's own table-figure counter needs to see every table the same
  // way, or a referenced table's number would drift out of sync.
  const figureArgs = caption
    ? `kind: table,\n  caption: [${renderCaptionText(caption)}],`
    : "kind: table,";
  const figureSrc = `#figure(\n  ${indentLines(tableSrc, "  ").trimStart()},\n  ${figureArgs}\n)${labelSuffix}`;
  return `#align(${align})[\n${indentLines(figureSrc, "  ")}\n]`;
}

function renderBlock(node: TiptapNode, offset: number): string {
  const type = typeof node.type === "string" ? node.type : "paragraph";

  switch (type) {
    case "heading": {
      const rawLevel = node.attrs?.level;
      const level = clamp(
        (typeof rawLevel === "number" ? rawLevel : 1) + offset,
        1,
        6,
      );
      const label = typstLabelFor(node);
      const labelSuffix = label ? ` <${label}>` : "";
      // Only a label, never Typst's own heading numbering: a heading
      // crossRef displays the heading's own TEXT (see cross-ref.ts's
      // comment on why — most of this app's 18 templates don't number
      // headings at all, and the couple that do use incompatible
      // per-template schemes), so nothing here needs to read a number back
      // from Typst. The label only has to exist for #link(<label>)[...] to
      // have something to jump to.
      return `${"=".repeat(level)} ${inlineToTypst(node.content)}${labelSuffix}`.trim();
    }
    case "paragraph":
      return inlineToTypst(node.content);
    case "bulletList":
      return renderList(node, offset, "-");
    case "orderedList":
      return renderList(node, offset, "+");
    case "taskList":
      return renderTaskList(node, offset);
    case "blockquote": {
      const inner = renderBlocks(asNodes(node.content), offset);
      return inner ? `#quote(block: true)[${inner}]` : "";
    }
    case "callout": {
      const kind = normalizeCalloutKind(
        typeof node.attrs?.kind === "string" ? node.attrs.kind : undefined,
      );
      const title = typeof node.attrs?.title === "string" ? node.attrs.title.trim() : "";
      const titleArg = title ? `title: [${escapeTypstText(title)}]` : "title: none";
      const inner = renderBlocks(asNodes(node.content), offset);
      return `#callout(kind: "${kind}", ${titleArg})[${inner}]`;
    }
    case "proof": {
      const inner = renderBlocks(asNodes(node.content), offset);
      const label = proofLabel(primaryLang);
      return `#proof(label: [${escapeTypstText(label)}])[${inner}]`;
    }
    case "codeBlock": {
      // Typst raw block with a safe fence; the language tag drives Typst's
      // native syntax highlighting.
      return createTypstRawBlock(
        textContent(node.content),
        typeof node.attrs?.language === "string" ? node.attrs.language : null,
      );
    }
    case "blockMath":
    case "math":
    case "equation": {
      const latex = attrLatex(node);
      if (!latex.trim()) {
        return "";
      }
      // Display math: surrounding spaces make Typst center it on its own line.
      const { typst, ok } = latexToTypstMath(latex);
      if (!ok) return `#block(raw("${escapeTypstString(latex)}"))`;

      const id = node.attrs?.id;
      const label = typstLabelFor(node);
      const isReferenced = typeof id === "string" && (referencedTargetIds?.has(id) ?? false);

      if (label && isReferenced) {
        // math.equation's own `numbering` defaults to none — wrapping
        // ONLY this equation in a scoped content block (#[ ... ]) with a
        // local `set` rule turns numbering on for just this one, leaving
        // every other (unreferenced) equation in the document unnumbered,
        // exactly matching cross-ref.ts's own rule (only a cross-referenced
        // equation gets a number at all). The #set's effect is scoped to
        // its enclosing content block, not global, so it doesn't leak
        // forward into equations rendered after this one returns.
        return `#[\n  #set math.equation(numbering: "(1)")\n  $ ${typst} $ <${label}>\n]`;
      }
      return `$ ${typst} $`;
    }
    case "horizontalRule":
      return "#line(length: 100%)";
    case "image":
      return renderImage(node);
    case "table":
      return renderTable(node, offset);
    case "hardBreak":
      return "";
    case "footnotes":
      // The trailing footnotes list itself is never rendered as a visible
      // block — its content is inlined at each footnoteReference via
      // footnoteMap (built in tiptapToTypst) using Typst's #footnote[...].
      return "";
    default:
      return inlineToTypst(node.content);
  }
}

function renderBlocks(nodes: TiptapNode[], offset: number): string {
  return nodes
    .map((node) => renderBlock(node ?? {}, offset))
    .filter(Boolean)
    .flatMap((block) => [block, ""])
    .join("\n")
    .trim();
}

// Builds data-id -> rendered-content for every `footnote` node found under
// the doc's trailing `footnotes` list (tiptap-footnotes always nests them
// one level: footnotes > footnote > paragraph+).
function buildFootnoteMap(nodes: TiptapNode[], offset: number): Map<string, string> {
  const map = new Map<string, string>();
  const footnotesNode = nodes.find((node) => node.type === "footnotes");
  for (const footnote of asNodes(footnotesNode?.content)) {
    const id = footnote.attrs?.["data-id"];
    if (typeof id === "string") {
      map.set(id, renderBlocks(asNodes(footnote.content), offset));
    }
  }
  return map;
}

export function tiptapToTypst(content: unknown[], opts: TiptapToTypstOptions = {}) {
  imageSink = opts.images ?? null;
  footnoteStyle = opts.footnoteStyle ?? "footnote";
  primaryLang = opts.primaryLang;
  const offset = opts.headingOffset ?? 0;
  const first = Array.isArray(content) ? content[0] : undefined;
  const nodes =
    first && typeof first === "object" && (first as TiptapNode).type === "doc"
      ? asNodes((first as TiptapNode).content)
      : asNodes(content);
  footnoteMap = buildFootnoteMap(nodes, offset);
  referencedTargetIds = new Set();
  collectReferencedIds(nodes, referencedTargetIds);
  const body = renderBlocks(nodes, offset);
  imageSink = null;
  footnoteMap = null;
  referencedTargetIds = null;
  primaryLang = undefined;
  return body;
}
