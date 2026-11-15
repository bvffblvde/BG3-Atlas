# Файлы игры: реальные пути на этой машине

Проверено 2026-11-15.

## Установка

- Steam: `C:\Program Files (x86)\Steam` (реестр `HKCU\Software\Valve\Steam\SteamPath`).
- Библиотеки Steam: `C:\Program Files (x86)\Steam`, `E:\steam  games` (два пробела), `O:\SteamLibrary`, `F:\SteamLibrary`.
- BG3 (appid 1086940, buildid 25605617, Patch 8 HotFix 10): `E:\steam  games\steamapps\common\Baldurs Gate 3`.
- `F:\SteamLibrary\steamapps\common\Baldurs Gate 3` это остаток старой установки: только логи и крашдампы, паков нет.

## Паки (`Data\`)

| Пак | Размер, МБ | Что внутри (гипотеза до распаковки) |
|---|---|---|
| Game.pak | 1065 | GUI (XAML, текстуры карты), скрипты |
| Gustav.pak | 12576 | уровни, шаблоны, статы основной кампании |
| GustavX.pak | 177 | патчи к Gustav |
| Shared.pak | 155 | общие шаблоны и уровни |
| Engine.pak | 7 | движок |
| Icons.pak | 26 | иконки |
| Patch8_HotFix9.pak, Patch8_HotFix10.pak | 130, 126 | хотфиксы, перекрывают файлы выше |
| Gustav_Textures.pak, Textures*.pak, VirtualTextures*.pak | много ГБ | текстуры, не распаковываем целиком |

Локализация: `Data\Localization\English.pak` (14 МБ), `Data\Localization\Russian\Russian.pak` (17 МБ).

## Пользовательские данные

