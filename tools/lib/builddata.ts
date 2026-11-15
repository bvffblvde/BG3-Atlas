import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { luaString, pointsLua, readMapOrigin, submapsLua } from "./mapdata.ts";
import { panelOrder } from "./panelxaml.ts";
import type { Point } from "./points.ts";
import type { Submap } from "./submaps.ts";

export interface BuildDataOptions {
  pointsFile: string;
  lsxRoot: string;
  stageDir: string;
  submaps?: Record<string, Submap[]>;
}

export function dataDir(stageDir: string): string {
  return path.join(stageDir, "Mods", "BG3Atlas", "ScriptExtender", "Lua", "Client", "Data");
}

export function categoriesLua(): string {
  return `return {${panelOrder().map((id) => luaString(id)).join(",")}}\n`;
}

export function buildData(opts: BuildDataOptions): string[] {
  if (!existsSync(opts.pointsFile)) throw new Error(`${opts.pointsFile} not found, run npm run extract first`);
  const points = JSON.parse(readFileSync(opts.pointsFile, "utf8")) as Point[];
  const byMap = new Map<string, Point[]>();
  for (const p of points) {
    const list = byMap.get(p.map) ?? [];
    list.push(p);
    byMap.set(p.map, list);
  }
  const dir = dataDir(opts.stageDir);
  mkdirSync(dir, { recursive: true });
  const warnings: string[] = [];
  const maps: string[] = [];
  for (const [map, list] of [...byMap].sort((a, b) => a[0].localeCompare(b[0]))) {
    let origin;
    try {
      origin = readMapOrigin(opts.lsxRoot, map);
    } catch (e) {
      warnings.push(`skip ${map}: ${(e as Error).message}`);
      continue;
    }
    writeFileSync(path.join(dir, `Points_${map}.lua`), pointsLua(list, origin));
    writeFileSync(path.join(dir, `Submaps_${map}.lua`), submapsLua(opts.submaps?.[map] ?? []));
    maps.push(map);
  }
  writeFileSync(path.join(dir, "Maps.lua"), `return {${maps.map(luaString).join(",")}}\n`);
  writeFileSync(path.join(dir, "Categories.lua"), categoriesLua());
  return warnings;
}
