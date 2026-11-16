# Stage 3: all Wilderness points, icons and the filter panel. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the mod shows all Wilderness surface points from `data/points.json` on the journal map and minimap with game-style icons, and a panel on the map screen toggles categories on and off; the selection persists between sessions.

**Architecture:** the build generates from `points.json` a Lua module with points already in map coordinates and the layer XAML with a separate `ItemsControl` per category (its own vector icon, no `DataTrigger`). Lua creates one ViewModel with a collection per category, attaches it to the map and minimap layer, and the filter toggles the `Visibility` of the category layer. The filter panel is inserted into `JournalMap.xaml` by the same patcher, its rows are buttons with a `Command`, and the state is displayed by replacing a collection item (properties with `Notify` do not work in SE v33).

**Tech Stack:** TypeScript (tools, vitest), Lua (SE v33), Noesis XAML.

**Spec:** `docs/SPEC.md` (stage 3, categories, "Settings"), facts about the map: `docs/RECON.md` (section 7a and "Projection coordinate system").

## Global Constraints

- No comments in code, no long dashes.
- Larian files and data extracted from the game (`points.json`, the generated Lua with names) do not go into git: they are generated at build time into `work/build`.
- In XAML only constructs verified in game or found in vanilla XAML. Forbidden until the crash cause is found: `DataContext="{x:Null}"`, `RelativeSource AncestorType=ItemsControl` inside transforms, `DataTrigger` in the layer templates.
- SE ViewModel properties without `Notify` (it does not work in SE v33). Do not store Noesis objects in Lua between `Ext.UI.Defer` calls.
- Do not touch the user's mod list, install only `BG3Atlas.pak`.

## Facts (verified)

- Map coordinates: `localX = worldX - (WorldX - W/2)`, `localY = (WorldZ + H/2) - worldZ`, for WLD_Main_A `WorldX=-362.5, WorldZ=80, W=H=1675` (`Mods/GustavDev/Levels/WLD_Main_A/WorldMap/MiniMap.lsx`).
- On-screen icon size: `scale = px * WorldWidth / (MapScale * MapImage.ActualWidth)`, Lua writes it to `LSWorldMap.Tag`, the template reads `{Binding Tag, RelativeSource={RelativeSource AncestorType=ls:LSWorldMap}}`.
- Widgets: `JournalMap` and `Minimap` in `ContentRoot`. In `JournalMap.xaml` the legend `Grid x:Name="Legend"` is at the bottom left, the waypoint panel is on the right.

## Review Focus

- A point with `submap != null` (building, underdark) must not be drawn on the surface. The test in task 1.
- A category without points (for example `animal` in another region) must not break XAML and Lua generation. The test in task 2.
- A name with quotes, a backslash or a newline must not break the generated Lua. The test in task 1.
- The settings file is missing or corrupt: all categories are enabled, the game does not crash. A Lua-level test in task 3 (luaparse plus a pure parse function).
- Reopening the journal (the widget is recreated): the layer and panel get the ViewModel again. An in-game check, task 5.

---

### Task 1: Point data generator for the mod

**Files:** Create `tools/lib/mapdata.ts`, Test `tools/test/mapdata.test.ts`.

**Interfaces:**
- Produces: `interface MapOrigin { x: number; z: number }`, `readMapOrigin(lsxRoot: string, level: string): MapOrigin` (from `WorldMap/MiniMap.lsx`, `x = WorldX - WorldWidth/2`, `z = WorldZ + WorldHeight/2`); `toMapLocal(origin: MapOrigin, x: number, z: number): [number, number]`; `luaString(s: string): string` (escaping into a Lua string in double quotes); `pointsLua(points: Point[], origin: MapOrigin): string` returns `return { {"id","category",x,y,"name","nameRu",flagsMask}, ... }` only for `submap === null`, coordinates with 0.01 precision, `flagsMask`: locked=1, trapped=2, hidden=4.

- [ ] Tests: `toMapLocal({x:-1200,z:917.5}, 212.35, 425.93)` gives `[1412.35, 491.57]`; a point with `submap: "Underdark"` is absent from the output; the name `a"b\c` and a newline are escaped, the result is parsed by `luaparse`; `flagsMask` for `["locked","hidden"]` equals 5.
- [ ] The test fails, implementation, the test passes, commit `Add map point data generator`.

### Task 2: Layer XAML generator with category icons

**Files:** Create `tools/lib/layerxaml.ts`, `mod/xaml/icons.ts` (icon geometry, data for the generator), Modify `tools/lib/themes.ts` (the snippet is taken from the generator, not from `mod/xaml/WorldMapLayer.xaml`), Delete `mod/xaml/WorldMapLayer.xaml`, Test `tools/test/layerxaml.test.ts`.

**Interfaces:**
- Consumes: `CategoryId`, `categoryRules` from `tools/categories.ts`.
- Produces: `categoryIcons: Record<CategoryId, { glyph: string }>` (Path data in a 24x24 square); `layerXaml(): string` returns `Grid x:Name="BG3A_Layer"` with an `ItemsControl x:Name="BG3A_Cat_<id>"` per category, `ItemsSource="{Binding <Id>}"` (the ViewModel property name = `Cat_<id>`), a shared `MatrixTransform` with `ProjectionMatrix` on the `Grid`, the item template: a `Canvas` with a `RenderTransform` (offset -12, scale `Tag/24` through a `ScaleTransform` bound to the `Tag` of the `ls:LSWorldMap` ancestor, offset `PosX/PosY`), inside a dark disc `#E61A1208` with a golden rim `#FFC9A45C` and a golden `Path` glyph.