- `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\Mods\`: паки модов (сейчас около 75 штук, ставились через внутриигровой менеджер модов).
- `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\PlayerProfiles\Public\modsettings.lsx`: порядок модов.
- Среди установленных модов есть `ImpUI (ImprovedUI)`, который меняет XAML игры. Учитывать при совместимости.

## Script Extender

- В `bin\` нет `DWrite.dll`: Script Extender не установлен.

## Внутри паков (проверено распаковкой)

UI (`Game.pak`):
- `Mods/MainUI/GUI/Pages/JournalMap.xaml`, `Minimap.xaml`, `OverviewMap.xaml` и версии `_c` для геймпада.
- `Mods/MainUI/GUI/StateMachines/Keyboard.xaml`, `Controller.xaml`: машины состояний UI.
- `Public/Game/GUI/Theme/DefaultShared.Styles.xaml`: стиль `MapMarkerIconStyle` (строка 2013), выбор иконки маркера.
- `Public/Game/GUI/Theme/DefaultTheme.Styles.xaml`: шаблоны `Map.MarkerDataTemplate` и `Map.MiniMarkerDataTemplateInAndOutViewport`.
- `Public/Game/GUI/Library/DataTemplates.xaml`, `Tooltips.xaml` (тултип `ls:MapMarker`, около строки 9121).
- `Public/Game/GUI/Assets/Map/`, `Assets/Minimap/`: текстуры интерфейса карты (рамки, кнопки, легенда), плюс варианты для дальтоников.

Уровни (`Gustav.pak`), на примере Акта 1:
- `Mods/Gustav/Levels/WLD_Main_A/{Items,Characters,Triggers,Scenery,Splines,LevelTemplates}/_merged.lsf`: основная часть объектов.
- `Mods/GustavDev/Levels/WLD_Main_A/...`: дополнения, те же папки, плюс `WorldMap/`, `meta.lsf` (границы уровня `LevelBounds`).
- `Mods/GustavDev/Levels/WLD_Main_A/WorldMap/MiniMap.lsf` и `<TriggerId>.lsf`: `WorldMapMetaData`, привязка мира к карте и подкарты.
- `Mods/Honour/Levels/WLD_Main_A/`: правки режима Honour.
- WorldMap есть и у других уровней: `CTY_Main_A`, `SCL_Main_A`, `BGO_Main_A`, `END_Main`, `CRE_Main_A`, `INT_Main_A`, `TUT_Avernus_C`, `IRN_Main_A`, `EPI_Main_A`.

Шаблоны: `Public/{Shared,SharedDev,Gustav,GustavDev,GustavX,Honour}/RootTemplates/_merged.lsf` (Shared и SharedDev в `Shared.pak`, GustavX в `GustavX.pak`, остальные в `Gustav.pak`).

Локализация: `Localization/English/english.loca` в `English.pak`; доп. тексты `Mods/Gustav*/Localization/*.lsf` в `Gustav.pak` (книги, подрегионы, вейпоинты).

Подуровни: `WLD_Main_A` подключает подуровни объектами `Type="LevelTemplate"` в `<L>/LevelTemplates/_merged.lsf`; их root template содержит `SubLevelName`. Объекты подуровня в локальных координатах, мир = позиция LT + поворот LT. Для Wilderness это 39 папок `Mods/Gustav/Levels/WLD_*` (плюс `GustavDev`), например `WLD_GoblinCamp_D`, `WLD_Underdark_C`, `WLD_RangerCamp_I` (Роща), `WLD_Plains_D`, `WLD_Forest_G`, `WLD_HagLair_D`.

Статы: `Public/{Shared,SharedDev,Gustav,GustavDev,GustavX,Honour,HonourX}/Stats/Generated/Data/*.txt`. Теги: `Public/{Shared,SharedDev,Gustav,GustavDev,GustavX}/Tags/<guid>.lsf`.

Локализация: базовые файлы `Localization/English/english.loca` (`English.pak`) и `Localization/Russian/russian.loca` (`Localization/Russian/Russian.pak`). Рядом лежат гендерные варианты (`*_to_F`, `Gender/...`), их не берём.

`npm run unpack` раскладывает всё нужное в `work/unpacked/lsx/` (lsx и txt по путям внутри паков) и `work/unpacked/loca/{english,russian}.xml`.

`Public/*/Levelmaps/*.lsx` к карте не относятся: это скейлинг уровня, опыт и золото.

## Склеп под заросшими руинами (Акт 1)

- Живой уровень: `Mods/Gustav/Levels/WLD_Chapel_Push`, подключается LevelTemplate `WLD_Chapel` (шаблон `65633591-0aff-40af-a9e1-03095d19add7`, `SubLevelName = WLD_Chapel_Push`) в `WLD_Main_A/LevelTemplates`.
- `Mods/Gustav/Levels/WLD_Chapel_H`: неиспользуемая копия Push с другими UUID предметов, не извлекать.
- Триггеры `LTN_*` это `TriggerLighting` (шаблон `LightingTrigger`), уровни они не подгружают.

## Рунные круги (вейпоинты)

- Объекты: предметы в `Mods/Gustav/Globals/WLD_Main_A/Items` и `Mods/GustavDev/Globals/{SCL,BGO,CTY,CRE}_Main_A/Items` (шаблоны `BLD_GEN_WaypointShrine_A`, `Helper_Waypoint_A`, у шаблона `AnubisConfigName = WaypointShrine`). Декорации `*_WaypointShrine_geo` в Scenery только оформление.
- Связь ключ ↔ объект: факты `DB_WaypointInfo("<Act>","WAYP_*",(ITEM)<имя>_<uuid>,(TRIGGER)...)` в `Mods/Gustav/Story/RawFiles/Goals/_Gustav_Waypoints_Act1.txt` и `Mods/GustavDev/Story/RawFiles/Goals/_Gustav_Waypoints.txt` (часть фактов без `(ITEM)`). 40 фактов.
- Названия: `Mods/Gustav/Localization/Waypointshrines.lsx` и `Mods/GustavDev/Localization/Waypointshrines2.lsx`, узлы `TranslatedStringKey` (`UUID` = ключ `WAYP_*`, `Content` = handle).
- В Globals лежат и другие глобальные объекты уровня (сюжетные NPC, торговцы, уникальные предметы), экстрактор читает их вместе с предметами и персонажами уровня.
