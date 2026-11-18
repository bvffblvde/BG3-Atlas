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

describe("Search.Fold", () => {
  it("drops latin diacritics and folds yo for matching", () => {
    expect(run(["Search.lua"], 'Search.Fold("Chá AÇÃO Élan ÜBER Ёлка")')).toBe("cha acao elan uber елка");
  });
});

const localeFiles = ["Locale.lua", "Locale/en.lua", "Locale/ru.lua", "Locale/pt-BR.lua"];

describe("Locale", () => {
  it("detects the game language from the probe string", () => {
    expect(run(localeFiles, 'BG3Atlas.Locale.Detect("Рунные круги")')).toBe("ru");
    expect(run(localeFiles, 'BG3Atlas.Locale.Detect("Waypoint")')).toBe("en");
    expect(run(localeFiles, 'BG3Atlas.Locale.Detect("Wegpunkt")')).toBe("en");
    expect(run(localeFiles, "BG3Atlas.Locale.Detect(nil)")).toBe("en");
  });

  it("ignores letter case and surrounding spaces in the probe string", () => {
    expect(run(localeFiles, 'BG3Atlas.Locale.Detect("Pontos de rota")')).toBe("pt-BR");
    expect(run(localeFiles, 'BG3Atlas.Locale.Detect("Pontos de Rota")')).toBe("pt-BR");
    expect(run(localeFiles, 'BG3Atlas.Locale.Detect(" PONTOS DE ROTA ")')).toBe("pt-BR");
  });

  it("falls back to English for missing keys and unknown languages", () => {
    expect(run(localeFiles, 'BG3Atlas.Locale.Text("ru").chest')).toBe("Сундуки");
    expect(run(localeFiles, 'BG3Atlas.Locale.Text("xx").chest')).toBe("Chests");
    expect(run(localeFiles, '(function() BG3Atlas.Locale.Add("zz", { title = "Z" }) local t = BG3Atlas.Locale.Text("zz") return t.title .. t.chest end)()')).toBe("ZChests");
  });

  it("gives every language exactly the English keys", () => {
    const expr = `(function()
      local L = BG3Atlas.Locale
      local bad = {}
      for code, t in pairs(L.Raw()) do
        for k in pairs(L.Raw().en) do if t[k] == nil then bad[#bad + 1] = code .. " missing " .. k end end
        for k in pairs(t) do if L.Raw().en[k] == nil then bad[#bad + 1] = code .. " extra " .. k end end
      end
      table.sort(bad)
      return table.concat(bad, ",")
    end)()`;
    expect(run(localeFiles, expr)).toBe("");
  });
});

describe("Settings per player view", () => {
  it("keeps map style and fog mode separate per player", () => {
    const expr = '(function() S.NextMapStyle(2) S.SetFogOnly(false, 2) return S.MapStyle(1) .. tostring(S.FogOnly(1)) .. S.MapStyle(2) .. tostring(S.FogOnly(2)) end)()';
    expect(run(["Settings.lua"], expr)).toBe("0true1false");
  });

  it("reads per player view settings and falls back to the shared ones", () => {
    const parse = 'Ext.Json.Parse = function() return { mapStyle = 1, fogOnly = false, view = { ["2"] = { mapStyle = 2, fogOnly = true } } } end\n';
    expect(run(["Settings.lua"], `(function() ${parse} S.Load = nil local st = S.Parse("x") return st.view["1"].mapStyle .. tostring(st.view["1"].fogOnly) .. st.view["2"].mapStyle .. tostring(st.view["2"].fogOnly) end)()`)).toBe("1false2true");
  });
});

