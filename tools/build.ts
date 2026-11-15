import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { divine, repoRoot } from "./lib/game.ts";
import { existsSync } from "node:fs";
import { buildData } from "./lib/builddata.ts";
import { wildernessLevels } from "./lib/level.ts";
import { readLsxFile } from "./lib/lsx.ts";
import { loadSubmaps } from "./lib/submaps.ts";
import { TemplateIndex } from "./lib/templates.ts";
import { ensureUnpacked, journalPages, patchJournal, patchTheme, worldMapThemes } from "./lib/themes.ts";

const source = path.join(repoRoot, "mod", "BG3Atlas");
const stage = path.join(repoRoot, "work", "build", "BG3Atlas");
const outDir = path.join(repoRoot, "dist");
const pak = path.join(outDir, "BG3Atlas.pak");

rmSync(stage, { recursive: true, force: true });
cpSync(source, stage, { recursive: true });
const lsxRoot = path.join(repoRoot, "work", "unpacked", "lsx");
const templates = new TemplateIndex(
  ["Shared", "SharedDev", "Gustav", "GustavDev", "GustavX"]
    .map((m) => path.join(lsxRoot, "Public", m, "RootTemplates", "_merged.lsx"))
    .filter((f) => existsSync(f))
    .map(readLsxFile),
);
const submaps = loadSubmaps(lsxRoot, wildernessLevels(lsxRoot, templates));
buildData({ pointsFile: path.join(repoRoot, "data", "points.json"), lsxRoot, stageDir: stage, submaps });
console.log("generated point data");

const withTheme = !process.argv.includes("--no-theme");
for (const theme of withTheme ? worldMapThemes : []) {
  const target = path.join(stage, ...theme.file.split("/"));
  mkdirSync(path.dirname(target), { recursive: true });
  const vanilla = process.argv.includes("--theme-vanilla");
  writeFileSync(target, vanilla ? readFileSync(ensureUnpacked(theme)) : patchTheme(theme));
  console.log(`${vanilla ? "copied vanilla" : "patched"} ${theme.file}`);
}

for (const page of withTheme && !process.argv.includes("--theme-vanilla") && !process.argv.includes("--no-panel") ? journalPages : []) {
  const target = path.join(stage, ...page.file.split("/"));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, patchJournal(page));
  console.log(`patched ${page.file}`);
}

mkdirSync(outDir, { recursive: true });
rmSync(pak, { force: true });
console.log(divine(["-a", "create-package", "-s", stage, "-d", pak]).trim());
console.log(divine(["-a", "list-package", "-s", pak]).trim());
