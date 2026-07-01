// mousse-notes adapter.
// Left at the package's own "serif" font-style (New Computer Modern / New
// Computer Modern Math, both bundled) — its "sans" alternative defaults to
// Fira Math, which AnvilNote intentionally doesn't bundle.
#import "@preview/mousse-notes:1.1.0": book

#let _s(v) = if v == none { none } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: book.with(
    title: _s(meta.at("title", default: "Untitled")),
    subtitle: _s(meta.at("subtitle", default: none)),
    author: _s(meta.at("author", default: none)),
  )
  body
}
