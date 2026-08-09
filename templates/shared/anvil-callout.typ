// AnvilNote shared callout (admonition) box.
//
// One function used by every template — templates own layout only, callouts
// look identical everywhere. Keep this palette in sync with
// anvilnote-web's src/config/callouts.ts and anvilnote-renderer's
// src/config/callouts.ts (the TS mirrors used by the editor and converter).
//
// No per-kind icon by design: the box is distinguished by its accent color,
// tinted background, and title text alone.
#import "./anvil-fonts.typ": title-fonts

// Proof block's own fixed font stack — deliberately NOT title-fonts: that
// list puts TaiwanPearl before 思源黑體 TW, so a CJK document would render
// with TaiwanPearl (Typst picks the first font in the list that covers a
// given character, not "prefer Source Han"). Proof's header/body are meant
// to always read as Source Han Sans for CJK regardless of the document's
// own title-face choice — see anvilnote-web's proof.ts doc comment for why.
#let _proof-fonts = (
  "Roboto",
  "思源黑體 TW",
  "Noto Sans",
  "Noto Sans JP",
  "Noto Sans KR",
  "Noto Sans Thai",
)

#let _callout-palette = (
  note: (accent: "#448AFF", background: "#E5ECF8"),
  abstract: (accent: "#00B0FF", background: "#DEF0F8"),
  info: (accent: "#00B8D4", background: "#DEF1F4"),
  tip: (accent: "#00BFA5", background: "#DEF1EF"),
  success: (accent: "#01C853", background: "#DEF2E6"),
  question: (accent: "#64DD17", background: "#E8F5E0"),
  warning: (accent: "#FF9100", background: "#F8EDDE"),
  failure: (accent: "#FF5252", background: "#F8E6E6"),
  danger: (accent: "#FF1744", background: "#F8E0E5"),
  bug: (accent: "#F50057", background: "#F7DEE7"),
  example: (accent: "#7C4DFF", background: "#EBE6F8"),
  quote: (accent: "#9E9E9E", background: "#EEEEEE"),
)

// body: the callout's content (paragraphs). kind: one of the palette keys
// above (falls back to "note" if unrecognized). title: content shown in bold,
// title-fonts (CJK -> 黑體/思源黑體/等 sans stack, other scripts -> Noto Sans /
// Roboto), colored with the kind's accent; omitted entirely when `none` or "".
// background: per-instance override of the kind's own preset fill (the web
// editor's own custom-background color picker — see callout-node-view.tsx).
// accent: only ever passed for kind: "custom" (no entry in
// _callout-palette above, so the at()-lookup below would otherwise silently
// fall back to note's blue) — every other kind still gets its accent from
// the palette regardless.
// title-color/content-color: contrast-fix overrides computed in
// tiptap-to-typst.ts (same functions/thresholds as anvilnote-web's
// CalloutNodeView — see config/callouts.ts's own comments), for when a
// custom accent/background pairing is bad enough that title/body text would
// otherwise be unreadable. Both none (the overwhelming common case, every
// one of the 12 presets included) leaves this exactly as it was: title in
// the plain accent, body in the document's own default text color.
// Square corners by design, matching the web editor's callout box.
#let callout(
  body,
  kind: "note",
  title: none,
  background: none,
  accent: none,
  title-color: none,
  content-color: none,
) = {
  let style = _callout-palette.at(kind, default: _callout-palette.note)
  let accent = if accent != none { rgb(accent) } else { rgb(style.accent) }
  let background = if background != none { rgb(background) } else { rgb(style.background) }
  let title-fill = if title-color != none { rgb(title-color) } else { accent }

  block(
    width: 100%,
    fill: background,
    stroke: (left: 2pt + accent),
    inset: (left: 12pt, right: 12pt, top: 6pt, bottom: 10pt),
    breakable: true,
    above: 1.8em,
    below: 1.8em,
  )[
    #if title != none and title != [] {
      // sticky: false — Typst's block() defaults sticky to true, which
      // glues this title to whatever comes right after it as a single
      // unbreakable unit for pagination purposes. That's exactly what a
      // heading wants (never end a page on a lone heading), but here it
      // meant: when the callout's body contained a long block equation
      // that didn't fit in the page's remaining space, Typst pushed the
      // WHOLE glued unit — title AND the body content before that
      // equation — to the next page, while this outer breakable block's
      // fragment on the current page still got laid out and painted its
      // background across the remaining space, empty. Confirmed via a
      // side-by-side Typst compile: identical setup, only this sticky
      // value changed, same empty-background-then-content-on-next-page
      // reproduced with sticky left at its default and gone once false.
      block(below: 0.9em, sticky: false)[
        #set text(font: title-fonts, weight: "bold", fill: title-fill)
        #title
      ]
    }
    #if content-color != none {
      set text(fill: rgb(content-color))
      body
    } else {
      body
    }
  ]
}

// Proof block: no border in the PDF (unlike the web editor's own bordered
// box — see proof-node-view.tsx's CSS — the editor needs a visible boundary
// to mark an otherwise-plain block in a busy UI; a printed page doesn't) —
// just a fixed sans-serif label (localized "證明"/"Proof"/etc., resolved by
// the caller per the document's own primaryLang — see cross-ref-labels.ts's
// own per-language pattern for why that's resolved outside Typst, not in
// here) and a solid black QED square pinned bottom-right. The square is
// drawn with #box+fill, not a Unicode glyph (■) — sidesteps relying on
// every bundled font actually having that codepoint.
//
// _proof-fonts applies to the label only, not body: the editor's own proof
// block shows both header and body in the fixed sans stack, but in the
// exported PDF only the "證"/"Proof" label needs that distinct look — the
// body reads as normal document body text (whatever font the template/
// document already uses), not a second font switch mid-proof.
//
// The label runs directly into the body's own first line — no #block
// around it, unlike callout's own title (which stays on its own line) —
// per explicit feedback: the web editor keeps the header/body split
// (proof-node-view.tsx is unchanged), only the Typst/PDF output should read
// "證設 x 為任意實數..." as one continuous line instead of two.
#let proof(body, label: "證") = {
  block(
    width: 100%,
    breakable: true,
    above: 1em,
    below: 1em,
  )[
    #text(font: _proof-fonts, weight: 600)[#label]#body
    #align(right)[#box(width: 0.6em, height: 0.6em, fill: black)]
  ]
}
