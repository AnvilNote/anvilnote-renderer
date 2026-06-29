// kunskap adapter.
// Maps AnvilNote's (meta, options) onto @preview/kunskap. `header` carries the
// course name; date is a display string in this package.
#import "@preview/kunskap:0.1.0": kunskap

#let _s(v) = if v == none { "" } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: kunskap.with(
    title: _s(meta.at("title", default: "Untitled")),
    author: _s(meta.at("author", default: "")),
    date: _s(meta.at("date", default: "")),
    header: _s(meta.at("courseName", default: "")),
    paper-size: options.at("paperSize", default: "a4"),
  )
  body
}
