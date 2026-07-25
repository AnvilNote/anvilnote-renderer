// src/converters/tiptap-to-typst.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { tiptapToTypst } from "./tiptap-to-typst";

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
