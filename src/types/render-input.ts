export type RenderInput = {
  document: {
    id: string;
    title: string;
    content: unknown[];
  };
  template: {
    id: string;
    fields?: Record<string, string | boolean | null>;
  };
  options?: {
    format?: "pdf";
    pageSize?: "A4" | "Letter";
    fontPreset?: "sans" | "serif" | "mono";
    includeMetadata?: boolean;
  };
};
