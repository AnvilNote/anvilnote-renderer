import { promises as fs } from "node:fs";

export async function ensureDir(pathname: string) {
  await fs.mkdir(pathname, { recursive: true });
}

export async function readJsonFile<T>(pathname: string): Promise<T> {
  const raw = await fs.readFile(pathname, "utf8");
  return JSON.parse(raw) as T;
}
