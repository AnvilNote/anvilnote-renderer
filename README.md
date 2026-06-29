# anvilnote-renderer

`anvilnote-renderer` is the dedicated CLI renderer for AnvilNote. It owns:

- BlockNote JSON to Typst conversion
- Typst escaping helpers
- Typst templates and template manifests
- Typst CLI compilation
- machine-readable render results for the API

The AnvilNote backend is Node.js/Express. This renderer delegates PDF generation to Typst. The “Rust-powered” part refers to Typst, not to the backend language.

## Why It Is Separate

`anvilnote-api` should stay focused on documents, templates metadata, render jobs, and HTTP concerns. This repo isolates all Typst-specific rendering logic behind a CLI boundary.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm build
```

## Environment

```env
TYPST_BIN=typst
ANVILNOTE_FONT_DIR=./fonts          # bundled fonts (Docker: /app/fonts)
ANVILNOTE_IGNORE_SYSTEM_FONTS=true  # only use the bundle, never system fonts
```

## Fonts

AnvilNote renders from a **fixed, bundled font set** (`fonts/`) and compiles
with `--font-path ./fonts --ignore-system-fonts`, so output never depends on
system fonts. Font policy (which family is used for title / meta / body /
heading / code / math) is owned centrally by `src/config/fonts.ts` and
`templates/shared/anvil-fonts.typ`; **templates control layout only, never
fonts** (`pnpm templates:lint` enforces this on each `template.typ`).

```bash
pnpm fonts:download   # fetch the open-source fonts
pnpm fonts:list       # families Typst sees from the bundle
pnpm fonts:verify     # assert every required family is present
pnpm templates:lint   # assert no template sets its own fonts
```

### Per-render font options

These template options let the user steer the bundled stacks (the renderer
validates them and rebuilds the stacks; the body/heading/code/math wrapper
applies to every template, while title/author/date chrome honors them in
AnvilNote-native templates such as plain-note):

| Option        | Values                                   | Effect |
| ------------- | ---------------------------------------- | ------ |
| `primaryLang` | `zh` · `en` · `ja` · `ko` · `th`         | Moves that language's face to the front of every stack |
| `titleFont`   | `taiwan-pearl` · `source-han`            | CJK face for title / heading (台灣圓體 vs 思源黑體) |
| `bodyFont`    | `song` · `kai`                           | CJK face for body / author (宋體 vs 楷書) |
| `dateFont`    | `playfair` · `tai-heritage`              | Author/date display face |
| `mathMode`    | `default` · `garamond`                   | New Computer Modern Math vs Garamond-Math |

All default to the AnvilNote baseline (`zh` / `taiwan-pearl` / `song` / `playfair` /
`default`). Unknown values fall back to the default — never to a system font.

## Typst Requirement

Typst must be installed locally:

```bash
typst --version
```

If Typst is not on your `PATH`, set `TYPST_BIN` in `.env`.

## CLI Usage

```bash
pnpm --silent render \
  --input /absolute/path/to/render-input.json \
  --output-dir /absolute/path/to/pdf-output-dir \
  --work-dir /absolute/path/to/typst-work-dir
```

## Render Input JSON

```json
{
  "document": {
    "id": "document-id",
    "title": "Lecture 01",
    "content": []
  },
  "template": {
    "id": "minimal-lecture",
    "fields": {
      "author": "Anthony",
      "date": "2026-06-26"
    }
  },
  "options": {
    "format": "pdf"
  }
}
```

## Render Output JSON

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

`stdout` is reserved for machine-readable JSON. Human-readable logs go to `stderr`. Use `pnpm --silent render` for scripting so the package manager does not prepend its own script banner to stdout.

## Templates

Templates live under `templates/<template-id>/`:

```txt
templates/
  minimal-lecture/
    manifest.json
    template.typ
```

## Adding a Template

1. Create `templates/<new-id>/manifest.json`
2. Create `templates/<new-id>/template.typ`
3. Use the new template id in the render input JSON
4. Keep stdout JSON-only so the API contract remains stable
