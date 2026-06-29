#!/usr/bin/env tsx
// Download the open-source fonts AnvilNote bundles, into fonts/<group>/<key>/.
//
//   pnpm fonts:download            # fetch missing fonts
//   pnpm fonts:download --force    # re-download even if files already exist
//
// Principles:
//   - Never silently swallow a download failure — every miss is reported.
//   - Never overwrite user-placed fonts unless --force is given.
//   - No commercial fonts, no cwTeX, no Times New Roman.
//   - Fonts that have no stable auto-download URL (MOE 宋體, TaiwanPearl, NewCM Math)
//     are printed as explicit manual TODOs with where to get them.

import { promises as fs, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const fontsDir = path.join(root, "fonts");
const force = process.argv.includes("--force");

const GF = "https://github.com/google/fonts/raw/main";
const ADOBE =
  "https://github.com/adobe-fonts/source-han-sans/raw/release/SubsetOTF/TW";

type DownloadFile = { url: string; name: string };
type AutoEntry = { key: string; dir: string; files: DownloadFile[] };
type ManualEntry = { key: string; dir: string; reason: string; where: string };
// Archive (zip) entries: download once, extract selected members (matched by a
// path suffix) into the target dir. Requires `unzip` on PATH.
type ZipMember = { match: string; name: string };
type ZipEntry = { key: string; dir: string; url: string; members: ZipMember[] };

// Typst 0.14 does NOT support variable fonts, so every entry below must point
// at a STATIC instance, not a google/fonts `Family[wght].ttf` variable file.
const NOTO = "https://github.com/notofonts/notofonts.github.io/raw/main/fonts";
const EBG = "https://github.com/octaviopardo/EBGaramond12/raw/master/fonts/ttf";
const ROBOTO = "https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest";
const PLAYFAIR = "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest";

const AUTO: AutoEntry[] = [
  {
    key: "tinos",
    dir: "latin/tinos",
    files: [
      { url: `${GF}/ofl/tinos/Tinos-Regular.ttf`, name: "Tinos-Regular.ttf" },
      { url: `${GF}/ofl/tinos/Tinos-Bold.ttf`, name: "Tinos-Bold.ttf" },
      { url: `${GF}/ofl/tinos/Tinos-Italic.ttf`, name: "Tinos-Italic.ttf" },
      { url: `${GF}/ofl/tinos/Tinos-BoldItalic.ttf`, name: "Tinos-BoldItalic.ttf" },
    ],
  },
  {
    key: "roboto",
    dir: "latin/roboto",
    files: [
      { url: `${ROBOTO}/latin-400-normal.ttf`, name: "Roboto-Regular.ttf" },
      { url: `${ROBOTO}/latin-700-normal.ttf`, name: "Roboto-Bold.ttf" },
      { url: `${ROBOTO}/latin-400-italic.ttf`, name: "Roboto-Italic.ttf" },
      { url: `${ROBOTO}/latin-700-italic.ttf`, name: "Roboto-BoldItalic.ttf" },
    ],
  },
  {
    key: "noto-sans",
    dir: "latin/noto-sans",
    files: [
      { url: `${NOTO}/NotoSans/unhinted/ttf/NotoSans-Regular.ttf`, name: "NotoSans-Regular.ttf" },
      { url: `${NOTO}/NotoSans/unhinted/ttf/NotoSans-Bold.ttf`, name: "NotoSans-Bold.ttf" },
      { url: `${NOTO}/NotoSans/unhinted/ttf/NotoSans-Italic.ttf`, name: "NotoSans-Italic.ttf" },
      { url: `${NOTO}/NotoSans/unhinted/ttf/NotoSans-BoldItalic.ttf`, name: "NotoSans-BoldItalic.ttf" },
    ],
  },
  {
    key: "noto-serif",
    dir: "latin/noto-serif",
    files: [
      { url: `${NOTO}/NotoSerif/unhinted/ttf/NotoSerif-Regular.ttf`, name: "NotoSerif-Regular.ttf" },
      { url: `${NOTO}/NotoSerif/unhinted/ttf/NotoSerif-Bold.ttf`, name: "NotoSerif-Bold.ttf" },
      { url: `${NOTO}/NotoSerif/unhinted/ttf/NotoSerif-Italic.ttf`, name: "NotoSerif-Italic.ttf" },
      { url: `${NOTO}/NotoSerif/unhinted/ttf/NotoSerif-BoldItalic.ttf`, name: "NotoSerif-BoldItalic.ttf" },
    ],
  },
  {
    key: "eb-garamond",
    dir: "latin/eb-garamond",
    files: [
      { url: `${EBG}/EBGaramond-Regular.ttf`, name: "EBGaramond-Regular.ttf" },
      { url: `${EBG}/EBGaramond-Bold.ttf`, name: "EBGaramond-Bold.ttf" },
      { url: `${EBG}/EBGaramond-Italic.ttf`, name: "EBGaramond-Italic.ttf" },
      { url: `${EBG}/EBGaramond-BoldItalic.ttf`, name: "EBGaramond-BoldItalic.ttf" },
    ],
  },
  {
    key: "playfair-display",
    dir: "latin/playfair-display",
    files: [
      { url: `${PLAYFAIR}/latin-400-normal.ttf`, name: "PlayfairDisplay-Regular.ttf" },
      { url: `${PLAYFAIR}/latin-700-normal.ttf`, name: "PlayfairDisplay-Bold.ttf" },
      { url: `${PLAYFAIR}/latin-400-italic.ttf`, name: "PlayfairDisplay-Italic.ttf" },
      { url: `${PLAYFAIR}/latin-700-italic.ttf`, name: "PlayfairDisplay-BoldItalic.ttf" },
    ],
  },
  {
    key: "tai-heritage-pro",
    dir: "latin/tai-heritage-pro",
    files: [
      { url: `${GF}/ofl/taiheritagepro/TaiHeritagePro-Regular.ttf`, name: "TaiHeritagePro-Regular.ttf" },
      { url: `${GF}/ofl/taiheritagepro/TaiHeritagePro-Bold.ttf`, name: "TaiHeritagePro-Bold.ttf" },
    ],
  },
  {
    key: "noto-sans-mono",
    dir: "mono/noto-sans-mono",
    files: [
      { url: `${NOTO}/NotoSansMono/unhinted/ttf/NotoSansMono-Regular.ttf`, name: "NotoSansMono-Regular.ttf" },
      { url: `${NOTO}/NotoSansMono/unhinted/ttf/NotoSansMono-Bold.ttf`, name: "NotoSansMono-Bold.ttf" },
    ],
  },
  {
    key: "noto-sans-thai",
    dir: "thai/noto-sans-thai",
    files: [
      { url: `${NOTO}/NotoSansThai/unhinted/ttf/NotoSansThai-Regular.ttf`, name: "NotoSansThai-Regular.ttf" },
      { url: `${NOTO}/NotoSansThai/unhinted/ttf/NotoSansThai-Bold.ttf`, name: "NotoSansThai-Bold.ttf" },
    ],
  },
  {
    key: "noto-serif-thai",
    dir: "thai/noto-serif-thai",
    files: [
      { url: `${NOTO}/NotoSerifThai/unhinted/ttf/NotoSerifThai-Regular.ttf`, name: "NotoSerifThai-Regular.ttf" },
      { url: `${NOTO}/NotoSerifThai/unhinted/ttf/NotoSerifThai-Bold.ttf`, name: "NotoSerifThai-Bold.ttf" },
    ],
  },
  {
    key: "source-han-sans-tw",
    dir: "zh/source-han-sans-tw",
    files: [
      { url: `${ADOBE}/SourceHanSansTW-Regular.otf`, name: "SourceHanSansTW-Regular.otf" },
      { url: `${ADOBE}/SourceHanSansTW-Bold.otf`, name: "SourceHanSansTW-Bold.otf" },
    ],
  },
  {
    key: "garamond-math",
    dir: "math/garamond-math",
    files: [
      {
        url: "https://github.com/YuanshengZhao/Garamond-Math/raw/master/Garamond-Math.otf",
        name: "Garamond-Math.otf",
      },
    ],
  },
];

const NOTO_CJK = "https://github.com/notofonts/noto-cjk/releases/download";

const ZIPS: ZipEntry[] = [
  {
    key: "jetbrains-mono",
    dir: "mono/jetbrains-mono",
    url: "https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip",
    members: [
      { match: "fonts/ttf/JetBrainsMono-Regular.ttf", name: "JetBrainsMono-Regular.ttf" },
      { match: "fonts/ttf/JetBrainsMono-Bold.ttf", name: "JetBrainsMono-Bold.ttf" },
      { match: "fonts/ttf/JetBrainsMono-Italic.ttf", name: "JetBrainsMono-Italic.ttf" },
      { match: "fonts/ttf/JetBrainsMono-BoldItalic.ttf", name: "JetBrainsMono-BoldItalic.ttf" },
    ],
  },
  {
    key: "noto-sans-jp",
    dir: "cjk/noto-sans-jp",
    url: `${NOTO_CJK}/Sans2.004/16_NotoSansJP.zip`,
    members: [
      { match: "NotoSansJP-Regular.otf", name: "NotoSansJP-Regular.otf" },
      { match: "NotoSansJP-Bold.otf", name: "NotoSansJP-Bold.otf" },
    ],
  },
  {
    key: "noto-sans-kr",
    dir: "cjk/noto-sans-kr",
    url: `${NOTO_CJK}/Sans2.004/17_NotoSansKR.zip`,
    members: [
      { match: "NotoSansKR-Regular.otf", name: "NotoSansKR-Regular.otf" },
      { match: "NotoSansKR-Bold.otf", name: "NotoSansKR-Bold.otf" },
    ],
  },
  {
    key: "noto-serif-jp",
    dir: "cjk/noto-serif-jp",
    url: `${NOTO_CJK}/Serif2.003/12_NotoSerifJP.zip`,
    members: [
      { match: "JP/NotoSerifJP-Regular.otf", name: "NotoSerifJP-Regular.otf" },
      { match: "JP/NotoSerifJP-Bold.otf", name: "NotoSerifJP-Bold.otf" },
    ],
  },
  {
    key: "noto-serif-kr",
    dir: "cjk/noto-serif-kr",
    url: `${NOTO_CJK}/Serif2.003/13_NotoSerifKR.zip`,
    members: [
      { match: "KR/NotoSerifKR-Regular.otf", name: "NotoSerifKR-Regular.otf" },
      { match: "KR/NotoSerifKR-Bold.otf", name: "NotoSerifKR-Bold.otf" },
    ],
  },
  {
    key: "new-computer-modern-math",
    dir: "math/new-computer-modern",
    // mirrors.ctan.org redirects to random (sometimes http) mirrors that
    // node's fetch refuses; pin a stable https mirror instead.
    url: "https://ftp.gwdg.de/pub/ctan/fonts/newcomputermodern.zip",
    members: [
      { match: "otf/NewCMMath-Regular.otf", name: "NewCMMath-Regular.otf" },
      { match: "otf/NewCM10-Regular.otf", name: "NewCM10-Regular.otf" },
      { match: "otf/NewCM10-Bold.otf", name: "NewCM10-Bold.otf" },
      { match: "otf/NewCM10-Italic.otf", name: "NewCM10-Italic.otf" },
      { match: "otf/NewCM10-BoldItalic.otf", name: "NewCM10-BoldItalic.otf" },
    ],
  },
];

const MANUAL: ManualEntry[] = [
  {
    key: "moe-kai",
    dir: "zh/moe-kai",
    reason: "教育部標準楷書 (TW-MOE-Std-Kai) has no stable direct download URL (gov portal).",
    where:
      "https://language.moe.gov.tw/  →  教育部標準楷書 (edukai). " +
      "Place the .ttf in fonts/zh/moe-kai/. License: CC BY-ND.",
  },
  {
    key: "moe-song",
    dir: "zh/moe-song",
    reason: "教育部標準宋體 has no stable direct download URL (gov portal).",
    where:
      "https://language.moe.gov.tw/  →  常用國字標準字體宋體母稿 (TW-Sung). " +
      "Place the .ttf in fonts/zh/moe-song/. License: CC BY-ND.",
  },
  {
    key: "taiwan-pearl",
    dir: "zh/taiwan-pearl",
    reason: "TaiwanPearl ships as release zips; install the TTF files manually.",
    where:
      "https://github.com/max32002/TaiwanPearl  →  unzip the .ttf files into " +
      "fonts/zh/taiwan-pearl/. License: OFL-1.1. " +
      "Confirm the family name with `pnpm fonts:list` and update src/config/fonts.ts.",
  },
];

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadViaCurl(url: string, dest: string): Promise<void> {
  const res = spawnSync(
    "curl",
    ["-sS", "-L", "--fail", "--max-time", "300", "-o", dest, url],
    { encoding: "utf8" },
  );
  if (res.status !== 0) {
    throw new Error(`curl failed (${res.status}): ${res.stderr?.trim() || url}`);
  }
}

async function download(url: string, dest: string): Promise<void> {
  // Prefer fetch; fall back to curl (some mirrors fail under fetch's TLS path).
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) throw new Error(`Empty response for ${url}`);
    await fs.writeFile(dest, buf);
  } catch (fetchError) {
    try {
      await downloadViaCurl(url, dest);
    } catch (curlError) {
      const f = fetchError instanceof Error ? fetchError.message : String(fetchError);
      const c = curlError instanceof Error ? curlError.message : String(curlError);
      throw new Error(`fetch: ${f}; curl: ${c}`);
    }
  }
}

