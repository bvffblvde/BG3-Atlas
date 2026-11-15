import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../lib/game.ts";

const fengari = require("fengari");
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

const luaDir = path.join(repoRoot, "mod", "BG3Atlas", "Mods", "BG3Atlas", "ScriptExtender", "Lua", "Client");

const stubs = `
BG3Atlas = { Points = { ByCategory = function() return {} end }, Settings = { Language = function() return "ru" end } }
Ext = { Json = { Parse = function() error("bad json") end }, IO = {} }
`;

function run(files: string[], expr: string): string {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const source = stubs + files.map((f) => readFileSync(path.join(luaDir, f), "utf8")).join("\n") + `\nreturn ${expr}`;
  if (lauxlib.luaL_loadstring(L, to_luastring(source)) !== lua.LUA_OK || lua.lua_pcall(L, 0, 1, 0) !== lua.LUA_OK) {
    throw new Error(to_jsstring(lua.lua_tostring(L, -1)));
  }
  return to_jsstring(lua.lua_tostring(L, -1));
}

describe("Search.Lower", () => {
  it("lowercases latin and cyrillic including Ё", () => {
    expect(run(["Search.lua"], 'Search.Lower("Everburn ЁЛКА Привет АЯ")')).toBe("everburn ёлка привет ая");
  });

  it("leaves lowercase text unchanged", () => {
    expect(run(["Search.lua"], 'Search.Lower("сундук ёж")')).toBe("сундук ёж");
  });
});

describe("Settings.Parse", () => {
  it("treats broken json as defaults", () => {
    expect(run(["Settings.lua"], 'tostring(next(S.Parse("{oops").disabled) == nil and S.Parse("{oops").hideFound == false)')).toBe("true");
  });

  it("treats a missing file as defaults", () => {
    expect(run(["Settings.lua"], "tostring(next(S.Parse(nil).disabled) == nil)")).toBe("true");
  });
});
