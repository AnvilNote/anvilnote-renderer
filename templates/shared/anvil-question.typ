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
// Both above/below set to 1em — NOT 0.5em+0.5em "summing" to 1em. Real
// bug, caught via a live PDF export the gap looked half of what was
// asked for: Typst's own block spacing works like CSS margin
// collapsing — two adjacent blocks' facing above/below values resolve
// to their MAX, not their sum. Confirmed directly (isolated
// #block(above:0.5em, below:0.5em) pairs compiled to a ~0.5em visible
// gap, not 1em). Setting both sides to the full 1em is what actually
// yields exactly 1em between consecutive items (max(1em, 1em) = 1em,
// not 2em) while still giving the right gap before the first item and
// after the last.
#let question-item(body, extra: none) = {
  q-num.step()
  block(above: 1em, below: 1em, {
    set par(first-line-indent: 0pt)
    grid(
      columns: (1.8em, 1fr),
      column-gutter: 1em,
      align: top,
      context [#q-num.display().],
      { body; extra },
    )
  })
}

// Choices grid: `columns` is REQUIRED now (no more `auto` + internal
// avg-width computation) - the caller (tiptap-to-typst.ts's
// "choiceList" case) already decided the column count using the ported
// choiceColumns() heuristic from choice-columns.ts, since a choice can
// now be an image or equation (not just text), and Typst content values
// (unlike strings) can't be measured for character width the way the
// old string-based version did. ..items are now CONTENT values ([...]),
// not string literals - each may itself contain bold/italic/inline-math
// markup or an embedded image. The empty-filter the old string-based
// version had is GONE - content values can't be trimmed/checked for
// emptiness the way strings could; the caller (tiptap-to-typst.ts) is
// responsible for not passing genuinely-empty choices in the first
// place.
#let choices(columns: 4, ..items) = {
  let labels = ("A", "B", "C", "D", "E", "F", "G", "H")
  let opts = items.pos()
  if opts.len() == 0 { return }

  let cells = ()
  for (i, item) in opts.enumerate() {
    cells.push(
      grid(
        columns: (1.8em, 1fr),
        column-gutter: 0.5em,
        align: top,
        [(#labels.at(i, default: str(i + 1)))],
        item,
      ),
    )
  }

  block(above: 1em, below: 0.5em, {
    if columns == 1 {
      grid(columns: (1fr,), row-gutter: 0.8em, ..cells)
    } else if columns == 2 {
      grid(columns: (1fr, 1fr), column-gutter: 1em, row-gutter: 0.8em, ..cells)
    } else {
      grid(columns: (1fr, 1fr, 1fr, 1fr), column-gutter: 0.5em, row-gutter: 0.8em, ..cells)
    }
  })
}

// Written-answer area, "lines" mode: n horizontal rules with vertical
// spacing between them, for a handwritten short-answer response.
#let answer-lines(n: 3) = {
  block(above: 1em, below: 0.5em, {
    for i in range(n) {
      v(1.2em)
      line(length: 100%, stroke: 0.6pt)
    }
  })
}

// Written-answer area, "blank" mode: reserved empty vertical space, NO
// border/frame at all — per explicit feedback (first changed from
// dashed to solid, then removed entirely). `height` already resolved to
// a literal length by the caller (tiptap-to-typst.ts reads the
// questionItem's own writtenHeightCm attr — already baked from a
// percentage client-side, see anvilnote-web's
// question-item-node-view.tsx — so this function does no percent-to-cm
// math of its own).
#let answer-blank(height: 4cm) = {
  block(above: 1em, below: 0.5em, v(height))
}

// A single image-type choice, embedded at its own natural size (no
// forced height/crop) — per explicit feedback reversing the earlier
// "uniform fixed height" decision: an image choice should render as-is,
// whatever its real dimensions are. `source` is an already-decoded
// image filename (tiptap-to-typst.ts's imageSink mechanism — same one
// renderImage() for body images already uses).
#let answer-choice-image(source) = {
  image(source)
}

// Inline cloze-blank reference: the number of the questionItem this
// blank points at, rendered as an underlined box — ported from
// /Users/anthonysung/tutoring/english/quiz/quiz-template.typ's qblank(n),
// with ONE change: inset scales with digit count (1.2em per side for a
// single-digit number, 1em once it reaches two digits/>= 10) instead of
// qblank's fixed 1em both sides, per explicit feedback. `n` is a STRING
// (tiptap-to-typst.ts passes the already-resolved question number as
// text, computed by anvilnote-web's cross-ref.ts resolver — this
// function does no numbering of its own).
#let question-blank(n) = {
  let inset-x = if n.len() >= 2 { 1em } else { 1.2em }
  box(
    stroke: (bottom: 0.6pt),
    inset: (x: inset-x, y: 0.1em),
    baseline: 20%,
    text(weight: "regular")[#n],
  )
}
