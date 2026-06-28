import { inlineContentToTypst } from "./inline-content-to-typst";
import { latexToTypstMath } from "./latex-to-typst";
import { escapeTypstCode, escapeTypstString, escapeTypstText } from "../utils/escape-typst";

type BlockNode = {
  type?: unknown;
  content?: unknown;
  props?: Record<string, unknown>;
};

// A math block stores its LaTeX source in props. Support the common field
// names so the contract is forgiving across editor implementations; fall back
// to a string content payload.
function extractLatex(block: BlockNode): string {
  const props = block.props ?? {};
  for (const key of ["formula", "latex", "equation", "value"]) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return typeof block.content === "string" ? block.content : "";
}

function normalizeHeadingLevel(props: Record<string, unknown> | undefined) {
  const level = props?.level;
  return typeof level === "number" && level >= 1 && level <= 6 ? level : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type BlocknoteToTypstOptions = {
  /** Shifts every heading level so templates whose visible structure starts
   *  below H1 (e.g. plain-note from `==`) line up. Clamped to 1..6. */
  headingOffset?: number;
};

function renderBlock(block: BlockNode, headingOffset: number): string {
  const type = typeof block.type === "string" ? block.type : "paragraph";
  const text = inlineContentToTypst(block.content);

  switch (type) {
    case "heading": {
      const level = clamp(normalizeHeadingLevel(block.props) + headingOffset, 1, 6);
      return `${"=".repeat(level)} ${text}`.trim();
    }
    case "bulletListItem":
      return `- ${text}`.trim();
    case "numberedListItem":
      return `+ ${text}`.trim();
    case "codeBlock": {
      const code = typeof block.content === "string" ? block.content : text;
      return ["```", escapeTypstCode(code), "```"].join("\n");
    }
    case "math":
    case "equation":
    case "blockEquation": {
      const latex = extractLatex(block);
      if (!latex.trim()) {
        return "";
      }
      // Display (block) math: surrounding spaces make Typst render it centered
      // on its own line. If conversion fails (e.g. an unsupported LaTeX env),
      // degrade to showing the source as a raw block so the render still
      // succeeds instead of one bad formula breaking the whole document.
      const { typst, ok } = latexToTypstMath(latex);
      return ok ? `$ ${typst} $` : `#block(raw("${escapeTypstString(latex)}"))`;
    }
    case "quote":
      return `#quote[${text}]`;
    case "paragraph":
      return text;
    default:
      return text || `[Unsupported block: ${escapeTypstText(type)}]`;
  }
}

export function blocknoteToTypst(blocks: unknown[], opts: BlocknoteToTypstOptions = {}) {
  const headingOffset = opts.headingOffset ?? 0;
  return blocks
    .map((block) => renderBlock((block ?? {}) as BlockNode, headingOffset))
    .filter(Boolean)
    .flatMap((block) => [block, ""])
    .join("\n")
    .trim();
}
