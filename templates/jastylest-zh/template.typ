// jastylest-zh adapter.
// This package defaults to Simplified-Chinese/STIX fonts we don't carry;
// override every font param to bundled equivalents (Latin serif/sans/mono
// stay at their bundled defaults, CJK faces repoint to the TW-oriented set
// AnvilNote already ships).
#import "@preview/jastylest-zh:0.1.2": article

#let _s(v) = if v == none { none } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: article.with(
    title: _s(meta.at("title", default: "Untitled")),
    office: _s(meta.at("courseName", default: none)),
    author: _s(meta.at("author", default: none)),
    date: _s(meta.at("date", default: none)),
    abstract: _s(meta.at("abstract", default: none)),
    titlepage: options.at("titlePage", default: false),
    paper: options.at("paperSize", default: "a4"),
    seriffont-cjk: "TW-MOE-Std-Song",
    sansfont-cjk: "思源黑體 TW",
    monofont: "Fira Code",
    kaiti-cjk: "TW-MOE-Std-Kai",
    mathfont: "New Computer Modern Math",
  )
  body
}
