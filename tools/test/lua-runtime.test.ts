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

function run(files: string[], expr: string, prelude = ""): string {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const source = stubs + prelude + "\n" + files.map((f) => readFileSync(path.join(luaDir, f), "utf8")).join("\n") + `\nreturn ${expr}`;
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

  it("reads the explored-only flag", () => {
    const stubbedParse = 'Ext.Json.Parse = function() return { disabled = {}, fogOnly = true } end\n';
    expect(run(["Settings.lua"], `(function() ${stubbedParse} return tostring(S.Parse("x").fogOnly) end)()`)).toBe("true");
    expect(run(["Settings.lua"], "tostring(S.Parse(nil).fogOnly)")).toBe("false");
  });

  it("keeps barrels and remains off until enabled", () => {
    expect(run(["Settings.lua"], 'tostring(S.IsEnabled("container")) .. tostring(S.IsEnabled("remains")) .. tostring(S.IsEnabled("chest"))')).toBe("falsefalsetrue");
    expect(run(["Settings.lua"], '(function() S.SetEnabled("container", true) S.SetEnabled("chest", false) return tostring(S.IsEnabled("container")) .. tostring(S.IsEnabled("chest")) end)()')).toBe("truefalse");
  });

  it("reads enabled default-off categories", () => {
    const stubbedParse = 'Ext.Json.Parse = function() return { disabled = { chest = true }, enabled = { remains = true } } end\n';
    expect(run(["Settings.lua"], `(function() ${stubbedParse} local st = S.Parse("x") return tostring(st.enabled.remains) .. tostring(st.disabled.chest) .. tostring(st.enabled.container) end)()`)).toBe("truetruenil");
  });

  it("treats a missing file as defaults", () => {
    expect(run(["Settings.lua"], "tostring(next(S.Parse(nil).disabled) == nil)")).toBe("true");
  });
});

const foundStubs = `
local store = {}
Ext.Vars = { RegisterModVariable = function() end, GetModVariables = function() return store end }
Ext.Events = { SessionLoaded = { Subscribe = function() end } }
`;


describe("Found", () => {
  const pre = (body: string) => `${foundStubs}\n${body}`;

  it("toggles a new point on, then off as a manual decision", () => {
    expect(run(["../Shared/Found.lua"], "(function() local F = BG3Atlas.Found return tostring(F.Toggle('a')) .. tostring(F.IsFound('a')) .. tostring(F.Toggle('a')) .. tostring(F.IsFound('a')) .. tostring(F.IsBlocked('a')) end)()", pre(""))).toBe("truetruefalsefalsetrue");
  });

  it("keeps a manually cleared point cleared when auto detection marks it", () => {
    expect(run(["../Shared/Found.lua"], "(function() local F = BG3Atlas.Found F.Toggle('a') F.Toggle('a') F.SetFound('a', true) return tostring(F.IsFound('a')) end)()", pre(""))).toBe("false");
  });

  it("reads old saves that only hold found points", () => {
    expect(run(["../Shared/Found.lua"], "(function() local F = BG3Atlas.Found return tostring(F.IsFound('a')) .. tostring(F.IsBlocked('a')) end)()", pre("store.Found = { a = true }"))).toBe("truefalse");
  });
});
