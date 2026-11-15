import { describe, expect, it } from "vitest";
import { parseStats, StatsIndex } from "../lib/stats.ts";

const text = `new entry "_BaseWeapon"
type "Weapon"
data "Rarity" "Common"

new entry "WPN_Base"
type "Weapon"
using "_BaseWeapon"
data "Damage" "1d6"
data "Rarity" "Rare"

new entry "WPN_Unique"
using "WPN_Base"
data "Damage" "1d8"
`;

describe("stats", () => {
  const entries = parseStats(text);
  const index = new StatsIndex(entries);

  it("parses entries with their raw data", () => {
    expect(entries.map((e) => e.name)).toEqual(["_BaseWeapon", "WPN_Base", "WPN_Unique"]);
    expect(entries[2].data.__using).toBe("WPN_Base");
  });

  it("merges data through two levels of using, child wins", () => {
    const e = index.get("WPN_Unique")!;
    expect(e.data.Damage).toBe("1d8");
    expect(e.data.Rarity).toBe("Rare");
  });

  it("inherits the type when the entry has none", () => {
    expect(index.get("WPN_Unique")!.type).toBe("Weapon");
  });

  it("returns undefined for unknown entries", () => {
    expect(index.get("NOPE")).toBeUndefined();
  });

  it("survives using cycles", () => {
    const cyclic = new StatsIndex(parseStats('new entry "A"\nusing "B"\n\nnew entry "B"\nusing "A"\n'));
    expect(cyclic.get("A")?.name).toBe("A");
  });
});
