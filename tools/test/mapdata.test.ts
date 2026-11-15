import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import luaparse from "luaparse";
import { describe, expect, it } from "vitest";
import { luaString, pointsLua, readMapOrigin, toMapLocal } from "../lib/mapdata.ts";
import type { Point } from "../lib/points.ts";

function point(over: Partial<Point>): Point {
  return {
    id: "id",
    category: "chest",
    level: "WLD_Main_A",
    submap: null,
    floor: null,
    pos: { x: 212.35, y: 0, z: 425.93 },
    template: "t",
    name: "Chest",
    nameRu: "Сундук",
    description: "",
    descriptionRu: "",
    flags: [],
    ...over,
  };
}

const origin = { x: -1200, z: 917.5 };

describe("toMapLocal", () => {
  it("moves the origin to the top-left map corner and flips z", () => {
    const [x, y] = toMapLocal(origin, 212.35, 425.93);
    expect(x).toBeCloseTo(1412.35, 6);
    expect(y).toBeCloseTo(491.57, 6);
  });
});

describe("readMapOrigin", () => {
  it("reads the minimap metadata of the level", () => {
    const root = mkdtempSync(path.join(tmpdir(), "bg3atlas-origin-"));
    const dir = path.join(root, "Mods", "GustavDev", "Levels", "WLD_Main_A", "WorldMap");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "MiniMap.lsx"),
      `<save><region id="WorldMapMetaData"><node id="WorldMapMetaData">
<attribute id="WorldHeight" type="float" value="1675" /><attribute id="WorldWidth" type="float" value="1675" />
<attribute id="WorldX" type="float" value="-362.5" /><attribute id="WorldZ" type="float" value="80" />
</node></region></save>`,
    );
    expect(readMapOrigin(root, "WLD_Main_A")).toEqual({ x: -1200, z: 917.5 });
  });
});

describe("luaString", () => {
  it("escapes quotes, backslashes and line breaks", () => {
    expect(luaString('a"b\\c\nd')).toBe('"a\\"b\\\\c\\nd"');
  });
});

describe("pointsLua", () => {
  const lua = pointsLua(
    [
      point({ id: "surface", flags: ["locked", "hidden"], name: 'Odd "name"\\x\nline' }),
      point({ id: "below", submap: "Underdark", floor: 2 }),
    ],
    origin,
  );

  it("is valid Lua", () => {
    expect(() => luaparse.parse(lua, { luaVersion: "5.3" })).not.toThrow();
  });

  it("keeps only surface points", () => {
    expect(lua).toContain('"surface"');
    expect(lua).not.toContain('"below"');
  });

  it("writes map coordinates and the flag mask", () => {
    expect(lua).toContain('{"surface","chest",1412.35,491.57,');
    expect(lua.trimEnd().endsWith("}")).toBe(true);
    expect(lua).toMatch(/,5\}/);
  });
});
