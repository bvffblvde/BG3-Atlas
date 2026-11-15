# Этап 3: все точки Wilderness, иконки и панель фильтров. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** мод показывает на журнальной карте и миникарте все точки поверхности Wilderness из `data/points.json` иконками в стиле игры, а панель на экране карты включает и выключает категории; выбор сохраняется между сессиями.

**Architecture:** сборка генерирует из `points.json` Lua-модуль с точками уже в координатах карты и XAML слоя с отдельным `ItemsControl` на каждую категорию (своя векторная иконка, без `DataTrigger`). Lua создаёт одну ViewModel с коллекцией на категорию, вешает её на слой карты и миникарты, фильтр включает и выключает `Visibility` слоя категории. Панель фильтров вставляется в `JournalMap.xaml` тем же патчером, её строки это кнопки с `Command`, состояние отображается заменой элемента коллекции (свойства с `Notify` в SE v33 не работают).

**Tech Stack:** TypeScript (tools, vitest), Lua (SE v33), Noesis XAML.

**Spec:** `docs/SPEC.md` (этап 3, категории, «Настройки»), факты о карте: `docs/RECON.md` (раздел 7a и «Система координат проекции»).

## Global Constraints

- Никаких комментариев в коде, никаких длинных тире.
- Файлы Larian и данные, извлечённые из игры (`points.json`, сгенерированный Lua с именами), в git не попадают: генерируются при сборке в `work/build`.
- В XAML только конструкции, проверенные в игре или встречающиеся в ванильном XAML. Запрещены до выяснения причины краша: `DataContext="{x:Null}"`, `RelativeSource AncestorType=ItemsControl` внутри трансформов, `DataTrigger` в шаблонах слоя.
- Свойства ViewModel SE без `Notify` (не работает в SE v33). Объекты Noesis в Lua не хранить между вызовами `Ext.UI.Defer`.
- Не трогать список модов пользователя, ставить только `BG3Atlas.pak`.

## Факты (проверены)

- Координаты карты: `localX = worldX - (WorldX - W/2)`, `localY = (WorldZ + H/2) - worldZ`, для WLD_Main_A `WorldX=-362.5, WorldZ=80, W=H=1675` (`Mods/GustavDev/Levels/WLD_Main_A/WorldMap/MiniMap.lsx`).
- Размер иконки на экране: `scale = px * WorldWidth / (MapScale * MapImage.ActualWidth)`, Lua пишет его в `LSWorldMap.Tag`, шаблон читает `{Binding Tag, RelativeSource={RelativeSource AncestorType=ls:LSWorldMap}}`.
- Виджеты: `JournalMap` и `Minimap` в `ContentRoot`. В `JournalMap.xaml` легенда `Grid x:Name="Legend"` слева внизу, панель вейпоинтов справа.

## Review Focus

- Точка с `submap != null` (здание, подземье) не должна рисоваться на поверхности. Тест в задаче 1.
- Категория без точек (например `animal` в другом регионе) не должна ломать генерацию XAML и Lua. Тест в задаче 2.
- Имя с кавычками, обратной косой чертой или переводом строки не должно ломать сгенерированный Lua. Тест в задаче 1.
- Файл настроек отсутствует или битый: все категории включены, игра не падает. Тест на Lua-уровне в задаче 3 (luaparse плюс чистая функция разбора).
- Повторное открытие журнала (виджет пересоздаётся): слой и панель получают ViewModel заново. Проверка в игре, задача 5.

---

### Task 1: Генератор данных точек для мода

**Files:** Create `tools/lib/mapdata.ts`, Test `tools/test/mapdata.test.ts`.

**Interfaces:**
- Produces: `interface MapOrigin { x: number; z: number }`, `readMapOrigin(lsxRoot: string, level: string): MapOrigin` (из `WorldMap/MiniMap.lsx`, `x = WorldX - WorldWidth/2`, `z = WorldZ + WorldHeight/2`); `toMapLocal(origin: MapOrigin, x: number, z: number): [number, number]`; `luaString(s: string): string` (экранирование в Lua-строку в двойных кавычках); `pointsLua(points: Point[], origin: MapOrigin): string` возвращает `return { {"id","category",x,y,"name","nameRu",flagsMask}, ... }` только для `submap === null`, координаты с точностью 0.01, `flagsMask`: locked=1, trapped=2, hidden=4.

