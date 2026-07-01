// elsearticle adapter.
// Text/math fonts (XITS/STIX Two/New Computer Modern fallback chains) are
// hardcoded inside the package (els-globals.typ), not exposed as parameters —
// nothing to wire here; XITS + XITS Math are bundled so the primary choice
// resolves instead of falling through to New Computer Modern.
#import "@preview/elsearticle:3.1.0": elsearticle

#let _s(v) = if v == none { none } else { v }

// AnvilNote sends dates as "YYYY-MM-DD" strings; the package requires a real
// `datetime` (or `none`), so parse rather than forward the string.
#let _parse-date(v) = {
  if v == none or type(v) != str { return none }
  let m = v.match(regex("^(\d{4})-(\d{2})-(\d{2})$"))
  if m == none { return none }
  let (y, mo, d) = m.captures
  datetime(year: int(y), month: int(mo), day: int(d))
}

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  let author = meta.at("author", default: none)
  show: elsearticle.with(
    title: _s(meta.at("title", default: "Untitled")),
    authors: if author != none { ((name: author),) } else { () },
    abstract: _s(meta.at("abstract", default: none)),
    journal: _s(options.at("journal", default: none)),
    date: _parse-date(meta.at("date", default: none)),
    paper: options.at("paperSize", default: "a4"),
    numcol: int(options.at("numColumns", default: "1")),
    line-numbering: options.at("lineNumbering", default: false),
  )
  body
}
