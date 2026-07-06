# Blockquote Quote/Font Styling — Design

**Goal:** Inside `#quote(block: true)[...]` (blockquote → Typst conversion), Chinese text renders in the TW-MOE-Std-Kai (教育部標準楷書) font; all other text renders in the existing serif stack with italic styling. Quote marks (`"..."`) inside blockquote content render as Typst's typographic smart quotes (curly `" "`) instead of straight ASCII quotes, for both scripts alike.

**Scope:** Only content inside a blockquote node's own conversion path (`case "blockquote"` in `tiptap-to-typst.ts`). No change to font, quote-mark, or smartquote behavior anywhere else in the document (headings, body paragraphs, callouts, etc.).

---

## Background / current behavior

- Blockquote already converts to `#quote(block: true)[...]` (confirmed in `tiptap-to-typst.ts`) — the `quote` function itself was already in use before this change.
- `escapeTypstText()` (used for all body text, including blockquote content today) escapes `"` to `\"`. A real compile confirms this renders as a literal straight quote — Typst's smartquote feature never triggers, because it operates on an unescaped `"` character during text layout, and the escape sequence prevents that.
- Real compiles (this session) confirmed: Typst's default `smartquote` behavior — with no `#set smartquote(...)` override at all — already renders a bare `"..."` as curly `" "` for both `#set text(lang: "zh")` and `#set text(lang: "en")` scopes. No custom `quotes:` configuration is needed to get `" "` (this was tested; an earlier design considered corner brackets `「」` for Chinese, which DOES require explicit `#set smartquote(quotes: ...)`, but that idea was dropped in favor of `" "` for both scripts).
- `TW-MOE-Std-Kai` is already a bundled/required font (`REQUIRED_FONT_FAMILIES` in `fonts.ts`) and already used as the "kai" `bodyFace` option in `templates/shared/anvil-fonts.typ` — no new font needs bundling.

## Behavior

1. **Script splitting:** Text inside a blockquote is split into runs of consecutive CJK vs. non-CJK characters. CJK is defined as: CJK Unified Ideographs (`一-鿿`), CJK Unified Ideographs Extension A (`㐀-䶿`), CJK Compatibility Ideographs (`豈-﫿`), CJK punctuation (`　-〿`), and fullwidth forms (`＀-￯`) — Han characters plus the punctuation that naturally accompanies Chinese text, so a Chinese sentence's own punctuation doesn't flip to the Latin styling. Everything else (Latin letters, digits, ASCII punctuation including the `"` quote character itself, whitespace) is "non-CJK".
2. **Per-run styling:**
   - CJK runs: wrapped in `#text(font: "TW-MOE-Std-Kai")[...]`.
   - Non-CJK runs: wrapped in `#text(font: <existing serif stack>, style: "italic")[...]` — reuses the same Latin/serif font stack already defined for the `body`/`meta` font presets (`Tinos` + `Noto Serif` fallbacks), so this doesn't introduce a new font family, only adds `style: "italic"` on top.
3. **Quote marks:** The `"` character is left unescaped within blockquote content (a blockquote-local exception to the usual `escapeTypstText` behavior) so Typst's own default smartquote renders it as curly `" "`. Since `"` is classified as non-CJK by the script splitter above, it takes on the Serif+Italic run's styling like any other Latin punctuation — this matches "both scripts get `" "`, only the font differs."
4. **Interaction with existing marks (bold/italic/strike/etc.):** Script-run splitting happens first, at the raw-text level, before the existing per-text-node mark wrapping (`#strong[...]`, `#emph[...]`, etc.) — so a bold Chinese phrase inside a blockquote still ends up `#strong[#text(font: "TW-MOE-Std-Kai")[...]]`, preserving existing formatting behavior untouched.
5. **Everything else about blockquote conversion is unchanged:** nested blocks (lists, other paragraphs) inside a blockquote still recurse through the normal `renderBlocks`/`inlineToTypst` path; only the leaf text-escaping step gains this blockquote-specific behavior.

## Non-goals (explicitly out of scope, decided during brainstorming)

- No corner-bracket quotes (`「」`/`『』`) for Chinese — dropped in favor of `" "` for both scripts, per explicit simplification.
- No change to quote/font styling outside blockquotes.
- No per-paragraph-only language detection — full character-level script splitting was chosen over the simpler paragraph-level alternative once the corner-bracket/quote-pairing complexity was dropped (making character-level splitting a plain font-wrapping problem, not a stateful quote-pairing one).

## Implementation approach

- **New module-level state** in `tiptap-to-typst.ts`, following the file's existing pattern (`primaryLang`, `footnoteMap`, etc. are already module-level `let`s set at the start of the top-level `convert()` call): add `let insideBlockquote = false;`, set to `true` around the `renderBlocks(asNodes(node.content), offset)` call in the `"blockquote"` case, reset to `false` immediately after (mirroring how `footnoteMap`/`primaryLang` are reset at the end of `convert()`).
- **New function** `splitScriptRuns(text: string): { text: string; isCjk: boolean }[]` — a small pure function, unit-testable in isolation, that walks the string character by character (using the Unicode ranges above), merging consecutive same-classification characters into runs.
- **New function** `wrapQuoteRun(text: string, isCjk: boolean): string` — escapes the run's text using a blockquote-specific escape function (same as `escapeTypstText` but WITHOUT escaping `"`), then wraps it in the appropriate `#text(...)` call per the styling rules above.
- **Modify `renderTextNode`**: when `insideBlockquote` is true, replace the current unconditional `escapeTypstText(raw)` step with `splitScriptRuns(raw).map(r => wrapQuoteRun(r.text, r.isCjk)).join("")`, before the existing mark-wrapping loop runs (unchanged).
- **New font preset entries** in `fonts.ts` are NOT needed — the Kai font name (`"TW-MOE-Std-Kai"`) and the existing serif stack (`getTypstFontStack("body")` or similar) are referenced directly from the new blockquote-specific code, since this styling is fixed (not user-configurable via `FontChoices` the way `bodyFace` is) and scoped to one call site.

## Testing

- Unit tests for `splitScriptRuns`: pure Chinese, pure Latin, mixed (`這是"test"字`), empty string, punctuation-only.
- Unit tests for the full blockquote conversion path (existing `tiptap-to-typst.test.ts` pattern): a blockquote with a Chinese paragraph, an English paragraph, and a mixed paragraph, asserting the expected `#text(font: "TW-MOE-Std-Kai")[...]` / `#text(font: (...), style: "italic")[...]` wrapping appears, and that a `"` inside the blockquote is NOT escaped to `\"`.
- Real Typst compile (this session's established verification standard) of a representative mixed-content blockquote, confirming visually: Chinese renders in Kai (a distinct brush-stroke look vs. the surrounding Song/Sans body text), Latin renders serif+italic, and quote marks render as curly `" "` rather than straight `"`.
