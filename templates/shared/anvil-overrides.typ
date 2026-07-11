// Document-level overrides (numbered headings, page margins) that apply
// uniformly across every third-party @preview-wrapped template, without
// needing to know or thread through each package's own function signature.
//
// Usage (build-entry.ts, right after `#show: anvil-template.with(...)`,
// so this nests INSIDE it and wins — same "later show rule nests deeper
// and overrides an earlier one" ordering apply-anvil-fonts already relies
// on):
//   #show: apply-anvil-overrides.with(numbered-headings: true, margin-top: 2cm, ...)
//
// Margins: only the sides actually passed a length OVERRIDE that side;
// the rest are left completely untouched (not reset to Typst's own
// default) — confirmed via an isolated compile that Typst's
// `set page(margin: (top: X))` with a PARTIAL dict merges onto whatever
// margin state a prior `set page` call (here, the wrapped package's own)
// already established, rather than replacing all four sides. This is
// what lets a single top-only override coexist with a package's own
// asymmetric default margins instead of clobbering them.
//
// Heading numbering: a plain "1.1" style, applied via Typst's OWN
// built-in `set heading(numbering:)` — unlike plain-note (which has its
// own bespoke TOC entry renderer with 3 separate call sites gated on a
// numbered-headings flag, deliberately left on its own native mechanism
// instead of this shared one), none of the OTHER 17 templates have any
// custom TOC/heading-numbering logic of their own today, so this blanket
// override is their ENTIRE numbered-headings behavior, not a partial one
// layered on top of something template-specific.
//
// NOT used by plain-note — plain-note's numbered-headings support
// predates this file and has its own working, independently-verified
// mechanism (upstream.typ's own numbered-headings param, threaded through
// 3 call sites including its custom TOC renderer); reusing THIS blanket
// override there instead would only reach the built-in heading numbering,
// not plain-note's own TOC entry prefixes, silently producing an
// inconsistent PDF (numbered headings in the body, unnumbered TOC).
#let apply-anvil-overrides(
  body,
  numbered-headings: true,
  margin-top: none,
  margin-bottom: none,
  margin-left: none,
  margin-right: none,
) = {
  let margin-overrides = (:)
  if margin-top != none { margin-overrides.insert("top", margin-top) }
  if margin-bottom != none { margin-overrides.insert("bottom", margin-bottom) }
  if margin-left != none { margin-overrides.insert("left", margin-left) }
  if margin-right != none { margin-overrides.insert("right", margin-right) }
  if margin-overrides.len() > 0 {
    set page(margin: margin-overrides)
  }

  set heading(numbering: if numbered-headings { "1.1" } else { none })

  body
}
