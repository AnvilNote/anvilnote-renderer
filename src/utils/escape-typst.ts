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
