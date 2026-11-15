import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { divine, repoRoot } from "./lib/game.ts";
import { ensureUnpacked, patchTheme, worldMapThemes } from "./lib/themes.ts";

const source = path.join(repoRoot, "mod", "BG3Atlas");
const stage = path.join(repoRoot, "work", "build", "BG3Atlas");
const outDir = path.join(repoRoot, "dist");
const pak = path.join(outDir, "BG3Atlas.pak");

rmSync(stage, { recursive: true, force: true });
cpSync(source, stage, { recursive: true });

const withTheme = !process.argv.includes("--no-theme");
for (const theme of withTheme ? worldMapThemes : []) {
  const target = path.join(stage, ...theme.file.split("/"));
  mkdirSync(path.dirname(target), { recursive: true });
  const vanilla = process.argv.includes("--theme-vanilla");
  writeFileSync(target, vanilla ? readFileSync(ensureUnpacked(theme)) : patchTheme(theme));
  console.log(`${vanilla ? "copied vanilla" : "patched"} ${theme.file}`);
}

mkdirSync(outDir, { recursive: true });
rmSync(pak, { force: true });
console.log(divine(["-a", "create-package", "-s", stage, "-d", pak]).trim());
console.log(divine(["-a", "list-package", "-s", pak]).trim());
