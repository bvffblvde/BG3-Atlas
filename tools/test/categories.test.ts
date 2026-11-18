import { describe, expect, it } from "vitest";
import { categorize, flags, isInteresting, type CategoryInput } from "../categories.ts";
import type { StatEntry } from "../lib/stats.ts";

function input(over: Partial<CategoryInput> = {}): CategoryInput {
  return { kind: "item", name: "", templateNames: [], attrs: {}, tags: [], hasTradeTreasures: false, contents: [], inventory: [], ...over };
}

function stat(type: string, data: Record<string, string> = {}, name = "STAT"): StatEntry {
  return { name, type, data };
}

describe("notes and scrolls", () => {
  it("skips blank generic parchment without its own name", () => {
    expect(categorize(input({ templateNames: ["BOOK_GEN_Scroll_Parchment_B_Long_D", "BASE_BOOK_Scroll_Letter", "BASE_BOOK"] }))).toBeNull();
    expect(categorize(input({ templateNames: ["BOOK_GEN_Paper_Poster_E", "BASE_BOOK_Scroll_Letter", "BASE_BOOK"] }))).toBeNull();
  });

  it("does not treat wine shelves and backpacks as scrolls", () => {
    expect(categorize(input({ templateNames: ["CONT_GEN_ScrollShelf_Wine_Bottle_A", "BASE_CONT_Immovable", "BASE_CONT"] }))).not.toBe("scroll");
    expect(categorize(input({ templateNames: ["LOOT_GEN_Backpack_D_Posed_A", "BASE_CONT_Movable_Pickable"], name: "S_Scroll_Backpack" }))).not.toBe("scroll");
  });

  it("keeps a stack of scrolls with loot a container", () => {
    expect(categorize(input({ templateNames: ["BOOK_GEN_Scroll_Parchment_Row_Multiple_A", "BASE_CONT_BOOKS", "BASE_CONT_Immovable"], attrs: { InventoryType: "2" }, inventory: ["X"] }))).toBe("container");
  });
});

