import type { StatEntry } from "./lib/stats.ts";

export type CategoryId =
  | "chest"
  | "weapon_unique"
  | "armor_unique"
  | "accessory"
  | "scroll"
  | "book"
  | "key"
  | "ingredient"
  | "valuable"
  | "trap"
  | "hidden_stash"
  | "lever"
  | "locked_door"
  | "waypoint"
  | "trader"
  | "quest_npc"
  | "boss"
  | "animal";

export type Flag = "locked" | "trapped" | "hidden";

export interface CategoryInput {
  kind: "item" | "character";
  name: string;
  templateNames: string[];
  attrs: Record<string, string>;
  tags: string[];
  stat?: StatEntry;
  hasTradeTreasures: boolean;
  contents: string[];
}

const emptyGuid = "00000000-0000-0000-0000-000000000000";
const uniqueRarity = new Set(["Uncommon", "Rare", "VeryRare", "Legendary"]);
const accessorySlots = new Set(["Amulet", "Ring"]);

function names(i: CategoryInput): string[] {
  const out = [i.name, ...i.templateNames];
  if (i.stat) out.push(i.stat.name);
  return out;
}

function anyName(i: CategoryInput, re: RegExp): boolean {
  return names(i).some((n) => re.test(n));
}

function isTrue(v: string | undefined): boolean {
  return v === "True";
}

function set(v: string | undefined): boolean {
  return !!v && v !== emptyGuid && v !== "0";
}

function objectCategory(i: CategoryInput): string {
  return i.stat?.data.ObjectCategory ?? "";
}

function isCharacter(i: CategoryInput): boolean {
  return i.kind === "character";
}

const hiddenRe = /Hidden|Secret|Buried|(?<!Gold_)Stash/;
const trapRe = /Trap/i;
const smokepowderRe = /SmokepowderTrap/i;
const keyRe = /(^|_)Key(_|$)|Key$/;

function isLocked(i: CategoryInput): boolean {
  return set(i.attrs.LockDifficultyClassID) || set(i.attrs.LockDC) || set(i.attrs.Key);
}

function isTrapped(i: CategoryInput): boolean {
  return set(i.attrs.DisarmDifficultyClassID) || isTrue(i.attrs.IsTrap);
}

function isHidden(i: CategoryInput): boolean {
  return isTrue(i.attrs.SecretDoor) || anyName(i, hiddenRe);
}

function isRareGear(i: CategoryInput, type: string): boolean {
  return i.stat?.type === type && (uniqueRarity.has(i.stat.data.Rarity ?? "") || isTrue(i.attrs.StoryItem));
}

function isContainer(i: CategoryInput): boolean {
  return set(i.attrs.InventoryType) || anyName(i, /(^|_)CONT(_|$)/);
}

export const categoryRules: { id: CategoryId; test: (i: CategoryInput) => boolean }[] = [
  { id: "trader", test: (i) => isCharacter(i) && i.hasTradeTreasures },
  { id: "boss", test: (i) => isCharacter(i) && isTrue(i.attrs.IsBoss) },
  { id: "animal", test: (i) => isCharacter(i) && (i.tags.some((t) => /ANIMAL/i.test(t)) || i.templateNames.some((n) => /Animal/i.test(n))) },
  { id: "quest_npc", test: (i) => isCharacter(i) && set(i.attrs.DefaultDialog) },
  { id: "waypoint", test: (i) => !isCharacter(i) && (isTrue(i.attrs.IsPortal) || anyName(i, /Waypoint/i)) },
  { id: "trap", test: (i) => !isCharacter(i) && (isTrue(i.attrs.IsTrap) || (anyName(i, trapRe) && !anyName(i, smokepowderRe))) },
  { id: "hidden_stash", test: (i) => !isCharacter(i) && isHidden(i) },
  { id: "locked_door", test: (i) => !isCharacter(i) && anyName(i, /(^|_)DOOR_/) && isLocked(i) },
  { id: "lever", test: (i) => !isCharacter(i) && anyName(i, /(^|_)PUZ_/) && anyName(i, /Lever|Button|Switch|Pressure/i) },
  { id: "key", test: (i) => !isCharacter(i) && (isTrue(i.attrs.IsKey) || anyName(i, keyRe)) },
  { id: "book", test: (i) => !isCharacter(i) && (set(i.attrs.BookId) || objectCategory(i).startsWith("Book")) },
  { id: "scroll", test: (i) => !isCharacter(i) && (objectCategory(i).includes("MagicScroll") || anyName(i, /Scroll/i)) },
  { id: "weapon_unique", test: (i) => isRareGear(i, "Weapon") },
  { id: "accessory", test: (i) => i.stat?.type === "Armor" && accessorySlots.has(i.stat.data.Slot ?? "") },
  { id: "armor_unique", test: (i) => isRareGear(i, "Armor") },
  { id: "ingredient", test: (i) => !isCharacter(i) && (objectCategory(i).includes("Ingredient") || anyName(i, /ALCH_Ingredient|CONS_Mushrooms|CONS_Herbs|(^|_)CRA_/)) },
  { id: "valuable", test: (i) => !isCharacter(i) && (/^(Gold|PreciousGem)/.test(objectCategory(i)) || anyName(i, /LOOT_Gold|Gold_Stash|LOOT_GEN_Gem|(^|_)GEM_/)) },
  { id: "chest", test: (i) => !isCharacter(i) && isContainer(i) },
];

export function categorize(input: CategoryInput): CategoryId | null {
  for (const rule of categoryRules) {
    if (rule.test(input)) return rule.id;
  }
  return null;
}

export function flags(input: CategoryInput): Flag[] {
  const out: Flag[] = [];
  if (isLocked(input)) out.push("locked");
  if (isTrapped(input)) out.push("trapped");
  if (isHidden(input)) out.push("hidden");
  return out;
}

export function isInteresting(i: CategoryInput): boolean {
  if (isCharacter(i)) return set(i.attrs.DefaultDialog) || i.hasTradeTreasures || isTrue(i.attrs.IsBoss);
  return (
    isContainer(i) ||
    isRareGear(i, "Weapon") ||
    isRareGear(i, "Armor") ||
    set(i.attrs.BookId) ||
    isTrue(i.attrs.IsKey) ||
    isTrue(i.attrs.IsTrap) ||
    isTrue(i.attrs.IsPortal) ||
    anyName(i, /(^|_)PUZ_/) ||
    (anyName(i, /(^|_)DOOR_/) && isLocked(i)) ||
    /^(Gold|PreciousGem|Ingredient|MagicScroll)/.test(objectCategory(i))
  );
}
