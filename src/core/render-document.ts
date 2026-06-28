import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { renderInputSchema } from "../schemas/render-input.schema";
import type { RenderInput } from "../types/render-input";
import type { RenderResult } from "../types/render-result";
import { blocknoteToTypst } from "../converters/blocknote-to-typst";
import { ensureMathLoaded } from "../converters/latex-to-typst";
import { loadTemplate } from "./template-loader";
import { ensureDir } from "../utils/fs";
import { compileTypst } from "./compile-typst";
import { buildTypstEntry } from "./build-entry";

function pagePreset(pageSize?: "A4" | "Letter") {
  return pageSize === "Letter" ? "us-letter" : "a4";
}

export async function renderDocument(
  rawInput: unknown,
  outputDir: string,
  workDir: string,
): Promise<RenderResult> {
  const input = renderInputSchema.parse(rawInput) as RenderInput;
  await ensureDir(outputDir);
  await ensureDir(workDir);

  const template = await loadTemplate(input.template.slug);
  await ensureMathLoaded();
  const body = blocknoteToTypst(input.document.content, {
    headingOffset: template.manifest.headingOffset,
  });

  const fileStem = `${input.document.id}-${randomUUID()}`;
  const pdfPath = path.join(outputDir, `${fileStem}.pdf`);

  // D3-A: compile with the template directory as `--root` so the adapter's
  // local imports (upstream.typ, fonts) and `@preview/*` resolve naturally.
  // The entry file lives in a per-render subdir under the template's `.work/`
  // (must be inside root), and is cleaned up afterwards. A durable copy of the
  // generated source is written to the caller's workDir for retention/debug.
  const buildDir = path.join(template.dir, ".work", fileStem);
  await ensureDir(buildDir);
  const entryPath = path.join(buildDir, "entry.typ");
  const durableTypstPath = path.join(workDir, `${fileStem}.typ`);

  const adapterRelPath = path
    .relative(buildDir, template.adapterPath)
    .split(path.sep)
    .join("/");

  const entrySource = buildTypstEntry({
    adapterRelPath,
    meta: input.template.meta,
    options: input.template.options,
    body,
    pagePreset: pagePreset(input.options?.pageSize),
  });

  await fs.writeFile(entryPath, entrySource, "utf8");

  try {
    const compileResult = await compileTypst(entryPath, pdfPath, {
      fontPaths: template.fontPaths,
      root: template.dir,
    });

    if (!compileResult.ok) {
      return compileResult;
    }

    // Persist the generated source where the API's retention sweep can manage
    // it, keeping the in-repo .work/ dir transient.
    await fs.copyFile(entryPath, durableTypstPath).catch(() => undefined);

    return {
      ok: true,
      status: "COMPLETED",
      typstPath: durableTypstPath,
      pdfPath,
      logs: compileResult.logs,
    };
  } finally {
    await fs.rm(buildDir, { recursive: true, force: true });
  }
}
