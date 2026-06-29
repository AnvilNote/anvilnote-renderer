#!/usr/bin/env tsx
// Scan every templates/<slug>/template.typ (and adapter-local upstream.typ) for
// font policy violations. Fails the command when any template tries to control
// fonts itself. Run in CI before build.
//
//   pnpm templates:lint

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lintTemplateSource } from "../src/core/template-lint";

const here = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(here, "..", "templates");

type Scanned = { file: string; strict: boolean };

// `template.typ` is the enforceable AnvilNote contract: it MUST be font-clean.
// Other .typ files in a template dir (e.g. a vendored upstream.typ) are package
// internals — scanned as warnings so we keep visibility without blocking.
async function collectTemplateFiles(): Promise<Scanned[]> {
  const entries = await fs.readdir(templatesDir, { withFileTypes: true });
  const files: Scanned[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "shared") continue;
    const dir = path.join(templatesDir, entry.name);
    const typFiles = (await fs.readdir(dir)).filter((f) => f.endsWith(".typ"));
    for (const f of typFiles) {
      files.push({ file: path.join(dir, f), strict: f === "template.typ" });
    }
  }
  return files;
}

async function main() {
  const files = await collectTemplateFiles();
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { file, strict } of files) {
    const source = await fs.readFile(file, "utf8");
    const rel = path.relative(path.resolve(here, ".."), file);
    const found = lintTemplateSource(source, rel);
    if (found.length === 0) {
      console.log(`  ✓ ${rel}`);
    } else if (strict) {
      for (const err of found) console.log(`  ✗ ${err}`);
      errors.push(...found);
    } else {
      for (const err of found) console.log(`  ⚠ ${err} (package internal — warning)`);
      warnings.push(...found);
    }
  }

  console.log(
    `\nScanned ${files.length} file(s): ${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  if (errors.length > 0) {
    console.error(
      `\n✗ ${errors.length} font-policy violation(s) in template.typ contracts. ` +
        `Templates must not set fonts — move font logic into ` +
        `templates/shared/anvil-fonts.typ.`,
    );
    process.exit(1);
  }
  if (warnings.length > 0) {
    console.warn(
      "\n⚠ Warnings are in vendored package internals (not the AnvilNote " +
        "contract). The renderer wrapper still applies AnvilNote fonts as the " +
        "outer policy; see fonts/README.md.",
    );
  }
  console.log("✓ No font-policy violations in template contracts.");
}

main();
