// gakusyun-doc adapter.
// Font params are overridden to the bundled TW-oriented CJK faces (this
// package defaults to Simplified-Chinese fonts we don't carry); latin-font
// stays at the package default (New Computer Modern, already bundled).
#import "@preview/gakusyun-doc:1.0.0": docu

#let _s(v) = if v == none { "" } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: docu.with(
    title: _s(meta.at("title", default: "Untitled")),
    subtitle: _s(meta.at("subtitle", default: "")),
    author: _s(meta.at("author", default: "")),
    date: _s(meta.at("date", default: "")),
    title-page: options.at("titlePage", default: false),
    show-index: options.at("showIndex", default: false),
    cjk-font: "TW-MOE-Std-Song",
    emph-cjk-font: "TW-MOE-Std-Kai",
    mono-font: "JetBrains Mono",
  )
  body
}