describe("Settings panel size and legend", () => {
  it("cycles panel size per player and maps it to a scale", () => {
    const expr = '(function() local out = {} for _ = 1, 4 do S.NextPanelSize(2) out[#out + 1] = S.PanelSize(2) end return table.concat(out, ",") .. " " .. S.PanelSize(1) .. " " .. S.PanelScale(0) .. "/" .. S.PanelScale(1) .. "/" .. S.PanelScale(2) .. "/" .. S.PanelScale(9) end)()';
    expect(run(["Settings.lua"], expr)).toBe("1,2,0,1 0 1/1.3/1.6/1");
  });

  it("hides the legend per player", () => {
    const expr = '(function() S.SetHideLegend(true, 2) return tostring(S.HideLegend(1)) .. tostring(S.HideLegend(2)) end)()';
    expect(run(["Settings.lua"], expr)).toBe("falsetrue");
  });

  it("reads panel size and legend for player 1 from the top level and others from view", () => {
    const parse = 'Ext.Json.Parse = function() return { panelSize = 2, hideLegend = true, view = { ["2"] = { panelSize = 1, hideLegend = false }, ["3"] = { panelSize = 8 } } } end\n';
    const expr = `(function() ${parse} local st = S.Parse("x") return st.view["1"].panelSize .. tostring(st.view["1"].hideLegend) .. st.view["2"].panelSize .. tostring(st.view["2"].hideLegend) .. st.view["3"].panelSize .. tostring(st.view["3"].hideLegend) end)()`;
    expect(run(["Settings.lua"], expr)).toBe("2true1false0false");
  });

  it("saves panel size and legend at the top level and per player", () => {
    const save = 'local written = nil Ext.IO.SaveFile = function(_, t) written = t end\n';
    const expr = `(function() ${save} S.NextPanelSize(1) S.SetHideLegend(true, 1) S.NextPanelSize(2) S.NextPanelSize(2) S.Save() return written end)()`;
    const out = run(["Settings.lua"], expr);
    expect(out).toContain('"panelSize":1');
    expect(out).toContain('"hideLegend":true');
    expect(out).toContain('"2":{"fogOnly":true,"mapStyle":0,"panelSize":2,"hideLegend":false}');
  });
});

describe("Panel.Nav", () => {
  const nav = (cur: number, dir: string, n = 21) => run(["Panel.lua"], `tostring(BG3Atlas.Panel.Nav(${cur}, "${dir}", ${n}))`);

  it("moves left and right through categories and the option row, wrapping", () => {
    expect(nav(1, "next")).toBe("2");
    expect(nav(23, "next")).toBe("1");
    expect(nav(1, "prev")).toBe("23");
  });

  it("moves down a column into the option row and back to the top", () => {
    expect(nav(1, "down")).toBe("3");
    expect(nav(21, "down")).toBe("22");
    expect(nav(20, "down")).toBe("21");
    expect(nav(23, "down")).toBe("2");
    expect(nav(22, "down")).toBe("1");
  });

  it("moves up from the option row into the last category row", () => {
    expect(nav(22, "up")).toBe("21");
    expect(nav(23, "up")).toBe("21");
    expect(nav(1, "up")).toBe("22");
    expect(nav(2, "up")).toBe("23");
  });

  it("works with an even number of categories", () => {
    expect(nav(19, "down", 20)).toBe("21");
    expect(nav(20, "down", 20)).toBe("22");
    expect(nav(22, "up", 20)).toBe("20");
  });
});

describe("Settings map style", () => {
  it("cycles normal, no grid, clear and back", () => {
    expect(run(["Settings.lua"], '(function() local out = {} for _ = 1, 4 do S.NextMapStyle() out[#out + 1] = S.MapStyle() end return table.concat(out, ",") end)()')).toBe("1,2,0,1");
  });

  it("maps each style to grid and fog opacity", () => {
    expect(run(["Settings.lua"], '(function() local out = {} for st = 0, 2 do local g, f = S.StyleOpacity(st, 0.2) out[#out + 1] = g .. "/" .. f end return table.concat(out, " ") end)()')).toBe("0.2/1 0.0/1 0.0/0.8");
  });
});

