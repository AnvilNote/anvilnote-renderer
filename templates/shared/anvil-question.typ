// AnvilNote shared question block — numbered multiple-choice question
// body + auto-columned choices list. Ported from the reference personal
// template at /Users/anthonysung/tutoring/english/quiz/quiz-template.typ
// (its own q-num counter, question(), choices(), display-width()) — same
// 14/28 average-display-width thresholds so the PDF layout matches
// anvilnote-web's own src/lib/question-choices.ts heuristic (CJK code
// point >= U+2E80 counts as 2 display units, everything else as 1).
//
// One counter, shared by every template that imports this file (see
// anvilnote-renderer's build-entry.ts) — question numbers run
// continuously across the whole document, matching anvilnote-web's own
// live-counted numbering (question-node-view.tsx's useQuestionNumber).
#let q-num = counter("anvil-question")

// body: the question's content (paragraphs, same renderBlocks() path
// every other block content goes through — see tiptap-to-typst.ts's
// "question" case).
#let question(body) = {
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
// Empty strings (tiptap-to-typst.ts already filters these before calling,
// but this function stays defensive so it degrades gracefully if called
// directly) are skipped for both the average calculation and rendering.
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
