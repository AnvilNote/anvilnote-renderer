#let anvil-note(
  title: none,
  author: none,
  date: none,
  body,
) = {
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
    text(weight: "bold", it.body),
  )

  [
    #if title != none {
      align(center)[
        #text(size: 20pt, weight: "bold")[#title]
      ]
      v(0.8em)
    }

    #if author != none or date != none {
      align(center)[
        #if author != none { author }
        #if author != none and date != none { " · " }
        #if date != none { date }
      ]
      v(1.2em)
    }

    #body
  ]
}
