// minimal-lecture is self-authored (no @preview package) — layout lives
// directly in this file rather than being threaded through to an upstream
// template call.
#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  let title = meta.at("title", default: none)
  let author = meta.at("author", default: none)
  let date = meta.at("date", default: none)

  set page(
    paper: "a4",
    margin: (x: 22mm, y: 24mm),
  )

  // Font policy is owned by templates/shared/anvil-fonts.typ via the renderer
  // wrapper; templates only control layout. Set size only, never family.
  set text(size: 11pt)

  set par(
    justify: true,
    leading: 0.65em,
  )

  show heading: it => block(
    above: 1.2em,
    below: 0.6em,
    text(weight: "bold", {
      if it.numbering != none {
        context counter(heading).display(it.numbering)
        h(0.5em)
      }
      it.body
    }),
  )

  if title != none {
    align(center)[
      #text(size: 20pt, weight: "bold")[#title]
    ]
    v(0.8em)
  }

  if author != none or date != none {
    align(center)[
      #if author != none { author }
      #if author != none and date != none { " · " }
      #if date != none { date }
    ]
    v(1.2em)
  }

  body
}
