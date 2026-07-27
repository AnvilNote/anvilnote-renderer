import { escapeTypstString } from "../utils/escape-typst";

// Mirrors anvilnote-web's src/lib/list-markers/marker-modules.ts catalog
// exactly (same 12 ordered modules, same 12 unordered symbols) — this is
// the Typst-codegen counterpart, generating actual Typst source instead of
// DOM decoration attributes.
export type OrderedListModuleId =
  | "arabic"
  | "paren-arabic"
  | "circled"
  | "alpha-lower"
  | "alpha-upper"
  | "roman-lower"
  | "roman-upper"
  | "chinese-numeral"
  | "japanese-formal"
  | "japanese-informal"
  | "korean-hangul"
  | "thai-consonant";

export type UnorderedListSymbol =
  | "•" | "◦" | "▪" | "–" | "■" | "□" | "▲" | "▼" | "◀" | "▶" | "◆" | "◇";

export const DEFAULT_ORDERED_LIST_LEVELS: OrderedListModuleId[] = [
  "arabic",
  "paren-arabic",
  "circled",
  "alpha-lower",
  "roman-lower",
];
export const DEFAULT_UNORDERED_LIST_LEVELS: UnorderedListSymbol[] = ["•", "◦", "▪", "–", "■"];

// How many items to precompute for the modules Typst's own numbering()
// can't express as a pattern string (see below) -- generous for any
// realistic list length; the cycling function wraps back to index 0 past
// this, same as the web editor's own wrap-around.
const TABLE_SIZE = 40;

const CIRCLED_DIGITS = [
  "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩",
  "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳",
];

const HAN_DIGITS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const HAN_TEN = "十";
const DAIJI_ONES: Record<number, string> = { 1: "壱", 2: "弐", 3: "参" };
const DAIJI_TEN = "拾";
const KOREAN_DIGITS = ["일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const KOREAN_TEN = "십";

// 42 "actively used" Thai consonants in alphabetical order (the full
// Unicode block has 46 code points; 2 are obsolete letters and 2 are
// vowel-like characters, both excluded) -- identical set to the web
// editor's own THAI_CONSONANTS.
const THAI_CONSONANTS = [
  "ก", "ข", "ค", "ฆ", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ",
  "ฎ", "ฏ", "ฐ", "ฑ", "ฒ", "ณ", "ด", "ต", "ถ", "ท", "ธ",
  "น", "บ", "ป", "ผ", "ฝ", "พ", "ฟ", "ภ", "ม", "ย", "ร",
  "ล", "ว", "ศ", "ษ", "ส", "ห", "ฬ", "อ", "ฮ",
];

function hanTens(n: number, ones: readonly string[], ten: string): string {
  if (n <= 9) return ones[n - 1];
  if (n === 10) return ten;
  const tensDigit = Math.floor(n / 10);
  const onesDigit = n % 10;
  const tensPart = tensDigit === 1 ? ten : `${ones[tensDigit - 1]}${ten}`;
  return onesDigit === 0 ? tensPart : `${tensPart}${ones[onesDigit - 1]}`;
}

function japaneseFormalDigit(n: number): string {
  if (n <= 9) return DAIJI_ONES[n] ?? HAN_DIGITS[n - 1];
  if (n === 10) return DAIJI_TEN;
  const tensDigit = Math.floor(n / 10);
  const onesDigit = n % 10;
  const tensOnesChar = DAIJI_ONES[tensDigit] ?? HAN_DIGITS[tensDigit - 1];
  const tensPart = tensDigit === 1 ? DAIJI_TEN : `${tensOnesChar}${DAIJI_TEN}`;
  const onesChar = DAIJI_ONES[onesDigit] ?? HAN_DIGITS[onesDigit - 1];
  return onesDigit === 0 ? tensPart : `${tensPart}${onesChar}`;
}

function buildTable(moduleId: OrderedListModuleId): string[] {
  const table: string[] = [];
  for (let n = 1; n <= TABLE_SIZE; n++) {
    switch (moduleId) {
      case "circled":
        table.push(CIRCLED_DIGITS[n - 1] ?? `${n}.`);
        break;
      case "chinese-numeral":
        table.push(`${hanTens(n, HAN_DIGITS, HAN_TEN)}、`);
        break;
      case "japanese-informal":
        table.push(`${hanTens(n, HAN_DIGITS, HAN_TEN)}、`);
        break;
      case "japanese-formal":
        table.push(`${japaneseFormalDigit(n)}、`);
        break;
      case "korean-hangul":
        table.push(`${hanTens(n, KOREAN_DIGITS, KOREAN_TEN)}.`);
        break;
      case "thai-consonant":
        table.push(`${THAI_CONSONANTS[(n - 1) % THAI_CONSONANTS.length]}.`);
        break;
      default:
        // Never reached for the 6 native-pattern modules (see
        // orderedListNumbering below) -- only here to satisfy the switch.
        table.push(`${n}.`);
    }
  }
  return table;
}

function typstStringArray(items: string[]): string {
  return `(${items.map((item) => `"${escapeTypstString(item)}"`).join(", ")})`;
}

// Typst's own numbering() pattern strings only recognize "1", "a"/"A", and
// "i"/"I" as counting KINDS -- any other character in the pattern is
// literal, constant text (this is what made the pre-existing "①" 2nd-level
// pattern a real bug: every item showed the same fixed "①", never
// incrementing). Modules outside that set instead get a generated Typst
// numbering FUNCTION, indexing into a precomputed table.
export function orderedListNumbering(moduleId: OrderedListModuleId): string {
  switch (moduleId) {
    case "arabic":
      return '"1."';
    case "paren-arabic":
      return '"(1)"';
    case "alpha-lower":
      return '"a."';
    case "alpha-upper":
      return '"A."';
    case "roman-lower":
      return '"i."';
    case "roman-upper":
      return '"I."';
    default: {
      const table = typstStringArray(buildTable(moduleId));
      return `(n) => { let syms = ${table}; syms.at(calc.rem(n - 1, syms.len())) }`;
    }
  }
}

export function orderedLevelModule(
  levels: OrderedListModuleId[] | undefined,
  depth: number,
): OrderedListModuleId {
  const list = levels && levels.length > 0 ? levels : DEFAULT_ORDERED_LIST_LEVELS;
  return list[(Math.max(depth, 1) - 1) % list.length];
}

export function unorderedLevelSymbol(
  levels: UnorderedListSymbol[] | undefined,
  depth: number,
): UnorderedListSymbol {
  const list = levels && levels.length > 0 ? levels : DEFAULT_UNORDERED_LIST_LEVELS;
  return list[(Math.max(depth, 1) - 1) % list.length];
}
