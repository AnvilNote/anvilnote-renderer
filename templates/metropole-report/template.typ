// metropole-report adapter.
// Font params (body-font/heading-font/raw-font) are left at the package's own
// defaults (Source Serif 4 / Source Sans 3 / Source Code Pro), all of which
// are bundled — no override needed.
#import "@preview/metropole-report:0.1.0": metropole

#let _s(v) = if v == none { none } else { v }

// AnvilNote sends dates as "YYYY-MM-DD" strings; the package requires a real
// `datetime` (or `none`/`auto`), so parse rather than forward the string.
#let _parse-date(v) = {
  if v == none or type(v) != str { return none }
  let m = v.match(regex("^(\d{4})-(\d{2})-(\d{2})$"))
  if m == none { return none }
  let (y, mo, d) = m.captures
  datetime(year: int(y), month: int(mo), day: int(d))
}

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: metropole.with(
    title: _s(meta.at("title", default: "Untitled")),
    subtitle: _s(meta.at("subtitle", default: none)),
    author: _s(meta.at("author", default: none)),
    date: _parse-date(meta.at("date", default: none)),
    paper-size: options.at("paperSize", default: "a4"),
    cover-page: options.at("coverPage", default: false),
    accent-color: rgb(options.at("accentColor", default: "#c53a2f")),
  )
  body
}
