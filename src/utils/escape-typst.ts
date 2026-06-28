export function escapeTypstText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
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
