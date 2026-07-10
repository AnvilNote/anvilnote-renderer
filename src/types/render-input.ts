export type RenderFieldValue = string | boolean | null;

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
  options?: {
    format?: "pdf";
    pageSize?: "A4" | "Letter";
    includeMetadata?: boolean;
  };
};
