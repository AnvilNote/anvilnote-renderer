// src/core/build-entry.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildTypstEntry, type BuildTypstEntryInput, type ResolvedWatermark } from "./build-entry";

const baseFonts: BuildTypstEntryInput["fonts"] = {
  primaryLang: "zh",
  titleFace: "taiwan-pearl",
  bodyFace: "song",
  dateFace: "playfair",
  mathFace: "default",
};

function baseInput(watermark?: ResolvedWatermark): BuildTypstEntryInput {
  return {
    adapterRelPath: "../../template.typ",
    sharedFontsRelPath: "./anvil-fonts.typ",
    sharedCalloutsRelPath: "./anvil-callout.typ",
    sharedQuestionsRelPath: "./anvil-question.typ",
    sharedOverridesRelPath: "./anvil-overrides.typ",
    fonts: baseFonts,
    meta: {},
    options: {},
    body: "= Heading\n\nBody paragraph.",
    watermark,
  };
}

test("no watermark -> no background rule and no extra font import", () => {
  const out = buildTypstEntry(baseInput());
  assert.ok(!out.includes("set page(background:"));
  assert.ok(!out.includes("watermark-rounded-fonts"));
});

test("image watermark emits a page background with the pre-baked file, no alpha param", () => {
  const out = buildTypstEntry(
    baseInput({
      type: "image",
      imageFilename: "watermark-image.png",
      rotationDeg: -45,
      opacityPercent: 20,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(out.includes(`#set page(background: context {`));
  assert.ok(out.includes(`image("watermark-image.png", width: 12cm)`));
  assert.ok(out.includes(`rotate(-45deg,`));
  // Opacity is pre-baked into the PNG itself (see utils/watermark-image.ts) --
  // image() has no alpha parameter in Typst, so none should be emitted here.
  assert.ok(!out.includes("alpha"));
});

test("image watermark scales the baseline 12cm width by sizePercent", () => {
  const out50 = buildTypstEntry(
    baseInput({
      type: "image",
      imageFilename: "watermark-image.png",
      sizePercent: 50,
      rotationDeg: 0,
      opacityPercent: 20,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(out50.includes(`width: 6cm)`));

  const out200 = buildTypstEntry(
    baseInput({
      type: "image",
      imageFilename: "watermark-image.png",
      sizePercent: 200,
      rotationDeg: 0,
      opacityPercent: 20,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(out200.includes(`width: 24cm)`));

  // Undefined (older callers / defaults) falls back to the 100% baseline.
  const outDefault = buildTypstEntry(
    baseInput({
      type: "image",
      imageFilename: "watermark-image.png",
      rotationDeg: 0,
      opacityPercent: 20,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(outDefault.includes(`width: 12cm)`));
});

test("text watermark scales the baseline 64pt size by sizePercent", () => {
  const out50 = buildTypstEntry(
    baseInput({
      type: "text",
      text: "x",
      sizePercent: 50,
      rotationDeg: 0,
      opacityPercent: 20,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(out50.includes(`size: 32pt`));

  const out200 = buildTypstEntry(
    baseInput({
      type: "text",
      text: "x",
      sizePercent: 200,
      rotationDeg: 0,
      opacityPercent: 20,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(out200.includes(`size: 128pt`));

  // Undefined (older callers / defaults) falls back to the 100% baseline.
  const outDefault = buildTypstEntry(
    baseInput({
      type: "text",
      text: "x",
      rotationDeg: 0,
      opacityPercent: 20,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(outDefault.includes(`size: 64pt`));
});

test("applyToFirstPage: true guards with a literal `true`, not a page-number check", () => {
  const out = buildTypstEntry(
    baseInput({
      type: "image",
      imageFilename: "watermark-image.png",
      rotationDeg: 0,
      opacityPercent: 15,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(out.includes("if true {"));
  assert.ok(!out.includes("counter(page)"));
});

test("applyToFirstPage: false guards on the page-1 counter check", () => {
  const out = buildTypstEntry(
    baseInput({
      type: "image",
      imageFilename: "watermark-image.png",
      rotationDeg: 0,
      opacityPercent: 15,
      applyToFirstPage: false,
      fontFamily: "sans",
    }),
  );
  assert.ok(out.includes("if counter(page).get().first() != 1 {"));
});

test("the watermark rule is emitted before #show: anvil-template.with(...) so it also covers a template's own generated cover/TOC page", () => {
  const out = buildTypstEntry(
    baseInput({
      type: "image",
      imageFilename: "watermark-image.png",
      rotationDeg: 0,
      opacityPercent: 15,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  const backgroundIndex = out.indexOf("set page(background:");
  const showTemplateIndex = out.indexOf("#show: anvil-template.with(");
  assert.ok(backgroundIndex >= 0 && showTemplateIndex >= 0);
  assert.ok(backgroundIndex < showTemplateIndex);
});

test("text watermark measures its own width before boxing it, to avoid wrapping inside page background", () => {
  const out = buildTypstEntry(
    baseInput({
      type: "text",
      text: "Confidential",
      rotationDeg: -30,
      opacityPercent: 25,
      applyToFirstPage: true,
      fontFamily: "serif",
    }),
  );
  assert.ok(out.includes("let watermark-text = text(font: body-fonts"));
  assert.ok(out.includes("let watermark-size = measure(watermark-text)"));
  assert.ok(out.includes("box(width: watermark-size.width, watermark-text)"));
  assert.ok(out.includes("[Confidential]"));
});

test("text watermark opacity converts percent to a 0-255 rgb() alpha channel", () => {
  const out = buildTypstEntry(
    baseInput({
      type: "text",
      text: "AnvilNote",
      rotationDeg: 0,
      opacityPercent: 50,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  // round(50 / 100 * 255) = 128
  assert.ok(out.includes("rgb(0, 0, 0, 128)"));
});

test("text watermark font family maps to the matching anvil-fonts.typ stack identifier", () => {
  const stacks: Array<[ResolvedWatermark["fontFamily"], string]> = [
    ["serif", "body-fonts"],
    ["sans", "title-fonts"],
    ["rounded", "watermark-rounded-fonts"],
  ];
  for (const [fontFamily, ident] of stacks) {
    const out = buildTypstEntry(
      baseInput({
        type: "text",
        text: "x",
        rotationDeg: 0,
        opacityPercent: 15,
        applyToFirstPage: true,
        fontFamily,
      }),
    );
    assert.ok(out.includes(`text(font: ${ident}`), `expected ${ident} for ${fontFamily}`);
  }
});

test("watermark text is escaped so markup-special characters can't break the Typst content block", () => {
  const out = buildTypstEntry(
    baseInput({
      type: "text",
      text: "50% Off #1 [DRAFT]",
      rotationDeg: 0,
      opacityPercent: 15,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(out.includes("\\#1"));
  assert.ok(!out.includes("[#1"));
});

test("watermark import line only pulls in the extra font stacks when a watermark is present", () => {
  const withWatermark = buildTypstEntry(
    baseInput({
      type: "text",
      text: "x",
      rotationDeg: 0,
      opacityPercent: 15,
      applyToFirstPage: true,
      fontFamily: "sans",
    }),
  );
  assert.ok(withWatermark.includes("body-fonts, title-fonts, watermark-rounded-fonts"));

  const withoutWatermark = buildTypstEntry(baseInput());
  assert.ok(!withoutWatermark.includes("body-fonts, title-fonts, watermark-rounded-fonts"));
});
