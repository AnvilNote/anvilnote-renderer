import path from "node:path";
import { promises as fs } from "node:fs";
import { z } from "zod";
import { resolveFromRendererRoot } from "../utils/path";
import type { LoadedTemplate, TemplateManifest } from "../types/template";

const templateFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "date", "boolean", "select"]),
  scope: z.enum(["metadata", "option"]),
  required: z.boolean().optional(),
  default: z.union([z.string(), z.boolean()]).optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
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
    resolveFromRendererRoot("fonts"),
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
