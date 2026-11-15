import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../lib/game.ts";
import { submapsLua } from "../lib/mapdata.ts";
import { assignSubmap, type Submap } from "../lib/submaps.ts";
import type { Vec3 } from "../lib/transform.ts";

const fengari = require("fengari");
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

const luaFile = path.join(repoRoot, "mod", "BG3Atlas", "Mods", "BG3Atlas", "ScriptExtender", "Lua", "Client", "Submaps.lua");

function box(trigger: string, building: string | null, floor: number, center: Vec3, half: Vec3, rot: [number, number, number, number]): Submap {
  return { trigger, building, floor, center, half, rot, area: 4 * half[0] * half[2] };
}

const subs: Submap[] = [
  box("r1", null, 0, [0, 0, 0], [500, Infinity, 500], [0, 0, 0, 1]),
  box("u0", "Underdark", 0, [100, -40, 100], [80, 20, 80], [0, 0, 0, 1]),
  box("u1", "Underdark", 1, [100, -10, 100], [80, 10, 80], [0, 0, 0, 1]),
  box("t", "Tower", 2, [-200, 5, 50], [10, 10, 30], [0, 0.3826834, 0, 0.9238795]),
  box("small", "Hut", 0, [110, -40, 110], [5, 20, 5], [0, 0, 0, 1]),
];

function luaAssign(points: Vec3[]): string[] {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const data = submapsLua(subs).replace(/^return /, "");
  const stub = `BG3Atlas = {}\nExt = { Require = function() return ${data} end }\n`;
  const calls = points.map((p) => `do local s, f = Submaps.Assign(${p.join(",")}) out[#out + 1] = tostring(s) .. "#" .. tostring(f) end`).join("\n");
  const src = `${stub}${readFileSync(luaFile, "utf8")}\nlocal Submaps = BG3Atlas.Submaps\nlocal out = {}\n${calls}\nreturn table.concat(out, "|")`;
  if (lauxlib.luaL_loadstring(L, to_luastring(src)) !== lua.LUA_OK || lua.lua_pcall(L, 0, 1, 0) !== lua.LUA_OK) {
    throw new Error(to_jsstring(lua.lua_tostring(L, -1)));
  }
  return to_jsstring(lua.lua_tostring(L, -1)).split("|");
}

describe("Submaps.lua", () => {
  it("matches the TypeScript assignment on a grid of points", () => {
    const points: Vec3[] = [];
    for (let x = -260; x <= 220; x += 13) for (let z = -40; z <= 220; z += 11) for (const y of [-45, -15, 0, 8]) points.push([x, y, z]);
    const expected = points.map((p) => {
      const a = assignSubmap(p, subs);
      return `${a.submap ?? "nil"}#${a.floor ?? "nil"}`;
    });
    expect(luaAssign(points)).toEqual(expected);
    expect(new Set(expected).size).toBeGreaterThan(3);
  });
});