Scale ruling: the icon is drawn in 24 units, so Lua writes the value `scale / 24` to `Tag`.

- [ ] Tests: the result passes `XMLValidator` inside a wrapper with `xmlns:ls`; for each category from `categoryRules` there is exactly one `x:Name="BG3A_Cat_<id>"`; the result has no `DataTrigger`, `{x:Null}`, `AncestorType=ItemsControl`; patching the real theme (`patchTheme`) passes with the new snippet.
- [ ] The tests fail, implementation, the tests pass, commit `Generate per-category map layer`.

### Task 3: Lua: points, per-category ViewModel, filters and settings

**Files:** Create `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Settings.lua`, `.../Client/Points.lua`; Modify `.../Client/Layer.lua`, `.../BootstrapClient.lua`; Modify `tools/build.ts` (puts the generated `Client/Data/Wilderness.lua` into `work/build`), Test `tools/test/lua-syntax.test.ts` (already covers all Lua), `tools/test/build-data.test.ts`.

**Interfaces:**
- `Settings.lua`: `BG3Atlas.Settings.Load()`, `Save()`, `IsEnabled(cat): boolean`, `SetEnabled(cat, on)`, `SetAll(on)`; the file `Script Extender/BG3Atlas/settings.json` through `Ext.IO`, a corrupt or missing file = all enabled.
- `Points.lua`: `BG3Atlas.Points.Load()` reads `Ext.Require("Client/Data/Wilderness.lua")`, `ByCategory(): table<cat, list>`, `Counts(): table<cat, n>`.
- `Layer.lua`: the ViewModel `BG3A_Layer` with properties `Cat_<id>` (Collection) per category; on attaching to the layer it fills the collections; every tick it sets `Visibility` on `BG3A_Cat_<id>` from `Settings.IsEnabled` (value `"Visible"`/`"Collapsed"`, with `Opacity` 0/1 as a fallback if the write fails); `Tag = scale / 24`; the player point is removed (no longer needed for calibration).
- `tools/build.ts`: before packing it calls `pointsLua(readPoints(), readMapOrigin(lsx, "WLD_Main_A"))` and writes to `work/build/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Data/Wilderness.lua`; if `data/points.json` is missing, the build fails with a hint `npm run extract`.

- [ ] Data build test: the generated file exists in the staging folder after `buildData()` and parses with luaparse. The Lua syntax of all files is green.
- [ ] Commit `Load extracted points into the map layer`.

### Task 4: Filter panel on the journal map screen

**Files:** Create `tools/lib/panelxaml.ts`, Modify `tools/lib/themes.ts` (add the source `Mods/MainUI/GUI/Pages/JournalMap.xaml` from Game.pak and the `injectFilterPanel` patch), `tools/lib/xaml-patch.ts`, Modify `.../Client/Layer.lua` (or a new `.../Client/Panel.lua`), Test `tools/test/panelxaml.test.ts`, `tools/test/xaml-patch.test.ts`.

**Interfaces:**
- `panelXaml(): string`: `Border x:Name="BG3A_Panel"` at the top left of the map screen (above the legend, `Grid.Row="1"`, `HorizontalAlignment="Left"`, `VerticalAlignment="Top"`, an offset under the zone banner), the title "Atlas", two buttons "All" / "None" (`Command="{Binding ShowAll}"`, `{Binding HideAll}`), `ItemsControl ItemsSource="{Binding Rows}"`, a row is a `Button` with `Command="{Binding DataContext.Toggle, ElementName=BG3A_Panel}"`, `CommandParameter="{Binding Id}"`, inside the category icon (the same geometry), `TextBlock Text="{Binding Label}"`, the counter `{Binding Count}`, `Opacity="{Binding Alpha}"` (1 enabled, 0.4 disabled).
- `injectFilterPanel(xaml, snippet)`: insertion before the `<!-- legend -->` block (`<Grid x:Name="Legend"`), an error if the anchor is not found.
- Lua: the type `BG3A_Panel` (`Rows` Collection, `Toggle`/`ShowAll`/`HideAll` Command), the type `BG3A_Row` (`Id`, `Label`, `Count`, `Alpha`); on click the command changes `Settings`, replaces the row in `Rows` with a new one (to refresh `Alpha`), saves the settings. Category labels: Russian and English strings in a Lua table by game language (`Ext.Utils`/`Ext.Loca` language, Russian on failure).

Ruling: `ElementName` from a `DataTemplate` to an element outside the template within one page works in WPF and Noesis within one page namescope; if it does not work in game, the fallback `RelativeSource AncestorType=ls:UIWidget` and `DataContext.BG3A...` is unavailable (the widget's DataContext belongs to the game), so the command is moved into the row itself (`Toggle` on `BG3A_Row`).

- [ ] Tests: the snippet is valid, there are no forbidden constructs, patching the real `JournalMap.xaml` inserts exactly one `BG3A_Panel` before `Legend`.
- [ ] Commit `Add filter panel to the journal map`.

### Task 5: Build, install, in-game check

- [ ] `npm test` is green, `npm run build`, install the pak after closing the game.
- [ ] Ask the user to: load a save, open the map, see icons by category; turn off "Traps" on the panel, make sure they disappeared on the map and minimap; restart the game, make sure the selection persisted; open and close the journal twice.
- [ ] Based on the results update `docs/PROGRESS.md` (stage 3 acceptance from SPEC: turning off "Traps" hides them on the map and minimap), commit and push.
