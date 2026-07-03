import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { renderInputSchema } from "../schemas/render-input.schema";
import type { RenderInput } from "../types/render-input";
import type { RenderResult } from "../types/render-result";
import { blocknoteToTypst } from "../converters/blocknote-to-typst";
import {
  isTiptapContent,
  tiptapToTypst,
  type ImageAsset,
} from "../converters/tiptap-to-typst";
import { ensureMathLoaded } from "../converters/latex-to-typst";
import { loadTemplate } from "./template-loader";
import { ensureDir } from "../utils/fs";
import { compileTypst } from "./compile-typst";
import { buildTypstEntry } from "./build-entry";
import { shouldIgnoreSystemFonts } from "./font-paths";
import { resolveFromRendererRoot } from "../utils/path";
import { FONT_PRESET_VERSION, FONT_BUNDLE, resolveFontChoices } from "../config/fonts";

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
  // Resolved here (not further down, where this used to live) so its
  // primaryLang can also drive cross-ref display text ("圖 1" vs "Figure
  // 1") during body conversion below — the font stack and the cross-ref
  // wording both key off the same document-language setting.
  const fonts = resolveFontChoices(input.template.options);

  // anvilnote-web now stores Tiptap JSON (wrapped as [{ type: "doc", … }]).
  // Legacy BlockNote documents (a flat block array) still convert via the old
  // path so previously stored notes keep rendering.
  const images: ImageAsset[] = [];
  const body = isTiptapContent(input.document.content)
    ? tiptapToTypst(input.document.content, {
        headingOffset: template.manifest.headingOffset,
        images,
        footnoteStyle: template.manifest.footnoteStyle,
        primaryLang: fonts.primaryLang,
      })
    : blocknoteToTypst(input.document.content, {
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

  // Write decoded inline images next to the entry so Typst's image("…")
  // (resolved relative to the entry file) finds them.
  await Promise.all(
    images.map((asset) =>
      fs.writeFile(
        path.join(buildDir, asset.filename),
        Buffer.from(asset.base64, "base64"),
      ),
    ),
  );

  const entryPath = path.join(buildDir, "entry.typ");
  const durableTypstPath = path.join(workDir, `${fileStem}.typ`);

  const adapterRelPath = path
    .relative(buildDir, template.adapterPath)
    .split(path.sep)
    .join("/");

  // Typst restricts file access to within `--root` (= template.dir), so the
  // shared font policy file (templates/shared/anvil-fonts.typ) is copied next
  // to the entry and imported as "./anvil-fonts.typ".
  const sharedFontsSrc = resolveFromRendererRoot(
    "templates",
    "shared",
    "anvil-fonts.typ",
  );
  await fs.copyFile(sharedFontsSrc, path.join(buildDir, "anvil-fonts.typ"));

  // Same reasoning as anvil-fonts.typ above: copy the shared callout box next
  // to the entry so it can be imported as "./anvil-callout.typ". It in turn
  // imports "./anvil-fonts.typ", so both must land in buildDir together.
  const sharedCalloutsSrc = resolveFromRendererRoot(
    "templates",
    "shared",
    "anvil-callout.typ",
  );
  await fs.copyFile(sharedCalloutsSrc, path.join(buildDir, "anvil-callout.typ"));

  const entrySource = buildTypstEntry({
    adapterRelPath,
    sharedFontsRelPath: "./anvil-fonts.typ",
    sharedCalloutsRelPath: "./anvil-callout.typ",
    usesAnvilFontWrapper: template.manifest.usesAnvilFontWrapper,
    footnoteStyle: template.manifest.footnoteStyle,
    fonts,
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
      ignoreSystemFonts: shouldIgnoreSystemFonts(),
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
      fontConfig: {
        fontPresetVersion: FONT_PRESET_VERSION,
        fontBundle: FONT_BUNDLE,
        mathMode: fonts.mathFace,
        primaryLang: fonts.primaryLang,
        titleFace: fonts.titleFace,
        bodyFace: fonts.bodyFace,
        dateFace: fonts.dateFace,
      },
    };
  } finally {
    await fs.rm(buildDir, { recursive: true, force: true });
  }
}
