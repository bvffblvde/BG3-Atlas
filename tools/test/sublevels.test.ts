import { describe, expect, it } from "vitest";
import { parseLsx } from "../lib/lsx.ts";
import { findSubLevels, isWildernessSubLevel } from "../lib/sublevels.ts";

function lt(name: string, template: string, pos: string, rot = "0 0 0 1") {
  return `<node id="GameObjects">
<attribute id="MapKey" type="FixedString" value="${name}-key" />
<attribute id="Name" type="LSString" value="${name}" />
<attribute id="TemplateName" type="FixedString" value="${template}" />
<attribute id="Type" type="FixedString" value="LevelTemplate" />
<children><node id="Transform">
<attribute id="Position" type="fvec3" value="${pos}" />
<attribute id="RotationQuat" type="fvec4" value="${rot}" />
<attribute id="Scale" type="float" value="1" />
</node></children></node>`;
}

const xml = `<save><region id="Templates"><node id="Templates"><children>
${lt("LT_WLD_Grove", "t-grove", "213.57 0 689.44")}
${lt("LT_WLD_Grove_Again", "t-grove", "0 0 0")}
${lt("LT_CMP_Basement", "t-basement", "-1090 0 -52")}
${lt("LT_Unknown", "t-unknown", "1 1 1")}
</children></node></region></save>`;

const subLevels = new Map([
  ["t-grove", "WLD_RangerCamp_I"],
  ["t-basement", "CMP_Basement_A"],
]);

describe("findSubLevels", () => {
  const refs = findSubLevels(parseLsx(xml), subLevels, isWildernessSubLevel);

  it("keeps only the first attachment of each accepted sublevel", () => {
    expect(refs.map((r) => r.level)).toEqual(["WLD_RangerCamp_I"]);
    expect(refs[0].via).toBe("LT_WLD_Grove");
    expect(refs[0].placement.pos).toEqual([213.57, 0, 689.44]);
  });
});

describe("isWildernessSubLevel", () => {
  it.each([
    ["WLD_GoblinCamp_D", true],
    ["WLD_CIN_Raft_A", false],
    ["WLD_Main_A", false],
    ["CMP_Basement_A", false],
  ])("%s -> %s", (level, expected) => {
    expect(isWildernessSubLevel(level)).toBe(expected);
  });
});
