export function escapeTypstText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/"/g, '\\"');
}

export function escapeTypstCode(value: string) {
  return value.replace(/```/g, "``\\`");
}