async function extractZip(entry: ZipEntry): Promise<{ ok: number; failures: string[] }> {
  const dir = path.join(fontsDir, entry.dir);
  await fs.mkdir(dir, { recursive: true });
  const failures: string[] = [];
  let ok = 0;

  const wanted = entry.members.filter(
    (m) => force || !existsSync(path.join(dir, m.name)),
  );
  if (wanted.length === 0) {
    for (const m of entry.members) console.log(`  • ${entry.key}/${m.name} (exists, skip)`);
    return { ok, failures };
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "anvil-font-"));
  const zipPath = path.join(tmp, "archive.zip");
  try {
    await download(entry.url, zipPath);
    for (const member of wanted) {
      // Find the real path inside the zip whose suffix matches `member.match`.
      const listed = spawnSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
      if (listed.status !== 0) throw new Error(`unzip -Z1 failed: ${listed.stderr}`);
      const inner = listed.stdout
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.endsWith(member.match));
      if (!inner) {
        failures.push(`${entry.key}/${member.name}: '${member.match}' not in archive`);
        continue;
      }
      const out = spawnSync("unzip", ["-p", zipPath, inner], {
        encoding: "buffer",
        maxBuffer: 64 * 1024 * 1024,
      });
      if (out.status !== 0 || !out.stdout?.length) {
        failures.push(`${entry.key}/${member.name}: extract failed`);
        continue;
      }
      await fs.writeFile(path.join(dir, member.name), out.stdout);
      console.log(`  ✓ ${entry.key}/${member.name}`);
      ok += 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${entry.key}: ${message}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
  return { ok, failures };
}

