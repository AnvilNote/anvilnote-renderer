// bubble adapter.
// Colored cover-page template. `class` carries the course name; main-color is
// a hex string consumed by bubble's rgb() internally.
#import "@preview/bubble:0.2.2": bubble

#let _s(v) = if v == none { "" } else { v }
// bubble feeds main-color straight into rgb(), which rejects a leading "#".
#let _hex(v) = { let s = _s(v); if s.starts-with("#") { s.slice(1) } else { s } }

#let anvil-template(meta: (:), options: (:), body) = {
  show: bubble.with(
    title: _s(meta.at("title", default: "Untitled")),
    subtitle: _s(meta.at("subtitle", default: "")),
    author: _s(meta.at("author", default: "")),
    affiliation: _s(meta.at("affiliation", default: "")),
    year: _s(meta.at("year", default: "")),
    class: _s(meta.at("courseName", default: "")),
    main-color: { let h = _hex(options.at("mainColor", default: "E94845")); if h == "" { "E94845" } else { h } },
  )
  body
}
