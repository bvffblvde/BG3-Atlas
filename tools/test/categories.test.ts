import { describe, expect, it } from "vitest";
import { categorize, flags, isInteresting, type CategoryInput } from "../categories.ts";
import type { StatEntry } from "../lib/stats.ts";

function input(over: Partial<CategoryInput> = {}): CategoryInput {
  return { kind: "item", name: "", templateNames: [], attrs: {}, tags: [], hasTradeTreasures: false, contents: [], ...over };
}

function stat(type: string, data: Record<string, string> = {}, name = "STAT"): StatEntry {
  return { name, type, data };
}

describe("categorize", () => {
  it.each<[string, CategoryInput, string]>([
    ["trader", input({ kind: "character", hasTradeTreasures: true, attrs: { DefaultDialog: "d" } }), "trader"],
    ["boss", input({ kind: "character", attrs: { IsBoss: "True", DefaultDialog: "d" } }), "boss"],
    ["animal by tag", input({ kind: "character", tags: ["ANIMAL"] }), "animal"],
    ["animal by template", input({ kind: "character", templateNames: ["S_Boar", "Animals_Boar_A"] }), "animal"],
    ["quest npc", input({ kind: "character", attrs: { DefaultDialog: "dlg" } }), "quest_npc"],
    ["waypoint portal", input({ attrs: { IsPortal: "True" } }), "waypoint"],
    ["waypoint by name", input({ templateNames: ["WAYP_Waypoint_Ancient"] }), "waypoint"],
    ["trap flag", input({ attrs: { IsTrap: "True" } }), "trap"],
    ["trap by name", input({ name: "TRAP_Bear_Trap_001" }), "trap"],
    ["hidden stash", input({ name: "S_FOR_HiddenGift_Gift", attrs: { InventoryType: "1" } }), "hidden_stash"],
    ["secret door", input({ attrs: { SecretDoor: "True" } }), "hidden_stash"],
    ["locked door", input({ templateNames: ["DOOR_GEN_Wood_A"], attrs: { LockDifficultyClassID: "abc" } }), "locked_door"],
    ["lever", input({ name: "PUZ_GEN_Lever_A_001" }), "lever"],
    ["button", input({ templateNames: ["PUZ_Button_Pressure_Plate"] }), "lever"],
    ["key flag", input({ attrs: { IsKey: "True" } }), "key"],
    ["key by stat", input({ stat: stat("Object", {}, "UND_SeluneOutpost_Key") }), "key"],
    ["book", input({ attrs: { BookId: "BOOK_1" } }), "book"],
    ["scroll", input({ stat: stat("Object", { ObjectCategory: "MagicScroll_2;MagicScroll_Illusion_2" }) }), "scroll"],
    ["unique weapon", input({ stat: stat("Weapon", { Rarity: "Rare" }) }), "weapon_unique"],
    ["story weapon", input({ stat: stat("Weapon", { Rarity: "Common" }), attrs: { StoryItem: "True" } }), "weapon_unique"],
    ["unique armor", input({ stat: stat("Armor", { Rarity: "VeryRare", Slot: "Breast" }) }), "armor_unique"],
    ["ring", input({ stat: stat("Armor", { Rarity: "Common", Slot: "Ring" }) }), "accessory"],
    ["amulet", input({ stat: stat("Armor", { Rarity: "Legendary", Slot: "Amulet" }) }), "accessory"],
    ["ingredient", input({ stat: stat("Object", { ObjectCategory: "Ingredient" }) }), "ingredient"],
    ["ingredient by name", input({ templateNames: ["ALCH_Ingredient_Bloodstone"] }), "ingredient"],
    ["gold", input({ stat: stat("Object", { ObjectCategory: "Gold" }) }), "valuable"],
    ["gem", input({ stat: stat("Object", { ObjectCategory: "PreciousGem_3" }) }), "valuable"],
    ["gold stash", input({ name: "Gold_Stash_Poor" }), "valuable"],
    ["container", input({ attrs: { InventoryType: "2" } }), "chest"],
    ["container by name", input({ templateNames: ["CONT_GEN_Chest_A"] }), "chest"],
  ])("%s", (_, i, expected) => {
    expect(categorize(i)).toBe(expected);
  });

  it("puts a trapped chest into trap and still flags it", () => {
    const i = input({ templateNames: ["CONT_GEN_Chest_A"], attrs: { IsTrap: "True", InventoryType: "2" } });
    expect(categorize(i)).toBe("trap");
    expect(flags(i)).toContain("trapped");
  });

  it("treats smokepowder barrels as ordinary objects, not traps", () => {
    expect(categorize(input({ name: "S_DEN_SmokepowderTrap_002" }))).toBe(null);
  });

  it("leaves decorations uncategorized", () => {
    expect(categorize(input({ name: "DEC_GEN_Pigeon_Cage_Small_A", templateNames: ["DEC_GEN_Pigeon_Cage_Small_A"] }))).toBe(null);
  });

  it("does not call a common weapon unique", () => {
    expect(categorize(input({ stat: stat("Weapon", { Rarity: "Common" }) }))).toBe(null);
  });
});

describe("flags", () => {
  it("locked by lock class", () => {
    expect(flags(input({ attrs: { LockDifficultyClassID: "4a2b" } }))).toEqual(["locked"]);
  });

  it("locked by key", () => {
    expect(flags(input({ attrs: { Key: "S_Key_01" } }))).toEqual(["locked"]);
  });

  it("ignores empty lock guid", () => {
    expect(flags(input({ attrs: { LockDifficultyClassID: "00000000-0000-0000-0000-000000000000" } }))).toEqual([]);
  });

  it("trapped by disarm class", () => {
    expect(flags(input({ attrs: { DisarmDifficultyClassID: "x" } }))).toEqual(["trapped"]);
  });

  it("hidden by name", () => {
    expect(flags(input({ name: "WLD_CRA_RidgeSecretChest" }))).toEqual(["hidden"]);
  });
});

describe("isInteresting", () => {
  it.each<[string, CategoryInput, boolean]>([
    ["decoration", input({ name: "DEC_GEN_Vase" }), false],
    ["generic villager", input({ kind: "character" }), false],
    ["talking npc", input({ kind: "character", attrs: { DefaultDialog: "d" } }), true],
    ["container", input({ attrs: { InventoryType: "2" } }), true],
    ["rare weapon", input({ stat: stat("Weapon", { Rarity: "Rare" }) }), true],
    ["common weapon", input({ stat: stat("Weapon", { Rarity: "Common" }) }), false],
    ["lever", input({ name: "PUZ_Lever" }), true],
    ["portal", input({ attrs: { IsPortal: "True" } }), true],
  ])("%s -> %s", (_, i, expected) => {
    expect(isInteresting(i)).toBe(expected);
  });
});
