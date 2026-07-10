import path from "node:path";
import { promises as fs } from "node:fs";
import { z } from "zod";
import { resolveFromRendererRoot } from "../utils/path";
import { getFontDir } from "./font-paths";
import type { LoadedTemplate, TemplateManifest } from "../types/template";

const templateFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "date", "boolean", "select", "color"]),
  scope: z.enum(["metadata", "option"]),
  required: z.boolean().optional(),
  default: z.union([z.string(), z.boolean()]).optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  dependsOn: z
    .object({ key: z.string(), value: z.union([z.string(), z.boolean(), z.null()]) })
    .optional(),
});

const templateManifestSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  engine: z.object({
    kind: z.enum(["typst-package", "local"]),
    package: z.string().optional(),
    entry: z.string().default("template.typ"),
  }),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  fonts: z.array(z.string()).default([]),
  headingOffset: z.number().int().default(0),
  // Font policy is AnvilNote-controlled via the renderer wrapper; these record
  // that contract. Older manifests default to the enforced policy.
  usesAnvilFontWrapper: z.boolean().default(true),
  fontPolicy: z.literal("anvil-controlled").default("anvil-controlled"),
  // How footnoteReference nodes render in Typst. Most templates use Typst's
  // native #footnote[...] (no import needed); margin-note-style templates
  // (toffee-tufte) instead emit #sidenote[...], imported from the template's
  // own package — see build-entry.ts and tiptap-to-typst.ts.
  footnoteStyle: z.enum(["footnote", "sidenote"]).default("footnote"),
  // The template's own content/text-column width (page width minus its own
  // margins), in cm — measured per-template via a real compile (each
  // template sets its own page size/margins, often via a third-party
  // @preview package's internal defaults, not any value visible in this
  // manifest or template.typ itself), not derived from a shared formula.
  // Consumers (e.g. anvilnote-web's stats-chart "ratio of text width"
  // sizing) use this instead of assuming a fixed page width, since it
  // varies per template. Required (no default) — every template needs its
  // own real measurement, not a guessed fallback.
  textWidthCm: z.number().positive(),
  textHeightCm: z.number().positive().optional(),
  fields: z.array(templateFieldSchema),
});

async function dirExists(pathname: string) {
  try {
    const stat = await fs.stat(pathname);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function loadTemplate(slug: string): Promise<LoadedTemplate> {
  const templateDir = resolveFromRendererRoot("templates", slug);
  const manifestPath = path.join(templateDir, "manifest.json");

  const manifestRaw = await fs.readFile(manifestPath, "utf8");
  const manifest = templateManifestSchema.parse(JSON.parse(manifestRaw)) as TemplateManifest;

  const adapterPath = path.join(templateDir, manifest.engine.entry);

  // Font search paths: shared renderer pool + this template's local fonts.
  // Only existing directories are included so Typst never gets a dead path.
  const candidateFontDirs = [
    getFontDir(),
    path.join(templateDir, "fonts"),
  ];
  const fontPaths: string[] = [];
  for (const dir of candidateFontDirs) {
    if (await dirExists(dir)) {
      fontPaths.push(dir);
    }
  }

  return {
    manifest,
    dir: templateDir,
    adapterPath,
    fontPaths,
  };
}
