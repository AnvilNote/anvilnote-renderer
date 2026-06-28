import { inlineContentToTypst } from "./inline-content-to-typst";
import { escapeTypstCode, escapeTypstText } from "../utils/escape-typst";

type BlockNode = {
  type?: unknown;
  content?: unknown;
  props?: Record<string, unknown>;
};

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
