import path from "node:path";
import { promises as fs } from "node:fs";
import { z } from "zod";
import { resolveFromRendererRoot } from "../utils/path";
import type { LoadedTemplate, TemplateManifest } from "../types/template";

const templateManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  fields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["text", "date", "select", "boolean"]),
      required: z.boolean(),
    }),
  ),
});

export async function loadTemplate(templateId: string): Promise<LoadedTemplate> {
  const templateDir = resolveFromRendererRoot("templates", templateId);
  const manifestPath = path.join(templateDir, "manifest.json");
  const templatePath = path.join(templateDir, "template.typ");

  const [manifestRaw, templateSource] = await Promise.all([
    fs.readFile(manifestPath, "utf8"),
    fs.readFile(templatePath, "utf8"),
  ]);

  const manifest = templateManifestSchema.parse(JSON.parse(manifestRaw)) as TemplateManifest;

  return {
    manifest,
    templatePath,
    templateSource,
  };
}
