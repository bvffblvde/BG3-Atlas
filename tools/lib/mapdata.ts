import { existsSync } from "node:fs";
import path from "node:path";
import { levelModules } from "./level.ts";
import { attr, findAll, readLsxFile } from "./lsx.ts";
import type { Point } from "./points.ts";

export interface MapOrigin {
  x: number;
  z: number;
}

const flagBits: Record<string, number> = { locked: 1, trapped: 2, hidden: 4 };

export function readMapOrigin(lsxRoot: string, level: string): MapOrigin {
  for (const m of [...levelModules].reverse()) {
    const file = path.join(lsxRoot, "Mods", m, "Levels", level, "WorldMap", "MiniMap.lsx");
    if (!existsSync(file)) continue;
    const node = findAll(readLsxFile(file), "WorldMapMetaData")[0];
    if (!node) continue;
    const num = (id: string) => Number(attr(node, id));
    return { x: num("WorldX") - num("WorldWidth") / 2, z: num("WorldZ") + num("WorldHeight") / 2 };
  }
  throw new Error(`MiniMap.lsx not found for level ${level}`);
}

export function toMapLocal(origin: MapOrigin, x: number, z: number): [number, number] {
  return [x - origin.x, origin.z - z];
}

export function luaString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n")}"`;
}

function num(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function pointsLua(points: Point[], origin: MapOrigin): string {
  const rows: string[] = [];
  for (const p of points) {
    if (p.submap !== null) continue;
    const [x, y] = toMapLocal(origin, p.pos.x, p.pos.z);
    const mask = p.flags.reduce((m, f) => m | (flagBits[f] ?? 0), 0);
    rows.push(`{${luaString(p.id)},${luaString(p.category)},${num(x)},${num(y)},${luaString(p.name)},${luaString(p.nameRu)},${mask}}`);
  }
  return `return {\n${rows.join(",\n")}\n}\n`;
}
