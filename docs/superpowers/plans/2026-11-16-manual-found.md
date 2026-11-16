# Manual "found" mark: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** toggle "found" on the point under the cursor with a gamepad button and the F key, with the manual decision overriding auto-marking.

**Architecture:** `Found` stores `true`/`false`, `Toggle` and `IsBlocked` are added. During the update on the UI thread the layer remembers the point under the cursor per player (gamepad: the screen center, mouse: `MouseWorldCoordinates`). The panel command and the `KeyInput` handler call `Layer.ToggleHovered(player)`.

**Tech Stack:** Lua (BG3 SE v33), Noesis XAML from `tools/lib/panelxaml.ts`, vitest + fengari.

**Spec:** `docs/superpowers/specs/2026-11-16-manual-found-design.md`

## Global Constraints

- No comments in code, no long dashes.
- Do not access ECS entities from the UI thread (`Ext.UI.Defer`).
- Gamepad: the `UIMessageBoxY` event, `EatInput=True`, the label "Found", the button is visible only while the panel is open.
- Mouse: the F key, no repeats, only while JournalMap is visible and the search field is not focused. Search radius is 30 screen pixels.
- Log on toggle: `manual found <id> on|off`.

## Review Focus

- Pressing F while typing in the search field must not mark anything (the focus flag from `Panel.Update`).
- F with the map closed or with no point under the cursor: nothing happens, no errors in the log.
- A mark removed manually from a picked-up item is not restored by auto-marking (a test on `Found` + the `IsBlocked` check in Detect).
- Split screen: the second player's gamepad button toggles the point under their cursor, not under the first player's cursor.
- Old saves without `false` values are read as before (a test).

---

### Task 1: Storing manual decisions in Found

**Files:**
- Modify: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Shared/Found.lua`
- Modify: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Detect.lua`
- Test: `tools/test/lua-runtime.test.ts`

**Interfaces:**
- Produces: `Found.IsFound(id): boolean` (only `true`), `Found.IsBlocked(id): boolean` (the value `false`), `Found.Toggle(id): boolean` (the new state), `Found.SetFound(id, on)` ignores `on == true` for blocked points.

- [ ] **Step 1: Tests** in `describe("Found")` with a stub `Ext.Vars` (an in-memory variable table, an empty `RegisterModVariable`, an empty `Events.SessionLoaded.Subscribe`):
  - `Toggle` on a new point gives `true`, `IsFound` true; a second `Toggle` gives `false`, `IsFound` false, `IsBlocked` true.
  - after a manual clear, `SetFound(id, true)` leaves `IsFound` false.
  - a saved table `{ a = true }` is read: `IsFound("a")` true, `IsBlocked("a")` false.
- [ ] **Step 2:** `npx vitest run tools/test/lua-runtime.test.ts`, FAIL expected (no `Toggle`).
- [ ] **Step 3:** implement in Found.lua: `load` keeps `false` too, writing the copy includes `false`; Detect.check skips `Found.IsBlocked(entry.id)`.
- [ ] **Step 4:** tests PASS, the whole `npx vitest run` PASS.
- [ ] **Step 5:** commit `Store manual found decisions`.

### Task 2: Point under the cursor and toggling

**Files:**
- Modify: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Layer.lua` (updateCursor, update on JournalMap)
- Modify: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Panel.lua` (the `PadFound` command, labels, the search focus flag)
- Modify: `tools/lib/panelxaml.ts` (LSButton `UIMessageBoxY`)
- Create: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Hotkey.lua`, hook it into `BootstrapClient.lua` after Detect.
- Test: `tools/test/panelxaml.test.ts` (or the existing panel test)

**Interfaces:**
- Consumes: `Found.Toggle(id)`.
- Produces: `Layer.ToggleHovered(player): boolean`, `Layer.MouseMapVisible(): boolean`, `Panel.SearchFocused(): boolean`.

- [ ] **Step 1: Panel test:** the `pad` mode XAML contains exactly one `ls:LSButton.BoundEvent="UIMessageBoxY"` with `Command="{Binding DataContext.PadFound, ElementName=BG3A_Panel}"` and `Tag="{Binding FoundMarkText}"`; the `mouse` mode does not contain it.
- [ ] **Step 2:** the test FAILS.
- [ ] **Step 3:** panelxaml: a button modeled on `UITakeAll`. Panel: the properties `PadFound` (Command) and `FoundMarkText` (String, ru "Найдено", en "Found"), the handler calls `BG3Atlas.Layer.ToggleHovered(player)` and `Panel.MarkDirty()`; the panel's player number is kept in the model when created in `Panel.Update(widget, player)`. In `Panel.Update` read `IsKeyboardFocused` of `BG3A_Search` into a module flag for `SearchFocused`.
- [ ] **Step 4:** Layer: `updateCursor` computes the nearest point for `JournalMap` as well (the center is taken from `MouseWorldCoordinates` through `Points.ToLocal`, the text under the cursor is not written), the result goes to `hovered[player]` and `mouseSeen = Ext.Timer.MonotonicTime()` for JournalMap. `ToggleHovered` toggles `hovered[player]`, writes a log line, sets `rebuild`. `MouseMapVisible` is true if JournalMap was visible no more than 1 s ago.
- [ ] **Step 5:** Hotkey.lua: `Ext.Events.KeyInput` on `Pressed`, not `Repeat`, `P.Str(e.Key) == "F"`, `Layer.MouseMapVisible()` and not `Panel.SearchFocused()` calls `Layer.ToggleHovered(1)`.
- [ ] **Step 6:** `npx vitest run` PASS, `npm run build` without errors.
- [ ] **Step 7:** PROGRESS: an entry marked "unverified" (the button event, `MouseWorldCoordinates` on the mouse, the scancode name `F`). Commit `Add manual found toggle on pad and F key`, install the pak with the game closed.
