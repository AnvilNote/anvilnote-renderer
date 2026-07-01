# AnvilNote font bundle

AnvilNote renders every PDF from a **fixed, bundled set of fonts** so output is
reproducible across local machines and Docker. The renderer compiles with
`--font-path ./fonts --ignore-system-fonts`, so **only** the fonts in this
directory are used — system fonts are ignored entirely.

## Policy

- **No commercial fonts.** Only open-source / freely-licensed fonts live here.
- **No Times New Roman, Calibri, Cambria, or Sabon.**
- **No cwTeX** as a bundled AnvilNote font. (The legacy `plain-note` template
  still vendors its own cwTeX look under `templates/plain-note/fonts/`; that is a
  pre-existing template, not part of this bundle — see the renderer report.)
- Fonts must be **static** instances. Typst 0.14 does not support variable
  fonts and will warn / render incorrectly if given a `Family[wght].ttf`.

## Layout

```
fonts/
  zh/    moe-kai/ moe-song/ source-han-sans-tw/ taiwan-pearl/
  latin/ tinos/ noto-sans/ noto-serif/ roboto/ eb-garamond/
         fira-sans/ switzer/ source-serif-4/ source-sans-3/
  cjk/   noto-serif-jp/ noto-sans-jp/ noto-serif-kr/ noto-sans-kr/
  thai/  noto-serif-thai/ noto-sans-thai/
  mono/  jetbrains-mono/ noto-sans-mono/
         fira-code/ ibm-plex-mono/ source-code-pro/
  math/  new-computer-modern/ garamond-math/
         tex-gyre-pagella/ xits/
```

`fira-sans`, `fira-code`, `ibm-plex-mono`, `tex-gyre-pagella` (+ Math), `switzer`,
`source-serif-4`, `source-sans-3`, `source-code-pro`, and `xits` (+ XITS Math)
are not part of the `anvilnote-default` bundle in `src/config/fonts.ts` — they
were pulled in to support external community templates (Typsidian, Obelisk,
Metropole Report, Elsearticle) that expect these families by name. They ride
along in the same bundle/manifest so `--font-path ./fonts` resolves them too.

`manifest.json` is the catalog (key, family, license, source, path). The Typst
**family names** there and in `src/config/fonts.ts` /
`templates/shared/anvil-fonts.typ` must match what `pnpm fonts:list` reports.

## Download / place fonts

```bash
pnpm fonts:download        # fetch the open-source fonts (idempotent)
pnpm fonts:download --force  # re-download even if files exist
```

Three fonts have **no safe automatic download** and must be placed manually
(they are committed to the repo via Git LFS, so a fresh `git lfs pull` already
has them — the table is for rebuilding the bundle from scratch):

| Key            | Family             | Where to get it |
| -------------- | ------------------ | --------------- |
| `moe-kai`      | TW-MOE-Std-Kai     | <https://language.moe.gov.tw/> → 教育部標準楷書 (edukai). Drop the `.ttf` in `fonts/zh/moe-kai/`. License: CC BY-ND. |
| `moe-song`     | TW-MOE-Std-Song    | <https://language.moe.gov.tw/> → 宋體母稿 (edusong). Drop the `.ttf` in `fonts/zh/moe-song/`. License: CC BY-ND. |
| `taiwan-pearl` | TaiwanPearl | <https://github.com/max32002/TaiwanPearl> → unzip the `.ttf` files into `fonts/zh/taiwan-pearl/`. License: OFL-1.1. |

Their real Typst family names (from `pnpm fonts:list`) are `TW-MOE-Std-Kai`,
`TW-MOE-Std-Song`, `TaiwanPearl` — already wired into
`src/config/fonts.ts` and `templates/shared/anvil-fonts.typ`.

If any are missing, Traditional Chinese body text falls back through the serif
stack (Noto Serif JP/KR cover most Han glyphs) and CJK titles fall back to
思源黑體 TW — renders still succeed, just without the MOE serif / TaiwanPearl
faces.

## Verify

```bash
pnpm fonts:list      # what Typst actually sees from the bundle
pnpm fonts:verify    # checks every required family is present (exits non-zero if not)
```

## Compile manually

```bash
typst compile input.typ output.pdf --font-path ./fonts --ignore-system-fonts
```

In Docker the bundle is copied to `/app/fonts`; set `ANVILNOTE_FONT_DIR=/app/fonts`.

## Licensing

Fonts retain their own licenses (see `manifest.json`). OFL / Apache-2.0 /
CC BY-ND / GUST. Keep license files alongside the fonts where required by the
license.
