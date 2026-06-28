import { escapeTypstText } from "../utils/escape-typst";

type InlineNode = {
  text?: unknown;
  href?: unknown;
  styles?: Record<string, unknown>;
  type?: unknown;
};

function renderInlineNode(node: InlineNode): string {
  const text = escapeTypstText(String(node.text ?? ""));
  if (!text) {
    return "";
  }

  const styles = node.styles ?? {};
  let rendered = text;

  if (typeof node.href === "string" && node.href) {
    rendered = `#link("${escapeTypstText(node.href)}")[${rendered}]`;
  }

  if (styles.code === true || node.type === "code") {
    rendered = `#raw("${text}")`;
  }
  if (styles.bold === true) {
    rendered = `#strong[${rendered}]`;
  }
  if (styles.italic === true) {
    rendered = `#emph[${rendered}]`;
  }

  return rendered;
}

export function inlineContentToTypst(content: unknown): string {
  if (typeof content === "string") {
    return escapeTypstText(content);
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((node) => {
      if (typeof node === "string") {
        return escapeTypstText(node);
      }

      if (!node || typeof node !== "object") {
        return "";
      }

      return renderInlineNode(node as InlineNode);
    })
    .join("");
}
