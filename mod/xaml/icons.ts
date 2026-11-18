import type { CategoryId } from "../../tools/categories.ts";

export type IconGroup = "loot" | "world" | "npc" | "danger";

export const groupRim: Record<IconGroup, string> = {
  loot: "#FFC9A45C",
  world: "#FF8FB3BF",
  npc: "#FFD08A4E",
  danger: "#FFC0563C",
};

export const iconDisc = "#EB1A1208";
export const iconGlyph = "#FFF2DDA0";

export const categoryColors: Record<CategoryId, { rim: string; disc: string }> = {
  chest: { rim: "#FFC08A4A", disc: "#F04A2E16" },
  container: { rim: "#FF9C7A52", disc: iconDisc },
  remains: { rim: "#FFD8CFB8", disc: iconDisc },
  weapon_unique: { rim: "#FFE0563A", disc: "#F0581A10" },
  armor_unique: { rim: "#FF6FA8DC", disc: "#F0163250" },
  accessory: { rim: "#FFC08AF0", disc: "#F03C1C52" },
  valuable: { rim: "#FF4FD08E", disc: "#F00E3F28" },
  notable: { rim: "#FFF08CC8", disc: "#F04A1838" },
  scroll: { rim: "#FFE8D39A", disc: iconDisc },
  book: { rim: "#FF5FC4BE", disc: iconDisc },
  key: { rim: "#FFF5CD3C", disc: iconDisc },
  ingredient: { rim: "#FF9CCB5A", disc: iconDisc },
  trap: { rim: "#FFFF4A4A", disc: iconDisc },
  hidden_stash: { rim: "#FF7FE0F0", disc: iconDisc },
  lever: { rim: "#FFA3AFB8", disc: iconDisc },
  locked_door: { rim: "#FFE09840", disc: iconDisc },
  waypoint: { rim: "#FFB5D2FF", disc: iconDisc },
  trader: { rim: "#FFE6A35C", disc: iconDisc },
  quest_npc: { rim: "#FFFFE680", disc: iconDisc },
  boss: { rim: "#FFB0303A", disc: "#F0400C10" },
  animal: { rim: "#FFC8A878", disc: iconDisc },
};

export const categoryIcons: Record<CategoryId, { group: IconGroup; glyph: string }> = {
  chest: { group: "loot", glyph: "M6,10 L18,10 L18,17 L6,17 Z M6,10 Q12,5 18,10 M11,12.5 L13,12.5 L13,14.5 L11,14.5 Z" },
  container: { group: "loot", glyph: "M8.5,6 L15.5,6 Q17.8,12 15.5,18 L8.5,18 Q6.2,12 8.5,6 Z M7.3,9.5 L16.7,9.5 M7.3,14.5 L16.7,14.5" },
  remains: { group: "loot", glyph: "M8,8 L16,16 M16,8 L8,16 M6.6,8.8 A1.3,1.3 0 1 1 8.8,6.6 M15.2,6.6 A1.3,1.3 0 1 1 17.4,8.8 M17.4,15.2 A1.3,1.3 0 1 1 15.2,17.4 M8.8,17.4 A1.3,1.3 0 1 1 6.6,15.2" },
  weapon_unique: { group: "loot", glyph: "M17.5,6.5 L16.8,9 L11.3,14.5 L9.5,12.7 L15,7.2 Z M8,12 L12,16 M9.8,14.2 L6.5,17.5" },
  armor_unique: { group: "loot", glyph: "M12,6 L17,8 L17,12 Q17,16 12,18 Q7,16 7,12 L7,8 Z" },
  accessory: { group: "loot", glyph: "M7.5,14 A4.5,4.5 0 1 1 16.5,14 A4.5,4.5 0 1 1 7.5,14 M10,8.5 L12,6 L14,8.5 Z" },
  scroll: { group: "loot", glyph: "M8,7 L16,7 M8,17 L16,17 M8,7 Q6,7 6,9 Q6,11 8,11 L8,17 M16,7 L16,13 Q16,15 18,15 Q18,17 16,17 M10,10 L14,10 M10,13 L14,13" },
  book: { group: "loot", glyph: "M12,8 Q9,6.5 6,7.5 L6,17 Q9,16 12,17.5 Q15,16 18,17 L18,7.5 Q15,6.5 12,8 L12,17.5" },
  key: { group: "loot", glyph: "M6.5,12 A2.75,2.75 0 1 1 12,12 A2.75,2.75 0 1 1 6.5,12 M12,12 L18,12 M16,12 L16,14.5 M18,12 L18,14" },
  ingredient: { group: "loot", glyph: "M7,17 Q7,8 17,7 Q16,17 7,17 Z M7,17 L13,11" },
  valuable: { group: "loot", glyph: "M8,8.5 L16,8.5 L18.5,11.5 L12,18 L5.5,11.5 Z M5.5,11.5 L18.5,11.5 M10,8.5 L12,18 M14,8.5 L12,18" },
  notable: { group: "loot", glyph: "M12,5.5 L13.9,10 L18.6,10.3 L15,13.4 L16.1,18 L12,15.5 L7.9,18 L9,13.4 L5.4,10.3 L10.1,10 Z" },
  trap: { group: "danger", glyph: "M5,15 L19,15 M6,15 L8,10 L10,15 L12,10 L14,15 L16,10 L18,15" },
  hidden_stash: { group: "world", glyph: "M5,12 Q12,6 19,12 Q12,18 5,12 Z M10.4,12 A1.6,1.6 0 1 1 13.6,12 A1.6,1.6 0 1 1 10.4,12" },
  lever: { group: "world", glyph: "M7,17 L17,17 M12,17 L14.6,8.6 M13.4,7 A1.8,1.8 0 1 1 17,7 A1.8,1.8 0 1 1 13.4,7" },
  locked_door: { group: "world", glyph: "M8,11 L16,11 L16,18 L8,18 Z M9.5,11 L9.5,9 A2.5,2.5 0 0 1 14.5,9 L14.5,11 M12,13.8 L12,15.6" },
  waypoint: { group: "world", glyph: "M12,5 L13.6,10.4 L19,12 L13.6,13.6 L12,19 L10.4,13.6 L5,12 L10.4,10.4 Z" },
  trader: { group: "npc", glyph: "M9,9.5 L15,9.5 L17.5,17.5 L6.5,17.5 Z M10,9.5 L9,6.5 L15,6.5 L14,9.5 M12,11.5 L12,15.5 M10.5,12.8 L13.5,12.8" },
  quest_npc: { group: "npc", glyph: "M12,6 L12,13.5 M12,16.5 L12,17.6 M8,5.5 L6,8 M16,5.5 L18,8" },
  boss: { group: "danger", glyph: "M7,12 A5,5 0 1 1 17,12 L16,14.5 L16,17.5 L8,17.5 L8,14.5 Z M9.5,12 L10.7,12 M13.3,12 L14.5,12 M11,17.5 L11,15.8 M13,17.5 L13,15.8" },
  animal: {
    group: "npc",
    glyph:
      "M9,15.5 A3,2.5 0 1 1 15,15.5 A3,2.5 0 1 1 9,15.5 M6.2,11 A1.3,1.6 0 1 1 8.8,11 A1.3,1.6 0 1 1 6.2,11 M9.3,8.2 A1.3,1.6 0 1 1 11.9,8.2 A1.3,1.6 0 1 1 9.3,8.2 M12.1,8.2 A1.3,1.6 0 1 1 14.7,8.2 A1.3,1.6 0 1 1 12.1,8.2 M15.2,11 A1.3,1.6 0 1 1 17.8,11 A1.3,1.6 0 1 1 15.2,11",
  },
};
