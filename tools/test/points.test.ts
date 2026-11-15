import { describe, expect, it } from "vitest";
import type { RawObject } from "../lib/level.ts";
import { Loca } from "../lib/loca.ts";
import { parseLsx } from "../lib/lsx.ts";
import { buildPoint, buildReport, type ExtractContext } from "../lib/points.ts";
import { StatsIndex } from "../lib/stats.ts";
import { TemplateIndex } from "../lib/templates.ts";

const templates = new TemplateIndex([
  parseLsx(`<save><region id="Templates"><node id="Templates"><children>
<node id="GameObjects">
<attribute id="MapKey" type="FixedString" value="t-chest" />
<attribute id="Name" type="LSString" value="CONT_GEN_Chest_A" />
<attribute id="Type" type="FixedString" value="item" />
<attribute id="DisplayName" type="TranslatedString" handle="h-chest" version="1" />
<attribute id="Description" type="TranslatedString" handle="h-desc" version="1" />
<attribute id="InventoryType" type="uint8" value="2" />
<children><node id="InventoryList"><children><node id="InventoryItem"><attribute id="Object" type="FixedString" value="Exploration_Minor" /></node></children></node></children>
</node>
<node id="GameObjects">
<attribute id="MapKey" type="FixedString" value="t-vase" />
<attribute id="Name" type="LSString" value="DEC_GEN_Vase_A" />
<attribute id="Type" type="FixedString" value="item" />
</node>
<node id="GameObjects">
<attribute id="MapKey" type="FixedString" value="t-nameless" />
<attribute id="Name" type="LSString" value="PUZ_GEN_Lever_A" />
<attribute id="Type" type="FixedString" value="item" />
<attribute id="DisplayName" type="TranslatedString" handle="h-missing" version="1" />
</node>
</children></node></region></save>`),
]);

const ctx: ExtractContext = {
  templates,
  stats: new StatsIndex([]),
  loca: new Loca(
    new Map([
      ["h-chest", "Chest"],
      ["h-desc", "A sturdy chest"],
      ["h2020fdf6g224eg40cfg80ecg91fed5d32d11", "Waypoint"],
    ]),
    new Map([
      ["h-chest", "Сундук"],
      ["h2020fdf6g224eg40cfg80ecg91fed5d32d11", "Рунные круги"],
    ]),
  ),
  tagNames: new Map(),
  submaps: [{ trigger: "u", building: "Underdark", floor: 2, center: [0, 0, 0], half: [10, 10, 10], rot: [0, 0, 0, 1], area: 400 }],
};

function raw(over: Partial<RawObject>): RawObject {
  return { id: "id", kind: "item", level: "WLD_Main_A", name: "", template: "", pos: [1.234, 2.345, 3.456], attrs: {}, tags: [], contents: [], inventory: [], tradeTables: [], ...over };
}

describe("buildPoint", () => {
  it("builds a categorized point with flags, names and submap", () => {
    const { point, interesting } = buildPoint(raw({ id: "c1", name: "S_Chest", template: "t-chest", attrs: { LockDifficultyClassID: "lock" } }), ctx);
    expect(interesting).toBe(true);
    expect(point).toEqual({
      id: "c1",
      category: "chest",
      level: "WLD_Main_A",
      submap: "Underdark",
      floor: 2,
      pos: { x: 1.23, y: 2.35, z: 3.46 },
      template: "t-chest",
      name: "Chest",
      nameRu: "Сундук",
      description: "A sturdy chest",
      descriptionRu: "A sturdy chest",
      flags: ["locked"],
    });
  });

  it("drops decorations", () => {
    expect(buildPoint(raw({ id: "v", template: "t-vase", name: "DEC_GEN_Vase_A_001" }), ctx)).toEqual({ point: null, interesting: false });
  });

  it("falls back to the template name when localization is missing", () => {
    const { point } = buildPoint(raw({ id: "l", template: "t-nameless", name: "PUZ_GEN_Lever_A_003", pos: [100, 0, 100] }), ctx);
    expect(point?.name).toBe("PUZ_GEN_Lever_A");
    expect(point?.nameRu).toBe("PUZ_GEN_Lever_A");
    expect(point?.submap).toBe(null);
  });
});

describe("waypoints", () => {
  it("use the map legend waypoint name", () => {
    const { point } = buildPoint(raw({ id: "w", name: "S_DEN_WaypointShrine_geo", template: "t-vase" }), ctx);
    expect(point?.category).toBe("waypoint");
    expect(point?.name).toBe("Waypoint");
    expect(point?.nameRu).toBe("Рунные круги");
  });
});

describe("buildReport", () => {
  it("counts categories and the uncategorized share of interesting objects", () => {
    const chest = buildPoint(raw({ id: "c", template: "t-chest" }), ctx);
    const vase = buildPoint(raw({ id: "v", template: "t-vase" }), ctx);
    const r = buildReport([
      { ...chest, objectName: "c" },
      { ...vase, objectName: "v" },
      { point: null, interesting: true, objectName: "PUZ_Statue" },
      { point: null, interesting: true, objectName: "PUZ_Statue" },
    ]);
    expect(r.total).toBe(1);
    expect(r.byCategory.chest).toBe(1);
    expect(r.interesting).toBe(3);
    expect(r.uncategorizedInteresting).toBe(2);
    expect(r.uncategorizedShare).toBeCloseTo(2 / 3);
    expect(r.topUncategorized[0]).toEqual({ name: "PUZ_Statue", count: 2 });
  });
});
