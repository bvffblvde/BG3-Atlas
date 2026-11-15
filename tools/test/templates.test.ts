import { describe, expect, it } from "vitest";
import { parseLsx } from "../lib/lsx.ts";
import { subLevelIndex, TemplateIndex } from "../lib/templates.ts";

function tpl(key: string, name: string, parent: string, extra = "", tags: string[] = [], trade = false) {
  return `<node id="GameObjects">
<attribute id="MapKey" type="FixedString" value="${key}" />
<attribute id="Name" type="LSString" value="${name}" />
<attribute id="ParentTemplateId" type="FixedString" value="${parent}" />
<attribute id="Type" type="FixedString" value="item" />
${extra}
<children>
<node id="Tags"><children>${tags.map((t) => `<node id="Tag"><attribute id="Object" type="guid" value="${t}" /></node>`).join("")}</children></node>
${trade ? '<node id="TradeTreasures"><children><node id="TreasureItem"><attribute id="Object" type="FixedString" value="PLA_ZhentarimTrader_Common" /></node></children></node>' : '<node id="TradeTreasures"><children><node id="TreasureItem"><attribute id="Object" type="FixedString" value="BG_Guard" /></node></children></node>'}
<node id="InventoryList"><children><node id="InventoryItem"><attribute id="Object" type="FixedString" value="${name}_Loot" /></node><node id="InventoryItem"><attribute id="Object" type="FixedString" value="Empty" /></node></children></node>
</children></node>`;
}

function file(...nodes: string[]) {
  return parseLsx(`<save><region id="Templates"><node id="Templates"><children>${nodes.join("")}</children></node></region></save>`);
}

const base = file(
  tpl("root", "ROOT", "", '<attribute id="Icon" type="FixedString" value="icon_root" /><attribute id="Stats" type="FixedString" value="OBJ_Root" />', ["t-root"]),
  tpl("mid", "MID", "root", '<attribute id="Stats" type="FixedString" value="OBJ_Mid" /><attribute id="Icon" type="FixedString" value="" />', ["t-mid"], true),
  tpl("leaf", "LEAF", "mid", '<attribute id="DisplayName" type="TranslatedString" handle="h1" version="1" />'),
  tpl("orphan", "ORPHAN", "missing"),
  tpl("a", "A", "b"),
  tpl("b", "B", "a"),
  tpl("lt", "LT_X", "", '<attribute id="SubLevelName" type="FixedString" value="WLD_X" />'),
);
const override = file(tpl("root", "ROOT2", "", '<attribute id="Icon" type="FixedString" value="icon_new" />'));

describe("TemplateIndex", () => {
  const index = new TemplateIndex([base]);

  it("merges attributes along the parent chain, nearest wins, empty values do not override", () => {
    const r = index.resolved("leaf");
    expect(r.attrs.Stats).toBe("OBJ_Mid");
    expect(r.attrs.Icon).toBe("icon_root");
    expect(r.attrs.DisplayName).toBe("h1");
  });

  it("lists names from the child up and unions tags", () => {
    const r = index.resolved("leaf");
    expect(r.names).toEqual(["LEAF", "MID", "ROOT"]);
    expect(r.tags.sort()).toEqual(["t-mid", "t-root"]);
    expect(r.hasTradeTreasures).toBe(true);
  });

  it("treats only trader tables as trade, not pocket loot", () => {
    expect(index.resolved("root").hasTradeTreasures).toBe(false);
  });

  it("collects inventory tables along the chain without Empty", () => {
    expect(index.resolved("mid").inventory.sort()).toEqual(["MID_Loot", "ROOT_Loot"]);
  });

  it("resolves a template whose parent is missing", () => {
    expect(index.resolved("orphan").names).toEqual(["ORPHAN"]);
  });

  it("stops on parent cycles", () => {
    expect(index.chain("a").length).toBe(2);
  });

  it("returns an empty resolution for unknown ids", () => {
    expect(index.resolved("nope").names).toEqual([]);
  });

  it("lets later files override templates with the same MapKey", () => {
    const layered = new TemplateIndex([base, override]);
    expect(layered.get("root")?.name).toBe("ROOT2");
    expect(layered.resolved("leaf").attrs.Icon).toBe("icon_new");
  });

  it("indexes sublevel names", () => {
    expect(subLevelIndex(index).get("lt")).toBe("WLD_X");
  });
});
