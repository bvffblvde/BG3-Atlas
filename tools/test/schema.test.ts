import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { categoryRules } from "../categories.ts";
import { repoRoot } from "../lib/game.ts";

const schema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema.json"), "utf8"));
const sample = JSON.parse(readFileSync(path.join(repoRoot, "data", "sample.json"), "utf8")) as Record<string, unknown>[];
const item = schema.items;

describe("data schema", () => {
  it("lists exactly the categories the rules can produce", () => {
    expect([...item.properties.category.enum].sort()).toEqual(categoryRules.map((r) => r.id).sort());
  });

  it("sample has ten points with exactly the schema fields", () => {
    expect(sample.length).toBe(10);
    for (const p of sample) expect(Object.keys(p).sort()).toEqual([...item.required].sort());
  });

  it("sample values respect enums and types", () => {
    for (const p of sample) {
      expect(item.properties.category.enum).toContain(p.category);
      for (const f of p.flags as string[]) expect(item.properties.flags.items.enum).toContain(f);
      const pos = p.pos as Record<string, number>;
      expect(typeof pos.x + typeof pos.y + typeof pos.z).toBe("numbernumbernumber");
    }
  });
});
