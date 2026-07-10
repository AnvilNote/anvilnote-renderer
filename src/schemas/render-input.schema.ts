import { z } from "zod";

const fieldValueSchema = z.union([z.string(), z.boolean(), z.null()]);

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
      pageSize: z.enum(["A4", "Letter"]).optional(),
      includeMetadata: z.boolean().optional(),
    })
    .optional(),
});

export type RenderInputSchema = z.infer<typeof renderInputSchema>;
