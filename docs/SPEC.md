# BG3 Atlas: specification

## Goal

An in-game interactive map layer in the style of Map Genie for Baldur's Gate 3. The player opens the map (M) and sees icons for all points of interest, can toggle categories on and off, hide collected items, search, and view details for a point. All of it without a second monitor or a browser.

## Reference

UX: https://mapgenie.io/baldurs-gate-3/maps/wilderness
- a side panel with category groups, each with an icon, a name and a counter;
- "show all / hide all", search by name;
- clicking or hovering a point opens a card: name, category, description;
- a "found" mark, hiding found points, progress per category.

We do not use Map Genie data or graphics. We draw our own icons or take them from game assets.

## Non-goals (for the first version)

- Console and Mac support.
- Multiplayer with synchronized marks (single player is required, do not break multiplayer).
- An in-game point editor.

## User scenarios

1. Opens the Wilderness map and sees chests, traps, books and merchants with the mod's icons.
2. Turns off "Traps", and they disappear from the map and the minimap. The setting persists between sessions.
3. Loots a chest, and it is automatically marked as found and hidden (if "hide found" is on).
4. Descends into the Underdark, and the map shows the points of that submap only, with no stray points at the edges.
5. Hovers over a point and sees a name and a hint, for example "locked, needs Sleight of Hand".
6. Types "Everburn" into search, and the map highlights the point.

## Categories (starting set)

Loot: chests and containers, unique weapons, unique armor, accessories, scrolls, books and notes, keys, ingredients, gold and valuables.
World: traps, hidden caches, levers and buttons, locked doors, teleports/waypoints, rest points.
NPC: merchants, quest characters, bosses, animals you can talk to.
Quests: quest start points (if they can be extracted reliably).

Categories are determined by rules in `tools/categories.ts` based on the object template, tags and name. The rules are covered by tests.

## Architecture

```
game files (.pak)
  -> tools/unpack      unpack the needed paks via Divine
  -> tools/extract     parse levels, templates, localization
  -> data/points.json  points: id, category, level/submap, x y z, template, name, description
  -> tools/build       pack the data into the mod (JSON or a Lua table)
mod in game
  -> Lua (Script Extender): load points, filters, "found" state, save settings
  -> XAML layer on the map: icons, category panel, card, search
```

### Point format

```json
{
  "id": "uuid of the object in the level",
  "category": "chest",
  "level": "WLD_Main_A",
  "submap": "Underdark",
  "pos": { "x": 0, "y": 0, "z": 0 },
  "template": "uuid root template",
  "name": "localized name",
  "description": "localized description or hint",
  "flags": ["locked", "trapped", "hidden"]
}
```

### "Found" state

Primary method: Lua checks whether the object exists and whether the container is empty, and subscribes to loot, kill and pickup events. Fallback: a manual mark by click. The state is stored in save data through Script Extender (ModVars or PersistentVars, to be chosen at stage 0).

### Settings

Filters and options are stored separately from the save (global for the player). If the on-map panel turns out too complex, the first version takes its settings from MCM and shows only icons on the map.

## Key risks (check first)

1. Whether a custom layer and panel can be added to the map XAML without breaking vanilla and while staying compatible with Better Maps All-In-One. Options: override the map XAML file in the mod, or modify the Noesis tree from Lua through Script Extender at runtime. Choose based on the results of stage 0.
2. Converting world coordinates to map coordinates, including submaps and interiors. The game already does this for its own markers and the player character, we need to find where and how.
3. Volume: thousands of points on a single map. Virtualization or clustering when zoomed out is needed.
4. Game patches change the UI. Keep XAML changes minimal and isolated.

## Stages

### Stage 0. Reconnaissance

- Find the game install, list the paks, unpack `Game.pak` and the level paks into `work/unpacked`.
- Find the XAML and resources of the journal map and minimap, describe the layer structure and where markers come from.
- Find how the bounds of level maps and submaps are defined.
- Count objects in `WLD_Main_A` by template type.
- Study how Better Maps All-In-One and Move With World Map interfere with the map (if the user puts their paks into `work/refs`).
- Find out from the Script Extender docs and sources what is available for the UI (Noesis) and for data storage.

Result: `docs/GAME_FILES.md` with real paths and `docs/RECON.md` with findings and the chosen UI approach. Acceptance: the user approved the approach.

### Stage 1. Prototype on the map

- A minimal mod: `meta.lsx`, Script Extender config, loads into the game without errors.
- 10 hardcoded points in Wilderness are drawn on the journal map in the right places.

Acceptance: the user opened the map in game and confirmed that the points are where they should be (screenshot).

### Stage 2. Data extractor

- `tools/extract` builds `data/points.json` for `WLD_Main_A` with all categories from the starting set.
- Names from localization, locked/trapped/hidden flags where possible.
- Report: how many points per category, how many were left without a category.

Acceptance: tests are green, fewer than 10% of interesting types are unclassified.

### Stage 3. All points and filters

- The mod loads the full set of Wilderness points and draws them with its own icons.
- Category filters, "show all / hide all", settings are saved.
- Performance: the map opens without a noticeable delay.

Acceptance: the user verified in game that turning off "Traps" hides them on the map and the minimap.

### Stage 4. Found and card

- Automatic "found", manual mark, "hide found", counters.
- Card on hover/click, search.

### Stage 5. Submaps and all acts

- Underdark, Grymforge, Moonrise Towers, acts 2 and 3, interiors.

### Stage 6. Release

- Build the pak, README for Nexus, screenshots, check with Better Maps All-In-One, check on a clean profile.

## Questions for the user (ask when we get there)

- Mod name for Nexus.
- Icon style: in the spirit of the game or of Map Genie.
- Whether compatibility with specific mods other than Better Maps is needed.
