// src/utils/watermark-image.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { applyWatermarkOpacity, decodeDataUrl } from "./watermark-image";

async function solidPng(alpha = 1): Promise<Buffer> {
  return sharp({
    create: { width: 10, height: 10, channels: 4, background: { r: 10, g: 20, b: 30, alpha } },
  })
    .png()
    .toBuffer();
}

test("decodeDataUrl strips the data: prefix before base64-decoding", () => {
  const original = Buffer.from("hello watermark");
  const dataUrl = `data:image/png;base64,${original.toString("base64")}`;
  assert.deepEqual(decodeDataUrl(dataUrl), original);
});

test("applyWatermarkOpacity scales a fully-opaque image's alpha channel to match opacityPercent", async () => {
  const input = await solidPng(1);
  const output = await applyWatermarkOpacity(input, 40);
  const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  const alphaSample = data[3];
  // 40% of 255 ~= 102; sharp's background alpha -> 8bit conversion can be off
  // by a rounding step, so assert a tolerance band instead of an exact byte.
  assert.ok(Math.abs(alphaSample - 102) <= 2, `expected alpha ~102, got ${alphaSample}`);
});

test("applyWatermarkOpacity multiplies (not overwrites) an already-transparent image's alpha", async () => {
  // Half-transparent source (alpha 0.5) at 50% requested opacity should end
  // up around 25% (0.5 * 0.5), confirming dest-in multiplies rather than
  // clobbers the source's own per-pixel alpha.
  const input = await solidPng(0.5);
  const output = await applyWatermarkOpacity(input, 50);
  const { data } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaSample = data[3];
  const expected = 0.25 * 255;
  assert.ok(Math.abs(alphaSample - expected) <= 4, `expected alpha ~${expected}, got ${alphaSample}`);
});

test("applyWatermarkOpacity clamps out-of-range percentages", async () => {
  const input = await solidPng(1);
  const over = await applyWatermarkOpacity(input, 150);
  const { data: overData } = await sharp(over).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.ok(overData[3] >= 253);

  const under = await applyWatermarkOpacity(input, -10);
  const { data: underData } = await sharp(under).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(underData[3], 0);
});
