// minicise adapter. No font params exposed — apply-anvil-fonts governs type.
#import "@preview/minicise:0.1.0": sheet

#let _s(v) = if v == none { none } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: sheet.with(
    title: _s(meta.at("title", default: "Untitled")),
    course: _s(meta.at("courseName", default: none)),
    semester: _s(meta.at("semester", default: none)),
    author: _s(meta.at("author", default: none)),
    date: _s(meta.at("date", default: none)),
  )
  body
}
