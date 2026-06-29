// AnvilNote font bundle smoke test.
//
// Compile from the renderer root so /-rooted imports and the font bundle
// resolve, ignoring every system font:
//
//   typst compile samples/font-test.typ samples/font-test-output.pdf \
//     --root . --font-path ./fonts --ignore-system-fonts
//
// Flip the math face by setting `mathMode` below to "garamond".

#import "/templates/shared/anvil-fonts.typ": (
  apply-anvil-fonts, anvil-font-stacks, title-text, meta-text, heading-text,
)

// Tweak these to preview different choices (primary-lang / faces / math).
#let _stacks = anvil-font-stacks(
  primary-lang: "zh",
  title-face: "taiwan-pearl",
  body-face: "song",
  date-face: "playfair",
  math-face: "default",
)

#set page(paper: "a4", margin: 2cm)
#show: apply-anvil-fonts.with(stacks: _stacks)

#title-text[
  #align(center)[#text(size: 24pt, weight: "bold")[字體測試 Font Test]]
]

#align(center)[
  #meta-text[#text(size: 11pt)[作者 Author · 2026-06-29]]
]

#v(1em)

= Heading 一 · Section 1234567890

== Heading 二 · 子標題

繁體中文內文測試。教育部標準宋體為主，缺字時退回 Noto Serif CJK。
English / Français / Español / Deutsch / Português body text in serif.
日本語の本文。한국어 본문입니다。ภาษาไทยข้อความตัวอย่าง。
數字 1234567890.

程式碼 `inline code` 與區塊：

```python
def greet(name: str) -> str:
    return f"你好, {name}!"  # JetBrains Mono
```

Inline math: $a^2 + b^2 = c^2$ and $integral_0^1 x^2 dif x = 1/3$.

Display math:
$ sum_(k=1)^n k = (n (n+1)) / 2 $
$ e^(i pi) + 1 = 0 $
