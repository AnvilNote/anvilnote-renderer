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
```

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
  "logs": []
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
