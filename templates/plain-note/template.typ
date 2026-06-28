// plain-note adapter.
//
// Translates AnvilNote's normalized (meta, options) dicts into the local
// plain-note package API. The renderer recognizes only the unified contract
// `anvil-template(meta, options, body)`; all package-specific shape lives here.
#import "upstream.typ": plain-note, hypersetup

#let anvil-template(meta: (:), options: (:), body) = {
  show: hypersetup.with(
    colorlinks: options.at("colorlinks", default: true),
    pdftitle: meta.at("title", default: none),
    pdfauthor: meta.at("author", default: ()),
  )
  show: plain-note.with(
    title: meta.at("title", default: none),
    author: meta.at("author", default: none),
    date: meta.at("date", default: none),
    toc: options.at("toc", default: true),
  )
  body
}
