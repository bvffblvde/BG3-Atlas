import { describe, expect, it } from "vitest";
import { parseLsx } from "../lib/lsx.ts";
import { parseWaypointFacts, parseWaypointNames, WaypointIndex } from "../lib/waypoints.ts";

const goal = `INITSECTION
DB_WaypointInfo("Act1","WAYP_DEN_Camp",(ITEM)S_DEN_WaypointShrine_ebf0904f-2664-45c9-8e9d-dcd8333097c8,(TRIGGER)S_DEN_WaypointTrigger_11111111-2222-3333-4444-555555555555);
DB_WaypointInfo("Act3b","WAYP_LOW_CentralWall",S_LOW_Waypoint_CentralWall_4a4128bf-43d2-4740-91ed-f73a539f026a,S_LOW_Waypoint_CentralWallTrigger_97bdf561-7f2b-4618-89ca-5cad0729bd01);
DB_WaypointInfo("Act2","WAYP_TWN_Center",(ITEM)S_TWN_Waypoint_a3bc9d4c-f48c-443f-a332-5a7f182b7ced, (TRIGGER)S_TWN_Waypoint_Pos_488ce3e4-2239-4623-9aeb-d34cc18bec58);
KBSECTION
IF
DB_WaypointInfo(_Group,_ID,_Item,_Trigger)
THEN
DB_NOOP(1);
`;

const keys = parseLsx(`<save><region id="TranslatedStringKeys"><node id="TranslatedStringKeys"><children>
<node id="TranslatedStringKey"><attribute id="Content" type="TranslatedString" handle="h-den" version="1" /><attribute id="UUID" type="FixedString" value="WAYP_DEN_Camp" /></node>
<node id="TranslatedStringKey"><attribute id="Content" type="TranslatedString" handle="h-wall" version="2" /><attribute id="UUID" type="FixedString" value="WAYP_LOW_CentralWall" /></node>
</children></node></region></save>`);

describe("parseWaypointFacts", () => {
  const facts = parseWaypointFacts(goal);

  it("reads every fact with and without type casts", () => {
    expect(facts).toEqual([
      { group: "Act1", key: "WAYP_DEN_Camp", item: "ebf0904f-2664-45c9-8e9d-dcd8333097c8" },
      { group: "Act3b", key: "WAYP_LOW_CentralWall", item: "4a4128bf-43d2-4740-91ed-f73a539f026a" },
      { group: "Act2", key: "WAYP_TWN_Center", item: "a3bc9d4c-f48c-443f-a332-5a7f182b7ced" },
    ]);
  });
});

describe("parseWaypointNames", () => {
  it("maps waypoint keys to name handles", () => {
    const names = parseWaypointNames(keys);
    expect(names.get("WAYP_DEN_Camp")).toBe("h-den");
    expect(names.get("WAYP_LOW_CentralWall")).toBe("h-wall");
    expect(names.size).toBe(2);
  });
});

describe("WaypointIndex", () => {
  const index = new WaypointIndex(parseWaypointFacts(goal), parseWaypointNames(keys));

  it("finds the name handle by world object id", () => {
    expect(index.has("ebf0904f-2664-45c9-8e9d-dcd8333097c8")).toBe(true);
    expect(index.nameHandle("ebf0904f-2664-45c9-8e9d-dcd8333097c8")).toBe("h-den");
  });

  it("knows waypoints without a name key", () => {
    expect(index.has("a3bc9d4c-f48c-443f-a332-5a7f182b7ced")).toBe(true);
    expect(index.nameHandle("a3bc9d4c-f48c-443f-a332-5a7f182b7ced")).toBe(undefined);
  });

  it("ignores other objects", () => {
    expect(index.has("not-a-waypoint")).toBe(false);
  });
});
