import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { panelOrder } from "./panelxaml.ts";
import { luaString, pointsLua, readMapOrigin, submapsLua } from "./mapdata.ts";
import type { Submap } from "./submaps.ts";
import type { Point } from "./points.ts";

export interface BuildDataOptions {
  pointsFile: string;
  lsxRoot: string;
  stageDir: string;
  submaps?: Submap[];
}

export function dataDir(stageDir: string): string {
  return path.join(stageDir, "Mods", "BG3Atlas", "ScriptExtender", "Lua", "Client", "Data");
}

export function categoriesLua(): string {
  return `return {${panelOrder().map((id) => luaString(id)).join(",")}}\n`;
}

export function buildData(opts: BuildDataOptions): void {
  if (!existsSync(opts.pointsFile)) throw new Error(`${opts.pointsFile} not found, run npm run extract first`);
  const points = JSON.parse(readFileSync(opts.pointsFile, "utf8")) as Point[];
  const origin = readMapOrigin(opts.lsxRoot, "WLD_Main_A");
  const dir = dataDir(opts.stageDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "Wilderness.lua"), pointsLua(points, origin));
  writeFileSync(path.join(dir, "Categories.lua"), categoriesLua());
  writeFileSync(path.join(dir, "Submaps.lua"), submapsLua(opts.submaps ?? []));
}
