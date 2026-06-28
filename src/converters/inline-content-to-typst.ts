import { escapeTypstString, escapeTypstText } from "../utils/escape-typst";
import { latexToTypstMath } from "./latex-to-typst";

type InlineNode = {
  text?: unknown;
  href?: unknown;
  content?: unknown;
  props?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  type?: unknown;
};

function inlineLatex(node: InlineNode): string {
  const props = node.props ?? {};
  for (const key of ["formula", "latex", "equation", "value"]) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return typeof node.text === "string" ? node.text : "";
}

function renderInlineNode(node: InlineNode): string {
  // Inline math: { type: "inlineMath", props: { formula: "<LaTeX>" } }.
  // No surrounding spaces so Typst keeps it inline within the text.
  if (node.type === "inlineMath" || node.type === "math") {
    const latex = inlineLatex(node);
    if (!latex.trim()) {
      return "";
    }
    // No surrounding spaces keeps it inline. On conversion failure, degrade to
    // the raw source so one bad formula can't break the render.
    const { typst, ok } = latexToTypstMath(latex);
    return ok ? `$${typst}$` : `#raw("${escapeTypstString(latex)}")`;
  }

  // BlockNote links are nested: { type: "link", href, content: [styledText…] }.
  // Render the inner inline content and wrap it in a Typst link.
  if (node.type === "link" && typeof node.href === "string" && node.href) {
    const inner = inlineContentToTypst(node.content);
    if (!inner) {
      return "";
    }
    return `#link("${escapeTypstText(node.href)}")[${inner}]`;
  }

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
