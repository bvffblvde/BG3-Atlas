# Stage 0. Reconnaissance: findings

Date: 2026-11-15. Game: Patch 8 HotFix 10 (buildid 25605617). Script Extender: v33 (sources in `work/refs/bg3se`).

## 1. How the map works in the game

- Journal map: `Mods/MainUI/GUI/Pages/JournalMap.xaml` (387 lines), minimap: `Minimap.xaml` (557), overview map: `OverviewMap.xaml`. Each has a `_c` version for gamepad.
- Both maps are drawn by the native control `ls:LSWorldMap` (`x:Name="WorldMap"`), data: `WorldMapData="{Binding CurrentPlayer.WorldMap}"`. Scale, panning and marker projection live inside the engine, they are not in the XAML.
- Marker: the control `ls:LSWorldMapMarker`, its ViewModel `ls:MapMarker` with the fields `Type`, `Name`, `GameObject`, `MapMarkerStyle`, `QuestViews`, `CombinedMapMarkers`. Templates: `Map.MarkerDataTemplate` and `Map.MiniMarkerDataTemplateInAndOutViewport` in `Public/Game/GUI/Theme/DefaultTheme.Styles.xaml`.
- The marker icon is chosen by the `MapMarkerIconStyle` style (`Public/Game/GUI/Theme/DefaultShared.Styles.xaml`, line 2013) by `Type` and `MapMarkerStyle` through a DataTrigger.
- Marker types found in the templates: `Waypoint`, `Portal`, `CampChest`, `Trader`, `Custom`, `SpecialItem`, `QuestMarker`, `LocationMarker`, `CharacterParty`.
- The game creates a `SpecialItem` marker for an item that has `MapMarkerStyle` set. In vanilla only two templates are marked this way: `FUR_GEN_Wardrobe_Player_A` (`WithersWardrobe`) and the magic mirror (`MagicMirror`), both in `Public/Shared/RootTemplates/_merged.lsf`. At runtime this is the component `eoc::item::MapMarkerStyleComponent { FixedString Style }` (SE: `MapMarkerStyle`).
- Custom markers (`AddCustomMarker`, `RemoveCustomMarker`) already exist in vanilla, the commands hang on the widget's DataContext.

## 2. World to map binding (risk 2): solved at the data level

Each level has a folder `Mods/GustavDev/Levels/<Level>/WorldMap/` with `WorldMapMetaData` files:

| Field | Example (shared map WLD_Main_A, `MiniMap.lsf`) |
|---|---|
| Width, Height | 33500 x 33500 pixels |
| WorldWidth, WorldHeight | 1675 x 1675 world units |
| WorldX, WorldZ | -362.5, 80 |
| BuildingUUID | empty for the surface, otherwise the submap name |
| Floor | floor |
| TriggerId | uuid of the trigger inside which the submap applies |
| TextureFilePath | uuid of the map texture |

- The scale is 20 pixels per world unit everywhere.
- WLD_Main_A has 96 such records: 35 without a building (surface regions) and the submaps `Underdark` (floors 0..5), `GoblinCamp` (0..2), `KethericCity` (0..2), `HagSecretLair`, `OwlbearCave`, `Mill`, `Tollhouse` and dozens of interiors.
- Choosing a submap for a point: check which `TriggerId` it lies inside (triggers in `Triggers/_merged.lsf`), take its `BuildingUUID` and `Floor`.
- Unverified: whether `WorldX/WorldZ` is the center of the area or a corner, and the direction of the Z axis on the map. We will check on the 10 points of stage 1.

## 3. WLD_Main_A level objects

Objects live in two modules and need to be merged: `Mods/Gustav/Levels/WLD_Main_A` (main) and `Mods/GustavDev/Levels/WLD_Main_A` (additions), plus `Mods/Honour/...` for Honour mode.

| File | Gustav | GustavDev |
|---|---|---|
| Items/_merged | 3333 | 170 |
| Characters/_merged | 621 | 24 |
| Triggers/_merged | 4394 | 488 |

An object has `MapKey` (instance uuid), `Name`, `TemplateName` (root template uuid), `Transform/Position`, `ItemList` (container contents), `LayerList`.

