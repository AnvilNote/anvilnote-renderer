# AnvilNote Renderer

`anvilnote-renderer` is the dedicated PDF rendering CLI for AnvilNote. It converts the current AnvilNote Tiptap document JSON into Typst, compiles it with a selected template, and returns a machine-readable result to `anvilnote-api`.

The renderer remains separate so the API can focus on documents, templates, jobs, and HTTP concerns. AnvilNote Desktop bundles the built renderer and Typst executable for end users. This process never handles OpenAI API keys; Smart Mode output must first become an accepted AnvilNote document before it can be rendered.

## Document input

The canonical input is an AnvilNote document whose `content` field contains a
one-element array with a Tiptap `doc` node.

The Tiptap converter supports the document structures used by the editor, including headings, lists, tables, math, code blocks, images, callouts, proofs with QED, questions, footnotes, and cross-references.

## Requirements

- Node.js and pnpm for source development
- [Typst](https://typst.app/open-source/) on `PATH`, or a custom executable supplied through `TYPST_BIN`

Packaged AnvilNote Desktop releases already include Typst. Desktop users do not need to install it separately.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm build
```

Environment variables:

```env
TYPST_BIN=typst
ANVILNOTE_FONT_DIR=./fonts
ANVILNOTE_IGNORE_SYSTEM_FONTS=true
```

## CLI usage

```bash
pnpm --silent render \
  --input /absolute/path/to/render-input.json \
  --output-dir /absolute/path/to/pdf-output-dir \
  --work-dir /absolute/path/to/typst-work-dir
```

`stdout` is reserved for one machine-readable JSON result. Human-readable diagnostics go to `stderr`. Use `pnpm --silent render` in scripts so pnpm does not add its own banner to standard output.

## Render input

```json
{
  "document": {
    "id": "document-id",
    "title": "Lecture 01",
    "content": [
      {
        "type": "doc",
        "content": []
      }
    ]
  },
  "template": {
    "slug": "plain-note",
    "meta": {
      "author": "Example Author",
      "date": "2026-07-20"
    },
    "options": {
      "primaryLang": "en",
      "toc": true
    }
  },
  "numberedHeadings": true,
  "options": {
    "format": "pdf",
    "pageSize": "A4",
    "includeMetadata": true
  }
}
```

The input schema also accepts optional positive `marginTopCm`, `marginBottomCm`, `marginLeftCm`, and `marginRightCm` values when the selected template supports custom margins.

## Render output

Success:

```json
{
  "ok": true,
  "status": "COMPLETED",
  "typstPath": "/absolute/path/to/generated.typ",
  "pdfPath": "/absolute/path/to/generated.pdf",
  "logs": [],
  "fontConfig": {
    "fontPresetVersion": "0.1.0",
    "fontBundle": "anvilnote-default",
    "mathMode": "default"
  }
}
```

Failure:

```json
{
  "ok": false,
  "status": "FAILED",
  "error": {
    "message": "Typst compilation failed",
    "details": "..."
  },
  "logs": []
}
```

## Fonts

Rendering uses the fixed font bundle under `fonts/` together with `--font-path` and `--ignore-system-fonts`, so output does not silently change with the host computer. Shared font policy is defined in `src/config/fonts.ts` and `templates/shared/anvil-fonts.typ`; templates control layout rather than replacing the font policy.

Useful font checks:

```bash
pnpm fonts:download
pnpm fonts:list
pnpm fonts:verify
pnpm templates:lint
```

Template options can change the preferred language and bundled font stacks:

| Option | Values | Purpose |
| --- | --- | --- |
| `primaryLang` | `zh`, `en`, `ja`, `ko`, `th` | Prioritizes the corresponding bundled language face |
| `titleFont` | `taiwan-pearl`, `source-han` | Selects the title and heading CJK face |
| `bodyFont` | `song`, `kai` | Selects the body CJK face |
| `dateFont` | `playfair`, `tai-heritage` | Selects the author and date display face |
| `mathMode` | `default`, `garamond` | Selects the bundled math stack |

Unknown values fall back to the AnvilNote defaults, never to an arbitrary system font.

## Templates

Templates live under `templates/<template-slug>/` and contain a manifest plus a Typst adapter:

```text
templates/
  plain-note/
    manifest.json
    template.typ
```

To add a template:

1. Create `templates/<new-slug>/manifest.json`.
2. Create `templates/<new-slug>/template.typ`.
3. Run `pnpm templates:lint`.
4. Use the new slug in the render input.

## Commands

```bash
pnpm build
pnpm build:desktop
pnpm lint
pnpm templates:lint
pnpm fonts:verify
```

Use the complete command under [CLI usage](#cli-usage) when invoking the
`render` script; both `render` and `start` require input and output arguments.

This repository does not currently define a separate `pnpm test` script. The
available package-level checks are linting, template linting, and font
verification; adding a packaged converter test command remains a follow-up.

## Related repositories

- [AnvilNote API](https://github.com/AnvilNote/anvilnote-api) creates render jobs and invokes this CLI.
- [AnvilNote Desktop](https://github.com/AnvilNote/anvilnote-desktop) packages the built renderer and Typst executable.
- [AnvilNote Web](https://github.com/AnvilNote/anvilnote-web) produces the current Tiptap document format.

## License

This repository is licensed under the [MIT License](LICENSE).