describe("Settings.Parse", () => {
  it("treats broken json as defaults", () => {
    expect(run(["Settings.lua"], 'tostring(next(S.Parse("{oops").disabled) == nil and S.Parse("{oops").hideFound == false)')).toBe("true");
  });

  it("reads the explored-only flag", () => {
    const stubbedParse = 'Ext.Json.Parse = function() return { disabled = {}, fogOnly = true } end\n';
    expect(run(["Settings.lua"], `(function() ${stubbedParse} return tostring(S.Parse("x").fogOnly) end)()`)).toBe("true");
    expect(run(["Settings.lua"], "tostring(S.Parse(nil).fogOnly)")).toBe("true");
    const off = 'Ext.Json.Parse = function() return { fogOnly = false } end\n';
    expect(run(["Settings.lua"], `(function() ${off} return tostring(S.Parse("x").fogOnly) end)()`)).toBe("false");
  });

  it("keeps barrels and remains off until enabled", () => {
    expect(run(["Settings.lua"], 'tostring(S.IsEnabled("container")) .. tostring(S.IsEnabled("remains")) .. tostring(S.IsEnabled("chest"))')).toBe("falsefalsetrue");
    expect(run(["Settings.lua"], '(function() S.SetEnabled("container", true) S.SetEnabled("chest", false) return tostring(S.IsEnabled("container")) .. tostring(S.IsEnabled("chest")) end)()')).toBe("truefalse");
  });

  it("reads enabled default-off categories", () => {
    const stubbedParse = 'Ext.Json.Parse = function() return { disabled = { chest = true }, enabled = { remains = true } } end\n';
    expect(run(["Settings.lua"], `(function() ${stubbedParse} local st = S.Parse("x") return tostring(st.enabled.remains) .. tostring(st.disabled.chest) .. tostring(st.enabled.container) end)()`)).toBe("truetruenil");
  });

  it("reads a language override", () => {
    const stubbedParse = 'Ext.Json.Parse = function() return { language = "pt-BR" } end\n';
    expect(run(["Settings.lua"], `(function() ${stubbedParse} return tostring(S.Parse("x").language) end)()`)).toBe("pt-BR");
    expect(run(["Settings.lua"], "tostring(S.Parse(nil).language)")).toBe("nil");
    expect(run(["Settings.lua"], "tostring(S.Parse(nil).mapStyle)")).toBe("0");
    const old = 'Ext.Json.Parse = function() return { hideGrid = true } end\n';
    expect(run(["Settings.lua"], `(function() ${old} return tostring(S.Parse("x").mapStyle) end)()`)).toBe("1");
    const clear = 'Ext.Json.Parse = function() return { mapStyle = 2 } end\n';
    expect(run(["Settings.lua"], `(function() ${clear} return tostring(S.Parse("x").mapStyle) end)()`)).toBe("2");
    const bad = 'Ext.Json.Parse = function() return { mapStyle = 7 } end\n';
    expect(run(["Settings.lua"], `(function() ${bad} return tostring(S.Parse("x").mapStyle) end)()`)).toBe("0");
  });

  it("treats a missing file as defaults", () => {
    expect(run(["Settings.lua"], "tostring(next(S.Parse(nil).disabled) == nil)")).toBe("true");
  });
});

