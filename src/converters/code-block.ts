import { normalizeCodeLanguage } from "../config/code-languages";

/** Length of the longest run of consecutive backticks in `text` (0 if none). */
export function longestBacktickRun(text: string): number {
  const matches = text.match(/`+/g);
  if (!matches) return 0;
  return Math.max(...matches.map((match) => match.length));
}

// Build a Typst raw block for `code`. The fence is always at least one backtick
// longer than the longest backtick run inside the code, so code containing
// triple backticks can't terminate the block early. Raw block contents are
// literal — no Typst escaping is applied. Plain text omits the language tag.
export function createTypstRawBlock(
  code: string,
  language?: string | null,
): string {
  const lang = normalizeCodeLanguage(language);
  const fenceLength = Math.max(3, longestBacktickRun(code) + 1);
  const fence = "`".repeat(fenceLength);

  if (lang === "text") {
    return `${fence}\n${code}\n${fence}`;
  }

  return `${fence}${lang}\n${code}\n${fence}`;
}
