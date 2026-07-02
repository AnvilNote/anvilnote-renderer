import { latexToTypstMath } from "./latex-to-typst";
import { createTypstRawBlock } from "./code-block";
import { escapeTypstString, escapeTypstText } from "../utils/escape-typst";
import { normalizeCalloutKind } from "../config/callouts";

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
};

// Collector for the current conversion (the CLI runs one conversion at a time).
let imageSink: ImageAsset[] | null = null;
let footnoteStyle: "footnote" | "sidenote" = "footnote";

// Maps a footnote's `data-id` to its rendered Typst content, built once per
// conversion from the trailing `footnotes` node (see tiptapToTypst). Typst's
// #footnote[...] takes its content inline at the reference's position — the
// opposite shape of tiptap-footnotes' DOM (a separate trailing list the
// reference points at by id) — so references are resolved through this map
// instead of rendering the footnotes list as a visible block.
let footnoteMap: Map<string, string> | null = null;

const IMAGE_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function renderImage(node: TiptapNode): string {
  const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
  if (!src) return "";

  const alignAttr = String(node.attrs?.align ?? "center");
  const align = ["left", "center", "right"].includes(alignAttr)
    ? alignAttr
    : "center";
  const width = typeof node.attrs?.width === "number" ? node.attrs.width : null;
  const caption =
    typeof node.attrs?.caption === "string" ? node.attrs.caption.trim() : "";

  // Only inline data URLs can be embedded; Typst can't fetch remote URLs.
  const match = src.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match || !imageSink) {
    return "";
  }

  const ext = IMAGE_MIME_EXT[match[1].toLowerCase()] ?? "png";
  const filename = `image-${imageSink.length}.${ext}`;
  imageSink.push({ filename, base64: match[2] });

  const widthArg = width != null ? `, width: ${width}%` : "";
  const imageSrc = `image("${filename}"${widthArg})`;
  if (!caption) {
    return `#align(${align})[#${imageSrc}]`;
  }
  return `#align(${align})[#figure(${imageSrc}, caption: [${escapeTypstText(caption)}])]`;
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
      return "";
    })
    .join("");
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
  if (!caption) {
    return `#align(${align})[\n${indentLines(`#${tableSrc}`, "  ")}\n]`;
  }
  const figureSrc = `#figure(\n  ${indentLines(tableSrc, "  ").trimStart()},\n  kind: table,\n  caption: [${escapeTypstText(caption)}],\n)`;
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
      return `${"=".repeat(level)} ${inlineToTypst(node.content)}`.trim();
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
      return ok ? `$ ${typst} $` : `#block(raw("${escapeTypstString(latex)}"))`;
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
  const offset = opts.headingOffset ?? 0;
  const first = Array.isArray(content) ? content[0] : undefined;
  const nodes =
    first && typeof first === "object" && (first as TiptapNode).type === "doc"
      ? asNodes((first as TiptapNode).content)
      : asNodes(content);
  footnoteMap = buildFootnoteMap(nodes, offset);
  const body = renderBlocks(nodes, offset);
  imageSink = null;
  footnoteMap = null;
  return body;
}
