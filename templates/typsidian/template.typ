// typsidian adapter.
// Maps AnvilNote's (meta, options) onto @preview/typsidian. The package's own
// math default (Fira Math) isn't in the AnvilNote font bundle, so text-args
// repoints math to the already-bundled New Computer Modern Math; Fira Sans /
// Fira Code (its body/heading/code defaults) are bundled and used as-is.
#import "@preview/typsidian:0.0.3": typsidian

#let _s(v) = if v == none { "" } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  let title = meta.at("title", default: "Untitled")
  let author = meta.at("author", default: none)
  let course = meta.at("courseName", default: none)
  show: typsidian.with(
    title: _s(title),
    author: _s(author),
    course: _s(course),
    theme: options.at("colorTheme", default: "light"),
    index-entry-list: (),
    text-args: (math: (font: "New Computer Modern Math")),
  )

  // typsidian's own make-title() always renders "#course -- #title" (a bare
  // dash when course is empty, which is common here) and hardcodes today's
  // date, so the adapter draws its own conditional title block instead.
  align(center)[
    #block(text(size: 2em, weight: "semibold")[
      #if course != none [#course #sym.dash.en ]#title
    ])
    #if author != none [
      #text(size: 1.2em)[#author]
    ]
  ]
  line(length: 100%, stroke: 0.5pt)
  v(0.8em)

  body
}
