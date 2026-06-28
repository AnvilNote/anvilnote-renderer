import { z } from "zod";

export const renderInputSchema = z.object({
  document: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    content: z.array(z.unknown()),
  }),
  template: z.object({
    id: z.string().min(1),
    fields: z.record(z.string(), z.union([z.string(), z.boolean(), z.null()])).optional(),
  }),
  options: z.object({
    format: z.literal("pdf").default("pdf"),
    pageSize: z.enum(["A4", "Letter"]).optional(),
    fontPreset: z.enum(["sans", "serif", "mono"]).optional(),
    includeMetadata: z.boolean().optional(),
  }).optional(),
});

export type RenderInputSchema = z.infer<typeof renderInputSchema>;
