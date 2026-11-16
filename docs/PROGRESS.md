# Progress

## Stage 2. Data extractor (code ready, awaiting final review)

Plan: `docs/superpowers/plans/2026-11-15-stage2-extractor.md`. Run: `npm run unpack` (once), then `npm run extract`.

Result for Wilderness (WLD_Main_A and 26 `WLD_*` sublevels): 10,838 objects, 3148 points, 3.0% unclassified among interesting ones (the criterion < 10% is met).

| Category | Points | Category | Points |
|---|---|---|---|
| chest | 1906 | quest_npc | 33 |
| trap | 313 | accessory | 26 |
| ingredient | 275 | valuable | 22 |
| hidden_stash | 153 | weapon_unique | 21 |
| scroll | 120 | trader | 12 |
| book | 79 | waypoint | 12 |
| lever | 56 | armor_unique | 11 |
| key | 51 | boss | 6 |
| locked_door | 48 | animal | 4 |

Submaps: 1097 points inside buildings (KethericCity 277, GoblinCamp 121, Underdark 105, ...), the rest on the surface.

Good to know:
- Sublevels are attached through `LevelTemplate` and use local coordinates, the extractor converts them to world coordinates (with rotation).
- Chest = a container with loot (an `InventoryList` table or `ItemList` contents), empty barrels and crates are excluded.
- Trader = the `TRADER` tag or a `TradeTreasures` table with `Trade`/`Vendor` in its name. A plain `TradeTreasures` exists on almost every NPC, it is pocket loot.
- Waypoint = scenery `*_WaypointShrine_geo`. Transition doors (`IsPortal`) no longer count as waypoints.
- Unique weapons and armor count only as items lying in the world. Chest contents and NPC equipment are not turned into separate points.

Unverified:
- The `hidden` flag and the `hidden_stash` category are determined by names (`Hidden`, `Secret`, `Buried`, `Stash`), there is no direct field in the data.
- `animal` = a beast (`BASE_Quadruped_Beast`) with dialogue. Only 4 were found, perhaps some talking animals are described differently.
- Dangerous Underdark mushrooms (`Bibberbang`, `Exploding`, `ToxicWall`) are classified as traps.
- Waypoints get a generic name from the map legend ("Waypoints"). The specific names (`WAYP_*` in `Mods/Gustav/Localization/Waypointshrines.lsf`) are not linked to the stones in the level data, the link is probably in Osiris.
- The sublevels `WLD_Chapel_H`, `WLD_SharTemple_E`, `WLD_Vista`, `WLD_CAMP_CineTriggers` are not attached through `LevelTemplate` and do not need to be extracted (checked 2026-11-16). `WLD_Chapel_H` is an unused copy of `WLD_Chapel_Push`: the same bounds in meta.lsx, atmosphere and lighting, all 277 of its items exist in Push with the same names (271 in the same position), but with different UUIDs. The live crypt under the ruins is `WLD_Chapel_Push` (LevelTemplate `WLD_Chapel` in `WLD_Main_A`), its 36 points lie inside the circle of the crypt subregion. The other three have no items, characters or waypoints (only triggers, layers, decorations).
- Notes sometimes land in `scroll` (for example, "Letter of Refusal") instead of `book`.

## Fixes after user testing (2026-11-15)

