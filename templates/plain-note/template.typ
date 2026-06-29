// plain-note adapter.
//
// plain-note ships as a self-contained template package. The renderer only
// feeds it metadata and a small set of behavior toggles.
#import "upstream.typ": plain-note, hypersetup

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
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