async function main() {
  let ok = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const entry of AUTO) {
    const dir = path.join(fontsDir, entry.dir);
    await fs.mkdir(dir, { recursive: true });
    for (const file of entry.files) {
      const dest = path.join(dir, file.name);
      if (!force && (await exists(dest))) {
        console.log(`  • ${entry.key}/${file.name} (exists, skip)`);
        skipped += 1;
        continue;
      }
      try {
        await download(file.url, dest);
        console.log(`  ✓ ${entry.key}/${file.name}`);
        ok += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ ${entry.key}/${file.name}: ${message}`);
        failures.push(`${entry.key}/${file.name}: ${message}`);
      }
    }
  }

  for (const zip of ZIPS) {
    const result = await extractZip(zip);
    ok += result.ok;
    failures.push(...result.failures);
  }

  console.log("\n── Manual fonts (no safe auto-download) ──");
  for (const m of MANUAL) {
    const dir = path.join(fontsDir, m.dir);
    await fs.mkdir(dir, { recursive: true });
    const present = (await fs.readdir(dir)).some((f) => /\.(ttf|otf|ttc)$/i.test(f));
    const mark = present ? "✓ present" : "TODO";
    console.log(`  [${mark}] ${m.key} → fonts/${m.dir}/`);
    if (!present) {
      console.log(`           ${m.reason}`);
      console.log(`           ${m.where}`);
    }
  }

  console.log(`\nDownloaded ${ok}, skipped ${skipped}, failed ${failures.length}.`);
  if (failures.length > 0) {
    console.error("\n✗ Some downloads failed:");
    for (const f of failures) console.error(`    - ${f}`);
    console.error("\n  Re-run after checking connectivity / URLs.");
  }
  console.log("\nNext: run `pnpm fonts:verify` to confirm Typst sees every family.");
  if (failures.length > 0) process.exit(1);
}

main();
