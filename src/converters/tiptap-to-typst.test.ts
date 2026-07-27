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
