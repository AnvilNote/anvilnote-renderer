import sharp from "sharp";

// Typst's image() has no opacity/alpha parameter (confirmed empirically
// against 0.14.2: `alpha: 40%` errors "unexpected argument: alpha", and no
// top-level `opacity()` wrapper exists either). The only way to get a
// translucent raster into the PDF is to bake the opacity into the image's
// OWN alpha channel before handing it to Typst. `dest-in` multiplies the
// source image's existing per-pixel alpha by the mask's alpha, so a
// non-transparent PNG (most uploads) still ends up uniformly translucent
// and an already-transparent PNG (the default AnvilNote icon) keeps its
// shape mask instead of being flattened to a solid rectangle.
export async function applyWatermarkOpacity(
  input: Buffer,
  opacityPercent: number,
): Promise<Buffer> {
  const clamped = Math.max(0, Math.min(100, opacityPercent));
  const source = sharp(input).ensureAlpha();
  const { width, height } = await source.metadata();
  if (!width || !height) {
    throw new Error("watermark image: could not read dimensions");
  }
  const mask = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: clamped / 100 },
    },
  })
    .png()
    .toBuffer();
  return source.composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

// Data URLs from the web crop dialog look like "data:image/png;base64,...."
export function decodeDataUrl(dataUrl: string): Buffer {
  const commaIndex = dataUrl.indexOf(",");
  const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return Buffer.from(payload, "base64");
}
