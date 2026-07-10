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
// renderBlocks() path every other block content goes through). extra:
// that item's choices()/answer-lines()/answer-blank() call (or `none`
// for a plain body with nothing below it) — placed in the SAME grid
// column as body, one row below it, so it's indented under body's own
// left edge instead of sitting flush with the page margin. Real bug,
// caught via a live PDF export: extra used to be emitted by the caller
// (tiptap-to-typst.ts) as a SEPARATE top-level call after
// #question-item[...], which put it back at the page's left margin,
// under the NUMBER column rather than under body — this matches
// anvilnote-web's own question-item-node-view.tsx layout instead, where
// choices/written-area sit inside the same flex column as the body.
#let question-item(body, extra: none) = {
  q-num.step()
  block(above: 0.6em, below: 0.2em, {
    set par(first-line-indent: 0pt)
    grid(
      columns: (1.8em, 1fr),
      column-gutter: 0.5em,
      align: top,
      context [#q-num.display().],
      { body; extra },
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
// `columns: auto` (the default, single-choice items) runs that
// heuristic; `columns: 1` (multi-choice items — see tiptap-to-typst.ts's
// "questionItem" case) skips it and always renders one option per line,
// per explicit feedback that single and multi are NOT visually identical
// after all — only the (A)/(B)/... label style is shared, not the
// column layout.
#let choices(columns: auto, ..items) = {
  let labels = ("A", "B", "C", "D", "E", "F", "G", "H")
  let opts = items.pos().filter(item => str(item).trim() != "")
  if opts.len() == 0 { return }

  let cells = ()
  for (i, item) in opts.enumerate() {
    cells.push([(#labels.at(i, default: str(i + 1))) #item])
  }

  block(above: 0.5em, below: 0.5em, {
    if columns == 1 {
      grid(columns: (1fr,), row-gutter: 0.4em, ..cells)
    } else {
      let total = 0
      for item in opts {
        total = total + _display-width(str(item))
      }
      let avg = total / opts.len()
      if avg <= 14 {
        grid(columns: (1fr, 1fr, 1fr, 1fr), column-gutter: 0.5em, row-gutter: 0.4em, ..cells)
      } else if avg <= 28 {
        grid(columns: (1fr, 1fr), column-gutter: 1em, row-gutter: 0.4em, ..cells)
      } else {
        grid(columns: (1fr,), row-gutter: 0.4em, ..cells)
      }
    }
  })
}

// Written-answer area, "lines" mode: n horizontal rules with vertical
// spacing between them, for a handwritten short-answer response.
#let answer-lines(n: 3) = {
  block(above: 0.5em, below: 0.5em, {
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
  block(above: 0.5em, below: 0.5em, {
    box(
      width: 100%,
      height: height,
      stroke: (paint: gray, dash: "dashed", thickness: 0.6pt),
    )
  })
}
