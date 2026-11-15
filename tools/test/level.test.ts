import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseLsx } from "../lib/lsx.ts";
import { readWilderness } from "../lib/level.ts";
import { TemplateIndex } from "../lib/templates.ts";

function go(key: string, name: string, template: string, pos: string, extra = "", rot = "0 0 0 1", children = "") {
  return `<node id="GameObjects">
<attribute id="MapKey" type="FixedString" value="${key}" />
<attribute id="Name" type="LSString" value="${name}" />
<attribute id="TemplateName" type="FixedString" value="${template}" />
${extra}
<children>${children}<node id="Transform">
<attribute id="Position" type="fvec3" value="${pos}" />
<attribute id="RotationQuat" type="fvec4" value="${rot}" />
<attribute id="Scale" type="float" value="1" />
</node></children></node>`;
}

function save(...nodes: string[]) {
  return `<save><region id="Templates"><node id="Templates"><children>${nodes.join("")}</children></node></region></save>`;
}

function put(root: string, rel: string, xml: string) {
  const file = path.join(root, ...rel.split("/"));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, xml);
}

describe("readWilderness", () => {
  const root = mkdtempSync(path.join(tmpdir(), "bg3atlas-level-"));
  put(root, "Mods/Gustav/Levels/WLD_Main_A/Items/_merged.lsx", save(go("main-item", "S_Barrel", "t-barrel", "212.35 24.92 425.93", '<attribute id="Type" type="FixedString" value="item" />')));
  put(root, "Mods/GustavDev/Levels/WLD_Main_A/Characters/_merged.lsx", save(go("npc", "S_Trader", "t-npc", "1 2 3", '<attribute id="Type" type="FixedString" value="character" />')));
  put(
    root,
    "Mods/Gustav/Levels/WLD_Main_A/LevelTemplates/_merged.lsx",
    save(go("lt1", "LT_WLD_Camp", "t-lt", "100 0 50", '<attribute id="Type" type="FixedString" value="LevelTemplate" />', "0 0.7071068 0 0.7071067")),
  );
  put(
    root,
    "Mods/Gustav/Levels/WLD_Main_A/Scenery/_merged.lsx",
    save(go("wp", "S_DEN_WaypointShrine_geo", "t-wp", "5 0 5"), go("wp-top", "S_CHA_WaypointShrine_Top_geo", "t-wp", "6 0 6"), go("rock", "Rock_Big_A", "t-rock", "7 0 7")),
  );
  const contents =
    '<node id="ItemList"><children><node id="Item"><attribute id="TemplateID" type="FixedString" value="t-ring" /></node></children></node>' +
    '<node id="InventoryList"><children><node id="InventoryItem"><attribute id="Object" type="FixedString" value="UND_KC_Loot" /></node><node id="InventoryItem"><attribute id="Object" type="FixedString" value="Empty" /></node></children></node>' +
    '<node id="TradeTreasures"><children><node id="TreasureItem"><attribute id="Object" type="FixedString" value="UND_KC_Trader_Weapons" /></node></children></node>';
  put(
    root,
    "Mods/Gustav/Levels/WLD_Camp_D/Items/_merged.lsx",
    save(go("sub-item", "CONT_Chest", "t-chest", "1 0 0", '<attribute id="Type" type="FixedString" value="item" />', "0 0 0 1", contents), go("main-item", "Dup", "t-dup", "0 0 0")),
  );
  const templates = new TemplateIndex([
    parseLsx(save('<node id="GameObjects"><attribute id="MapKey" type="FixedString" value="t-lt" /><attribute id="Name" type="LSString" value="LT" /><attribute id="Type" type="FixedString" value="LevelTemplate" /><attribute id="SubLevelName" type="FixedString" value="WLD_Camp_D" /></node>')),
  ]);
  const objects = readWilderness(root, templates);
  const byId = new Map(objects.map((o) => [o.id, o]));

  it("reads main level objects in world coordinates", () => {
    expect(byId.get("main-item")?.pos).toEqual([212.35, 24.92, 425.93]);
    expect(byId.get("main-item")?.level).toBe("WLD_Main_A");
  });

  it("merges Gustav and GustavDev modules and marks characters", () => {
    expect(byId.get("npc")?.kind).toBe("character");
  });

  it("places sublevel objects through the rotated level template", () => {
    const p = byId.get("sub-item")!.pos;
    expect(p[0]).toBeCloseTo(100, 4);
    expect(p[2]).toBeCloseTo(49, 4);
    expect(byId.get("sub-item")!.level).toBe("WLD_Camp_D");
  });

  it("collects container contents", () => {
    expect(byId.get("sub-item")?.contents).toEqual(["t-ring"]);
  });

  it("collects instance inventory and trade tables without Empty", () => {
    expect(byId.get("sub-item")?.inventory).toEqual(["UND_KC_Loot"]);
    expect(byId.get("sub-item")?.tradeTables).toEqual(["UND_KC_Trader_Weapons"]);
    expect(byId.get("npc")?.inventory).toEqual([]);
  });

  it("reads waypoint shrines from scenery and nothing else", () => {
    expect(byId.get("wp")?.kind).toBe("item");
    expect(byId.has("wp-top")).toBe(false);
    expect(byId.has("rock")).toBe(false);
  });

  it("keeps the first object when ids repeat", () => {
    expect(objects.filter((o) => o.id === "main-item").length).toBe(1);
    expect(byId.get("main-item")?.name).toBe("S_Barrel");
  });
});
