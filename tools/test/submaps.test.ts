import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assignSubmap, floorsAt, loadSubmaps, type Submap } from "../lib/submaps.ts";
import { identity } from "../lib/transform.ts";

function box(trigger: string, building: string | null, floor: number, center: [number, number, number], half: [number, number, number], rot: [number, number, number, number] = [0, 0, 0, 1]): Submap {
  return { trigger, building, floor, center, half, rot, area: 4 * half[0] * half[2] };
}

const region = box("r1", null, 0, [0, 0, 0], [100, 50, 100]);
const smallRegion = box("r2", null, 0, [50, 0, 50], [20, 50, 20]);
const underdark = box("u3", "Underdark", 3, [0, 30, 0], [40, 10, 40]);
const tilted = box("t", "Tilted", 0, [500, 0, 500], [10, 10, 10], [0, 0.3826834, 0, 0.9238795]);

describe("assignSubmap", () => {
  const all = [region, smallRegion, underdark, tilted];

  it("prefers a building over regions", () => {
    expect(assignSubmap([5, 30, 5], all)).toEqual({ submap: "Underdark", floor: 3, trigger: "u3" });
  });

  it("respects building height", () => {
    expect(assignSubmap([5, 0, 5], all).submap).toBe(null);
    expect(assignSubmap([5, 0, 5], all).trigger).toBe("r1");
  });

  it("picks the smallest containing region", () => {
    expect(assignSubmap([55, 0, 55], all).trigger).toBe("r2");
  });

  it("tests rotated boxes in their own frame", () => {
    expect(assignSubmap([509, 0, 509], all).trigger).toBe(null);
    expect(assignSubmap([500, 0, 513], all).trigger).toBe("t");
  });

  it("returns nulls outside every submap", () => {
    expect(assignSubmap([9999, 0, 9999], all)).toEqual({ submap: null, floor: null, trigger: null });
  });
});

function put(root: string, rel: string, xml: string) {
  const file = path.join(root, ...rel.split("/"));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, xml);
}

function meta(trigger: string, building: string, floor: number, x: number, z: number, w: number, h: number) {
  return `<save><region id="WorldMapMetaData"><node id="WorldMapMetaData">
<attribute id="WorldWidth" type="float" value="${w}" /><attribute id="WorldHeight" type="float" value="${h}" />
<attribute id="WorldX" type="float" value="${x}" /><attribute id="WorldZ" type="float" value="${z}" />
<attribute id="BuildingUUID" type="FixedString" value="${building}" /><attribute id="TriggerId" type="guid" value="${trigger}" />
<attribute id="Floor" type="int32" value="${floor}" /></node></region></save>`;
}

describe("loadSubmaps", () => {
  const root = mkdtempSync(path.join(tmpdir(), "bg3atlas-submaps-"));
  put(root, "Mods/GustavDev/Levels/WLD_Main_A/WorldMap/u3.lsx", meta("u3", "Underdark", 3, -37.6, -283.7, 43.6, 42));
  put(root, "Mods/GustavDev/Levels/WLD_Main_A/WorldMap/fallback.lsx", meta("nf", "", 0, 10, 20, 100, 60));
  put(root, "Mods/GustavDev/Levels/WLD_Main_A/WorldMap/MiniMap.lsx", meta("00000000-0000-0000-0000-000000000000", "", 0, 0, 0, 1675, 1675));
  put(
    root,
    "Mods/Gustav/Levels/WLD_Under_C/Triggers/_merged.lsx",
    `<save><region id="Templates"><node id="Templates"><children><node id="GameObjects">
<attribute id="Extents" type="fvec3" value="21.8 5 21" /><attribute id="MapKey" type="FixedString" value="u3" />
<children><node id="Transform"><attribute id="Position" type="fvec3" value="-79.46 33.78 -86.85" /><attribute id="RotationQuat" type="fvec4" value="0 0 0 1" /><attribute id="Scale" type="float" value="1" /></node></children>
</node></children></node></region></save>`,
  );
  const subs = loadSubmaps(root, [
    { level: "WLD_Main_A", placement: identity },
    { level: "WLD_Under_C", placement: { pos: [41.83, 0, -196.85], rot: [0, 0, 0, 1], scale: 1 } },
  ]);

  it("uses the trigger box from the level that owns it, in world coordinates", () => {
    const u = subs.find((s) => s.trigger === "u3")!;
    expect(u.building).toBe("Underdark");
    expect(u.center[0]).toBeCloseTo(-37.63, 2);
    expect(u.center[2]).toBeCloseTo(-283.7, 2);
    expect(u.half).toEqual([21.8, 5, 21]);
  });

  it("falls back to the metadata rectangle with unlimited height", () => {
    const f = subs.find((s) => s.trigger === "nf")!;
    expect(f.center).toEqual([10, 0, 20]);
    expect(f.half[0]).toBe(50);
    expect(f.half[2]).toBe(30);
    expect(f.half[1]).toBe(Infinity);
    expect(f.building).toBe(null);
  });

  it("skips the whole-level minimap entry", () => {
    expect(subs.some((s) => s.trigger === "00000000-0000-0000-0000-000000000000")).toBe(false);
  });
});

describe("floorsAt", () => {
  const flat1 = box("k1", "Keep", 1, [0, 0, 0], [50, Infinity, 50]);
  const flat2 = box("k2", "Keep", 2, [10, 0, 10], [30, Infinity, 30]);
  const solid1 = box("s1", "Tower", 1, [0, 0, 0], [50, 5, 50]);
  const solid2 = box("s2", "Tower", 2, [0, 10, 0], [50, 5, 50]);

  it("lists every floor of the building when floors have no height and overlap", () => {
    expect(floorsAt([12, 20, 12], [flat1, flat2], "Keep")).toEqual([1, 2]);
  });

  it("keeps one floor where only one flat floor covers the point", () => {
    expect(floorsAt([-40, 0, -40], [flat1, flat2], "Keep")).toEqual([1]);
  });

  it("keeps one floor when floors have real heights", () => {
    expect(floorsAt([0, 9, 0], [solid1, solid2], "Tower")).toEqual([2]);
  });

  it("returns nothing for another building", () => {
    expect(floorsAt([12, 20, 12], [flat1, flat2], "Other")).toEqual([]);
  });
});
