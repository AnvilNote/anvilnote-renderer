import { PNG } from "pngjs";

// Typst's image() has no opacity/alpha parameter (confirmed empirically
// against 0.14.2: `alpha: 40%` errors "unexpected argument: alpha", and no
// top-level `opacity()` wrapper exists either). The only way to get a
// translucent raster into the PDF is to bake the opacity into the image's
// OWN alpha channel before handing it to Typst.
//
// pngjs (pure JS, no native binary) rather than sharp: this module ends up
// inside dist/cli.js, esbuild-bundled into a single self-contained file for
// the desktop app (bundle-desktop.mjs's whole point is "no node_modules
// needed at runtime") -- confirmed via a real packaged build that bundling
// sharp (a native addon that locates its own platform .node binary via a
// runtime require relative to its own package files) breaks once flattened
// into that single file: `ERR_INVALID_ARG_VALUE: filename... Received
// undefined` from deep inside sharp's own module-loading code. The watermark
// crop dialog always re-encodes to PNG (canvas.toDataURL("image/png"),
// regardless of the original upload's format) and the bundled default icon
// is also a PNG, so this only ever needs to read/write PNG -- no JPEG path
// needed, which is exactly pngjs's whole scope.
//
// Every pixel's alpha byte is multiplied (not overwritten) by the requested
// opacity: a non-transparent PNG (most uploads) still ends up uniformly
// translucent, and an already-transparent PNG (the default AnvilNote icon)
// keeps its own shape mask instead of being flattened to a solid rectangle.
export function applyWatermarkOpacity(input: Buffer, opacityPercent: number): Buffer {
  const clamped = Math.max(0, Math.min(100, opacityPercent));
  const factor = clamped / 100;
  const png = PNG.sync.read(input);
  const { data } = png;
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * factor);
  }
  return PNG.sync.write(png);
}

// Data URLs from the web crop dialog look like "data:image/png;base64,...."
export function decodeDataUrl(dataUrl: string): Buffer {
  const commaIndex = dataUrl.indexOf(",");
  const payload = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return Buffer.from(payload, "base64");
}
