import { existsSync } from "node:fs";
import path from "node:path";
import { attr, child, findAll, readLsxFile, type LsxNode } from "./lsx.ts";
import { findSubLevels, isWildernessSubLevel, readPlacement } from "./sublevels.ts";
import { subLevelIndex, nodeAttrs, nodeTags, treasureTables, type TemplateIndex } from "./templates.ts";
import { composePlacement, identity, toWorld, type Placement, type Vec3 } from "./transform.ts";

export interface RawObject {
  id: string;
  kind: "item" | "character";
  level: string;
  name: string;
  template: string;
  pos: Vec3;
  attrs: Record<string, string>;
  tags: string[];
  contents: string[];
  inventory: string[];
  tradeTables: string[];
}

export const levelModules = ["Gustav", "GustavDev"];

const sceneryKeep = /WaypointShrine(?!_Top)/;

function levelFiles(lsxRoot: string, level: string, folder: string): LsxNode[][] {
  const out: LsxNode[][] = [];
  for (const m of levelModules) {
    const file = path.join(lsxRoot, "Mods", m, "Levels", level, folder, "_merged.lsx");
    if (existsSync(file)) out.push(readLsxFile(file));
  }
  return out;
}

function contentsOf(go: LsxNode): string[] {
  const list = child(go, "ItemList");
  if (!list) return [];
  return findAll(list.children, "Item")
    .map((i) => attr(i, "TemplateID"))
    .filter((t): t is string => !!t);
}

export function readLevelObjects(lsxRoot: string, level: string, placement: Placement): RawObject[] {
  const out: RawObject[] = [];
  for (const [folder, kind] of [["Items", "item"], ["Characters", "character"], ["Scenery", "item"]] as const) {
    for (const roots of levelFiles(lsxRoot, level, folder)) {
      for (const go of findAll(roots, "GameObjects")) {
        const id = attr(go, "MapKey");
        if (!id) continue;
        if (folder === "Scenery" && !sceneryKeep.test(attr(go, "Name") ?? "")) continue;
        out.push({
          id,
          kind,
          level,
          name: attr(go, "Name") ?? "",
          template: attr(go, "TemplateName") ?? "",
          pos: toWorld(placement, readPlacement(go).pos),
          attrs: nodeAttrs(go),
          tags: nodeTags(go),
          contents: contentsOf(go),
          inventory: treasureTables(go, "InventoryList", "InventoryItem"),
          tradeTables: treasureTables(go, "TradeTreasures", "TreasureItem"),
        });
      }
    }
  }
  return out;
}

export interface PlacedLevel {
  level: string;
  placement: Placement;
}

export function wildernessLevels(lsxRoot: string, templates: TemplateIndex): PlacedLevel[] {
  const subLevels = subLevelIndex(templates);
  const result: PlacedLevel[] = [{ level: "WLD_Main_A", placement: identity }];
  const seen = new Set(["WLD_Main_A"]);
  for (let i = 0; i < result.length; i++) {
    const parent = result[i];
    const lts = levelFiles(lsxRoot, parent.level, "LevelTemplates").flat();
    for (const ref of findSubLevels(lts, subLevels, isWildernessSubLevel)) {
      if (seen.has(ref.level)) continue;
      seen.add(ref.level);
      result.push({ level: ref.level, placement: composePlacement(parent.placement, ref.placement) });
    }
  }
  return result;
}

export function readWilderness(lsxRoot: string, templates: TemplateIndex): RawObject[] {
  const out: RawObject[] = [];
  const seen = new Set<string>();
  for (const { level, placement } of wildernessLevels(lsxRoot, templates)) {
    for (const obj of readLevelObjects(lsxRoot, level, placement)) {
      if (seen.has(obj.id)) continue;
      seen.add(obj.id);
      out.push(obj);
    }
  }
  return out;
}
