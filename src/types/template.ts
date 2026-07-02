export type TemplateFieldType =
  | "text"
  | "textarea"
  | "date"
  | "boolean"
  | "select"
  | "color";

export type TemplateFieldScope = "metadata" | "option";

export type TemplateField = {
  key: string;
  label: string;
  type: TemplateFieldType;
  scope: TemplateFieldScope;
  required?: boolean;
  default?: string | boolean;
  placeholder?: string;
  options?: string[];
  dependsOn?: { key: string; value: string | boolean | null };
};

export type TemplateEngineKind = "typst-package" | "local";

export type TemplateEngine = {
  kind: TemplateEngineKind;
  /** Required when kind === "typst-package", e.g. "@preview/kunskap:0.1.0". */
  package?: string;
  /** Adapter entry file relative to the template directory. */
  entry: string;
};

export type TemplateManifest = {
  slug: string;
  name: string;
  description: string;
  version: string;
  engine: TemplateEngine;
  category: string;
  tags: string[];
  /** Declared fonts (human-readable + resolution aid); not the load path. */
  fonts: string[];
  /** BlockNote H1 → Typst heading level offset. plain-note = 1, others = 0. */
  headingOffset: number;
  /** Whether the renderer wraps this template with apply-anvil-fonts. */
  usesAnvilFontWrapper: boolean;
  /** Font ownership contract; always AnvilNote-controlled. */
  fontPolicy: "anvil-controlled";
  /** How footnoteReference nodes render in Typst — see template-loader.ts. */
  footnoteStyle: "footnote" | "sidenote";
  fields: TemplateField[];
};

export type LoadedTemplate = {
  manifest: TemplateManifest;
  /** Absolute path to the template directory. */
  dir: string;
  /** Absolute path to the adapter entry (.typ exporting anvil-template). */
  adapterPath: string;
  /** Font directories to pass as --font-path (renderer pool + template-local). */
  fontPaths: string[];
};
