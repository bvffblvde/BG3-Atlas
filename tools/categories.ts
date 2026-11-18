import type { StatEntry } from "./lib/stats.ts";

export type CategoryId =
  | "chest"
  | "container"
  | "remains"
  | "weapon_unique"
  | "armor_unique"
  | "accessory"
  | "scroll"
  | "book"
  | "key"
  | "ingredient"
  | "valuable"
  | "notable"
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
  inventory: string[];
  waypoint?: boolean;
  ownName?: boolean;
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

function templateName(i: CategoryInput, re: RegExp): boolean {
  return i.templateNames.some((n) => !n.startsWith("BASE_") && re.test(n));
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
const hazardRe = /Mushroom_(Bibberbang|Exploding|ToxicWall)/;
const propRe = /Mushroom_(Timmask|Nightlight)|Fairy_Ring|Remains|DELETEME/;
const beastRe = /Quadruped_Beast/;
const chestRe = /(^|_)(Chest|Safe|Strongbox|Lockbox|Vault)(_|$)/;
const remainsRe = /(^|_)(Skeleton|BonePile|Bones|Ribcage|Skull|Corpse|Body|Bodies|Viscera|Cocoon|Coffin|Casket|Sarcophagus|Tomb|Urn|Grave|Remains)(_|$)/;

const readableRe = /^(BASE_BOOK|REF_BOOK)|(^|_)BOOK_GEN_MOO_Map/;
const blankRe = /^BOOK_GEN_(Scroll_Parchment|Paper)/;

function isSpellScroll(i: CategoryInput): boolean {
  return objectCategory(i).includes("MagicScroll") || i.templateNames.includes("BASE_BOOK_Scroll_Magic");
}

function isNote(i: CategoryInput): boolean {
  if (isContainer(i) || isSpellScroll(i)) return false;
  const readable = set(i.attrs.BookId) || objectCategory(i).startsWith("Book") || i.templateNames.some((n) => readableRe.test(n));
  const blank = !i.ownName && blankRe.test(i.templateNames[0] ?? "");
  return readable && !blank;
}

function isHazard(i: CategoryInput): boolean {
  return anyName(i, hazardRe) && !anyName(i, propRe);
}

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

const notableRe = /^(UNI|QUEST)_/i;
const notableSkipRe = /_CMB_|_DEC_|RoastingDwarf|SuspiciousMeat|Bloodbank|NightsongPamphlet|^QUEST_Chains|PaintingPuzzle|RestorationPondDevice|GoblinPriestess_Statue/i;

function isNotable(i: CategoryInput): boolean {
  if (isCharacter(i) || !i.stat || /(^|;)Grounded(;|$)/.test(i.stat.data.Flags ?? "")) return false;
  if (i.templateNames.some((n) => notableSkipRe.test(n)) || (isContainer(i) && hasLoot(i))) return false;
  return isTrue(i.attrs.StoryItem) || i.templateNames.some((n) => notableRe.test(n));
}

function hasLoot(i: CategoryInput): boolean {
  return i.contents.length > 0 || i.inventory.length > 0;
}

export const categoryRules: { id: CategoryId; test: (i: CategoryInput) => boolean }[] = [
  { id: "trader", test: (i) => isCharacter(i) && (i.hasTradeTreasures || i.tags.includes("TRADER")) },
  { id: "boss", test: (i) => isCharacter(i) && isTrue(i.attrs.IsBoss) },
  { id: "animal", test: (i) => isCharacter(i) && set(i.attrs.DefaultDialog) && (i.tags.includes("ANIMAL") || i.templateNames.some((n) => beastRe.test(n))) },
  { id: "quest_npc", test: (i) => isCharacter(i) && set(i.attrs.DefaultDialog) },
  { id: "waypoint", test: (i) => !isCharacter(i) && i.waypoint === true },
  { id: "trap", test: (i) => !isCharacter(i) && (isTrue(i.attrs.IsTrap) || isHazard(i) || (anyName(i, trapRe) && !anyName(i, smokepowderRe))) },
  { id: "hidden_stash", test: (i) => !isCharacter(i) && isHidden(i) },
  { id: "locked_door", test: (i) => !isCharacter(i) && anyName(i, /(^|_)DOOR_/) && isLocked(i) },
  { id: "lever", test: (i) => !isCharacter(i) && anyName(i, /(^|_)PUZ_/) && anyName(i, /Lever|Button|Switch|Pressure/i) },
  { id: "key", test: (i) => !isCharacter(i) && (isTrue(i.attrs.IsKey) || anyName(i, keyRe)) },
  { id: "scroll", test: (i) => !isCharacter(i) && isSpellScroll(i) },
  { id: "book", test: (i) => !isCharacter(i) && isNote(i) },
  { id: "weapon_unique", test: (i) => isRareGear(i, "Weapon") },
  { id: "accessory", test: (i) => i.stat?.type === "Armor" && accessorySlots.has(i.stat.data.Slot ?? "") },
  { id: "armor_unique", test: (i) => isRareGear(i, "Armor") },
  { id: "ingredient", test: (i) => !isCharacter(i) && (objectCategory(i).includes("Ingredient") || anyName(i, /ALCH_Ingredient|CONS_Mushrooms|CONS_Herbs|(^|_)CRA_/)) },
  { id: "valuable", test: (i) => !isCharacter(i) && (/^(Gold|PreciousGem)/.test(objectCategory(i)) || anyName(i, /LOOT_Gold|Gold_Stash|LOOT_GEN_Gem|(^|_)GEM_/)) },
  { id: "notable", test: (i) => isNotable(i) },
  { id: "chest", test: (i) => !isCharacter(i) && isContainer(i) && hasLoot(i) && (templateName(i, chestRe) || isLocked(i)) },
  { id: "remains", test: (i) => !isCharacter(i) && isContainer(i) && hasLoot(i) && templateName(i, remainsRe) },
  { id: "container", test: (i) => !isCharacter(i) && isContainer(i) && hasLoot(i) },
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
  if (isCharacter(i)) return set(i.attrs.DefaultDialog) || i.hasTradeTreasures || i.tags.includes("TRADER") || isTrue(i.attrs.IsBoss);
  return (
    (isContainer(i) && hasLoot(i)) ||
    isRareGear(i, "Weapon") ||
    isRareGear(i, "Armor") ||
    set(i.attrs.BookId) ||
    isTrue(i.attrs.IsKey) ||
    isTrue(i.attrs.IsTrap) ||
    isNotable(i) ||
    i.waypoint === true ||
    (anyName(i, /(^|_)PUZ_/) && !anyName(i, propRe)) ||
    (anyName(i, /(^|_)DOOR_/) && isLocked(i)) ||
    /^(Gold|PreciousGem|Ingredient|MagicScroll)/.test(objectCategory(i))
  );
}
