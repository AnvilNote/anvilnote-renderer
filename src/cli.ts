#!/usr/bin/env node

import dotenv from "dotenv";
import { ZodError } from "zod";
import { renderDocument } from "./core/render-document";
import { readJsonFile } from "./utils/fs";

dotenv.config({ quiet: true });

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      continue;
    }

    args.set(token, next);
    index += 1;
  }

  return {
    input: args.get("--input"),
    outputDir: args.get("--output-dir"),
    workDir: args.get("--work-dir"),
  };
}

async function main() {
  const { input, outputDir, workDir } = parseArgs(process.argv.slice(2));

  if (!input || !outputDir || !workDir) {
    process.stderr.write(
      "Usage: pnpm render --input <file.json> --output-dir <dir> --work-dir <dir>\n",
    );
    process.stdout.write(
      JSON.stringify({
        ok: false,
        status: "FAILED",
        error: {
          message: "Missing required CLI arguments",
        },
        logs: [],
      }),
    );
    process.exit(1);
  }

  try {
    const payload = await readJsonFile<unknown>(input);
    const result = await renderDocument(payload, outputDir, workDir);
    process.stdout.write(JSON.stringify(result));
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    const details =
      error instanceof ZodError
        ? JSON.stringify(error.issues)
        : error instanceof Error
          ? error.message
          : String(error);

    process.stderr.write(`${details}\n`);
    process.stdout.write(
      JSON.stringify({
        ok: false,
        status: "FAILED",
        error: {
          message: error instanceof ZodError ? "Invalid render input" : "Renderer failed",
          details,
        },
        logs: [],
      }),
    );
    process.exit(1);
  }
}

void main();
