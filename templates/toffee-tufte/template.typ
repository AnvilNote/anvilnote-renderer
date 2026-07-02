#import "@preview/toffee-tufte:0.1.1": template, sidenote

#let _s(v) = if v == none { none } else { v }

#let anvil-template(meta: (:), options: (:), fonts: (:), body) = {
  show: template.with(
    title: _s(meta.at("title", default: "Untitled")),
    authors: _s(meta.at("author", default: none)),
    date: _s(meta.at("date", default: none)),
    toc: options.at("toc", default: false),
    // "full" is toffee-tufte's own full-width mode, where sidenotes render
    // as regular footnotes instead of margin notes (per the package's own
    // docs) — exposed as-is rather than reimplemented, since the renderer
    // always emits #sidenote[...] for this template regardless (see
    // manifest.json's footnoteStyle) and the package handles the fallback.
    full: options.at("fullWidth", default: false),
    header: options.at("header", default: true),
    footer: options.at("footer", default: true),
  )
  body
}
