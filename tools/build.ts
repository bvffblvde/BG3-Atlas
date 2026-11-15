import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { divine, repoRoot } from "./lib/game.ts";

const source = path.join(repoRoot, "mod", "BG3Atlas");
const outDir = path.join(repoRoot, "dist");
const pak = path.join(outDir, "BG3Atlas.pak");

mkdirSync(outDir, { recursive: true });
rmSync(pak, { force: true });
console.log(divine(["-a", "create-package", "-s", source, "-d", pak]).trim());
console.log(divine(["-a", "list-package", "-s", pak]).trim());
