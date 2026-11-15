import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { attr, findAll, readLsxFile, type LsxNode } from "./lsx.ts";

export interface WaypointFact {
  group: string;
  key: string;
  item: string;
}

const guid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const factRe = new RegExp(`DB_WaypointInfo\\(\\s*"([^"]*)"\\s*,\\s*"([^"]+)"\\s*,\\s*(?:\\(ITEM\\))?\\w*?(${guid})`, "g");

export function parseWaypointFacts(text: string): WaypointFact[] {
  return [...text.matchAll(factRe)].map((m) => ({ group: m[1], key: m[2], item: m[3] }));
}

export function parseWaypointNames(roots: LsxNode[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const node of findAll(roots, "TranslatedStringKey")) {
    const key = attr(node, "UUID");
    const handle = node.attrs.Content?.handle;
    if (key && handle) out.set(key, handle);
  }
  return out;
}

export class WaypointIndex {
  private readonly keyById = new Map<string, string>();

  constructor(
    facts: WaypointFact[],
    private readonly names: Map<string, string>,
  ) {
    for (const f of facts) this.keyById.set(f.item, f.key);
  }

  has(id: string): boolean {
    return this.keyById.has(id);
  }

  nameHandle(id: string): string | undefined {
    const key = this.keyById.get(id);
    return key ? this.names.get(key) : undefined;
  }

  get size(): number {
    return this.keyById.size;
  }
}

const goalFiles = ["Mods/Gustav/Story/RawFiles/Goals/_Gustav_Waypoints_Act1.txt", "Mods/GustavDev/Story/RawFiles/Goals/_Gustav_Waypoints.txt"];
const nameFiles = ["Mods/Gustav/Localization/Waypointshrines.lsx", "Mods/GustavDev/Localization/Waypointshrines2.lsx"];

export function loadWaypoints(lsxRoot: string): WaypointIndex {
  const facts: WaypointFact[] = [];
  for (const rel of goalFiles) {
    const file = path.join(lsxRoot, rel);
    if (existsSync(file)) facts.push(...parseWaypointFacts(readFileSync(file, "utf8")));
  }
  const names = new Map<string, string>();
  for (const rel of nameFiles) {
    const file = path.join(lsxRoot, rel);
    if (existsSync(file)) for (const [k, v] of parseWaypointNames(readLsxFile(file))) names.set(k, v);
  }
  return new WaypointIndex(facts, names);
}
