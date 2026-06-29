import { resolveFromRendererRoot } from "../utils/path";

/**
 * Resolve the bundled font directory. In Docker this is set to /app/fonts via
 * ANVILNOTE_FONT_DIR (or TYPST_FONT_PATH). Locally it defaults to the renderer's
 * `fonts/` folder. Always returned as an absolute path so Typst's `--font-path`
 * is independent of the process CWD.
 */
export function getFontDir(): string {
  const fromEnv = process.env.ANVILNOTE_FONT_DIR ?? process.env.TYPST_FONT_PATH;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim();
  }
  return resolveFromRendererRoot("fonts");
}

/**
 * Whether Typst should ignore system-installed fonts. AnvilNote pins fonts to
 * the bundle for reproducibility, so this defaults to `true`. It can be turned
 * off (ANVILNOTE_IGNORE_SYSTEM_FONTS=false) only as an escape hatch while the
 * bundle is incomplete locally.
 */
export function shouldIgnoreSystemFonts(): boolean {
  const raw = process.env.ANVILNOTE_IGNORE_SYSTEM_FONTS;
  if (raw === undefined) {
    return true;
  }
  return !/^(0|false|no)$/i.test(raw.trim());
}
