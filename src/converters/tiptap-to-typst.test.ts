// src/converters/tiptap-to-typst.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { tiptapToTypst } from "./tiptap-to-typst";

type TestNode = {
  type: string;
  content?: TestNode[];
  text?: string;
};

function nestedList(type: "orderedList" | "bulletList", labels: string[]): TestNode {
  const [label, ...rest] = labels;
  return {
    type,
    content: [
      {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: label }],
          },
          ...(rest.length > 0 ? [nestedList(type, rest)] : []),
        ],
      },
    ],
  };
}

test("functionPlot node embeds its cached base64 PDF via image()", () => {
  const images: { filename: string; base64: string }[] = [];
  const { body } = tiptapToTypst(
    [
      {
        type: "doc",
        content: [
          { type: "functionPlot", attrs: { pdf: "JVBERi0xLjQK" } },
        ],
      },
    ],
    { images },
  );

  assert.equal(images.length, 1);
  assert.equal(images[0].base64, "JVBERi0xLjQK");
  assert.match(images[0].filename, /\.pdf$/);
  assert.match(body, /#figure\(image\("image-0\.pdf"\)\)/);
});

test("functionPlot node with no cached pdf renders nothing", () => {
  const { body } = tiptapToTypst(
    [{ type: "doc", content: [{ type: "functionPlot", attrs: {} }] }],
    { images: [] },
  );
  assert.equal(body.trim(), "");
});

test("chart node embeds its cached base64 PNG via image()", () => {
  // Real bug, caught via a live PDF preview: this case didn't exist at all
  // until anvilnote-web's stats-chart -> chart rewrite (23 types, Python/
  // plotly render service) — the renderer's switch still only matched the
  // OLD "statsChart" node type, so a chart inserted via the new editor
  // silently vanished from every PDF/print preview while still showing
  // fine in the live browser editor (which renders via its own cached
  // plotly.js JSON, a completely separate code path from this file).
  const images: { filename: string; base64: string }[] = [];
  const { body } = tiptapToTypst(
    [
      {
        type: "doc",
        content: [
          {
            type: "chart",
            attrs: { chartType: "bar", staticImage: "data:image/png;base64,aGVsbG8=", caption: "" },
          },
        ],
      },
    ],
    { images },
  );

  assert.equal(images.length, 1);
  assert.equal(images[0].base64, "aGVsbG8=");
  assert.match(images[0].filename, /\.png$/);
  assert.match(body, /#figure\(image\("image-0\.png"\)\)/);
});

test("chart node with no cached static image renders nothing", () => {
  const { body } = tiptapToTypst(
    [{ type: "doc", content: [{ type: "chart", attrs: { chartType: "bar" } }] }],
    { images: [] },
  );
  assert.equal(body.trim(), "");
});

test("chart node's own caption becomes the figure's caption, same as a plain image", () => {
  const { body } = tiptapToTypst(
    [
      {
        type: "doc",
        content: [
          {
            type: "chart",
            attrs: {
              chartType: "bar",
              staticImage: "data:image/png;base64,aGVsbG8=",
              caption: "Example chart",
            },
          },
        ],
      },
    ],
    { images: [] },
  );
  assert.match(body, /caption: \[Example chart\]/);
});

test("paragraph indentation is preserved in Typst output", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { indent: 2 },
          content: [{ type: "text", text: "Indented paragraph" }],
        },
      ],
    },
  ]);

  assert.equal(body.trim(), "#block(inset: (left: 4em))[Indented paragraph]");
});

test("centered/right-aligned paragraphs wrap in #align; explicit left does not", () => {
  const paragraph = (textAlign: string, text: string) => ({
    type: "paragraph",
    attrs: { textAlign },
    content: [{ type: "text", text }],
  });

  const { body: centered } = tiptapToTypst([
    { type: "doc", content: [paragraph("center", "Centered")] },
  ]);
  assert.equal(centered.trim(), "#align(center)[Centered]");

  const { body: right } = tiptapToTypst([
    { type: "doc", content: [paragraph("right", "Right")] },
  ]);
  assert.equal(right.trim(), "#align(right)[Right]");

  const { body: left } = tiptapToTypst([
    { type: "doc", content: [paragraph("left", "Left")] },
  ]);
  assert.equal(left.trim(), "Left");
});

