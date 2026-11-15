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
      { id: "a", category: "trap", map: "WLD_Main_A", level: "WLD_Main_A", submap: null, floor: null, pos: { x: 0, y: 0, z: 0 }, template: "t", name: "Trap", nameRu: "Ловушка", description: "", descriptionRu: "", flags: ["trapped"] },
      { id: "b", category: "chest", map: "SCL_Main_A", level: "SCL_Main_A", submap: null, floor: null, pos: { x: 0, y: 0, z: 0 }, template: "t", name: "Chest", nameRu: "Сундук", description: "", descriptionRu: "", flags: [] },
    ]),
  );
  const stage = path.join(root, "stage");
  return { lsx, points, stage };
}

describe("buildData", () => {
  it("writes per-map points, submaps, a map index and categories as Lua", () => {
    const { lsx, points, stage } = setup();
    const warnings = buildData({
      pointsFile: points,
      lsxRoot: lsx,
      stageDir: stage,
      submaps: { WLD_Main_A: [{ trigger: "u", building: "Underdark", floor: 1, center: [0, 0, 0], half: [1, 1, 1], rot: [0, 0, 0, 1], area: 4 }] },
    });
    const dir = dataDir(stage);
    const read = (name: string) => {
      const text = readFileSync(path.join(dir, name), "utf8");
      expect(() => luaparse.parse(text, { luaVersion: "5.3" })).not.toThrow();
      return text;
    };
    expect(read("Points_WLD_Main_A.lua")).toContain('{"a","trap",1200,917.5,"Trap","Ловушка",2,nil,nil}');
    expect(read("Submaps_WLD_Main_A.lua")).toContain('{"Underdark",1,');
    expect(read("Maps.lua")).toBe('return {{"WLD_Main_A",-1200,917.5}}\n');
    const cats = read("Categories.lua");
    for (const r of categoryRules) expect(cats).toContain(`"${r.id}"`);
    expect(existsSync(path.join(dir, "Points_SCL_Main_A.lua"))).toBe(false);
    expect(warnings.join(" ")).toContain("SCL_Main_A");
  });

  it("fails with a hint when points.json is missing", () => {
    const { lsx, stage } = setup();
    expect(() => buildData({ pointsFile: path.join(stage, "nope.json"), lsxRoot: lsx, stageDir: stage })).toThrow(/npm run extract/);
    expect(existsSync(dataDir(stage))).toBe(false);
  });
});