Item name prefixes (top of the list): `S_` 1275 (unique story instances), `CONT_` 281 (containers), `CONS_` 238 (consumables), `LOOT_` 199, `PUZ_` 172 (levers, puzzles), `DEC_` 124, `LTS_` 89, `WPN_` 59, `TOOL_` 51, `DOOR_` 10, `BOOK_` 8. The instance name is often uninformative (`S_...`), so it is more reliable to derive the category from the root template chain (`ParentTemplateId`), its tags and stats.

## 4. What Script Extender v33 offers for the UI

From `Docs/API.md` and `BG3Extender/Lua/Libs/ClientUI`, `GameDefinitions/PropertyMaps/UI.inl`:

- `Ext.UI.GetRoot()`, `Find(name)`, `Child`, `VisualChild`, `TreeParent`, `Resource(key)`: navigation of the Noesis tree.
- `GetProperty`, `SetProperty`, `GetAllProperties`, `DependencyProperties`: reading and writing any properties of native objects, including the game's ViewModels.
- `Subscribe`/`Unsubscribe` for element events, `PointToScreen`/`PointFromScreen`, `HitTest`.
- `Ext.UI.RegisterType` and `Ext.UI.Instantiate`: custom ViewModels with properties, collections and commands, including wrappers around an existing widget DataContext (`wrappedTypeName`).
- Since v33, Noesis work is only allowed inside `Ext.UI.Defer(callback)`.
- A new UI element cannot be created from Lua (there is no loading of XAML from a string). New markup appears only through XAML files in the mod pak.
- Storage: `Ext.Vars` (User variables, Mod variables) and PersistentVars, with synchronization between client and server. For "found", Mod variables or User variables on the player entity fit, for global settings: a file through `Ext.IO`.

## 5. Compatibility

- UI overhaul mods such as ImprovedUI (ImpUI) do not touch the map files: they override character creation, level-up and notifications and add their own GUI module (`GUI/metadata.lsf`, `GUI/StateMachines`). None of the mods checked during recon overrides `JournalMap`, `Minimap`, `DefaultShared.Styles` or `DefaultTheme.Styles`.
- Better Maps All-In-One and Move With World Map were not available during recon, their paks are not in `work/refs`. They almost certainly override `JournalMap.xaml`/`Minimap.xaml` entirely, which is a direct conflict with any override of the same files in our mod.

## 6. UI approach options

### A. Native markers (recommended to try first)

Lua attaches the `MapMarkerStyle` component with our own styles (`BG3A_Chest`, `BG3A_Trap`...) to the entities of interesting items. The game draws them itself on the map and minimap, in the right submap, with scaling and a tooltip. Icons are hooked in by overriding `MapMarkerIconStyle`.

- Pros: no need to compute the projection, submaps and the minimap come for free, minimal XAML, higher compatibility with Better Maps (they touch pages, not the theme).
- Cons: works only for loaded item entities (NPCs and trap triggers probably do not work); overriding `DefaultShared.Styles.xaml` (2259 lines) is fragile across patches; unverified whether the game creates a marker if the component is added at runtime and whether it is synchronized to the client.

### B. Own layer on top of the map

Override `JournalMap.xaml` and `Minimap.xaml`: add our own `ItemsControl` on a `Canvas` on top of `LSWorldMap`, bound to our ViewModel. Lua reads the current map scale and offset through `GetProperty` and recomputes the on-screen positions of points from `points.json` using `WorldMapMetaData`.

- Pros: full control (any points, including NPCs, traps and unloaded objects, clustering, own icons, search with highlighting).
- Cons: we need to find the internal `LSWorldMap` properties holding the transform (unverified that they are available at all); recomputing thousands of points from Lua on every map shift; a direct conflict with Better Maps.

### C. Hybrid (final recommendation)

- Point icons: option A, if in-game probes confirm that the runtime component creates a marker. Otherwise B.
- Filter panel, search and card: a small widget of our own in the mod's own GUI module (like ImpUI), on top of the journal map, without overriding `JournalMap.xaml`. If that fails, a minimal insertion into `JournalMap.xaml` or settings through MCM, as the spec allows.

## 7a. In-game probe results (2026-11-15)

