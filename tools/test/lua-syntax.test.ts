import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import luaparse from "luaparse";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../lib/game.ts";

const luaRoot = path.join(repoRoot, "mod", "BG3Atlas", "Mods", "BG3Atlas", "ScriptExtender", "Lua");
const files = (readdirSync(luaRoot, { recursive: true }) as string[]).filter((f) => f.endsWith(".lua"));

describe("mod Lua files", () => {
  it("exist", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s parses as Lua 5.3", (file) => {
    const src = readFileSync(path.join(luaRoot, file), "utf8");
    expect(() => luaparse.parse(src, { luaVersion: "5.3" })).not.toThrow();
  });

  it.each(files)("%s has no function with a repeated parameter name", (file) => {
    const src = readFileSync(path.join(luaRoot, file), "utf8");
    const dupes: string[] = [];
    for (const m of src.matchAll(/\bfunction\b\s*[\w.:]*\s*\(([^)]*)\)/g)) {
      const params = m[1].split(",").map((p) => p.trim()).filter(Boolean);
      if (new Set(params).size !== params.length) dupes.push(m[0]);
    }
    expect(dupes).toEqual([]);
  });

  it("repeated parameter check sees a real duplicate", () => {
    const src = "local function f(a, b, a) end";
    const hits = [...src.matchAll(/\bfunction\b\s*[\w.:]*\s*\(([^)]*)\)/g)].filter((m) => {
      const params = m[1].split(",").map((p) => p.trim()).filter(Boolean);
      return new Set(params).size !== params.length;
    });
    expect(hits.length).toBe(1);
  });

  it("map point view model avoids the reserved Id property and reads back what it writes", () => {
    const src = readFileSync(path.join(luaRoot, "Client", "Layer.lua"), "utf8");
    const type = src.match(/RegisterType\("BG3A_Point", \{([\s\S]*?)\n\s*\}\)/);
    expect(type).not.toBeNull();
    const props = [...type![1].matchAll(/(\w+)\s*=\s*\{/g)].map((m) => m[1]);
    expect(props).not.toContain("Id");
    const written = src.match(/P\.Set\(p, "(\w+)", pt\.id\)/);
    const read = src.match(/P\.Get\(item, "(\w+)"\) == id/);
    expect(written?.[1]).toBeDefined();
    expect(read?.[1]).toBe(written![1]);
    expect(props).toContain(written![1]);
    expect(props).toContain("LabelSize");
    expect(src).toMatch(/P\.Set\(p, "LabelSize", /);
  });

  it("layer leaves the UI alone while the set of widgets changes", () => {
    const src = readFileSync(path.join(luaRoot, "Client", "Layer.lua"), "utf8");
    const boot = readFileSync(path.join(luaRoot, "BootstrapClient.lua"), "utf8");
    expect(src).toMatch(/if not BG3Atlas\.Guard\.Settled\(settle, names, .*\) then[\s\S]*?return\r?\n    end/);
    expect(src.indexOf("Guard.Settled")).toBeLessThan(src.indexOf("BG3Atlas.Panel.Reset()"));
    expect(boot.indexOf("Client/Guard.lua")).toBeLessThan(boot.indexOf("Client/Layer.lua"));
  });

  it("layer hides the vanilla legend only on the journal map pages", () => {
    const src = readFileSync(path.join(luaRoot, "Client", "Layer.lua"), "utf8");
    expect(src).toContain('Layer.LegendWidgets = { JournalMap = true, JournalMap_c = true }');
    expect(src).toMatch(/Settings\.HideLegend\(pid\)/);
  });

  it.each(files)("%s has no comments", (file) => {
    const ast = luaparse.parse(readFileSync(path.join(luaRoot, file), "utf8"), { luaVersion: "5.3", comments: true });
    expect(ast.comments ?? []).toEqual([]);
  });
});
