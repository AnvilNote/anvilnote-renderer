export type TemplateFieldType = "text" | "date" | "select" | "boolean";

export type TemplateFieldManifest = {
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
};

export type TemplateManifest = {
  id: string;
  name: string;
  description: string;
  version: string;
  fields: TemplateFieldManifest[];
};

export type LoadedTemplate = {
  manifest: TemplateManifest;
  templatePath: string;
  templateSource: string;
};