describe("categorize", () => {
  it.each<[string, CategoryInput, string]>([
    ["trader", input({ kind: "character", hasTradeTreasures: true, attrs: { DefaultDialog: "d" } }), "trader"],
    ["boss", input({ kind: "character", attrs: { IsBoss: "True", DefaultDialog: "d" } }), "boss"],
    ["trader by tag", input({ kind: "character", tags: ["TRADER"] }), "trader"],
    ["talking beast", input({ kind: "character", templateNames: ["Bear", "BASE_Quadruped_Beast_Bear", "BASE_Quadruped_Beast"], attrs: { DefaultDialog: "d" } }), "animal"],
    ["exploding mushroom", input({ templateNames: ["PUZ_Underdark_Mushroom_Bibberbang_B"] }), "trap"],
    ["toxic mushroom wall", input({ templateNames: ["PUZ_Underdark_Mushroom_ToxicWall_A"] }), "trap"],
    ["quest npc", input({ kind: "character", attrs: { DefaultDialog: "dlg" } }), "quest_npc"],
    ["waypoint from story facts", input({ waypoint: true, templateNames: ["Helper_Waypoint_A"] }), "waypoint"],
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
    ["spell scroll by template", input({ templateNames: ["LOOT_SCROLL_Blight", "BASE_BOOK_Scroll_Magic", "BASE_BOOK"] }), "scroll"],
    ["named letter is a note", input({ templateNames: ["BOOK_LOW_Graveyard_LastWishes", "BOOK_GEN_Paper_Sheet_A", "BASE_BOOK_Scroll_Letter", "BASE_BOOK"] }), "book"],
    ["poster is a note", input({ templateNames: ["DEC_GEN_Circus_Poster_Large_A", "BASE_BOOK_Scroll_Letter", "BASE_BOOK"] }), "book"],
    ["generic parchment with its own name is a note", input({ ownName: true, templateNames: ["BOOK_GEN_Scroll_Parchment_C_Open_C", "BASE_BOOK_Scroll_Letter", "BASE_BOOK"] }), "book"],
    ["map is a note", input({ templateNames: ["QUEST_SHA_TempleMap", "PUZ_GEN_Map_World_A", "REF_BOOK_Letter_Map"] }), "book"],
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
    ["container with loot table", input({ attrs: { InventoryType: "2" }, inventory: ["Exploration_Minor"] }), "container"],
    ["container with items", input({ attrs: { InventoryType: "2" }, contents: ["t-ring"] }), "container"],
    ["chest by name", input({ templateNames: ["CONT_GEN_Chest_A"], inventory: ["X"] }), "chest"],
    ["safe", input({ templateNames: ["CONT_GEN_Safe_Small_Metal_A_Ornate"], inventory: ["X"] }), "chest"],
    ["locked barrel", input({ templateNames: ["CONT_Barrel_A"], attrs: { LockDC: "15" }, inventory: ["X"] }), "chest"],
    ["barrel", input({ templateNames: ["CONT_Barrel_A", "BASE_CONT_Movable"], inventory: ["X"] }), "container"],
    ["burlap sack", input({ templateNames: ["CONT_GEN_Burlap_Sack_A"], inventory: ["X"] }), "container"],
    ["beehive", input({ templateNames: ["CONT_GEN_Beehive_A"], inventory: ["X"] }), "container"],
    ["skeleton", input({ templateNames: ["DEC_Dungeon_Skeleton_Laying_A", "BASE_CONT_Immovable"], inventory: ["X"] }), "remains"],
    ["bone pile", input({ templateNames: ["DEC_Dungeon_Skeleton_BonePile_A", "BASE_CONT_Immovable"], inventory: ["X"] }), "remains"],
    ["coffin", input({ templateNames: ["CONT_CEM_Coffin_Wood_Rich_Combine_A"], inventory: ["X"] }), "remains"],
    ["urn with bones", input({ templateNames: ["CONT_Jergal_Urn_Bones_A"], inventory: ["X"] }), "remains"],
    ["spider cocoon", input({ templateNames: ["CONT_Spiders_Cocoon_A_Hanging"], inventory: ["X"] }), "remains"],
    ["tomb", input({ templateNames: ["DEC_CEM_Tomb_A_Lid_A_Statue_Woman_A", "BASE_DEC_Medium_Immovable"], attrs: { InventoryType: "2" }, inventory: ["X"] }), "remains"],
    ["turnip crate is not an urn", input({ templateNames: ["CONT_GEN_Crate_Turnip_A"], inventory: ["X"] }), "container"],
    ["cabinet named like a chest", input({ name: "S_FUR_Chest_Cabinet_003", templateNames: ["FUR_GEN_Cabinet_A", "BASE_CONT_Movable"], inventory: ["X"] }), "container"],
    ["barrel with a chest base", input({ templateNames: ["CONT_GTY_Barrel_A", "BASE_CONT_Movable_Chest"], inventory: ["X"] }), "container"],
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

  it("does not call a silent beast an animal point", () => {
    expect(categorize(input({ kind: "character", templateNames: ["SPIDER_Ranged_A", "BASE_Quadruped_Beast"] }))).toBe(null);
  });

  it("does not treat shrine scenery as a waypoint", () => {
    expect(categorize(input({ name: "S_DEN_WaypointShrine_geo" }))).toBe(null);
  });

  it("does not treat transition doors as waypoints", () => {
    expect(categorize(input({ name: "DOOR_Interior", attrs: { IsPortal: "True" } }))).toBe(null);
  });

  it("skips empty containers", () => {
    expect(categorize(input({ attrs: { InventoryType: "2" }, templateNames: ["CONT_Barrel_A"] }))).toBe(null);
    expect(isInteresting(input({ attrs: { InventoryType: "2" } }))).toBe(false);
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
    ["container with loot", input({ attrs: { InventoryType: "2" }, inventory: ["L"] }), true],
    ["rare weapon", input({ stat: stat("Weapon", { Rarity: "Rare" }) }), true],
    ["common weapon", input({ stat: stat("Weapon", { Rarity: "Common" }) }), false],
    ["lever", input({ name: "PUZ_Lever" }), true],
    ["glowing mushroom prop", input({ templateNames: ["PUZ_Underdark_Mushroom_Nightlight_A"] }), false],
    ["fairy ring prop", input({ templateNames: ["PUZ_GEN_Mushroom_Fairy_Ring_C"] }), false],
    ["remains prop", input({ templateNames: ["PUZ_Underdark_Mushroom_Exploding_A_Remains_A"] }), false],
    ["transition door", input({ attrs: { IsPortal: "True" } }), false],
    ["waypoint from story facts", input({ waypoint: true }), true],
  ])("%s -> %s", (_, i, expected) => {
    expect(isInteresting(i)).toBe(expected);
  });
});

describe("notable items", () => {
  const obj = (names: string[], flags = "", extra: Partial<CategoryInput> = {}) =>
    input({ templateNames: names, stat: stat("Object", flags ? { Flags: flags } : {}), ...extra });

  it("shows pickable unique and quest items that fit no other category", () => {
    expect(categorize(obj(["Quest_FOR_SussurBark"]))).toBe("notable");
    expect(categorize(obj(["UNI_UND_SussurTreeFlower"]))).toBe("notable");
    expect(categorize(obj(["QUEST_SHA_TrialOrb"]))).toBe("notable");
    expect(categorize(obj(["LOOT_Something"], "", { attrs: { StoryItem: "True" } }))).toBe("notable");
  });

  it("skips items that cannot be picked up", () => {
    expect(categorize(obj(["UNI_UND_SussurTreeFlower"], "Grounded"))).toBeNull();
    expect(categorize(obj(["QUEST_Lever_Thing"], "Torch;Grounded"))).toBeNull();
  });

  it("skips throwable combat props, decor and puzzle pieces", () => {
    for (const n of ["Quest_CMB_Crystal_Shard_Wall", "Quest_CMB_ThrowingRock", "UNI_DEC_GEN_Crate_Stack_B", "QUEST_GOB_RoastingDwarf_B", "QUEST_GOB_SuspiciousMeat", "UNI_TWN_Hospital_Bloodbank_Transfusion_Bottle_A", "UNI_LOW_NightsongPamphlet", "QUEST_Chains", "UNI_WYR_PaintingPuzzle_SolutionPainting3", "UNI_LOW_HOH_RestorationPondDevice", "QUEST_GoblinPriestess_Statue"]) {
      expect(categorize(obj([n]))).toBeNull();
    }
  });

  it("leaves items with their own category alone and ignores characters", () => {
    expect(categorize(obj(["UNI_Key_Thing"], "", { attrs: { IsKey: "True" } }))).toBe("key");
    expect(categorize(input({ kind: "character", templateNames: ["UNI_Someone"] }))).toBeNull();
  });

  it("keeps unique containers with loot in the container categories", () => {
    expect(categorize(obj(["UNI_Bag_Of_Moulding"], "", { attrs: { InventoryType: "2" }, inventory: ["X"] }))).toBe("container");
  });

  it("counts notable items as interesting", () => {
    expect(isInteresting(obj(["Quest_FOR_SussurBark"]))).toBe(true);
  });
});
