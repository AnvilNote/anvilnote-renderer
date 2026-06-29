// AnvilNote shared font policy.
//
// Single source of truth for the font stacks the renderer enforces on every
// document. Templates must NOT set fonts themselves — they own layout only.
// The renderer copies this file next to the generated entry and calls
// `apply-anvil-fonts(..)` before handing the body to the selected template.
//
// Every family name here must match the output of:
//   typst fonts --font-path ./fonts --ignore-system-fonts
// Keep this file in sync with src/config/fonts.ts.

#let title-fonts = (
  "Roboto",
  "TaiwanPearl",
  "思源黑體 TW",
  "Noto Sans",
  "Noto Sans JP",
  "Noto Sans KR",
  "Noto Sans Thai",
)

#let meta-fonts = (
  "TW-MOE-Std-Song",
  "Tinos",
  "Noto Serif JP",
  "Noto Serif KR",
  "Noto Serif Thai",
  "Noto Serif",
)

#let body-fonts = (
  "TW-MOE-Std-Song",
  "Tinos",
  "Noto Serif JP",
  "Noto Serif KR",
  "Noto Serif Thai",
  "Noto Serif",
)

#let heading-fonts = (
  "Roboto",
  "TaiwanPearl",
  "思源黑體 TW",
  "Noto Sans",
  "Noto Sans JP",
  "Noto Sans KR",
  "Noto Sans Thai",
)

#let code-fonts = (
  "JetBrains Mono",
  "Noto Sans Mono",
)

#let math-fonts-default = (
  "New Computer Modern Math",
)

#let math-fonts-garamond = (
  "Garamond-Math",
)

// Switchable author/date display faces. Latin/numbers use the chosen face; CJK
// falls back through the serif (meta) stack.
#let date-fonts-playfair = (
  "Playfair Display",
  "TW-MOE-Std-Song",
  "Noto Serif JP",
  "Noto Serif KR",
  "Noto Serif Thai",
  "Noto Serif",
)

#let date-fonts-tai-heritage = (
  "Tai Heritage Pro",
  "TW-MOE-Std-Song",
  "Noto Serif JP",
  "Noto Serif KR",
  "Noto Serif Thai",
  "Noto Serif",
)

// Resolve the date stack from the user-facing option ("playfair" | "tai-heritage").
#let date-fonts(variant: "playfair") = {
  if variant == "tai-heritage" { date-fonts-tai-heritage } else { date-fonts-playfair }
}

// Inline helpers for template-authored title / author / date so those chunks
// pick up the AnvilNote stacks even when they bypass the global `set text`.
#let title-text(content) = {
  set text(font: title-fonts)
  content
}

#let meta-text(content) = {
  set text(font: meta-fonts)
  content
}

#let body-text(content) = {
  set text(font: body-fonts)
  content
}

#let heading-text(content) = {
  set text(font: heading-fonts)
  content
}

// ─── User-customizable stack builder ────────────────────────────────────────
// The stacks are derived from a few scalar choices so the API / web UI only
// needs simple selects: a primary language and a primary CJK face per role.

#let _serif-for(lang, body-face) = {
  if lang == "zh" {
    if body-face == "kai" { "TW-MOE-Std-Kai" } else { "TW-MOE-Std-Song" }
  } else if lang == "ja" { "Noto Serif JP" }
  else if lang == "ko" { "Noto Serif KR" }
  else if lang == "th" { "Noto Serif Thai" }
  else { "Tinos" }
}

#let _sans-for(lang, title-face) = {
  if lang == "zh" {
    if title-face == "source-han" { "思源黑體 TW" } else { "TaiwanPearl" }
  } else if lang == "ja" { "Noto Sans JP" }
  else if lang == "ko" { "Noto Sans KR" }
  else if lang == "th" { "Noto Sans Thai" }
  else { "Noto Sans" }
}

// Order the five supported languages with the chosen one first.
#let _lang-order(primary) = {
  let base = ("zh", "en", "ja", "ko", "th")
  (primary,) + base.filter(l => l != primary)
}

// Build every role stack from the scalar choices. `math-face` is "default" or
// "garamond"; it only affects `math`.
#let anvil-font-stacks(
  primary-lang: "zh",
  title-face: "taiwan-pearl",
  body-face: "song",
  date-face: "playfair",
  math-face: "default",
) = {
  let langs = _lang-order(primary-lang)
  let serif = langs.map(l => _serif-for(l, body-face)) + ("Noto Serif",)
  let sans = ("Roboto",) + langs.map(l => _sans-for(l, title-face))
  let date-primary = if date-face == "tai-heritage" { "Tai Heritage Pro" } else { "Playfair Display" }
  (
    title: sans,
    heading: sans,
    meta: serif,
    body: serif,
    code: ("JetBrains Mono", "Noto Sans Mono"),
    date: (date-primary,) + serif,
    math: if math-face == "garamond" { ("Garamond-Math",) } else { ("New Computer Modern Math",) },
  )
}

// Apply the full AnvilNote font policy to the document body. Declared AFTER the
// template show rule in the generated entry so it nests INSIDE the template and
// wins over any fonts the template package sets for body content.
//   #show: apply-anvil-fonts.with(stacks: _stacks)
// `stacks` is the dict from `anvil-font-stacks`; omitting it uses the defaults.
#let apply-anvil-fonts(body, stacks: none) = {
  let s = if stacks == none { anvil-font-stacks() } else { stacks }
  set text(font: s.body)
  show heading: set text(font: s.heading)
  show raw: set text(font: s.code, size: 0.88em)
  show math.equation: set text(font: s.math)
  body
}
