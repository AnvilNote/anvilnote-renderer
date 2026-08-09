// src/utils/watermark-image.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { PNG } from "pngjs";
import { applyWatermarkOpacity, decodeDataUrl } from "./watermark-image";

function solidPng(alpha255 = 255): Buffer {
  const png = new PNG({ width: 10, height: 10 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 10;
    png.data[i + 1] = 20;
    png.data[i + 2] = 30;
    png.data[i + 3] = alpha255;
  }
  return PNG.sync.write(png);
}

function readAlpha(buffer: Buffer, pixelIndex = 0): number {
  const png = PNG.sync.read(buffer);
  return png.data[pixelIndex * 4 + 3];
}

test("decodeDataUrl strips the data: prefix before base64-decoding", () => {
  const original = Buffer.from("hello watermark");
  const dataUrl = `data:image/png;base64,${original.toString("base64")}`;
  assert.deepEqual(decodeDataUrl(dataUrl), original);
});

test("applyWatermarkOpacity scales a fully-opaque image's alpha channel to match opacityPercent", () => {
  const input = solidPng(255);
  const output = applyWatermarkOpacity(input, 40);
  // 40% of 255 = 102 (rounded).
  assert.equal(readAlpha(output), 102);
});

test("applyWatermarkOpacity multiplies (not overwrites) an already-transparent image's alpha", () => {
  // Half-transparent source (alpha 128/255) at 50% requested opacity should
  // end up around a quarter, confirming it multiplies rather than clobbers
  // the source's own per-pixel alpha.
  const input = solidPng(128);
  const output = applyWatermarkOpacity(input, 50);
  assert.equal(readAlpha(output), 64);
});

test("applyWatermarkOpacity clamps out-of-range percentages", () => {
  const input = solidPng(255);
  assert.equal(readAlpha(applyWatermarkOpacity(input, 150)), 255);
  assert.equal(readAlpha(applyWatermarkOpacity(input, -10)), 0);
});
