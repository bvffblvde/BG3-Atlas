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

  it.each(files)("%s has no comments", (file) => {
    const ast = luaparse.parse(readFileSync(path.join(luaRoot, file), "utf8"), { luaVersion: "5.3", comments: true });
    expect(ast.comments ?? []).toEqual([]);
  });
});
