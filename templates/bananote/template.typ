// bananote adapter (function `note`).
// authors is an array of (name, affiliation) tuples; date must be a real
// datetime (the package calls date.display); banana-color must be a color.
#import "@preview/bananote:0.1.2": note

#let _parse-date(s) = {
  if s == none or s == "" { return none }
  let parts = s.split("-")
  if parts.len() != 3 { return none }
  datetime(year: int(parts.at(0)), month: int(parts.at(1)), day: int(parts.at(2)))
}

// rgb() rejects a leading "#", so strip it before parsing the hex string.
#let _hex(v) = if v == none or v == "" { none } else if v.starts-with("#") { v.slice(1) } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  let name = meta.at("author", default: none)
  let aff = meta.at("affiliation", default: none)
  let authors = if name == none or name == "" { () } else { (([#name], [#aff]),) }

  let version = meta.at("version", default: none)
  let bc = _hex(options.at("bananaColor", default: none))

  show: note.with(
    title: [#meta.at("title", default: "Untitled")],
    authors: authors,
    date: _parse-date(meta.at("date", default: none)),
    version: if version == none or version == "" { none } else { version },
    banana-color: if bc == none { yellow } else { rgb(bc) },
  )
  // @preview/bananote's own `note()` sets figure(placement: top) — an
  // academic-paper convention (figures float to the current page's top)
  // that's wrong for AnvilNote's charts/images, which the user inserts at
  // a specific spot and expects to stay there (same intent as chart-node-
  // view.tsx's own draggable={false} fix for the live editor). Overriding
  // it here, after the show rule, wins because this set-rule sits later in
  // the same content sequence than note()'s own (Typst set-rules shadow
  // earlier ones for everything from that point forward) — no need to
  // touch the vendored package itself.
  set figure(placement: none)
  body
}
