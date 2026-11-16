# Manual "found" mark

## Why

Auto-marking only sees picked-up items, emptied containers and killed bosses. Levers, traps, doors, characters, stashes and waypoints cannot be marked. The player wants to mark and unmark the point under the cursor themselves, on gamepad and on mouse.

## Goals and boundaries

- Toggle "found" on a single point under the cursor.
- The manual decision overrides automation: a mark removed manually is not restored by auto-marking.
- Do not break vanilla map actions and typing in the search field.
- Non-goals: marking by clicking an icon (a command in the point ViewModel breaks properties in SE v33), bulk marking.

## Approaches

1. A gamepad button and a mouse key, the point under the cursor is looked up in Lua (chosen). It reuses the existing nearest-point search for the row under the cursor.
2. A click on the icon through a point command. Rejected: in SE v33 a Command property on the point breaks neighboring properties.
3. Marking from a list in the panel. Rejected: inconvenient with thousands of points.

## Decisions

- Storage: the mod variable `Found` stores `true` (found) and `false` (cleared manually). `IsFound` is true only for `true`. Auto-marking does not touch points with the value `false` or with `true` already set.
- Toggling: found → `false`, otherwise → `true`.
- Gamepad: in the panel's hints row (visible while the panel is open) a "Found" button on the `UIMessageBoxY` event, `EatInput=True`, the game draws the glyph. Target: the point nearest to the screen center, the same one shown in the `BG3A_CursorInfo` row. The choice of event is unverified: if the button collides with the vanilla map mark, change the event.
- Mouse: the F key (scancode, no repeats) through `Ext.Events.KeyInput`, only while the journal map (the JournalMap widget) is on screen and the search field is not focused. Target: the point nearest to `LSWorldMap.MouseWorldCoordinates` within a radius of 30 screen pixels. Whether this field on the mouse shows the point under the cursor is unverified.
- The point under the cursor is computed on the UI thread when the layer updates and stored as a plain Lua table per player; the key and the command only read it and call `Found.Toggle` (with no access to entities).
- After toggling, the layer and the panel counters are redrawn by the `Found` version.

## Left to the implementer

Function names, a one-line log on toggling (`manual found <id> on/off`), tests of the storage logic through fengari.
