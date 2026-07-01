// obelisk adapter.
// @preview/obelisk's `init` is a pure layout wrapper (baseline grid, sidenotes,
// theorem environments) with no built-in title chrome, so the adapter draws a
// small centered title block itself before yielding to body. Sizes/weights
// only — never a font override — so apply-anvil-fonts still governs the type.
#import "@preview/obelisk:0.1.0": init

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: init

  // init() sets top-edge/bottom-edge: "baseline" globally so paragraph leading
  // locks to its baseline grid. That shrinks Typst's row-height measurement
  // for `table`, so rows overlap; restore normal glyph metrics inside tables
  // only, where the grid doesn't apply anyway.
  show table: set text(top-edge: "ascender", bottom-edge: "descender")

  let title = meta.at("title", default: none)
  let author = meta.at("author", default: none)
  let date = meta.at("date", default: none)

  set document(
    title: if title != none { title } else { auto },
    author: if author != none { (author,) } else { () },
  )

  if title != none {
    align(center)[
      #text(size: 20pt, weight: "bold")[#title]
    ]
    v(0.8em)
  }

  if author != none or date != none {
    align(center)[
      #if author != none { author }
      #if author != none and date != none { " · " }
      #if date != none { date }
    ]
    v(1.2em)
  }

  body
}