const foundStubs = `
local saved = {}
local sent = {}
local listeners = {}
local side = "client"
Ext.Vars = { RegisterModVariable = function() end, GetModVariables = function() return saved end }
Ext.Events = { SessionLoaded = { Subscribe = function() end } }
Ext.IsClient = function() return side == "client" end
Ext.IsServer = function() return side == "server" end
Ext.ClientNet = { PostMessageToServer = function(channel, payload) sent[#sent + 1] = channel .. "|" .. payload end }
Ext.RegisterNetListener = function(channel, fn) listeners[channel] = fn end
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
    expect(run(["../Shared/Found.lua"], "(function() local F = BG3Atlas.Found return tostring(F.IsFound('a')) .. tostring(F.IsBlocked('a')) end)()", pre("saved.Found = { a = true }"))).toBe("truefalse");
  });

  it("sends every client change to the server instead of writing the variable", () => {
    const expr = "(function() local F = BG3Atlas.Found F.Toggle('a') F.Toggle('a') F.Toggle('b') F.Toggle('b') F.Toggle('b') return table.concat(sent, ' ') .. ' ' .. tostring(saved.Found) end)()";
    expect(run(["../Shared/Found.lua"], expr, pre(""))).toBe("BG3Atlas_Found|on:a BG3Atlas_Found|off:a BG3Atlas_Found|on:b BG3Atlas_Found|off:b BG3Atlas_Found|on:b nil");
  });

  it("sends a clear when auto detection unmarks a point", () => {
    const expr = "(function() local F = BG3Atlas.Found F.SetFound('a', true) F.SetFound('a', false) return table.concat(sent, ' ') end)()";
    expect(run(["../Shared/Found.lua"], expr, pre(""))).toBe("BG3Atlas_Found|on:a BG3Atlas_Found|clear:a");
  });

  it("decodes only well formed messages", () => {
    const expr = "(function() local F = BG3Atlas.Found local out = {} for _, m in ipairs({ 'on:a-1', 'off:b', 'clear:c', 'bad', 'on:', 'maybe:x' }) do local id, v = F.Decode(m) out[#out + 1] = tostring(id) .. '=' .. tostring(v) end return table.concat(out, ' ') end)()";
    expect(run(["../Shared/Found.lua"], expr, pre(""))).toBe("a-1=true b=false c=nil nil=nil nil=nil nil=nil");
  });

  it("stores client messages in the saved variable on the server", () => {
    const expr = "(function() local fn = listeners.BG3Atlas_Found fn('BG3Atlas_Found', 'on:a') fn('BG3Atlas_Found', 'off:b') fn('BG3Atlas_Found', 'on:c') fn('BG3Atlas_Found', 'clear:c') fn('BG3Atlas_Found', 'junk') return tostring(saved.Found.a) .. tostring(saved.Found.b) .. tostring(saved.Found.c) end)()";
    expect(run(["../Shared/Found.lua"], expr, pre('side = "server"'))).toBe("truefalsenil");
  });

  it("keeps marks made before the saved variable reached the client", () => {
    const expr = "(function() local F = BG3Atlas.Found F.Toggle('a') saved.Found = { b = true } return tostring(F.IsFound('a')) .. tostring(F.IsFound('b')) end)()";
    expect(run(["../Shared/Found.lua"], expr, pre(""))).toBe("truetrue");
  });
});

const hotkeyStubs = `
BG3Atlas.Probe = { Str = tostring }
Ext.Events = { KeyInput = { Subscribe = function() end }, ControllerButtonInput = { Subscribe = function() end }, ControllerAxisInput = { Subscribe = function() end } }
`;

describe("Hotkey.DevicePlayer", () => {
  const call = (which: number, lists: string) => run(["Hotkey.lua"], `tostring(BG3Atlas.Hotkey.DevicePlayer(${which}, ${lists}))`, hotkeyStubs);

  it("maps an SDL controller to the player of its device slot", () => {
    expect(call(0, "{ [3] = 2, [4] = 1 }")).toBe("2");
    expect(call(1, "{ [3] = 2, [4] = 1 }")).toBe("1");
    expect(call(1, "{ [4] = 3 }")).toBe("3");
  });

  it("returns nil when no player owns the controller", () => {
    expect(call(5, "{ [3] = 2, [4] = 1 }")).toBe("nil");
    expect(call(0, "nil")).toBe("nil");
  });
});

describe("Hotkey.AllowFor", () => {
  it("lets a panel command through only for the player who pressed", () => {
    const expr = '(function() local H = BG3Atlas.Hotkey H.NotePress(2, 1000) return tostring(H.AllowFor(2, 1050)) .. tostring(H.AllowFor(1, 1050)) .. tostring(H.AllowFor(1, 2000)) end)()';
    expect(run(["Hotkey.lua"], expr, hotkeyStubs)).toBe("truefalsetrue");
  });

  it("allows everything when the presser is unknown", () => {
    expect(run(["Hotkey.lua"], '(function() local H = BG3Atlas.Hotkey H.NotePress(nil, 1000) return tostring(H.AllowFor(1, 1010)) end)()', hotkeyStubs)).toBe("true");
  });
});

describe("Hotkey.Fresh", () => {
  it("lets a command through once per press even if several panels fire it", () => {
    const expr = '(function() local H = BG3Atlas.Hotkey local seen = {} return tostring(H.Fresh(seen, "PadToggle", 1000)) .. tostring(H.Fresh(seen, "PadToggle", 1010)) .. tostring(H.Fresh(seen, "PadNext", 1010)) .. tostring(H.Fresh(seen, "PadToggle", 1200)) end)()';
    expect(run(["Hotkey.lua"], expr, hotkeyStubs)).toBe("truefalsetruetrue");
  });
});

describe("Hotkey.Accept", () => {
  it("ignores a second F press within the debounce window", () => {
    expect(run(["Hotkey.lua"], "tostring(BG3Atlas.Hotkey.Accept(1000, 900))", hotkeyStubs)).toBe("false");
    expect(run(["Hotkey.lua"], "tostring(BG3Atlas.Hotkey.Accept(1300, 900))", hotkeyStubs)).toBe("true");
  });
});

describe("Hotkey.TriggerPressed", () => {
  it("fires once when LT crosses the threshold on the open gamepad map", () => {
    const call = (axis: string, value: number, was: string, open: string) => run(["Hotkey.lua"], `tostring(BG3Atlas.Hotkey.TriggerPressed("${axis}", ${value}, ${was}, ${open}))`, hotkeyStubs);
    expect(call("TriggerLeft", 0.9, "false", "true")).toBe("true");
    expect(call("TriggerLeft", 0.9, "true", "true")).toBe("false");
    expect(call("TriggerLeft", 0.9, "false", "false")).toBe("false");
    expect(call("TriggerLeft", 0.2, "false", "true")).toBe("false");
    expect(call("TriggerRight", 0.9, "false", "true")).toBe("false");
  });
});

describe("Hotkey.PadFog", () => {
  const call = (button: string, ev: string, open: string) => run(["Hotkey.lua"], `tostring(BG3Atlas.Hotkey.PadFog("${button}", "${ev}", ${open}))`, hotkeyStubs);

  it("toggles the fog mode with LB only while the gamepad map is open", () => {
    expect(call("LeftShoulder", "KeyDown", "true")).toBe("true");
    expect(call("LeftShoulder", "KeyDown", "false")).toBe("false");
    expect(call("LeftShoulder", "KeyUp", "true")).toBe("false");
    expect(call("RightShoulder", "KeyDown", "true")).toBe("false");
  });
});

describe("Hotkey.PadTarget", () => {
  const call = (button: string, ev: string, players: string) => run(["Hotkey.lua"], `tostring(BG3Atlas.Hotkey.PadTarget("${button}", "${ev}", ${players}))`, hotkeyStubs);

  it("marks for the only pad player hovering a point when RB goes down", () => {
    expect(call("RightShoulder", "KeyDown", "{ 2 }")).toBe("2");
  });

  it("ignores other buttons, key up and nobody hovering", () => {
    expect(call("Y", "KeyDown", "{ 1 }")).toBe("nil");
    expect(call("RightShoulder", "KeyUp", "{ 1 }")).toBe("nil");
    expect(call("RightShoulder", "KeyDown", "{}")).toBe("nil");
  });

  it("picks the first player when several pad players hover", () => {
    expect(call("RightShoulder", "KeyDown", "{ 1, 2 }")).toBe("1");
  });
});

const detectStubs = `
BG3Atlas.Probe = {}
BG3Atlas.Found = {}
Ext.Events = { SessionLoaded = { Subscribe = function() end } }
`;

describe("Detect", () => {
  const byCategory = `{
    chest = { { id = "c1", x = 10, y = 10, map = "WLD", name = "Chest" }, { id = "c2", x = 500, y = 500, map = "WLD", name = "Far" } },
    scroll = { { id = "s1", x = 12, y = 9, map = "WLD", name = "Scroll" }, { id = "s2", x = 10, y = 10, map = "SCL", name = "Other map" } },
    lever = { { id = "l1", x = 10, y = 10, map = "WLD", name = "Lever" } },
  }`;

  it("queues only detectable points of the current map", () => {
    const expr = `(function() local q = BG3Atlas.Detect.BuildQueue(${byCategory}, "WLD") local ids = {} for _, e in ipairs(q) do ids[#ids + 1] = e.id end table.sort(ids) return table.concat(ids, ",") end)()`;
    expect(run(["Detect.lua"], expr, detectStubs)).toBe("c1,c2,s1");
  });

  it("finds queued points near the player", () => {
    const expr = `(function() local q = BG3Atlas.Detect.BuildQueue(${byCategory}, "WLD") local ids = {} for _, e in ipairs(BG3Atlas.Detect.Near(q, 11, 11, 40)) do ids[#ids + 1] = e.id end table.sort(ids) return table.concat(ids, ",") end)()`;
    expect(run(["Detect.lua"], expr, detectStubs)).toBe("c1,s1");
  });
});

