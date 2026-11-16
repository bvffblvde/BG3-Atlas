# Game files: real paths

Verified 2026-11-15.

## Installation

- Steam: `C:\Program Files (x86)\Steam` (registry `HKCU\Software\Valve\Steam\SteamPath`).
- Steam libraries are listed in `<SteamPath>\steamapps\libraryfolders.vdf`.
- BG3 (appid 1086940, buildid 25605617, Patch 8 HotFix 10): `<SteamLibrary>\steamapps\common\Baldurs Gate 3`.
- A leftover folder from an old install may exist in another library: only logs and crash dumps, no paks.

## Paks (`Data\`)

| Pak | Size, MB | Contents (hypothesis before unpacking) |
|---|---|---|
| Game.pak | 1065 | GUI (XAML, map textures), scripts |
| Gustav.pak | 12576 | levels, templates, stats of the main campaign |
| GustavX.pak | 177 | patches to Gustav |
| Shared.pak | 155 | shared templates and levels |
| Engine.pak | 7 | engine |
| Icons.pak | 26 | icons |
| Patch8_HotFix9.pak, Patch8_HotFix10.pak | 130, 126 | hotfixes, override files above |
| Gustav_Textures.pak, Textures*.pak, VirtualTextures*.pak | many GB | textures, not unpacked in full |

Localization: `Data\Localization\English.pak` (14 MB), `Data\Localization\Russian\Russian.pak` (17 MB).

## User data

- `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\Mods\`: mod paks (installed through the in-game mod manager).
- `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\PlayerProfiles\Public\modsettings.lsx`: mod order.
- Mods that change the game's XAML (UI overhaul mods) can conflict with the map layer. Keep this in mind for compatibility.

## Script Extender

- `bin\` had no `DWrite.dll` at the time of the check: Script Extender was not installed.

## Inside the paks (verified by unpacking)

UI (`Game.pak`):
- `Mods/MainUI/GUI/Pages/JournalMap.xaml`, `Minimap.xaml`, `OverviewMap.xaml` and the `_c` versions for gamepad.
- `Mods/MainUI/GUI/StateMachines/Keyboard.xaml`, `Controller.xaml`: UI state machines.
- `Public/Game/GUI/Theme/DefaultShared.Styles.xaml`: the `MapMarkerIconStyle` style (line 2013), marker icon selection.
- `Public/Game/GUI/Theme/DefaultTheme.Styles.xaml`: the `Map.MarkerDataTemplate` and `Map.MiniMarkerDataTemplateInAndOutViewport` templates.
- `Public/Game/GUI/Library/DataTemplates.xaml`, `Tooltips.xaml` (the `ls:MapMarker` tooltip, around line 9121).
- `Public/Game/GUI/Assets/Map/`, `Assets/Minimap/`: map interface textures (frames, buttons, legend), plus colorblind variants.

Levels (`Gustav.pak`), using Act 1 as an example:
- `Mods/Gustav/Levels/WLD_Main_A/{Items,Characters,Triggers,Scenery,Splines,LevelTemplates}/_merged.lsf`: most of the objects.
- `Mods/GustavDev/Levels/WLD_Main_A/...`: additions, the same folders, plus `WorldMap/`, `meta.lsf` (level bounds `LevelBounds`).
- `Mods/GustavDev/Levels/WLD_Main_A/WorldMap/MiniMap.lsf` and `<TriggerId>.lsf`: `WorldMapMetaData`, the world-to-map binding and submaps.
- `Mods/Honour/Levels/WLD_Main_A/`: Honour mode changes.
- WorldMap also exists for other levels: `CTY_Main_A`, `SCL_Main_A`, `BGO_Main_A`, `END_Main`, `CRE_Main_A`, `INT_Main_A`, `TUT_Avernus_C`, `IRN_Main_A`, `EPI_Main_A`.

Templates: `Public/{Shared,SharedDev,Gustav,GustavDev,GustavX,Honour}/RootTemplates/_merged.lsf` (Shared and SharedDev in `Shared.pak`, GustavX in `GustavX.pak`, the rest in `Gustav.pak`).

Localization: `Localization/English/english.loca` in `English.pak`; extra texts `Mods/Gustav*/Localization/*.lsf` in `Gustav.pak` (books, subregions, waypoints).

Sublevels: `WLD_Main_A` attaches sublevels as objects with `Type="LevelTemplate"` in `<L>/LevelTemplates/_merged.lsf`; their root template contains `SubLevelName`. Sublevel objects use local coordinates, world = LT position + LT rotation. For Wilderness these are 39 folders `Mods/Gustav/Levels/WLD_*` (plus `GustavDev`), for example `WLD_GoblinCamp_D`, `WLD_Underdark_C`, `WLD_RangerCamp_I` (Druid Grove), `WLD_Plains_D`, `WLD_Forest_G`, `WLD_HagLair_D`.

Stats: `Public/{Shared,SharedDev,Gustav,GustavDev,GustavX,Honour,HonourX}/Stats/Generated/Data/*.txt`. Tags: `Public/{Shared,SharedDev,Gustav,GustavDev,GustavX}/Tags/<guid>.lsf`.

Localization: base files `Localization/English/english.loca` (`English.pak`) and `Localization/Russian/russian.loca` (`Localization/Russian/Russian.pak`). Gender variants (`*_to_F`, `Gender/...`) lie next to them and are not used.

`npm run unpack` lays out everything needed in `work/unpacked/lsx/` (lsx and txt by their paths inside the paks) and `work/unpacked/loca/{english,russian}.xml`.

`Public/*/Levelmaps/*.lsx` is unrelated to the map: it is level scaling, experience and gold.

## Crypt under the overgrown ruins (Act 1)

- Live level: `Mods/Gustav/Levels/WLD_Chapel_Push`, attached by the LevelTemplate `WLD_Chapel` (template `65633591-0aff-40af-a9e1-03095d19add7`, `SubLevelName = WLD_Chapel_Push`) in `WLD_Main_A/LevelTemplates`.
- `Mods/Gustav/Levels/WLD_Chapel_H`: an unused copy of Push with different item UUIDs, do not extract.
- `LTN_*` triggers are `TriggerLighting` (template `LightingTrigger`), they do not load levels.

## Waypoints

- Objects: items in `Mods/Gustav/Globals/WLD_Main_A/Items` and `Mods/GustavDev/Globals/{SCL,BGO,CTY,CRE}_Main_A/Items` (templates `BLD_GEN_WaypointShrine_A`, `Helper_Waypoint_A`, the template has `AnubisConfigName = WaypointShrine`). The `*_WaypointShrine_geo` decorations in Scenery are visuals only.
- Key to object link: facts `DB_WaypointInfo("<Act>","WAYP_*",(ITEM)<name>_<uuid>,(TRIGGER)...)` in `Mods/Gustav/Story/RawFiles/Goals/_Gustav_Waypoints_Act1.txt` and `Mods/GustavDev/Story/RawFiles/Goals/_Gustav_Waypoints.txt` (some facts have no `(ITEM)`). 40 facts.
- Names: `Mods/Gustav/Localization/Waypointshrines.lsx` and `Mods/GustavDev/Localization/Waypointshrines2.lsx`, `TranslatedStringKey` nodes (`UUID` = the `WAYP_*` key, `Content` = handle).
- Globals also hold other global level objects (story NPCs, merchants, unique items), the extractor reads them together with the level's items and characters.
