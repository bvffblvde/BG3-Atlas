import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import luaparse from "luaparse";
import { describe, expect, it } from "vitest";
import { categoryRules } from "../categories.ts";
import { buildData, dataDir } from "../lib/builddata.ts";

function setup() {
  const root = mkdtempSync(path.join(tmpdir(), "bg3atlas-data-"));
  const lsx = path.join(root, "lsx");
  const mapDir = path.join(lsx, "Mods", "GustavDev", "Levels", "WLD_Main_A", "WorldMap");
  mkdirSync(mapDir, { recursive: true });
  writeFileSync(
    path.join(mapDir, "MiniMap.lsx"),
    `<save><region id="WorldMapMetaData"><node id="WorldMapMetaData">
<attribute id="WorldHeight" type="float" value="1675" /><attribute id="WorldWidth" type="float" value="1675" />
<attribute id="WorldX" type="float" value="-362.5" /><attribute id="WorldZ" type="float" value="80" />
</node></region></save>`,
  );
  const points = path.join(root, "points.json");
  writeFileSync(
    points,
    JSON.stringify([
      { id: "a", category: "trap", level: "WLD_Main_A", submap: null, floor: null, pos: { x: 0, y: 0, z: 0 }, template: "t", name: "Trap", nameRu: "Ловушка", description: "", descriptionRu: "", flags: ["trapped"] },
    ]),
  );
  const stage = path.join(root, "stage");
  return { lsx, points, stage };
}

describe("buildData", () => {
  it("writes points and categories modules that parse as Lua", () => {
    const { lsx, points, stage } = setup();
    buildData({ pointsFile: points, lsxRoot: lsx, stageDir: stage, submaps: [{ trigger: "u", building: "Underdark", floor: 1, center: [0, 0, 0], half: [1, 1, 1], rot: [0, 0, 0, 1], area: 4 }] });
    const dir = dataDir(stage);
    const pts = readFileSync(path.join(dir, "Wilderness.lua"), "utf8");
    const cats = readFileSync(path.join(dir, "Categories.lua"), "utf8");
    expect(() => luaparse.parse(pts, { luaVersion: "5.3" })).not.toThrow();
    expect(() => luaparse.parse(cats, { luaVersion: "5.3" })).not.toThrow();
    expect(pts).toContain('{"a","trap",1200,917.5,"Trap","Ловушка",2,nil,nil}');
    const subs = readFileSync(path.join(dir, "Submaps.lua"), "utf8");
    expect(() => luaparse.parse(subs, { luaVersion: "5.3" })).not.toThrow();
    expect(subs).toContain('{"Underdark",1,');
    for (const r of categoryRules) expect(cats).toContain(`"${r.id}"`);
  });

  it("fails with a hint when points.json is missing", () => {
    const { lsx, stage } = setup();
    expect(() => buildData({ pointsFile: path.join(stage, "nope.json"), lsxRoot: lsx, stageDir: stage })).toThrow(/npm run extract/);
    expect(existsSync(dataDir(stage))).toBe(false);
  });
});
