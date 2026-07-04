import { promises as fs } from "node:fs";

export async function ensureDir(pathname: string) {
  await fs.mkdir(pathname, { recursive: true });
}

export async function pathExists(pathname: string): Promise<boolean> {
  try {
    await fs.access(pathname);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(pathname: string): Promise<T> {
  const raw = await fs.readFile(pathname, "utf8");
  return JSON.parse(raw) as T;
}
