import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { ensureDir } from "../utils/fs";
import type { RenderFailureResult } from "../types/render-result";

dotenv.config({ quiet: true });

const typstBin = process.env.TYPST_BIN || "typst";

export type CompileTypstOptions = {
  /** Directories passed as `--font-path` so bundled fonts resolve. */
  fontPaths?: string[];
  /** Project root passed as `--root` so adapter-local imports resolve. */
  root?: string;
  /** Pass `--ignore-system-fonts` so renders only use the bundled fonts. */
  ignoreSystemFonts?: boolean;
};

export async function compileTypst(
  inputPath: string,
  outputPath: string,
  options: CompileTypstOptions = {},
) {
  await ensureDir(path.dirname(outputPath));
  await fs.rm(outputPath, { force: true });

  const args = ["compile"];
  if (options.root) {
    args.push("--root", options.root);
  }
  for (const fontPath of options.fontPaths ?? []) {
    args.push("--font-path", fontPath);
  }
  if (options.ignoreSystemFonts) {
    args.push("--ignore-system-fonts");
  }
  args.push(inputPath, outputPath);

  return new Promise<{ ok: true; logs: string[] } | RenderFailureResult>((resolve) => {
    const child = spawn(typstBin, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const logs: string[] = [];
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({
        ok: false,
        status: "FAILED",
        error: {
          message: "Typst compilation timed out",
        },
        logs,
      });
    }, 30_000);

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.trim()) {
        logs.push(text.trim());
      }
      process.stderr.write(text);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.trim()) {
        logs.push(text.trim());
      }
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        ok: false,
        status: "FAILED",
        error: {
          message: "Failed to start Typst CLI",
          details: error.message,
        },
        logs,
      });
    });

    child.on("close", async (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        resolve({
          ok: false,
          status: "FAILED",
          error: {
            message: "Typst compilation failed",
            details: logs.join("\n") || `typst exited with code ${code ?? "unknown"}`,
          },
          logs,
        });
        return;
      }

      try {
        await fs.access(outputPath);
        resolve({ ok: true, logs });
      } catch {
        resolve({
          ok: false,
          status: "FAILED",
          error: {
            message: "Typst did not produce a PDF output",
          },
          logs,
        });
      }
    });
  });
}