- Confirmed in game: icons, panel, found/total counters, auto-marking (scrolls 5/120, ingredients 3/275, chests 2/1906), minimap, panel on gamepad (the Atlas button on L).
- Icons disappearing: the player entered a small Bridge building trigger with no points, and the view switched to an empty one. Now an empty building view falls back to the surface.
- The crypt under the overgrown ruins (WLD_Chapel_H, not extracted) showed surface points. The current building and floor must be taken from the game's WorldMapData: `!atlas_layerdump` now dumps WorldMapData and CurrentBuilding, waiting for a dump from the crypt and from the surface.
- Icons: each category has its own rim color, and weapons, armor, valuables, chests, accessories and bosses have a colored disc.
- The hover tooltip is now ls:LSTooltip (like vanilla markers) instead of a string ToolTip: it was too large; it may also work under the gamepad cursor (unverified).
- Gamepad: added UIUp/UIDown to move between panel rows (unverified, vanilla consumes them on this page).
- Second test: LSTooltip with a string renders empty, replaced with a ToolTip with an explicit TextBlock (font 22). The gamepad cursor does not show the tooltip: at the bottom of the gamepad panel there is a line with the name of the point nearest to the cursor (by LSWorldMap.MouseWorldCoordinates, format unverified, the first value is written to the log).
- The building and floor are now taken from the game's map data: WorldMapData.CurrentBuilding.UuidStr and WorldMapData.Floor (verified by a dump on the surface: UuidStr empty, Floor 0). A building unknown to the mod (for example the crypt WLD_Chapel_H) shows an empty view, a known building without points shows the surface. Fallback path: triggers, if there is no map on screen.
- `!atlas_layerdump` dumps are numbered (layer_dump_N.txt).
- Dump from the crypt (WLD_Chapel_H): CurrentBuilding.UuidStr is empty, but SubregionCenter = (-173.6, -317.5) in world (x, z) near the player and SubregionRadius = 63.3; on the surface the radius is 421. The game paints everything outside the subregion circle black. The mod now shows only points inside the SubregionCenter/SubregionRadius circle (everywhere).
- Gamepad cursor: ActualCameraLookatPos equals the player's position and does not change when panning. The point under the cursor is computed from MapPos: local = (holder/2 - MapPos - (holder - image)/2) * WorldWidth/imageWidth; verified on a dump (209.9, 427.1 with the player at 209.45, 427.08).
- Removed from the mod the probe commands that change the world (!atlas_mark, !atlas_unmark, !atlas_cmark), before playing on the main save.
- Confirmed by the user 2026-11-16: the tooltip under the gamepad cursor works, split screen works.
- Confirmed by the user 2026-11-16: the "On/off" button on gamepad toggles a category on all maps.
- SE crash in `GetAllEntitiesWithComponent` during the camp sleep cutscene. Cause per the SE sources: the `Ext.UI.Defer` callback runs on the Noesis thread (`OnUiPredicatesManagerUpdate`, `ContextGuardAnyThread`), and the layer queried ECS from it, which is a race with the main thread. Now the player's position and level are read in the timer callback (main thread) and passed to the UI thread as a copy of the numbers; the UI thread no longer touches entities. Additionally `Client/World.lua`: entities are read only in the `Running` state and 2 s after entering it, state changes are written to the log. Confirmed by the user 2026-11-16: sleeping in camp with the cutscene no longer crashes the game.
- Confirmed by the user 2026-11-16: the map in the ruined sanctum (under the goblin camp) is correct.
- The "Chests" category was split into three (2026-11-16, at the user's request: barrels, sacks and bones got in the way). `chest`: the template name (without `BASE_*`, instance names are not considered, they are unreliable) contains Chest, Safe, Strongbox, Lockbox or Vault, or the container is locked; 620 points. `remains`: Skeleton, BonePile, Bones, Ribcage, Skull, Corpse, Body, Viscera, Cocoon, Coffin, Casket, Sarcophagus, Tomb, Urn, Grave, Remains; 910 points. `container`: the other containers with loot (barrels, sacks, crates, baskets, furniture, beehives, nests); 5051 points. `container` and `remains` are off by default (`Settings.DefaultOff`, the enabled ones are stored in the `enabled` field of the settings file), auto-marking works for all three as for chests (unverified in game).
- Manual "found" mark (2026-11-16, plan `docs/superpowers/plans/2026-11-16-manual-found.md`). The mod variable `Found` stores `true` (found) and `false` (cleared manually), auto-marking does not touch points cleared manually. Gamepad: with the panel open, the "Found" button on the `UIMessageBoxY` event toggles the point in the row under the cursor (the toggle is queued and runs on the main thread). Mouse: the F key toggles the point nearest to `LSWorldMap.MouseWorldCoordinates` within a 30 pixel radius, only when JournalMap is visible and the search field is not focused. Log: `manual found <id> on|off`, the first mouse coordinate is written as a `mouse coords` line. Unverified: whether the `UIMessageBoxY` button is free on the map, whether `MouseWorldCoordinates` points to the point under the mouse, the scancode name `F` in `e.Key`, the `IsKeyboardFocused` property of the search field.
- Waypoints in all acts (2026-11-16): the extractor reads `Globals/<level>/{Items,Characters}`, a waypoint is determined by the `DB_WaypointInfo` facts, the name is taken by the `WAYP_*` key. 40 waypoints: WLD 16, SCL 8, CTY 10, BGO 3, CRE 3, all with their own names in English and Russian. Decorations from Scenery are no longer read. Global objects from Globals were added along the way: traders (+10 in act 1), bosses, unique gear. Unverified in game: some waypoints landed in building submaps by triggers (Blighted Village in Apothercary, Basilisk Gate in BarracksSideShed, Lower City Central Wall in BellTower, Reithwin Town in Tax, Wyrm's Rock in Fort, South Span in Bridge), so they are not visible on the surface then.
- Bug 2026-11-16: the found icon sometimes does not fade. Found: the auto-marking queue went over all acts (8947 points, 150 per 250 ms), one point was checked about every 15 s. Now the queue covers only the current map, plus every step checks all points within 40 m of the player. Diagnostics: a line `auto found <category> <name> (<reason>)` for every auto-mark and once a minute `detect <map>: ... containers full/empty/unreadable ...`. Hypothesis for containers (unverified): if the client cannot see the contents of an unopened container (unreadable or empty before opening), the "emptied" mark never triggers.
- Code review 2026-11-16 (reviewer agent). Fixed: (1) `Layer.ForceRebuild` was overwritten in `loadState`, so the "Explored only" toggle did not rebuild the layer; now there is a generation counter `rebuildGen`. (2) Detect took the map from the UI thread and after a level change could mass-mark items as "vanished"; now the map comes from the player snapshot (main thread), observations are reset on a map change, and "vanished from the world" counts only within 40 m of the player. (3) The first read of the mod variable `Found` happened on the UI thread; now the cache is warmed on the main thread (`Found.Prime`). (4) An error no longer stops Detect forever and does not block the second player. (5) A repeated layer start no longer starts a second loop. (6) The search for the point under the cursor and the found sync go over the points of the current view, not over all maps. Deferred: in split screen the position for the building fallback and the cursor is taken from the first player; the panel is recreated on every auto-mark; a full UI tree walk every tick; in network play, found records written by different clients overwrite each other.
- Split screen: Ext.UI.GetRoot returns one MainCanvas for both players, widgets differ by UIWidget.PlayerId. The layer looks for map widgets deeper (up to 4 levels under ContentRoot) and keeps state separately per player: its own ViewModel, view (building, floor, subregion), scale cache. The panel is redrawn by version separately for each player. Filters, found and search remain shared.
- Not working: "accept" on gamepad on the shared map (intercepted by the game), the "Explored only" filter (the user allowed deferring it).
- Gamepad: "accept" on the shared map did not toggle the category (it worked in the crypt): probably the press is intercepted by the map cursor over regions and markers. Added a second toggle button UITakeAll (an LSButton with the "On/off" hint and a button glyph, visible when the panel is open). Unverified.
- The "Explored only" setting (suggested by the user): on the surface only points inside the opened map regions are shown (WorldMapData.RegionsContainer.Regions, a region has Hidden and WorldPos/WorldSize in map coordinates). Regions are polled every 2 seconds, and the layer is rebuilt on change. Accuracy: per region, not per-pixel fog. In buildings the filter does not apply. A button in the mouse panel, saved to settings.json.

## Stage 5. Submaps (Wilderness built, not verified in game)

- The mod gets all 3148 Wilderness points with submap and floor and 95 submap boxes (Client/Data/Submaps.lua). Every tick Lua determines the player's submap and floor with the same algorithm as the extractor (the port was checked in fengari against TypeScript on a grid of points), and shows only the points of the current view: surface, Underdark by floors, interiors.
- Unverified: that the Underdark and interiors are drawn in the same map coordinate system (per the LSWorldMap template, building floors go under the same ProjectionMatrix, so it should match); that the player between Underdark floor triggers does not fall back to "surface".
- All acts (unverified in game): the extractor works by level groups (tools/lib/maps.ts): WLD_Main_A 3148, SCL_Main_A 2128 (act 2), CTY_Main_A 3145 and BGO_Main_A 1955 (act 3), CRE_Main_A 266, END_Main 182, EPI_Main_A 116, IRN_Main_A 83, TUT_Avernus_C 23, INT_Main_A 5. 11,051 points in total, 4.3% unclassified among interesting ones. The point has a new field map. The mod picks data by the character's Level.LevelName (unverified that the level name matches the name of the main level).
- Waypoint names exist only for WLD (waypoints, a generic label); waypoints of other acts are not marked (12 in total), we need to find how they are arranged in SCL/CTY/BGO.

## Stage 4. Found and card (part 1 built, not verified in game)

- Plan: docs/superpowers/plans/2026-11-15-stage4-found-card.md.
- Storage of found: the mod variable Found (in the save, client-server sync).
- Auto-detection (unverified): items by InventoryMember or by vanishing from the world after having been visible; chests if the container was non-empty and became empty (chests looted before the mod was installed will not mark themselves); bosses by Health.Hp <= 0. Traps, levers, doors, stashes are manual only.
- Found points are moved to a separate layer with opacity 0.45; a "Hide found" button on the panel; found/total counters.
- Manual marking by click was removed: in the installed SE build (v33 of 24.10.2026) a Command-type property in the point ViewModel breaks writing of neighboring properties (Cannot set property Id). The hover tooltip remained. All property writes from Lua go through P.Set/P.Handle, which log the failing property once and do not break the update.
- Search (not verified in game): a field in the panel (style DefaultInputBox, a TwoWay binding with UpdateSourceTrigger=PropertyChanged, vanilla has none), matches by Russian and English name are highlighted with a ring on top of the icons, up to 80, the counter is written directly into a TextBlock. It is unknown whether the game intercepts keys while typing in the field (journal hotkeys).
- Lua logic is tested through fengari (Lua 5.3 on JS): Search.Lower, Settings.Parse.

## Stage 3. All points and filters (in verification)

- Done per the plan docs/superpowers/plans/2026-11-15-stage3-points-filters.md: 2051 Wilderness surface points, 18 vector icons by category, constant on-screen size (scale through LSWorldMap.MinWidth, because the installed SE build has no Ext.UI.Box), a filter panel in JournalMap.xaml, settings in Script Extender/BG3Atlas/settings.json.
- The user confirmed: icons and panel work (2026-11-15). Waiting for verification of filters on the map and minimap and of persistence between sessions.
- Gamepad (unverified in game): the layer on the minimap and journal map (the JournalMap_c widget). The panel in JournalMap_c.xaml: shown by a toggle button on the UIFilter event (in the hints row next to "Legend", the game draws the button glyph), UILeft/UIRight move the selection, UIAccept toggles a category. There is no search in gamepad mode (no keyboard). Risk: UIAccept with the panel open may conflict with vanilla actions.

## Stage 1. Prototype on the map (points visible, 2026-11-15)

- The user confirmed with a screenshot: the player circle sits on the character icon and moves with it, 10 points at the Emerald Grove gates are visible north of the character. The conversion formula to map coordinates is in RECON.md.
- Left for a full prototype: icon size independent of zoom (now the circles are 6 m, huge when zoomed in), layer autostart, checking the minimap, an economical map lookup instead of walking the whole UI tree.

- 2026-11-15: the game with a pak that patches the `DefaultShared.Styles.xaml` theme crashed twice on startup, before the SE log was created (a minidump with no error text). Hypothesis: overriding the theme breaks UI loading. A pak without the theme was installed (`npm run build -- --no-theme`) to confirm. If the game starts without the theme, investigate the XAML layer; if it crashes even without the theme, the cause is elsewhere (SE or Lua).
- 2026-11-15, 18:16: enabling the mod in the in-game manager mid-session led to a crash on module reload; the mod's Lua had not run by then (no BG3 Atlas lines in the SE log). The layer autostart on SessionLoaded was removed, the layer is started manually with the `!atlas_layer_start` command in the client console. Waiting for a clean game start with the mod already enabled.
- 2026-11-15, 20:00: a clean start with the mod enabled without the theme: the save loads, the layer starts, no crashes. So the startup crashes are tied to the theme override. Next step: a pak with a vanilla copy of the theme (`npm run build -- --theme-vanilla`). If it crashes even with it, the problem is in the theme file substitution itself; if not, in our XAML fragment.
- 2026-11-15: with a vanilla copy of the theme the game starts, so our fragment breaks it. The WPF XamlReader accepts the fragment, all constructs occur in vanilla XAML, the patch inserts exactly our block. Bisection: a minimal layer was installed (projection, Canvas, circles of 4x4 units, no DataContext x:Null, no scale through RelativeSource on the transform, no color triggers).
- Minimal layer in the theme: the game does NOT crash, the layer is found. So the crash was caused by one of the removed constructs: DataContext x:Null, ScaleTransform with RelativeSource AncestorType=ItemsControl, or DataTrigger. Bring them back one at a time.
- SE v33: properties with Notify = true cannot be written from Lua (Cannot set property X - property does not exist), those without Notify work. Properties were renamed to PosX/PosY without Notify, the player's points are updated by replacing a collection item (unverified in game).
- In game: the layer's DataContext is set on the map and minimap, but the points are not visible. Lua proxies of Noesis objects live only inside one Defer call: the ViewModel cannot be cached between ticks (lifetime has expired). Fixed: the ViewModel is taken from the layer's DataContext every tick. Added the `!atlas_layerdump` command for render diagnostics.

- Stage 0 accepted: the hybrid approach was agreed, the in-game probe was done (RECON.md, section 7a).
- Done: the `BG3A_Layer` layer in the `LSWorldMap` template, the theme patch at build time, Lua `Client/Layer.lua` with 10 points at the Emerald Grove gates and two player debug points: green (x, z), red (x, -z).
- Waiting for in-game verification: whether the points are visible, which debug point matched the character, icon size.

## Stage 0. Reconnaissance (done)

Done:
- Found the game install, listed the paks, listings in `work/lists/`.
- Downloaded LSLib v1.20.4 (`tools/bin/lslib`, outside git) and SE v33 (`work/refs/bg3se-dl/DWrite.dll`, sources in `work/refs/bg3se`).
- Unpacked `Game.pak`, `Shared.pak`, `GustavX.pak`, the Patch 8 hotfixes, `English.pak` and selectively from `Gustav.pak`: the `WLD_Main_A` level, `RootTemplates`, `Localization`.
- Found the map XAML, the marker scheme, the world-to-map binding data (`WorldMap/*.lsf`). Findings in `docs/RECON.md`.

- The user agreed to the hybrid approach (RECON.md, section 6C). We do not install Better Maps, we work with the vanilla map.
- SE installed, a probe mod built and installed (`mod/BG3Atlas`, console commands `!atlas_*`).

Remaining:
- The in-game probe (section 7 in `RECON.md`), analysis of `probe_ui.txt` and logs.

## What is installed in the game and how to roll back

- `<game>\bin\DWrite.dll`: Script Extender v33 (updater). Delete the file to disable SE.
- `...\bin\ScriptExtenderSettings.json`: console, logs in `work/selogs`, DeveloperMode. Delete together with DWrite.dll.
- `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\Mods\BG3Atlas.pak`: our mod.
- `modsettings.lsx`: one `BG3Atlas` node was added, backup before the change in `work/backup/`.

## Build and install

- `npm run build`: build `dist/BG3Atlas.pak`.
- `npm run install-mod`: copy the pak to `Mods` and register it in `modsettings.lsx` (with a backup, does not add twice).
- `npm test`: unit tests and Lua syntax check.

## Unverified

- `WorldX/WorldZ` in `WorldMapMetaData`: center of the area or a corner, direction of the Z axis.
- Whether the game creates a map marker if `MapMarkerStyle` is added to an item at runtime.
- Whether the scale and offset of `LSWorldMap` are accessible from Lua.
- How Better Maps All-In-One changes the map (no paks).
- Keyboard text reaches only `ls:LSTextBox`, not a plain `TextBox` (the search box got no letters in game with `TextBox`; every vanilla input uses `LSTextBox`).
- A custom `ToolTip.Template` removes the yellow frame around the hover tooltip text on the mouse map.

## Gamepad bindings on the map page (JournalMap_c)

- `X`: `UIMapAddCustomMarker` (place marker). `Y`: `UIDelete` (waypoint list) and also `UITakeAll` and `UIMessageBoxY`, so those two must not be used. `A`: `UIAccept` (fast travel to the hovered waypoint, Atlas toggle while the panel is open). `B`: `UICancel`. Left stick click: `UIFilter` (Atlas). `UISort`: legend. Right stick click: `UIShowInfo` (center).
- Script Extender exposes raw pad buttons through `Ext.Events.ControllerButtonInput` (`Button`, `Pressed`, `DeviceId`) and triggers through `Ext.Events.ControllerAxisInput`.
- Found marking on the pad is RB through `ControllerButtonInput` with `PreventAction`, only while a pad map cursor hovers a point (unverified in game). In split screen with several pad players hovering, the lowest player number wins because `DeviceId` is not mapped to players yet.

## Environment notes

- Divine from LSLib v1.20.4 requires .NET 8, the machine has .NET 9: run with `DOTNET_ROLL_FORWARD=Major`.
- Divine accepts only absolute paths in `-d`.
- The `-x` mask during unpacking works as a glob over the path inside the pak, for example `-x "Mods/Gustav/Levels/WLD_Main_A/*"`.

## Open bug: detached sublevels drawn on the surface (2026-11-16)

- Lower City basements and other detached sublevels (`CTY_*_Basement_A`, `CTY_Catacombs_A`, `CTY_DockWarehouseBasement_A` and more) sit far outside the city in world space and have no WorldMap submap region, so the extractor leaves `submap = null` and the mod draws their points on the surface map, in the sea and fog around the city.
- Tried rule: a sublevel is detached when no surface point of the main level lies within 30 m of its bounding box. It does not work: the main level `CTY_Main_A` itself places objects inside the basement areas, so only 6 sublevels across all maps qualify.
- Next idea: give each detached sublevel a synthetic submap box from its LevelTemplate bounds (or the point bounding box), shown only when the player is inside. How the vanilla map behaves while the player is in such a basement is unverified.

## Scrolls and notes (2026-11-16)

- Every letter, note, poster and newspaper inherits `BASE_BOOK_Scroll_Letter`, so the old `Scroll` name rule put them all into `scroll`, and books without a `BookId` attribute were not categorized at all.
- Now `scroll` is spell scrolls only (`MagicScroll` object category or the `BASE_BOOK_Scroll_Magic` template). `book` is everything readable under `BASE_BOOK` or `REF_BOOK` (letters, notes, posters, maps, books), except containers and blank generic paper (`BOOK_GEN_Scroll_Parchment*`, `BOOK_GEN_Paper*` placed without their own `DisplayName`).
- Counts: scroll 845 -> 77, book 102 -> 1411 (Lower City 14 -> 621 notes and books).
- Update: the points in the sea next to the Lower City are not basements. Around x -305..-99, z -244..-171 there are 82 surface points at y 0..6 (streets are at y 15..45): Gilded Chests of the Counting House vault south of the `CH` footprint, plus chests and barrels around `WQH` and `SeaTower`. Submap boxes in the data have an unbounded height, so assignment is by XZ footprint only, and these points fall outside every footprint. Unverified in game which of them are the vault, ship holds or real dock objects.

## Location risk analysis, all acts (2026-11-16, from data only, unverified in game)

1. Outdoor waypoints assigned to building submaps, hidden on the surface view: Blighted Village (Apothercary), Reithwin Town (Tax), Basilisk Gate (BarracksSideShed), Lower City Central Wall (BellTower), South Span of Wyrm's Crossing (Bridge, floor -3), Wyrm's Rock (Fort). Underground ones are probably right: Grymforge and Ancient Forge (KethericCity), Gauntlet of Shar and Verge of the Shadows (Shar), Cazador's Dungeon.
2. Points outside every submap footprint but inside an interior (Counting House vault and the harbour, see above). Footprints are XZ only, so any vault or cellar wider than its building leaks onto the surface map. Not detectable from data alone.
3. Detached sublevels with no submap at all, drawn on the surface map at their world position: CTY_Guildhall_Basement_A 44, CTY_PhilgraveBasement_A 27, END_KarlachDock_A 24, SCL_Nightsong_A 15 (2 unique armour), END_Beach_A 5.
4. State variants loaded together: WLD_Hag_C_Evil and WLD_Hag_C_Happy (Auntie Ethel's teahouse) both contribute points, so one set is always stale.
5. 52 exact duplicate spots (same name, same position, same level), they inflate counters.
6. Vertical outliers (points 6+ m below their neighbours without a submap) are few: Jungle of Chult bones, Reithwin and battlefield bones, a few WLD caves (Underdark, around 0,500 and 250,500).

## Localization (2026-11-16)

- Interface strings moved to `Client/Locale/<code>.lua` (en, ru, pt-BR placeholder). `Locale.Text(code)` falls back to English for missing keys, a test checks that every language has exactly the English keys.
- Game language is detected by matching the translated text of the waypoint legend handle `h2020fdf6g224eg40cfg80ecg91fed5d32d11` against a probe string registered by each locale. `settings.json` can force it with `"language": "pt-BR"`.
- Search folds Latin diacritics and Russian yo, so "cha" finds "Chá".
- Point names exist only in English and Russian. Brazilian Portuguese names need `Localization/BrazilianPortuguese` from the game (switch the game language in Steam to download it) and a third name column in the data. Not done yet.

## Compatibility with Better Maps All-In-One by Caites (2026-11-16, from pak contents, unverified in game)

- Better Map (all scale variants) does not override vanilla files. It adds its own pages (`BetterJournalMap.xaml`, `BetterJournalMap_c.xaml`, `BetterMinimap*.xaml`) and switches the `JournalMap` and `IUI_Minimap` states to them through `StateMachines/*.xaml` with `ModType="Override"`. Its `LSWorldMap` elements use the implicit style, so our layer in `DefaultShared.Styles.xaml` should still draw icons. Our panel and gamepad hint buttons live in the vanilla journal pages, so they will not appear. Lua widget lookups by name may also miss the new pages.
- Better Map Icons only replaces character marker textures under `Public/Game/GUI/Assets/Map`: no conflict.
- Clear Map (No Grid, Transparent Shroud, No Shroud) defines an implicit `Style TargetType="ls:LSWorldMap"` with a full `ControlTemplate` in `GUI/Library/Lib_Keyboard.xaml` and `Lib_Controller.xaml`. If it wins over the vanilla theme style, our layer disappears from the map and minimap while the panel stays.
- Robust fix idea: move the panel into our own overlay state instead of patching the journal pages, and find a way to inject the layer that survives a replaced `LSWorldMap` template.

## Compatibility with Mazzle's Maps Unleashed (2026-11-16, from pak contents, unverified in game)

- No XAML overrides at all. Everything is Script Extender Lua, with dependencies MCM, Mazzle_Lib and Mazzle_Docs.
- Its map icons and windows are IMGUI overlays (`Ext.IMGUI.NewWindow`, `AddImage`) positioned through its own world to screen transform, not Noesis elements, so they should coexist with our XAML layer. Risks: IMGUI windows taking mouse input over our tooltips and the F hotkey, and its map scale and subregion lock settings changing `LSWorldMap` properties we read.
- Its fog of war toggle only changes `Opacity` of the template elements `ShroudedRooms`, `SemiShroudedRooms` and `Shroud`. It does not read which areas are explored, so it does not help our "Explored only" filter.
- Idea for our own Better Maps and Clear Map compatibility: an overlay that does not live inside the `LSWorldMap` template survives template replacement. IMGUI would not look native and needs checking with a gamepad.

## Panel as its own widget (2026-11-16)

- The Atlas panel no longer patches `JournalMap.xaml` and `JournalMap_c.xaml`. The build generates `GUI/Pages/BG3A_Panel.xaml` (mouse) and `BG3A_Panel_c.xaml` (pad) plus `GUI/StateMachines/Keyboard.xaml` and `Controller.xaml` that add them to the `JournalMap` state with `ModType="Extend"` on the `PopupPanels` layer.
- Verified in game: the widget shows on both map pages, the panel, search, category clicks, gamepad L3, D-pad, A, RB and LB work. With Better Map All-In-One the widget shows only when BG3 Atlas is loaded after Better Map (its `ModType="Override"` replaces the state, our `Extend` must come later).
- Lua finds panel widgets by name (`BG3A_PanelWidget`, `BG3A_PanelWidget_c`) and player id and updates the existing view model in place instead of replacing it on every change.
- F hotkey: one press sometimes arrived twice (on and off in consecutive ticks), now only `KeyDown` counts and repeats within 300 ms are ignored. Split screen with two panels: unverified.

## Data fixes (2026-11-16)

- Waypoints assigned to a building submap move back to the surface view when at least 5 surface points within 40 m lie within 4 m height (`surfaceWaypoints`). Moved: Blighted Village, Reithwin Town, Basilisk Gate, Lower City Central Wall, South Span of Wyrm's Crossing. Kept underground: Grymforge, Ancient Forge, Gauntlet of Shar, Verge of the Shadows, Cazador's Dungeon. Wyrm's Rock stays in `Fort` (only 1 surface neighbour). Unverified in game.
- Exact duplicates (same map, name and position to 0.1 m) are dropped: 11710 -> 11648 points.
- Auntie Ethel's teahouse: both `WLD_Hag_C_Happy` and `WLD_Hag_C_Evil` stay, which state is live is unverified.

## Release 1.1.0 (2026-11-16)

- Verified in game: fog of war layer, LB and LT toggles, hide grid, panel widget on mouse and gamepad, split screen panels, tooltips next to the icon, compact panel rows, F with a working counter.
- Package: `dist/release/v1.1/BG3Atlas-1.1.0.zip` (meta Version64 36169534507319296). Nexus description, banner and changelog are in `dist/release/v1.1/`.
- Still open: F on mouse does not refresh the tooltip and dimmed style of the hovered icon until the cursor leaves it, Lower City vault and harbour points on the surface map, Auntie Ethel teahouse state variants, Blighted Village waypoint unverified in game, Brazilian Portuguese point names (needs the game's pt-BR localization pak).

## Map styles (next version, unverified in game)

- `LT` and the panel button cycle three map styles: default (vanilla grid and fog), no grid, clear (no grid, `Shroud` at 0.8 opacity like Clear Map No Grid Transparent Shroud). Settings store `mapStyle` 0..2, old `hideGrid: true` reads as 1.
- With the clear style the Atlas icons under the fog are faintly visible too, so "Explored only" no longer hides them fully.

## Split screen input fixes (unverified in game)

- With both players on the map, one gamepad press reached both Atlas panels, so A toggled a category twice (back to where it was) and the D-pad moved the selection two steps. Panel commands are now deduplicated within 120 ms (`Hotkey.Fresh`).
- RB, LB and LT come from raw SDL controller events, which do not say which player pressed them. The owner is now looked up in `Ext.Input.GetInputManager().PlayerDeviceIDs`, assuming the game's controller id is `3 + SDL device index` (unverified). The first press of each controller is logged as `pad device N -> player P (player devices ...)`. When the owner is unknown the old behaviour applies.
- Map open state for the gamepad is tracked per player, so the other player's buttons are no longer swallowed while only one of them has the map open.
