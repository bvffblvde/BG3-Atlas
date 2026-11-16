import { describe, expect, it } from "vitest";
import type { RawObject } from "../lib/level.ts";
import { Loca } from "../lib/loca.ts";
import { parseLsx } from "../lib/lsx.ts";
import { buildPoint, buildReport, dedupePoints, surfaceWaypoints, type ExtractContext, type Point } from "../lib/points.ts";
import { StatsIndex } from "../lib/stats.ts";
import { TemplateIndex } from "../lib/templates.ts";
import { WaypointIndex } from "../lib/waypoints.ts";

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
      ["h-den", "Emerald Grove Environs"],
    ]),
    new Map([
      ["h-chest", "Сундук"],
      ["h2020fdf6g224eg40cfg80ecg91fed5d32d11", "Рунные круги"],
      ["h-den", "Окрестности Изумрудной рощи"],
    ]),
  ),
  tagNames: new Map(),
  waypoints: new WaypointIndex(
    [
      { group: "Act1", key: "WAYP_DEN_Camp", item: "w" },
      { group: "Act2", key: "WAYP_Nameless", item: "w2" },
    ],
    new Map([["WAYP_DEN_Camp", "h-den"]]),
  ),
  map: "WLD_Main_A",
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
      map: "WLD_Main_A",
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
  it("come from story facts and use their own names", () => {
    const { point, interesting } = buildPoint(raw({ id: "w", name: "S_DEN_WaypointShrine", template: "t-vase" }), ctx);
    expect(interesting).toBe(true);
    expect(point?.category).toBe("waypoint");
    expect(point?.name).toBe("Emerald Grove Environs");
    expect(point?.nameRu).toBe("Окрестности Изумрудной рощи");
  });

  it("fall back to the map legend name without a name key", () => {
    const { point } = buildPoint(raw({ id: "w2", template: "t-vase" }), ctx);
    expect(point?.name).toBe("Waypoint");
    expect(point?.nameRu).toBe("Рунные круги");
  });

  it("ignore shrine scenery that is not in the facts", () => {
    expect(buildPoint(raw({ id: "geo", name: "S_DEN_WaypointShrine_geo", template: "t-vase" }), ctx).point).toBe(null);
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

function pt(id: string, category: Point["category"], x: number, y: number, z: number, submap: string | null = null, floor: number | null = null): Point {
  return { id, category, map: "WLD", level: "WLD", submap, floor, pos: { x, y, z }, template: "", name: id, nameRu: id, description: "", descriptionRu: "", flags: [] };
}

describe("surfaceWaypoints", () => {
  const street = [pt("a", "chest", 5, 10, 5), pt("b", "trap", -6, 11, 2), pt("c", "key", 3, 9, -7), pt("d", "book", -4, 10, -3), pt("e", "lever", 8, 10, -1)];

  it("moves a waypoint at street level out of a building submap", () => {
    const out = surfaceWaypoints([...street, pt("w", "waypoint", 0, 10.5, 0, "Apothecary", 0)]);
    const w = out.find((p) => p.id === "w")!;
    expect(w.submap).toBeNull();
    expect(w.floor).toBeNull();
  });

  it("keeps an underground waypoint in its submap", () => {
    const out = surfaceWaypoints([...street, pt("w", "waypoint", 0, -30, 0, "Dungeon", 0)]);
    expect(out.find((p) => p.id === "w")!.submap).toBe("Dungeon");
  });

  it("keeps a waypoint with too few surface neighbours in its submap", () => {
    const out = surfaceWaypoints([pt("a", "chest", 5, 10, 5), pt("w", "waypoint", 0, 10, 0, "Tower", 2)]);
    expect(out.find((p) => p.id === "w")!.submap).toBe("Tower");
  });
});

describe("dedupePoints", () => {
  it("drops a second point with the same name, map and position", () => {
    const out = dedupePoints([pt("a", "chest", 1, 2, 3), { ...pt("b", "chest", 1.04, 2, 3), name: "a" }, { ...pt("c", "chest", 5, 2, 3), name: "a" }]);
    expect(out.map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("keeps points with different names at the same spot", () => {
    const b = { ...pt("b", "book", 1, 2, 3), name: "Other" };
    expect(dedupePoints([pt("a", "book", 1, 2, 3), b])).toHaveLength(2);
  });
});
