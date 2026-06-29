// Bundle the renderer CLI into a single self-contained dist/cli.js so the
// desktop app can run it under Electron's Node runtime with NO external
// node_modules. Templates and fonts are read at runtime (from cwd / env), not
// bundled, so they stay overridable by the desktop bundle.

import { build } from "esbuild";
import { chmod } from "node:fs/promises";

await build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile: "dist/cli.js",
  // The source already carries a shebang; the desktop API spawns it via
  // `node dist/cli.js` so no extra banner is added (a second shebang would be a
  // syntax error on line 2).
  legalComments: "none",
  logLevel: "info",
});

await chmod("dist/cli.js", 0o755);
console.log("bundled dist/cli.js (standalone — no node_modules required at runtime)");
