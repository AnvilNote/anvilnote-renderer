import assert from "node:assert/strict";
import test from "node:test";
import { tiptapToTypst } from "./tiptap-to-typst";

const paragraph = (text: string) => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});

test("renders merged cells and supported cell attributes", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: {
                    colspan: 2,
                    rowspan: 1,
                    align: "center",
                    fill: "#eeeeee",
                    stroke: "#111111",
                    inset: "8pt",
                    breakable: false,
                    customAttribute: "must-not-export",
                  },
                  content: [paragraph("Merged")],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [paragraph("A")] },
                { type: "tableCell", content: [paragraph("B")] },
              ],
            },
          ],
        },
      ],
    },
  ]);

  assert.match(body, /columns: \(1fr, 1fr\)/);
  assert.match(
    body,
    /table\.cell\(colspan: 2, align: center \+ horizon, fill: rgb\("#eeeeee"\), stroke: rgb\("#111111"\), inset: 8pt, breakable: false\)\[Merged\]/,
  );
  assert.doesNotMatch(body, /customAttribute|must-not-export/);
});

test("renders manual column proportions and row heights", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              attrs: { rowHeight: 40 },
              content: [
                { type: "tableCell", attrs: { colwidth: [120] }, content: [paragraph("A")] },
                { type: "tableCell", attrs: { colwidth: [80] }, content: [paragraph("B")] },
              ],
            },
            {
              type: "tableRow",
              attrs: { rowHeight: 60 },
              content: [
                { type: "tableCell", attrs: { colwidth: [120] }, content: [paragraph("C")] },
                { type: "tableCell", attrs: { colwidth: [80] }, content: [paragraph("D")] },
              ],
            },
          ],
        },
      ],
    },
  ]);

  assert.match(body, /columns: \(120fr, 80fr\)/);
  assert.match(body, /rows: \(30pt, 45pt\)/);
});

test("keeps styled header cells inside table.header", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  attrs: { fill: "#abcdef" },
                  content: [paragraph("Heading")],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  assert.match(
    body,
    // align: horizon is the unconditional vertical-center default every
    // cell now gets (see cellAlignment).
    /table\.header\(table\.cell\(align: horizon, fill: rgb\("#abcdef"\)\)\[#text\(font: _stacks\.heading, weight: "bold"\)\[Heading\]\]\)/,
  );
  assert.match(body, /columns: \(1fr,\)/);
});

test("uses Word-like table inset and keeps empty cells at an automatic minimum height", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [paragraph("")] },
                { type: "tableCell", content: [paragraph("")] },
              ],
            },
          ],
        },
      ],
    },
  ]);

  assert.match(body, /inset: \(x: 0\.19cm, y: 0\.05cm\)/);
  assert.equal(body.match(/#box\(height: 0\.45cm\)\[\]/g)?.length, 2);
  assert.doesNotMatch(body, /rows:/);
});

test("preserves partial manual widths and maps widths around rowspans", () => {
  const { body } = tiptapToTypst([
    {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: { rowspan: 2, colwidth: [100] },
                  content: [paragraph("A")],
                },
                { type: "tableCell", content: [paragraph("B")] },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: { colwidth: [80] },
                  content: [paragraph("C")],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  assert.match(body, /columns: \(100fr, 80fr\)/);
});