test("a centered AND indented paragraph nests #align outside #block", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { indent: 1, textAlign: "center" },
          content: [{ type: "text", text: "Both" }],
        },
      ],
    },
  ]);

  assert.equal(body.trim(), "#align(center)[#block(inset: (left: 2em))[Both]]");
});

test("ordered list markers follow the configured nesting hierarchy", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        nestedList("orderedList", [
          "Level 1",
          "Level 2",
          "Level 3",
          "Level 4",
          "Level 5",
        ]),
      ],
    },
  ]);

  assert.match(body, /#enum\(\s*numbering: "1\."/);
  assert.match(body, /#enum\(\s*numbering: "\(1\)"/);
  // Level 3 (circled numbers) is a generated Typst numbering FUNCTION, not
  // a plain "①" pattern string — Typst's own numbering() only recognizes
  // 1/a/A/i/I as counting kinds, so a literal "①" pattern would be constant
  // text, never incrementing to ②③④... (a real bug this replaces; see
  // list-markers.ts's own comment).
  assert.match(body, /#enum\(\s*numbering: \(n\) => \{ let syms = \("①", "②"/);
  assert.match(body, /#enum\(\s*numbering: "a\."/);
  // Level 5's default module changed from parenthesized-alpha to roman
  // numerals when the marker catalog became user-configurable (Settings >
  // List markers) — see anvilnote-web's settings-store.ts DEFAULT_ORDERED_LIST_LEVELS.
  assert.match(body, /#enum\(\s*numbering: "i\."/);
});

test("a list item with multiple paragraphs renders each as its own Typst paragraph", () => {
  // Regression: joining a listItem's block children with a single "\n"
  // produced ONE Typst paragraph (Typst only breaks paragraphs on a BLANK
  // line) — "Parent"/"ChildXYZ" ran together as "Parent ChildXYZ" in the
  // rendered PDF instead of showing ChildXYZ as an indented continuation
  // line. This is the shape a demoted list item (anvilnote-web's
  // list-item-demote.ts) produces: a listItem whose content is two
  // paragraphs, no nested list in between.
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Parent" }] },
                { type: "paragraph", content: [{ type: "text", text: "ChildXYZ" }] },
              ],
            },
          ],
        },
      ],
    },
  ]);

  assert.match(body, /Parent\n\s*\n\s*ChildXYZ/);
  // Regression: templates commonly set a document-wide paragraph
  // first-line-indent (e.g. plain-note/upstream.typ's `all: false` — every
  // paragraph but a container's first gets an extra indent). Without
  // resetting it inside the item body, "ChildXYZ" — the item's SECOND
  // paragraph — picked up that indent on top of the list's own hanging
  // indent, landing visibly further right than "Parent" in the PDF.
  assert.match(body, /\[\s*#set par\(first-line-indent: 0pt\)/);
});

test("bullet list markers follow the configured nesting hierarchy", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        nestedList("bulletList", ["Level 1", "Level 2", "Level 3", "Level 4"]),
      ],
    },
  ]);

  assert.match(body, /#list\(\s*marker: \[•\]/);
  assert.match(body, /#list\(\s*marker: \[◦\]/);
  assert.match(body, /#list\(\s*marker: \[▪\]/);
  assert.match(body, /#list\(\s*marker: \[–\]/);
});

test("mixed nested lists restart their marker hierarchy", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Ordered parent" }],
                },
                nestedList("bulletList", ["Bullet child"]),
              ],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Bullet parent" }],
                },
                nestedList("orderedList", ["Ordered child"]),
              ],
            },
          ],
        },
      ],
    },
  ]);

  assert.doesNotMatch(body, /#list\(\s*marker: \[◦\]/);
  assert.doesNotMatch(body, /#enum\(\s*numbering: "\(1\)"/);
  assert.match(body, /#list\(\s*marker: \[•\]/);
  assert.match(body, /#enum\(\s*numbering: "1\."/);
});

test("pageBreak renders a forced Typst page break", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [{ type: "pageBreak", attrs: { weak: false } }],
    },
  ]);

  assert.equal(body.trim(), "#pagebreak()");
});

