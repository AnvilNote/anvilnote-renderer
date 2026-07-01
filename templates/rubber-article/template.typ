// rubber-article adapter.
// text-font stays at the package default (New Computer Modern, bundled);
// lang is pinned to "en" so figure/table captions don't default to German.
#import "@preview/rubber-article:0.5.2": article, maketitle

#let _s(v) = if v == none { none } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  let author = meta.at("author", default: none)
  show: article.with(
    lang: "en",
    page-paper: options.at("paperSize", default: "a4"),
    heading-numbering: if options.at("numberedHeadings", default: true) { "1.1" } else { none },
  )
  maketitle(
    title: _s(meta.at("title", default: "Untitled")),
    authors: if author != none { (author,) } else { () },
    date: _s(meta.at("date", default: none)),
  )
  body
}
