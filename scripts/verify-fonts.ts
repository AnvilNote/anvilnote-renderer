#!/usr/bin/env tsx
// Verify that every font family AnvilNote requires is visible to Typst when it
// reads ONLY the bundled font directory (no system fonts). Exits non-zero and
// lists the missing families if the bundle is incomplete — never silently.
//
//   pnpm fonts:verify

import { execFileSync } from "node:child_process";
import { REQUIRED_FONT_FAMILIES } from "../src/config/fonts";
import { getFontDir } from "../src/core/font-paths";

const typstBin = process.env.TYPST_BIN || "typst";

function listTypstFamilies(fontDir: string): Set<string> {
  let stdout: string;
  try {
    stdout = execFileSync(
      typstBin,
      ["fonts", "--font-path", fontDir, "--ignore-system-fonts"],
      { encoding: "utf8" },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ Failed to run \`${typstBin} fonts\`: ${message}`);
    console.error("  Is the Typst CLI installed and on PATH?");
    process.exit(2);
  }
  return new Set(
    stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

function main() {
  const fontDir = getFontDir();
  console.log(`Font directory: ${fontDir}`);
  console.log(`Typst binary:   ${typstBin}\n`);

  const available = listTypstFamilies(fontDir);
  const missing: string[] = [];
  for (const family of REQUIRED_FONT_FAMILIES) {
    if (available.has(family)) {
      console.log(`  ✓ ${family}`);
    } else {
      console.log(`  ✗ ${family}  (MISSING)`);
      missing.push(family);
    }
  }

  console.log(
    `\n${available.size} families visible to Typst, ` +
      `${REQUIRED_FONT_FAMILIES.length - missing.length}/${REQUIRED_FONT_FAMILIES.length} required present.`,
  );

  if (missing.length > 0) {
    console.error(`\n✗ Missing ${missing.length} required font families:`);
    for (const family of missing) {
      console.error(`    - ${family}`);
    }
    console.error(
      "\n  Run `pnpm fonts:download` to fetch the open-source fonts, then place\n" +
        "  the manual ones (MOE, TaiwanPearl) per fonts/README.md. If a family name\n" +
        "  differs from `pnpm fonts:list`, fix src/config/fonts.ts and\n" +
        "  templates/shared/anvil-fonts.typ to match.",
    );
    process.exit(1);
  }

  console.log("\n✓ All required font families are present.");
}

main();