- [ ] Тесты: `toMapLocal({x:-1200,z:917.5}, 212.35, 425.93)` даёт `[1412.35, 491.57]`; точка с `submap: "Underdark"` отсутствует в выводе; имя `a"b\c` и перевод строки экранированы, результат парсится `luaparse`; `flagsMask` для `["locked","hidden"]` равен 5.
- [ ] Тест падает, реализация, тест проходит, коммит `Add map point data generator`.

### Task 2: Генератор XAML слоя с иконками категорий

**Files:** Create `tools/lib/layerxaml.ts`, `mod/xaml/icons.ts` (геометрия иконок, данные для генератора), Modify `tools/lib/themes.ts` (сниппет берётся из генератора, а не из `mod/xaml/WorldMapLayer.xaml`), Delete `mod/xaml/WorldMapLayer.xaml`, Test `tools/test/layerxaml.test.ts`.

**Interfaces:**
- Consumes: `CategoryId`, `categoryRules` из `tools/categories.ts`.
- Produces: `categoryIcons: Record<CategoryId, { glyph: string }>` (Path data в квадрате 24x24); `layerXaml(): string` возвращает `Grid x:Name="BG3A_Layer"` с `ItemsControl x:Name="BG3A_Cat_<id>"` на каждую категорию, `ItemsSource="{Binding <Id>}"` (имя свойства ViewModel = `Cat_<id>`), общий `MatrixTransform` с `ProjectionMatrix` на `Grid`, шаблон элемента: `Canvas` с `RenderTransform` (сдвиг -12, масштаб `Tag/24` через `ScaleTransform` с привязкой к `Tag` предка `ls:LSWorldMap`, сдвиг `PosX/PosY`), внутри тёмный диск `#E61A1208` с золотым ободком `#FFC9A45C` и золотой глиф `Path`.

Ruling для масштаба: иконка рисуется в 24 единицах, поэтому Lua пишет в `Tag` значение `scale / 24`.

- [ ] Тесты: результат проходит `XMLValidator` внутри обёртки с `xmlns:ls`; для каждой категории из `categoryRules` ровно один `x:Name="BG3A_Cat_<id>"`; в результате нет `DataTrigger`, `{x:Null}`, `AncestorType=ItemsControl`; патч реальной темы (`patchTheme`) проходит с новым сниппетом.
- [ ] Тесты падают, реализация, тесты проходят, коммит `Generate per-category map layer`.

### Task 3: Lua: точки, ViewModel по категориям, фильтры и настройки

**Files:** Create `mod/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Settings.lua`, `.../Client/Points.lua`; Modify `.../Client/Layer.lua`, `.../BootstrapClient.lua`; Modify `tools/build.ts` (кладёт сгенерированный `Client/Data/Wilderness.lua` в `work/build`), Test `tools/test/lua-syntax.test.ts` (уже покрывает все Lua), `tools/test/build-data.test.ts`.

**Interfaces:**
- `Settings.lua`: `BG3Atlas.Settings.Load()`, `Save()`, `IsEnabled(cat): boolean`, `SetEnabled(cat, on)`, `SetAll(on)`; файл `Script Extender/BG3Atlas/settings.json` через `Ext.IO`, битый или отсутствующий файл = все включены.
- `Points.lua`: `BG3Atlas.Points.Load()` читает `Ext.Require("Client/Data/Wilderness.lua")`, `ByCategory(): table<cat, list>`, `Counts(): table<cat, n>`.
- `Layer.lua`: ViewModel `BG3A_Layer` со свойствами `Cat_<id>` (Collection) на каждую категорию; при подключении к слою заполняет коллекции; каждый тик выставляет `Visibility` у `BG3A_Cat_<id>` по `Settings.IsEnabled` (значение `"Visible"`/`"Collapsed"`, при ошибке записи запасной вариант `Opacity` 0/1); `Tag = scale / 24`; точка игрока удаляется (больше не нужна для калибровки).
- `tools/build.ts`: перед упаковкой вызывает `pointsLua(readPoints(), readMapOrigin(lsx, "WLD_Main_A"))` и пишет в `work/build/BG3Atlas/Mods/BG3Atlas/ScriptExtender/Lua/Client/Data/Wilderness.lua`; если `data/points.json` нет, сборка падает с подсказкой `npm run extract`.

