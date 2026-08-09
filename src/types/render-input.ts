export type RenderFieldValue = string | boolean | null;

export type WatermarkFontFamily = "serif" | "sans" | "rounded";

export type WatermarkOptions = {
  enabled: boolean;
  type: "image" | "text";
  // Base64 data URL of a cropped upload, or null to use the renderer's own
  // bundled default (AnvilNote's icon asset -- see render-document.ts's
  // resolveWatermarkImage for where that lives).
  image: string | null;
  text: string;
  rotationDeg: number;
  opacityPercent: number;
  applyToFirstPage: boolean;
  // Only meaningful for type: "text" -- an image watermark has no font.
  fontFamily: WatermarkFontFamily;
  // Applies to both types -- percent of the renderer's baseline size
  // (image: 12cm width: text: 64pt), 100 = baseline, 200 = 2x, etc.
  sizePercent: number;
};

export type RenderInput = {
  document: {
    id: string;
    title: string;
    content: unknown[];
  };
  template: {
    slug: string;
    meta: Record<string, RenderFieldValue>;
    options: Record<string, RenderFieldValue>;
  };
  numberedHeadings: boolean;
  marginTopCm?: number;
  marginBottomCm?: number;
  marginLeftCm?: number;
  marginRightCm?: number;
  options?: {
    format?: "pdf";
    pageSize?: "A4" | "B4" | "B5" | "Letter";
    includeMetadata?: boolean;
    orderedListLevels?: import("../converters/list-markers").OrderedListModuleId[];
    unorderedListLevels?: import("../converters/list-markers").UnorderedListSymbol[];
    watermark?: WatermarkOptions;
  };
};
