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
  assert.match(body, /#enum\(\s*numbering: "①"/);
  assert.match(body, /#enum\(\s*numbering: "a\."/);
  assert.match(body, /#enum\(\s*numbering: "\(a\)"/);
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
