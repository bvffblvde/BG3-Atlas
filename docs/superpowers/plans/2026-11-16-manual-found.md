# Ручная отметка «найдено»: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** переключать «найдено» у точки под курсором кнопкой геймпада и клавишей F, ручное решение главнее автоотметки.

**Architecture:** `Found` хранит `true`/`false`, добавляются `Toggle` и `IsBlocked`. Слой при обновлении в UI-потоке запоминает точку под курсором на игрока (геймпад: центр экрана, мышь: `MouseWorldCoordinates`). Команда панели и обработчик `KeyInput` вызывают `Layer.ToggleHovered(player)`.

**Tech Stack:** Lua (BG3 SE v33), Noesis XAML из `tools/lib/panelxaml.ts`, vitest + fengari.

**Spec:** `docs/superpowers/specs/2026-11-16-manual-found-design.md`

## Global Constraints

- Никаких комментариев в коде, никаких длинных тире.
- Из UI-потока (`Ext.UI.Defer`) не обращаться к сущностям ECS.
- Геймпад: событие `UIMessageBoxY`, `EatInput=True`, подпись «Найдено» (en «Found»), кнопка видна только при открытой панели.
- Мышь: клавиша F, без повторов, только при видимой JournalMap и без фокуса в строке поиска. Радиус поиска 30 пикселей экрана.
- Лог при переключении: `manual found <id> on|off`.

## Review Focus

- Нажатие F во время ввода в строку поиска не должно ничего отмечать (флаг фокуса из `Panel.Update`).
- F при закрытой карте или когда под курсором нет точки: ничего не происходит, ошибок в логе нет.
- Снятая вручную отметка у подобранного предмета не возвращается автоотметкой (тест на `Found` + проверка `IsBlocked` в Detect).
- Разделённый экран: кнопка геймпада второго игрока переключает точку под его курсором, а не под курсором первого.
- Старые сохранения без значений `false` читаются как раньше (тест).

---

### Task 1: Хранение ручных решений в Found

**Files:**
- Modify: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Shared/Found.lua`
- Modify: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Detect.lua`
- Test: `tools/test/lua-runtime.test.ts`

**Interfaces:**
- Produces: `Found.IsFound(id): boolean` (только `true`), `Found.IsBlocked(id): boolean` (значение `false`), `Found.Toggle(id): boolean` (новое состояние), `Found.SetFound(id, on)` игнорирует `on == true` для заблокированных.

- [ ] **Step 1: Тесты** в `describe("Found")` с заглушкой `Ext.Vars` (таблица переменных в памяти, `RegisterModVariable` пустая, `Events.SessionLoaded.Subscribe` пустая):
  - `Toggle` на новой точке даёт `true`, `IsFound` true; второй `Toggle` даёт `false`, `IsFound` false, `IsBlocked` true.
  - после ручного снятия `SetFound(id, true)` оставляет `IsFound` false.
  - сохранённая таблица `{ a = true }` читается: `IsFound("a")` true, `IsBlocked("a")` false.
- [ ] **Step 2:** `npx vitest run tools/test/lua-runtime.test.ts`, ожидается FAIL (нет `Toggle`).
- [ ] **Step 3:** реализовать в Found.lua: `load` сохраняет и `false`, запись копии включает `false`; Detect.check пропускает `Found.IsBlocked(entry.id)`.
- [ ] **Step 4:** тесты PASS, весь `npx vitest run` PASS.
- [ ] **Step 5:** commit `Store manual found decisions`.

### Task 2: Точка под курсором и переключение

**Files:**
- Modify: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Layer.lua` (updateCursor, обновление на JournalMap)
- Modify: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Panel.lua` (команда `PadFound`, подписи, флаг фокуса поиска)
- Modify: `tools/lib/panelxaml.ts` (LSButton `UIMessageBoxY`)
- Create: `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Hotkey.lua`, подключить в `BootstrapClient.lua` после Detect.
- Test: `tools/test/panelxaml.test.ts` (или существующий тест панели)

**Interfaces:**
- Consumes: `Found.Toggle(id)`.
- Produces: `Layer.ToggleHovered(player): boolean`, `Layer.MouseMapVisible(): boolean`, `Panel.SearchFocused(): boolean`.

- [ ] **Step 1: Тест панели:** XAML режима `pad` содержит ровно одну `ls:LSButton.BoundEvent="UIMessageBoxY"` с `Command="{Binding DataContext.PadFound, ElementName=BG3A_Panel}"` и `Tag="{Binding FoundMarkText}"`; режим `mouse` её не содержит.
- [ ] **Step 2:** тест FAIL.
- [ ] **Step 3:** panelxaml: кнопка по образцу `UITakeAll`. Panel: свойства `PadFound` (Command) и `FoundMarkText` (String, ru «Найдено», en «Found»), обработчик вызывает `BG3Atlas.Layer.ToggleHovered(player)` и `Panel.MarkDirty()`; номер игрока панели хранить в модели при создании в `Panel.Update(widget, player)`. В `Panel.Update` читать `IsKeyboardFocused` у `BG3A_Search` в модульный флаг для `SearchFocused`.
- [ ] **Step 4:** Layer: `updateCursor` считает ближайшую точку и для `JournalMap` (центр берётся из `MouseWorldCoordinates` через `Points.ToLocal`, текст под курсором не пишется), результат в `hovered[player]` и `mouseSeen = Ext.Timer.MonotonicTime()` для JournalMap. `ToggleHovered` переключает `hovered[player]`, пишет лог, ставит `rebuild`. `MouseMapVisible` верно, если JournalMap виден не позже 1 с назад.
- [ ] **Step 5:** Hotkey.lua: `Ext.Events.KeyInput` при `Pressed`, не `Repeat`, `P.Str(e.Key) == "F"`, `Layer.MouseMapVisible()` и не `Panel.SearchFocused()` вызывает `Layer.ToggleHovered(1)`.
- [ ] **Step 6:** `npx vitest run` PASS, `npm run build` без ошибок.
- [ ] **Step 7:** PROGRESS: запись с пометкой «не проверено» (событие кнопки, `MouseWorldCoordinates` на мыши, имя скан-кода `F`). Commit `Add manual found toggle on pad and F key`, установка пака при закрытой игре.