describe("Guard.Settled", () => {
  const g = (body: string) => run(["Guard.lua"], `(function() local G = BG3Atlas.Guard local st = {} ${body} end)()`);

  it("does not wait when widgets only appear, like opening the map", () => {
    expect(g('local a = G.Settled(st, {}, 0, 500) local b = G.Settled(st, { "JournalMap@1", "BG3A_PanelWidget@1" }, 100, 500) return tostring(a) .. tostring(b)')).toBe("truetrue");
  });

  it("waits after a widget disappears, like switching from pad to mouse", () => {
    expect(g('G.Settled(st, { "JournalMap_c@1", "Minimap@1" }, 0, 500) local a = G.Settled(st, { "JournalMap@1", "Minimap@1" }, 100, 500) local b = G.Settled(st, { "JournalMap@1", "Minimap@1" }, 500, 500) local c = G.Settled(st, { "JournalMap@1", "Minimap@1" }, 600, 500) return tostring(a) .. tostring(b) .. tostring(c)')).toBe("falsefalsetrue");
  });

  it("restarts the wait when another widget disappears during it", () => {
    expect(g('G.Settled(st, { "A", "B", "C" }, 0, 500) G.Settled(st, { "A", "B" }, 100, 500) local a = G.Settled(st, { "A" }, 400, 500) local b = G.Settled(st, { "A" }, 800, 500) local c = G.Settled(st, { "A" }, 900, 500) return tostring(a) .. tostring(b) .. tostring(c)')).toBe("falsefalsetrue");
  });
});
