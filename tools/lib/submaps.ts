import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { levelModules, type PlacedLevel } from "./level.ts";
import { attr, findAll, readLsxFile } from "./lsx.ts";
import { readPlacement } from "./sublevels.ts";
import { composePlacement, parseVec3, rotate, toWorld, type Quat, type Vec3 } from "./transform.ts";

export interface Submap {
  trigger: string;
  building: string | null;
  floor: number;
  center: Vec3;
  half: Vec3;
  rot: Quat;
  area: number;
}

export interface SubmapAssignment {
  submap: string | null;
  floor: number | null;
  trigger: string | null;
}

const emptyTrigger = "00000000-0000-0000-0000-000000000000";

interface Box {
  center: Vec3;
  half: Vec3;
  rot: Quat;
}

function levelDirs(lsxRoot: string, level: string, folder: string): string[] {
  return levelModules.map((m) => path.join(lsxRoot, "Mods", m, "Levels", level, folder)).filter((d) => existsSync(d));
}

function triggerBoxes(lsxRoot: string, levels: PlacedLevel[]): Map<string, Box> {
  const out = new Map<string, Box>();
  for (const { level, placement } of levels) {
    for (const dir of levelDirs(lsxRoot, level, "Triggers")) {
      const file = path.join(dir, "_merged.lsx");
      if (!existsSync(file)) continue;
      for (const go of findAll(readLsxFile(file), "GameObjects")) {
        const id = attr(go, "MapKey");
        const extents = attr(go, "Extents");
        if (!id || !extents || out.has(id)) continue;
        const p = composePlacement(placement, readPlacement(go));
        const e = parseVec3(extents);
        out.set(id, { center: p.pos, half: [e[0] * p.scale, e[1] * p.scale, e[2] * p.scale], rot: p.rot });
      }
    }
  }
  return out;
}

export function loadSubmaps(lsxRoot: string, levels: PlacedLevel[]): Submap[] {
  const boxes = triggerBoxes(lsxRoot, levels);
  const out: Submap[] = [];
  for (const { level, placement } of levels) {
    for (const dir of levelDirs(lsxRoot, level, "WorldMap")) {
      for (const name of readdirSync(dir).filter((n) => n.endsWith(".lsx"))) {
        const node = findAll(readLsxFile(path.join(dir, name)), "WorldMapMetaData")[0];
        if (!node) continue;
        const trigger = attr(node, "TriggerId") ?? emptyTrigger;
        if (trigger === emptyTrigger) continue;
        const building = attr(node, "BuildingUUID") || null;
        const floor = Number(attr(node, "Floor") ?? "0");
        const box = boxes.get(trigger) ?? {
          center: toWorld(placement, [Number(attr(node, "WorldX")), 0, Number(attr(node, "WorldZ"))]),
          half: [Number(attr(node, "WorldWidth")) / 2, Infinity, Number(attr(node, "WorldHeight")) / 2] as Vec3,
          rot: placement.rot,
        };
        out.push({ trigger, building, floor, ...box, area: 4 * box.half[0] * box.half[2] });
      }
    }
  }
  return out;
}

function contains(s: Submap, pos: Vec3): boolean {
  const inv: Quat = [-s.rot[0], -s.rot[1], -s.rot[2], s.rot[3]];
  const local = rotate(inv, [pos[0] - s.center[0], pos[1] - s.center[1], pos[2] - s.center[2]]);
  return Math.abs(local[0]) <= s.half[0] && Math.abs(local[1]) <= s.half[1] && Math.abs(local[2]) <= s.half[2];
}

export function assignSubmap(pos: Vec3, submaps: Submap[]): SubmapAssignment {
  let building: Submap | undefined;
  let region: Submap | undefined;
  for (const s of submaps) {
    if (!contains(s, pos)) continue;
    if (s.building) {
      if (!building || s.area < building.area) building = s;
    } else if (!region || s.area < region.area) region = s;
  }
  const hit = building ?? region;
  if (!hit) return { submap: null, floor: null, trigger: null };
  return { submap: hit.building, floor: hit.building ? hit.floor : null, trigger: hit.trigger };
}
