// Escapes every character Typst's markup mode treats specially, so plain
// user text can never be reinterpreted as markup. Two groups:
//   - Always special, anywhere in the text: # $ * _ ` < > @
//   - Special only at the very start of a line, where they introduce a
//     heading (=), bullet (-), numbered (+), or term-list (/) item — e.g. a
//     paragraph whose whole text is "/" crashes the Typst compiler with
//     "expected colon" because it parses as an empty term-list entry.
// Escaping unconditionally (not just at line-start) is safe: `\-`, `\+`, etc.
// render identically to the unescaped character everywhere else.
export function escapeTypstText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/`/g, "\\`")
    .replace(/</g, "\\<")
    .replace(/>/g, "\\>")
    .replace(/@/g, "\\@")
    .replace(/-/g, "\\-")
    .replace(/\+/g, "\\+")
    .replace(/\//g, "\\/")
    .replace(/=/g, "\\=")
    .replace(/"/g, '\\"');
}

// Escape a value destined for inside a Typst string literal ("..."). Only the
// backslash and double-quote are special there — unlike markup/content mode,
// `#` and `$` are literal, so escaping them would corrupt values (e.g. hex
// colors like "#E94845").
export function escapeTypstString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function escapeTypstCode(value: string) {
  return value.replace(/```/g, "``\\`");
}

// A Typst label's dedicated <name> syntax only allows letters, numbers, _,
// -, :, and . (the label(str) constructor is more permissive, but the
// cross-ref feature needs the plain <name> form both to WRITE the label
// next to a figure/table/equation and to emit a matching @name reference
// for it). AnvilNote's own ids are crypto.randomUUID() — valid, but the
// hyphens are the only overlap; prefixing with a letter guards against the
// (never actually possible, since randomUUID never starts with a digit,
// but not worth relying on that) case of a label starting with a digit,
// which Typst also rejects.
export function sanitizeTypstLabel(id: string): string {
  return `xref-${id.replace(/[^a-zA-Z0-9_\-:.]/g, "-")}`;
}
