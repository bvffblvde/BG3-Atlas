# Stage 4 (part 1): "found", hiding found, card, manual mark

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** points that the player has already looted, picked up or killed are automatically marked as found and drawn dimmed or hidden; hovering an icon shows the name, a click toggles "found"; the panel shows "found/total" and a "hide found" toggle. Search comes in the next part.

**Spec:** `docs/SPEC.md` (stage 4, "Found state"). The constraints from `docs/superpowers/plans/2026-11-15-stage3-points-filters.md` (Global Constraints) apply.

## Decisions

- Storage: the mod variable `Found` (a table `id -> true`), `Ext.Vars.RegisterModVariable(uuid, "Found", { Server = true, Client = true, WriteableOnClient = true, SyncToServer = true, SyncToClient = true })` in shared code. The client writes it (by reassigning the whole table, otherwise SE does not see the change).
- Auto-detection on the client, in batches of 150 points every 250 ms:
  - items (`weapon_unique`, `armor_unique`, `accessory`, `scroll`, `book`, `key`, `ingredient`, `valuable`): found if the entity has `InventoryMember` or the entity does not exist, provided it was visible in the world earlier in this session (protection against unloaded entities);
  - `chest`: found if the container (`InventoryOwner.PrimaryInventory` -> `InventoryContainer.Items`) had items and now has none;
  - `boss`: found if `Health.Hp <= 0`;
  - the other categories are manual only.
- Display: in the layer, two `ItemsControl` per category: `BG3A_Cat_<id>` (active) and `BG3A_Found_<id>` (`Opacity="0.45"`). Moving a point = removing it from one collection (`coll[i] = nil`) and adding it to the other.
- Card: the icon has `ToolTip="{Binding Label}"` (a string: name and flags). Manual mark: the icon inside a `Button` with `Command="{Binding Mark}"` on the point ViewModel. The layer becomes visible to the mouse (`IsHitTestVisible` is removed from the root `Grid`), but the `Grid` itself has no background, so dragging the map over empty space works.
- Panel: `found/total` counters, a "Hide found" / "Show found" button.

## Tasks

- [ ] 1. `tools/lib/layerxaml.ts`: a second `ItemsControl` per category, the icon in a `Button` with `Command="{Binding Mark}"` and `ToolTip="{Binding Label}"`, the root `Grid` without `IsHitTestVisible="False"`. Tests: two named controls per category, no forbidden constructs, the theme patch passes.
- [ ] 2. `Shared/Found.lua`: variable registration, `IsFound(id)`, `SetFound(id, on)`, `All()`. Hook into both bootstraps.
- [ ] 3. `Client/Detect.lua`: batch check by the rules above, calls `Found.SetFound`.
- [ ] 4. `Client/Layer.lua`: the point ViewModel with `Id`, `Label`, `Mark`; distribution into `Cat_`/`Found_` on build; every tick a sync of changed points; `Visibility` of the `Found_` layers by the `hideFound` setting.
- [ ] 5. `Client/Settings.lua`: `hideFound`. `Client/Panel.lua` and `tools/lib/panelxaml.ts`: `found/total` counters, the `ToggleFound` button. Panel generator tests.
- [ ] 6. Build, install, a note in `docs/PROGRESS.md` (what is unverified in game), commit and push.
