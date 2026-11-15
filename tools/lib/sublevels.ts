import { attr, child, findAll, type LsxNode } from "./lsx.ts";
import { parseQuat, parseVec3, type Placement } from "./transform.ts";

export interface SubLevelRef {
  level: string;
  placement: Placement;
  via: string;
}

export function readPlacement(node: LsxNode): Placement {
  const t = child(node, "Transform");
  return {
    pos: parseVec3(t ? (attr(t, "Position") ?? "0 0 0") : "0 0 0"),
    rot: parseQuat(t ? (attr(t, "RotationQuat") ?? "0 0 0 1") : "0 0 0 1"),
    scale: Number(t ? (attr(t, "Scale") ?? "1") : "1"),
  };
}

export function isWildernessSubLevel(level: string): boolean {
  return level.startsWith("WLD_") && !level.startsWith("WLD_CIN_") && level !== "WLD_Main_A";
}

export function findSubLevels(levelTemplates: LsxNode[], subLevelByTemplate: Map<string, string>, accept: (level: string) => boolean): SubLevelRef[] {
  const out: SubLevelRef[] = [];
  const seen = new Set<string>();
  for (const go of findAll(levelTemplates, "GameObjects")) {
    if (attr(go, "Type") !== "LevelTemplate") continue;
    const level = subLevelByTemplate.get(attr(go, "TemplateName") ?? "");
    if (!level || seen.has(level) || !accept(level)) continue;
    seen.add(level);
    out.push({ level, placement: readPlacement(go), via: attr(go, "Name") ?? "" });
  }
  return out;
}
