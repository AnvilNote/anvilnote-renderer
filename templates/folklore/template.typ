// folklore adapter. Fixed half-letter book trim size and EB Garamond (bundled)
// are the package's own design choices — left as-is.
#import "@preview/folklore:0.2.0": setup

#let _s(v) = if v == none { none } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: setup.with(
    work-title: _s(meta.at("title", default: "Untitled")),
    work-author: _s(meta.at("author", default: none)),
    preface: _s(meta.at("preface", default: none)),
    recto-toc: options.at("toc", default: true),
    number-chapters: options.at("numberChapters", default: true),
  )
  body
}
