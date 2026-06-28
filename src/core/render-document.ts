import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { renderInputSchema } from "../schemas/render-input.schema";
import type { RenderInput } from "../types/render-input";
import type { RenderResult } from "../types/render-result";
import { blocknoteToTypst } from "../converters/blocknote-to-typst";
import { loadTemplate } from "./template-loader";
import { ensureDir } from "../utils/fs";
import { compileTypst } from "./compile-typst";
import { escapeTypstText } from "../utils/escape-typst";

function pagePreset(pageSize?: "A4" | "Letter") {
  return pageSize === "Letter" ? "us-letter" : "a4";
}

function fontPreset(font?: "sans" | "serif" | "mono") {
  switch (font) {
    case "sans":
      return "TeX Gyre Heros";
    case "mono":
      return "New Computer Modern Mono";
    default:
      return "New Computer Modern";
  }
}

function fieldValueLiteral(value: string | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "none";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return `"${escapeTypstText(String(value))}"`;
}

export async function renderDocument(
  rawInput: unknown,
  outputDir: string,
  workDir: string,
): Promise<RenderResult> {
  const input = renderInputSchema.parse(rawInput) as RenderInput;
  await ensureDir(outputDir);
  await ensureDir(workDir);

  const template = await loadTemplate(input.template.id);
  const bodyContent = blocknoteToTypst(input.document.content);
  const fileStem = `${input.document.id}-${randomUUID()}`;
  const typstPath = path.join(workDir, `${fileStem}.typ`);
  const pdfPath = path.join(outputDir, `${fileStem}.pdf`);
  const templateImportPath = path.join(workDir, `${fileStem}-template.typ`);

  await fs.copyFile(template.templatePath, templateImportPath);

  const typstSource = [
    `#import "${path.basename(templateImportPath)}": anvil-note`,
    ``,
    `#set page(paper: "${pagePreset(input.options?.pageSize)}", margin: (x: 22mm, y: 24mm))`,
    `#set text(font: "${fontPreset(input.options?.fontPreset)}", size: 11pt)`,
    ``,
    `#anvil-note(`,
    `  title: ${fieldValueLiteral(input.template.fields?.title ?? input.document.title)},`,
    `  author: ${fieldValueLiteral(input.template.fields?.author)},`,
    `  date: ${fieldValueLiteral(input.template.fields?.date)},`,
    `  [`,
    bodyContent,
    `  ],`,
    `)`,
    ``,
  ].join("\n");

  await fs.writeFile(typstPath, typstSource, "utf8");

  const compileResult = await compileTypst(typstPath, pdfPath);
  if (!compileResult.ok) {
    return compileResult;
  }

  return {
    ok: true,
    status: "COMPLETED",
    typstPath,
    pdfPath,
    logs: compileResult.logs,
  };
}
