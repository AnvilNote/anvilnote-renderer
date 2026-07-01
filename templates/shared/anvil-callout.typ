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
// Square corners by design, matching the web editor's callout box.
#let callout(body, kind: "note", title: none) = {
  let style = _callout-palette.at(kind, default: _callout-palette.note)
  let accent = rgb(style.accent)
  let background = rgb(style.background)

  block(
    width: 100%,
    fill: background,
    stroke: (left: 2pt + accent),
    inset: (left: 12pt, right: 12pt, top: 6pt, bottom: 10pt),
    breakable: true,
    above: 1em,
    below: 1em,
  )[
    #if title != none and title != [] {
      block(below: 0.5em)[
        #set text(font: title-fonts, weight: "bold", fill: accent)
        #title
      ]
    }
    #body
  ]
}
