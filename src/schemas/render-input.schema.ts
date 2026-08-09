import { z } from "zod";

const fieldValueSchema = z.union([z.string(), z.boolean(), z.null()]);

// Mirrors list-markers.ts's own OrderedListModuleId/UnorderedListSymbol
// unions (kept as a separate literal list here, not imported, since this
// schema module has no reason to depend on the converter internals it's
// merely validating input for).
const orderedListModuleSchema = z.enum([
  "arabic",
  "paren-arabic",
  "circled",
  "alpha-lower",
  "alpha-upper",
  "roman-lower",
  "roman-upper",
  "chinese-numeral",
  "japanese-formal",
  "japanese-informal",
  "korean-hangul",
  "thai-consonant",
]);
const unorderedListSymbolSchema = z.enum([
  "•", "◦", "▪", "–", "■", "□", "▲", "▼", "◀", "▶", "◆", "◇",
]);

export const renderInputSchema = z.object({
  document: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    content: z.array(z.unknown()),
  }),
  template: z.object({
    slug: z.string().min(1),
    // Already normalized + defaulted by the API; the renderer just serializes.
    meta: z.record(z.string(), fieldValueSchema).default({}),
    options: z.record(z.string(), fieldValueSchema).default({}),
  }),
  numberedHeadings: z.boolean().default(true),
  marginTopCm: z.number().positive().optional(),
  marginBottomCm: z.number().positive().optional(),
  marginLeftCm: z.number().positive().optional(),
  marginRightCm: z.number().positive().optional(),
  options: z
    .object({
      format: z.literal("pdf").default("pdf"),
      pageSize: z.enum(["A4", "B4", "B5", "Letter"]).optional(),
      includeMetadata: z.boolean().optional(),
      orderedListLevels: z.array(orderedListModuleSchema).min(1).optional(),
      unorderedListLevels: z.array(unorderedListSymbolSchema).min(1).optional(),
      watermark: z
        .object({
          enabled: z.boolean(),
          type: z.enum(["image", "text"]),
          image: z.string().nullable(),
          text: z.string(),
          rotationDeg: z.number(),
          opacityPercent: z.number().min(0).max(100),
          applyToFirstPage: z.boolean(),
          fontFamily: z.enum(["serif", "sans", "rounded"]).default("sans"),
          sizePercent: z.number().min(10).max(400).default(100),
        })
        .optional(),
    })
    .optional(),
});

export type RenderInputSchema = z.infer<typeof renderInputSchema>;
