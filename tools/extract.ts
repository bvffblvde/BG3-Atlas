import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/game.ts";
import { groupLevels, readGroup } from "./lib/level.ts";
import { Loca, parseLoca } from "./lib/loca.ts";
import { readLsxFile } from "./lib/lsx.ts";
import { mapGroups } from "./lib/maps.ts";
import { buildPoint, buildReport, dedupePoints, surfaceWaypoints, type ExtractContext, type Point, type ReportEntry } from "./lib/points.ts";
import { parseStats, StatsIndex } from "./lib/stats.ts";
import { loadSubmaps } from "./lib/submaps.ts";
import { loadTagNames } from "./lib/tags.ts";
import { TemplateIndex } from "./lib/templates.ts";
import { loadWaypoints } from "./lib/waypoints.ts";

const lsx = path.join(repoRoot, "work", "unpacked", "lsx");
const locaDir = path.join(repoRoot, "work", "unpacked", "loca");
const dataDir = path.join(repoRoot, "data");
const modules = ["Shared", "SharedDev", "Gustav", "GustavDev", "GustavX"];
const sampleCenter = { x: 209.45, z: 427.08 };

if (!existsSync(lsx)) throw new Error("work/unpacked/lsx not found, run npm run unpack first");

function publicFiles(sub: string, filter: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const m of modules) {
    const dir = path.join(lsx, "Public", m, sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) if (filter(name)) out.push(path.join(dir, name));
  }
  return out;
}

function unpacked(level: string): boolean {
  return ["Gustav", "GustavDev"].some((m) => existsSync(path.join(lsx, "Mods", m, "Levels", level)));
}

const t0 = Date.now();
const templates = new TemplateIndex(publicFiles("RootTemplates", (n) => n === "_merged.lsx").map(readLsxFile));
const stats = new StatsIndex(publicFiles(path.join("Stats", "Generated", "Data"), (n) => n.endsWith(".txt")).flatMap((f) => parseStats(readFileSync(f, "utf8"))));
const tagNames = loadTagNames(publicFiles("Tags", (n) => n.endsWith(".lsx")).map(readLsxFile));
const loca = new Loca(parseLoca(readFileSync(path.join(locaDir, "english.xml"), "utf8")), parseLoca(readFileSync(path.join(locaDir, "russian.xml"), "utf8")));
const waypoints = loadWaypoints(lsx);
console.log(`waypoints: ${waypoints.size}`);
console.log(`loaded data in ${Date.now() - t0} ms: ${tagNames.size} tags`);

const entries: ReportEntry[] = [];
let objectCount = 0;
for (const group of mapGroups) {
  if (!unpacked(group.main)) {
    console.log(`skip ${group.main}: not unpacked`);
    continue;
  }
  const levels = groupLevels(lsx, templates, group);
  const submaps = loadSubmaps(lsx, levels);
  const ctx: ExtractContext = { templates, stats, loca, tagNames, waypoints, map: group.main, submaps };
  const objects = readGroup(lsx, templates, group);
  objectCount += objects.length;
  let mapPoints = 0;
  for (const obj of objects) {
    const entry = { ...buildPoint(obj, ctx), objectName: templates.resolved(obj.template).names[0] || obj.name };
    if (entry.point) mapPoints++;
    entries.push(entry);
  }
  console.log(`${group.main}: ${levels.length} levels, ${submaps.length} submaps, ${objects.length} objects, ${mapPoints} points`);
}

const points = dedupePoints(surfaceWaypoints(entries.map((e) => e.point).filter((p): p is Point => p !== null))
  .sort((a, b) => a.map.localeCompare(b.map) || a.category.localeCompare(b.category) || a.id.localeCompare(b.id)));
const report = buildReport(entries);

mkdirSync(dataDir, { recursive: true });
writeFileSync(path.join(dataDir, "points.json"), JSON.stringify(points, null, 1));
writeFileSync(path.join(dataDir, "report.json"), JSON.stringify(report, null, 2));
const sample = points
  .filter((p) => p.map === "WLD_Main_A")
  .sort((a, b) => Math.hypot(a.pos.x - sampleCenter.x, a.pos.z - sampleCenter.z) - Math.hypot(b.pos.x - sampleCenter.x, b.pos.z - sampleCenter.z))
  .slice(0, 10);
writeFileSync(path.join(dataDir, "sample.json"), JSON.stringify(sample, null, 2) + "\n");

console.log(`objects ${objectCount}, points ${report.total}, without submap ${report.noSubmap}`);
for (const [cat, n] of Object.entries(report.byCategory).sort((a, b) => b[1] - a[1])) console.log(`  ${cat.padEnd(14)} ${n}`);
console.log(`interesting ${report.interesting}, uncategorized ${report.uncategorizedInteresting} (${(report.uncategorizedShare * 100).toFixed(1)}%)`);
for (const u of report.topUncategorized) console.log(`  ? ${u.count} ${u.name}`);
console.log(`total ${Date.now() - t0} ms`);
