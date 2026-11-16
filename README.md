# BG3 Atlas

![BG3 Atlas](docs/media/cover.png)

An interactive map inside Baldur's Gate 3. Open the journal map (M) or look at the minimap and you see icons for chests, unique gear, books, keys, traps, hidden stashes, levers, waypoints, traders, bosses and more. Filter by category, hide what you have already found, search by name and hover an icon to see what it is. No second monitor, no browser.

All point data is extracted from the game's own files. Nothing is taken from third party map sites or other mods.

## Features

- Icons on the journal map and on the minimap, sized like the game's own markers and kept in place while you zoom and pan.
- 20 categories in three groups:
  - Loot: chests, barrels crates and sacks, remains, unique weapons, unique armour, accessories, scrolls, books and notes, keys, ingredients, valuables.
  - World: traps, hidden stashes, levers and buttons, locked doors, waypoints.
  - Characters: traders, quest characters, bosses, talking animals.
- Filter panel on the map with a found / total counter per category. Show all and hide all buttons.
- Found tracking:
  - Picked up items, emptied containers and defeated bosses are marked automatically.
  - Mark or unmark any point yourself (see Controls). A point you unmarked stays unmarked.
  - Found points are dimmed, or hidden with "Hide found".
  - Progress is stored in your save.
- Search by name (mouse and keyboard), in English and Russian.
- Hover tooltip with the point's name. On a gamepad the name of the point under the map cursor is shown in the panel.
- Interiors and sub maps: inside buildings, caves, the Underdark, Grymforge, the crypt and similar places the map shows only the points of that place and floor.
- All acts: Wilderness, Underdark and Grymforge, Shadow-Cursed Lands, Moonrise Towers, Rivington and Wyrm's Crossing, Lower City, plus the smaller areas.
- Waypoints use their real names ("Roadside Cliffs", "Last Light Inn", "Grey Harbour Docks").
- Gamepad support and split screen co-op: each player has their own map view, filters and found state are shared.

## Requirements

- Baldur's Gate 3, Patch 8 (Steam, Windows).
- [BG3 Script Extender](https://github.com/Norbyte/bg3se).

## Installation

1. Install BG3 Script Extender.
2. Put `BG3Atlas.pak` into `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\Mods`.
3. Enable "BG3 Atlas" in your mod manager (or the in-game mod manager) and start the game.

Enable or disable the mod from the main menu, not while a save is loaded.

## Controls

Mouse and keyboard:

- Open the journal map. The Atlas panel sits on the map: click a category to show or hide it, use the search box to find a point by name.
- Hover an icon to see its name.
- Hover an icon and press **F** to mark it as found, press **F** again to unmark it. F does nothing while you type in the search box.

Gamepad:

- Open the map and press the button shown next to "Legend" to open or close the Atlas panel.
- D-pad moves the selection in the panel, the button labelled "On/off" in the hint bar shows or hides the selected category.
- Move the map cursor onto an icon: its name appears at the bottom of the panel. Press the button labelled "Found" in the hint bar to mark or unmark it.

## Settings

Category filters, "Hide found" and "Explored only" are saved to `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\Script Extender\BG3Atlas\settings.json` and apply to every save. Found state is stored per save.

## Compatibility

BG3 Atlas adds its layer to the vanilla world map style and its panel to the vanilla journal map pages (mouse and gamepad). Mods that replace the same map files may conflict. Better Maps All-In-One has not been tested yet.

## Known limitations

- "Explored only" is work in progress: the game's fog of war is not readable by mods, so this filter may not hide anything yet.
- Barrels, crates, sacks and remains are off by default because there are thousands of them. Turn them on in the panel if you want them.
- Automatic marking needs the object to be loaded near you. Items taken out of a container are not points of their own, the container is.
- Found marks in online multiplayer are kept per client and may overwrite each other. Single player and split screen are fine.

## Console commands

Open the Script Extender console and type:

- `!atlas_layerdump` writes a diagnostic dump of the map to the Script Extender folder.
- `!atlas_iconpx <journal> <minimap>` changes icon size in pixels.
- `!atlas_toggle <category>` and `!atlas_all on|off` change filters.
