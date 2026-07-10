// AnvilNote shared question block — see this feature's design doc
// ("Question Block v2") for the container/item split this file
// implements. q-num now steps once per SUB-QUESTION (a Tiptap
// "questionItem" node, converted by tiptap-to-typst.ts's own
// "questionItem" case) — the "question" node itself (a container of one
// or more questionItems) has no Typst-side representation of its own;
// tiptap-to-typst.ts's "question" case just renders its children
// directly via renderBlocks(), no wrapper function call.
//
// Ported from the reference personal template at
// /Users/anthonysung/tutoring/english/quiz/quiz-template.typ (its own
// q-num counter, question(), choices(), display-width()) — same 14/28
// average-display-width thresholds so the PDF layout matches
// anvilnote-web's own src/lib/question-choices.ts heuristic.
#let q-num = counter("anvil-question")

// body: one sub-question's content (paragraphs/images, same
// renderBlocks() path every other block content goes through). Used by
// EVERY kind (single/multi/written) — the choices()/answer-lines()/
// answer-blank() call for that item's specific kind is emitted by the
// caller (tiptap-to-typst.ts) directly after this, not inside it, so
// this function only owns the number+body layout.
#let question-item(body) = {
  q-num.step()
  block(above: 0.6em, below: 0.2em, {
    set par(first-line-indent: 0pt)
    grid(
      columns: (1.8em, 1fr),
      column-gutter: 0.5em,
      align: top,
      context [#q-num.display().],
      body,
    )
  })
}

#let _display-width(s) = {
  let w = 0
  for c in s.clusters() {
    let cp = str.to-unicode(c)
    w = w + if cp >= 0x2E80 { 2 } else { 1 }
  }
  w
}

// Auto-layout choices: 4-in-a-row -> 2x2 -> 1-per-line, based on average
// visible character width across the non-empty options — same thresholds
// as the reference template and anvilnote-web's question-choices.ts.
// Used identically for both "single" and "multi" kind items — no visual
// distinction between them, per explicit product decision.
#let choices(..items) = {
  let labels = ("A", "B", "C", "D", "E", "F", "G", "H")
  let opts = items.pos().filter(item => str(item).trim() != "")
  if opts.len() == 0 { return }

  let total = 0
  for item in opts {
    total = total + _display-width(str(item))
  }
  let avg = total / opts.len()

  let cells = ()
  for (i, item) in opts.enumerate() {
    cells.push([(#labels.at(i, default: str(i + 1))) #item])
  }

  block(above: 0.3em, below: 0.5em, {
    if avg <= 14 {
      grid(columns: (1fr, 1fr, 1fr, 1fr), column-gutter: 0.5em, row-gutter: 0.4em, ..cells)
    } else if avg <= 28 {
      grid(columns: (1fr, 1fr), column-gutter: 1em, row-gutter: 0.4em, ..cells)
    } else {
      grid(columns: (1fr,), row-gutter: 0.4em, ..cells)
    }
  })
}

// Written-answer area, "lines" mode: n horizontal rules with vertical
// spacing between them, for a handwritten short-answer response.
#let answer-lines(n: 3) = {
  block(above: 0.4em, below: 0.5em, {
    for i in range(n) {
      v(1.2em)
      line(length: 100%, stroke: 0.6pt)
    }
  })
}

// Written-answer area, "blank" mode: a single empty dashed-border box,
// `height` already resolved to a literal length by the caller
// (tiptap-to-typst.ts reads the questionItem's own writtenHeightCm attr
// — already baked from a percentage client-side, see anvilnote-web's
// question-item-node-view.tsx — so this function does no percent-to-cm
// math of its own).
#let answer-blank(height: 4cm) = {
  block(above: 0.4em, below: 0.5em, {
    box(
      width: 100%,
      height: height,
      stroke: (paint: gray, dash: "dashed", thickness: 0.6pt),
    )
  })
}
