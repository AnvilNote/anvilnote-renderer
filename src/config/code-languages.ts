// Mirror of anvilnote-web's code language normalizer. Keep the alias map and
// supported set in sync with src/config/code-languages.ts on the web side.

const aliases: Record<string, string> = {
  txt: "text",
  plain: "text",

  typst: "typ",

  js: "javascript",
  jsx: "javascript",
  ts: "typescript",

  py: "python",
  rs: "rust",

  rb: "ruby",

  sh: "bash",
  shell: "bash",
  zsh: "bash",

  htm: "html",
  yml: "yaml",
  md: "markdown",
  tex: "latex",
  gql: "graphql",
  jl: "julia",

  "c++": "cpp",
  cplusplus: "cpp",
  cc: "cpp",
  cxx: "cpp",

  "c#": "cs",
  csharp: "cs",
};

const supported = new Set([
  "text",
  "typ",
  "javascript",
  "typescript",
  "tsx",
  "python",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "cs",
  "php",
  "ruby",
  "swift",
  "dart",
  "bash",
  "fish",
  "html",
  "css",
  "scss",
  "sass",
  "json",
  "yaml",
  "toml",
  "xml",
  "sql",
  "markdown",
  "latex",
  "dockerfile",
  "graphql",
  "r",
  "julia",
  "matlab",
]);

export function normalizeCodeLanguage(input?: string | null): string {
  if (!input) return "text";

  const key = input.trim().toLowerCase();

  if (!key) return "text";

  const normalized = aliases[key] ?? key.replace(/[^a-z0-9_-]/g, "");

  return supported.has(normalized) ? normalized : "text";
}
