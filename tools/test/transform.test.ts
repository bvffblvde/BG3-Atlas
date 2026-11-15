import { describe, expect, it } from "vitest";
import { composePlacement, identity, parseQuat, parseVec3, rotate, toWorld, type Vec3 } from "../lib/transform.ts";

function close(a: Vec3, b: Vec3, eps = 1e-4) {
  for (let i = 0; i < 3; i++) expect(Math.abs(a[i] - b[i])).toBeLessThan(eps);
}

describe("transform", () => {
  it("rotates 90 degrees around Y", () => {
    close(rotate([0, 0.7071068, 0, 0.7071067], [1, 0, 0]), [0, 0, -1], 1e-5);
  });

  it("translates sublevel local coordinates into world", () => {
    close(toWorld({ pos: [213.57, 0, 689.44], rot: [0, 0, 0, 1], scale: 1 }, [-4.5185, 0, -110.4688]), [209.0515, 0, 578.9712]);
  });

  it("applies scale before rotation and translation", () => {
    close(toWorld({ pos: [10, 0, 0], rot: [0, 0.7071068, 0, 0.7071067], scale: 2 }, [1, 0, 0]), [10, 0, -2]);
  });

  it("composes placements like nested transforms", () => {
    const outer = { pos: [100, 0, 0] as Vec3, rot: parseQuat("0 0.7071068 0 0.7071067"), scale: 1 };
    const inner = { pos: [1, 0, 0] as Vec3, rot: [0, 0, 0, 1] as [number, number, number, number], scale: 1 };
    const both = composePlacement(outer, inner);
    close(toWorld(both, [0, 0, 0]), toWorld(outer, toWorld(inner, [0, 0, 0])));
    close(toWorld(both, [1, 0, 0]), toWorld(outer, toWorld(inner, [1, 0, 0])));
  });

  it("parses vectors and keeps identity neutral", () => {
    expect(parseVec3("1.5 -2 3E-1")).toEqual([1.5, -2, 0.3]);
    close(toWorld(identity, [4, 5, 6]), [4, 5, 6]);
  });
});
