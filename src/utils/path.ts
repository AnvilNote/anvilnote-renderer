import path from "node:path";

export const rendererRoot = path.resolve(process.cwd());

export function resolveFromRendererRoot(...segments: string[]) {
  return path.resolve(rendererRoot, ...segments);
}
