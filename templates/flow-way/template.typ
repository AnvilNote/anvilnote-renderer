// flow-way adapter (function `flow`).
// authors is an array (single value → one-element array); year must be an int
// or none; toc-depth is an int.
#import "@preview/flow-way:0.2.0": flow

#let _s(v) = if v == none { "" } else { v }

#let anvil-template(meta: (:), options: (:), body) = {
  let author = meta.at("author", default: none)
  let authors = if author == none or author == "" { () } else { (author,) }

  let year = meta.at("year", default: none)
  let year-val = if year == none or year == "" { none } else { int(year) }

  let subtitle = meta.at("subtitle", default: none)
  let affiliation = meta.at("affiliation", default: none)

  show: flow.with(
    title: _s(meta.at("title", default: "Untitled")),
    subtitle: if subtitle == none or subtitle == "" { none } else { subtitle },
    authors: authors,
    affiliation: if affiliation == none or affiliation == "" { none } else { affiliation },
    year: year-val,
    toc: options.at("toc", default: true),
    toc-depth: int(options.at("tocDepth", default: "3")),
  )
  body
}