- [ ] Тест сборки данных: сгенерированный файл существует в стейдже после `buildData()` и парсится luaparse. Lua-синтаксис всех файлов зелёный.
- [ ] Коммит `Load extracted points into the map layer`.

### Task 4: Панель фильтров на экране журнальной карты

**Files:** Create `tools/lib/panelxaml.ts`, Modify `tools/lib/themes.ts` (добавить источник `Mods/MainUI/GUI/Pages/JournalMap.xaml` из Game.pak и патч `injectFilterPanel`), `tools/lib/xaml-patch.ts`, Modify `.../Client/Layer.lua` (или новый `.../Client/Panel.lua`), Test `tools/test/panelxaml.test.ts`, `tools/test/xaml-patch.test.ts`.

**Interfaces:**
- `panelXaml(): string`: `Border x:Name="BG3A_Panel"` слева вверху экрана карты (над легендой, `Grid.Row="1"`, `HorizontalAlignment="Left"`, `VerticalAlignment="Top"`, отступ под баннером зоны), заголовок «Atlas», две кнопки «Все» / «Ничего» (`Command="{Binding ShowAll}"`, `{Binding HideAll}`), `ItemsControl ItemsSource="{Binding Rows}"`, строка это `Button` с `Command="{Binding DataContext.Toggle, ElementName=BG3A_Panel}"`, `CommandParameter="{Binding Id}"`, внутри иконка категории (та же геометрия), `TextBlock Text="{Binding Label}"`, счётчик `{Binding Count}`, `Opacity="{Binding Alpha}"` (1 включено, 0.4 выключено).
- `injectFilterPanel(xaml, snippet)`: вставка перед `<!-- legend -->`-блоком (`<Grid x:Name="Legend"`), ошибка если якорь не найден.
- Lua: тип `BG3A_Panel` (`Rows` Collection, `Toggle`/`ShowAll`/`HideAll` Command), тип `BG3A_Row` (`Id`, `Label`, `Count`, `Alpha`); при клике команда меняет `Settings`, заменяет строку в `Rows` новой (для обновления `Alpha`), сохраняет настройки. Подписи категорий: русские и английские строки в Lua-таблице по языку игры (`Ext.Utils`/`Ext.Loca` язык, при неудаче русский).

Ruling: `ElementName` из `DataTemplate` на элемент вне шаблона внутри одной страницы работает в WPF и Noesis в пределах одного namescope страницы; если в игре не сработает, запасной вариант `RelativeSource AncestorType=ls:UIWidget` и `DataContext.BG3A...` недоступен (DataContext виджета чужой), тогда команда переносится в саму строку (`Toggle` на `BG3A_Row`).

- [ ] Тесты: сниппет валиден, нет запрещённых конструкций, патч реальной `JournalMap.xaml` вставляет ровно один `BG3A_Panel` перед `Legend`.
- [ ] Коммит `Add filter panel to the journal map`.

### Task 5: Сборка, установка, проверка в игре

- [ ] `npm test` зелёный, `npm run build`, установка пака после закрытия игры.
- [ ] Попросить пользователя: загрузить сейв, открыть карту, увидеть иконки по категориям; выключить «Ловушки» на панели, убедиться, что пропали на карте и миникарте; перезапустить игру, убедиться, что выбор сохранился; открыть и закрыть журнал дважды.
- [ ] По результатам обновить `docs/PROGRESS.md` (приёмка этапа 3 из SPEC: выключение «Ловушки» скрывает их на карте и миникарте), коммит и пуш.
