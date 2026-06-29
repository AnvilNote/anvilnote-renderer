// hetvid adapter.
// title/affiliation/abstract are content in this package; author/date/version
// are strings. We wrap strings as content with [#value] (none renders empty).
#import "@preview/hetvid:0.2.1": hetvid

#let _s(v) = if v == none { "" } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: hetvid.with(
    title: [#meta.at("title", default: "Untitled")],
    author: _s(meta.at("author", default: "")),
    affiliation: [#meta.at("affiliation", default: none)],
    abstract: [#meta.at("abstract", default: none)],
    date-created: _s(meta.at("date", default: "")),
    version: _s(meta.at("version", default: "")),
    toc: options.at("toc", default: true),
    paper-size: options.at("paperSize", default: "a4"),
    lang: options.at("lang", default: "en"),
  )
  body
}