test("weak pageBreak renders a weak Typst page break", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [{ type: "pageBreak", attrs: { weak: true } }],
    },
  ]);

  assert.equal(body.trim(), "#pagebreak(weak: true)");
});

test("a blockquote with no custom color renders a bare #quote, no border block", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Quoted" }] }],
        },
      ],
    },
  ]);

  assert.match(body, /^#quote\(block: true\)\[.*Quoted.*\]$/m);
  assert.doesNotMatch(body, /#block\(stroke:/);
});

test("a blockquote with a custom color wraps #quote in a colored left-border #block", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "blockquote",
          attrs: { color: "#3b82f6" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Quoted" }] }],
        },
      ],
    },
  ]);

  assert.match(
    body,
    /^#block\(stroke: \(left: 3pt \+ rgb\("#3b82f6"\)\), inset: \(left: 1em, top: 0\.3em, bottom: 0\.3em\)\)\[#quote\(block: true\)\[.*Quoted.*\]\]$/m,
  );
});

test("a preset-kind callout passes neither accent: nor background: (unless customBackground is set)", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { kind: "warning", title: "Heads up" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Careful" }] }],
        },
      ],
    },
  ]);

  assert.match(body, /^#callout\(kind: "warning", title: \[Heads up\]\)\[.*Careful.*\]$/m);
});

test("a custom-kind callout passes both accent: and a computed background:", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { kind: "custom", customAccent: "#3b82f6", title: "Note" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Custom" }] }],
        },
      ],
    },
  ]);

  assert.match(body, /kind: "custom"/);
  assert.match(body, /background: "#[0-9a-fA-F]{6}"/);
  assert.match(body, /accent: "#3b82f6"/);
});

test("a custom-kind callout's own customBackground still overrides the computed one", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: {
            kind: "custom",
            customAccent: "#3b82f6",
            customBackground: "#fefefe",
            title: "Note",
          },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Custom" }] }],
        },
      ],
    },
  ]);

  assert.match(body, /background: "#fefefe"/);
  assert.match(body, /accent: "#3b82f6"/);
});

test("a custom-kind callout with a dark background gets an explicit content-color, no title-color (accent still legible)", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "callout",
          // A saturated, moderately dark blue accent -- its own computed
          // background (S 50% L 92%) is still light regardless (the
          // formula's own fixed lightness, not derived from the accent's),
          // so force a dark background via customBackground instead, same
          // shape as the real reported bug.
          attrs: { kind: "custom", customAccent: "#3b82f6", customBackground: "#191e2e" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Custom" }] }],
        },
      ],
    },
  ]);

  assert.match(body, /content-color: "#FFFFFF"/);
  assert.doesNotMatch(body, /title-color:/);
});

test("a near-identical custom accent/background pairing gets both title-color and content-color", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { kind: "custom", customAccent: "#1a1e2c", customBackground: "#191e2e" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Custom" }] }],
        },
      ],
    },
  ]);

  assert.match(body, /title-color: "#FFFFFF"/);
  assert.match(body, /content-color: "#FFFFFF"/);
});

test("a preset kind with a dark customBackground override also gets a content-color fix", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { kind: "note", customBackground: "#191e2e" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Dark note" }] }],
        },
      ],
    },
  ]);

  assert.match(body, /content-color: "#FFFFFF"/);
});
