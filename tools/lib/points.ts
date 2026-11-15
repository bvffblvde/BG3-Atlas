import { categorize, flags, isInteresting, type CategoryId, type CategoryInput, type Flag } from "../categories.ts";
import type { RawObject } from "./level.ts";
import type { Loca } from "./loca.ts";
import type { StatsIndex } from "./stats.ts";
import { assignSubmap, type Submap } from "./submaps.ts";
import { isTraderTable, type TemplateIndex } from "./templates.ts";
import type { WaypointIndex } from "./waypoints.ts";

export interface Point {
  id: string;
  category: CategoryId;
  map: string;
  level: string;
  submap: string | null;
  floor: number | null;
  pos: { x: number; y: number; z: number };
  template: string;
  name: string;
  nameRu: string;
  description: string;
  descriptionRu: string;
  flags: Flag[];
}

export interface ExtractContext {
  templates: TemplateIndex;
  stats: StatsIndex;
  loca: Loca;
  tagNames: Map<string, string>;
  waypoints: WaypointIndex;
  map: string;
  submaps: Submap[];
}

export interface PointResult {
  point: Point | null;
  interesting: boolean;
}

export interface ReportEntry extends PointResult {
  objectName: string;
}

export interface Report {
  total: number;
  byCategory: Record<string, number>;
  interesting: number;
  uncategorizedInteresting: number;
  uncategorizedShare: number;
  noSubmap: number;
  topUncategorized: { name: string; count: number }[];
}

export const waypointNameHandle = "h2020fdf6g224eg40cfg80ecg91fed5d32d11";

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

export function categoryInput(obj: RawObject, ctx: ExtractContext): CategoryInput {
  const resolved = ctx.templates.resolved(obj.template);
  const attrs: Record<string, string> = { ...resolved.attrs };
  for (const [k, v] of Object.entries(obj.attrs)) if (v !== "") attrs[k] = v;
  const tags = [...new Set([...resolved.tags, ...obj.tags])].map((t) => ctx.tagNames.get(t) ?? t);
  const stat = attrs.Stats ? ctx.stats.get(attrs.Stats) : undefined;
  return {
    kind: obj.kind,
    name: obj.name,
    templateNames: resolved.names,
    attrs,
    tags,
    ...(stat ? { stat } : {}),
    hasTradeTreasures: resolved.hasTradeTreasures || obj.tradeTables.some(isTraderTable),
    contents: obj.contents,
    inventory: [...new Set([...resolved.inventory, ...obj.inventory])],
    waypoint: ctx.waypoints.has(obj.id),
  };
}

export function displayName(obj: RawObject, input: CategoryInput, ctx: ExtractContext, lang: "en" | "ru", category?: CategoryId): string {
  const handles = category === "waypoint" ? [ctx.waypoints.nameHandle(obj.id), waypointNameHandle] : [obj.attrs.DisplayName, input.attrs.DisplayName];
  for (const h of handles) {
    const t = ctx.loca.text(h, lang);
    if (t) return t;
  }
  return input.templateNames[0] || obj.name;
}

export function buildPoint(obj: RawObject, ctx: ExtractContext): PointResult {
  const input = categoryInput(obj, ctx);
  const interesting = isInteresting(input);
  const category = categorize(input);
  if (!category) return { point: null, interesting };
  const where = assignSubmap(obj.pos, ctx.submaps);
  const desc = input.attrs.Description;
  return {
    interesting,
    point: {
      id: obj.id,
      category,
      map: ctx.map,
      level: obj.level,
      submap: where.submap,
      floor: where.floor,
      pos: { x: round(obj.pos[0]), y: round(obj.pos[1]), z: round(obj.pos[2]) },
      template: obj.template,
      name: displayName(obj, input, ctx, "en", category),
      nameRu: displayName(obj, input, ctx, "ru", category),
      description: ctx.loca.text(desc, "en") ?? "",
      descriptionRu: ctx.loca.text(desc, "ru") ?? "",
      flags: flags(input),
    },
  };
}

export function buildReport(entries: ReportEntry[]): Report {
  const byCategory: Record<string, number> = {};
  const missing = new Map<string, number>();
  let total = 0;
  let interesting = 0;
  let uncategorized = 0;
  let noSubmap = 0;
  for (const e of entries) {
    if (e.point) {
      total++;
      byCategory[e.point.category] = (byCategory[e.point.category] ?? 0) + 1;
      if (e.point.submap === null) noSubmap++;
    }
    if (e.interesting) {
      interesting++;
      if (!e.point) {
        uncategorized++;
        missing.set(e.objectName, (missing.get(e.objectName) ?? 0) + 1);
      }
    }
  }
  const topUncategorized = [...missing]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 30);
  return {
    total,
    byCategory,
    interesting,
    uncategorizedInteresting: uncategorized,
    uncategorizedShare: interesting ? uncategorized / interesting : 0,
    noSubmap,
    topUncategorized,
  };
}