- Option A does not work: `MapMarkerStyle` added at runtime on the server is replicated to the client (the component is visible in the client context), but no marker appears on the map or minimap. `SpecialItem` markers are apparently created when the entity loads or by another system. Option A is dropped.
- Coordinates in the level files match the runtime: the barrel `S_DEN_SmokepowderTrap_002` in `Items/_merged` is at (212.35, 24.92, 425.93), and in game it is in the same place.
- Through SE, `ls.LSWorldMap` exposes `MapPos`, `MapScale`, `MapRotation`, `Scale`, `ActualCameraLookatPos`, `MouseWorldCoordinates`, `LowerHeightLimit`, `UpperHeightLimit`. SE cannot read `ProjectionMatrix` (type `Transform2`). `WorldMapData` and `DataContext` on the control itself are empty.
- The marker ViewModel `ls.MapMarker`: `Type`, `Name`, `WorldPos`, `Height`, `AzimuthDegrees`, `GameObject`, `MapMarkerStyle`, `QuestViews`, `CombinedMapMarkers`.
- Native markers live in the `Canvas PART_MarkerHolder` of the `LSWorldMap` template, the engine places them.

### Chosen icon mechanism: a layer in the LSWorldMap template

In the `LSWorldMap` template (`DefaultShared.Styles.xaml`, the style without a key) the map regions are drawn by an `ItemsControl` inside `MapHolder`, which has `MatrixTransform Matrix="{Binding ProjectionMatrix, ...LSWorldMap}"`, and elements are placed on a `Canvas` through `TranslateTransform X=WorldPos.X Y=WorldPos.Y`. `MapHolder` itself shifts, rotates and scales by `MapPos`, `MapRotation`, `MapScale`.

We add our own `ItemsControl x:Name="BG3A_Layer"` as the last child of `MapHolder` with the same projection. Lua finds the layer and sets its DataContext to our ViewModel (`BG3A_Layer { Points, IconScale }`). The engine projects the points itself, panning, zoom and rotation come for free, and the map and minimap use the same style. Icons compensate for scale through `IconScale` (Lua recomputes it from `MapScale`).

- We do not put Larian's theme file in git: `tools/build.ts` takes the vanilla file from `work/unpacked`, inserts the fragment `mod/xaml/WorldMapLayer.xaml` and validates the XML. Two versions are patched: `Public/Game/GUI/Theme/` (Game.pak) and `Public/Game/GUI/Override/Clairmont/Theme/` (Patch8_HotFix9). Which of them is active is unverified, so both are patched.
- If a game patch changes the template, the build fails with a clear error instead of producing a broken pak.
- Unverified: that `WorldPos.Y` in the projection is the world `z` without a sign change (we check with two debug points), and the icon scale coefficient.

### Projection coordinate system (verified in game 2026-11-15)

`ProjectionMatrix` works in the level map's local coordinates, not in world coordinates. `WorldMapData` (the DataContext of `MapHolder`) has `WorldSize = 1675×1675` for WLD_Main_A, and the vanilla regions (`VMRegion.WorldPos/WorldSize`) lie in the range 0..1675. Cross-checking four regions against the `WorldMap` metadata gave an exact formula:

- `localX = worldX - (WorldX - WorldWidth / 2)`, for WLD_Main_A this is `worldX + 1200`;
- `localY = (WorldZ + WorldHeight / 2) - worldZ`, for WLD_Main_A this is `917.5 - worldZ`.

Here `WorldX/WorldZ/WorldWidth/WorldHeight` come from the level's `WorldMap/MiniMap.lsf`. The Z axis is flipped, the origin is at the top left corner.

Other findings in game:
- SE ViewModel properties with `Notify = true` cannot be written from Lua in SE v33, those without `Notify` work.
- Lua proxies of Noesis objects live only inside one `Ext.UI.Defer`, they cannot be cached.
- The full layer fragment crashed the game on startup; the minimal one (without `DataContext="{x:Null}"`, without a `ScaleTransform` with `RelativeSource AncestorType=ItemsControl`, without a `DataTrigger`) works. Which of the three constructs is to blame was not determined.

## 7. What to check in game before choosing (stage 0.5 probe)

This needs SE installed and a small debug mod. Check in the SE console:

1. `GetAllProperties()` on the journal map's `LSWorldMap` and on `CurrentPlayer.WorldMap`: whether there is a scale, a center, a collection of markers.
2. Add `MapMarkerStyle = "WithersWardrobe"` to a chest near the player (server, then client) and see whether a marker appears on the map and minimap.
3. Take the player's position and check the world-to-map formula on a single point.
