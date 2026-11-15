# Этап 0. Разведка: выводы

Дата: 2026-11-15. Игра: Patch 8 HotFix 10 (buildid 25605617). Script Extender: v33 (исходники в `work/refs/bg3se`).

## 1. Как устроена карта в игре

- Журнальная карта: `Mods/MainUI/GUI/Pages/JournalMap.xaml` (387 строк), миникарта: `Minimap.xaml` (557), обзорная: `OverviewMap.xaml`. У каждой есть версия `_c` для геймпада.
- Обе карты рисует нативный контрол `ls:LSWorldMap` (`x:Name="WorldMap"`), данные: `WorldMapData="{Binding CurrentPlayer.WorldMap}"`. Масштаб, панорамирование и проекция маркеров живут внутри движка, в XAML их нет.
- Маркер: контрол `ls:LSWorldMapMarker`, его ViewModel `ls:MapMarker` с полями `Type`, `Name`, `GameObject`, `MapMarkerStyle`, `QuestViews`, `CombinedMapMarkers`. Шаблоны: `Map.MarkerDataTemplate` и `Map.MiniMarkerDataTemplateInAndOutViewport` в `Public/Game/GUI/Theme/DefaultTheme.Styles.xaml`.
- Иконка маркера выбирается стилем `MapMarkerIconStyle` (`Public/Game/GUI/Theme/DefaultShared.Styles.xaml`, строка 2013) по `Type` и `MapMarkerStyle` через DataTrigger.
- Типы маркеров, найденные в шаблонах: `Waypoint`, `Portal`, `CampChest`, `Trader`, `Custom`, `SpecialItem`, `QuestMarker`, `LocationMarker`, `CharacterParty`.
- Маркер `SpecialItem` игра создаёт для предмета, у которого задан `MapMarkerStyle`. В ванили так помечены только два шаблона: `FUR_GEN_Wardrobe_Player_A` (`WithersWardrobe`) и магическое зеркало (`MagicMirror`), оба в `Public/Shared/RootTemplates/_merged.lsf`. В рантайме это компонент `eoc::item::MapMarkerStyleComponent { FixedString Style }` (SE: `MapMarkerStyle`).
- Пользовательские метки (`AddCustomMarker`, `RemoveCustomMarker`) уже есть в ванили, команды висят на DataContext виджета.

## 2. Привязка мира к карте (риск 2): решён на уровне данных

В каждом уровне есть папка `Mods/GustavDev/Levels/<Level>/WorldMap/` с файлами `WorldMapMetaData`:

| Поле | Пример (общая карта WLD_Main_A, `MiniMap.lsf`) |
|---|---|
| Width, Height | 33500 x 33500 пикселей |
| WorldWidth, WorldHeight | 1675 x 1675 мировых единиц |
| WorldX, WorldZ | -362.5, 80 |
| BuildingUUID | пусто для поверхности, иначе имя подкарты |
| Floor | этаж |
| TriggerId | uuid триггера, внутри которого действует подкарта |
| TextureFilePath | uuid текстуры карты |

- Масштаб везде 20 пикселей на мировую единицу.
- В WLD_Main_A 96 таких записей: 35 без здания (регионы поверхности) и подкарты `Underdark` (этажи 0..5), `GoblinCamp` (0..2), `KethericCity` (0..2), `HagSecretLair`, `OwlbearCave`, `Mill`, `Tollhouse` и десятки интерьеров.
- Выбор подкарты для точки: проверить, внутри какого `TriggerId` она лежит (триггеры в `Triggers/_merged.lsf`), взять его `BuildingUUID` и `Floor`.
- Не проверено: `WorldX/WorldZ` это центр области или угол, и направление оси Z на карте. Проверим на 10 точках этапа 1.

## 3. Объекты уровня WLD_Main_A

Объекты лежат в двух модулях, их нужно объединять: `Mods/Gustav/Levels/WLD_Main_A` (основной) и `Mods/GustavDev/Levels/WLD_Main_A` (дополнения), плюс `Mods/Honour/...` для режима Honour.

| Файл | Gustav | GustavDev |
|---|---|---|
| Items/_merged | 3333 | 170 |
| Characters/_merged | 621 | 24 |
| Triggers/_merged | 4394 | 488 |

У объекта есть `MapKey` (uuid экземпляра), `Name`, `TemplateName` (uuid root template), `Transform/Position`, `ItemList` (содержимое контейнера), `LayerList`.

Префиксы имён предметов (верх списка): `S_` 1275 (уникальные сюжетные экземпляры), `CONT_` 281 (контейнеры), `CONS_` 238 (расходники), `LOOT_` 199, `PUZ_` 172 (рычаги, головоломки), `DEC_` 124, `LTS_` 89, `WPN_` 59, `TOOL_` 51, `DOOR_` 10, `BOOK_` 8. Имя экземпляра часто неинформативно (`S_...`), категорию надёжнее брать по цепочке root template (`ParentTemplateId`), его тегам и статам.

## 4. Что даёт Script Extender v33 для UI

Из `Docs/API.md` и `BG3Extender/Lua/Libs/ClientUI`, `GameDefinitions/PropertyMaps/UI.inl`:

- `Ext.UI.GetRoot()`, `Find(name)`, `Child`, `VisualChild`, `TreeParent`, `Resource(key)`: навигация по дереву Noesis.
- `GetProperty`, `SetProperty`, `GetAllProperties`, `DependencyProperties`: чтение и запись любых свойств нативных объектов, включая ViewModel игры.
- `Subscribe`/`Unsubscribe` на события элементов, `PointToScreen`/`PointFromScreen`, `HitTest`.
- `Ext.UI.RegisterType` и `Ext.UI.Instantiate`: свои ViewModel со свойствами, коллекциями и командами, в том числе обёртки над существующим DataContext виджета (`wrappedTypeName`).
- С v33 работа с Noesis только внутри `Ext.UI.Defer(callback)`.
- Создать новый элемент UI из Lua нельзя (нет загрузки XAML из строки). Новая разметка появляется только через XAML-файлы в паке мода.
- Хранение: `Ext.Vars` (User variables, Mod variables) и PersistentVars, синхронизация между клиентом и сервером есть. Для «найдено» подходят Mod variables или User variables на сущности игрока, для глобальных настроек: файл через `Ext.IO`.

## 5. Совместимость

- Установленный у пользователя ImpUI (ImprovedUI) не трогает файлы карты: он переопределяет создание персонажа, левелап, уведомления и добавляет свой GUI-модуль (`GUI/metadata.lsf`, `GUI/StateMachines`). Ни один из 75 установленных модов не переопределяет `JournalMap`, `Minimap`, `DefaultShared.Styles` и `DefaultTheme.Styles`.
- Better Maps All-In-One и Move With World Map не установлены, их паков в `work/refs` нет. Почти наверняка они переопределяют `JournalMap.xaml`/`Minimap.xaml` целиком, а это прямой конфликт с любым нашим переопределением тех же файлов.

## 6. Варианты подхода к UI

### A. Нативные маркеры (рекомендую проверить первым)

Lua вешает компонент `MapMarkerStyle` со своими стилями (`BG3A_Chest`, `BG3A_Trap`...) на сущности интересных предметов. Игра сама рисует их на карте и миникарте, в нужной подкарте, с масштабом и тултипом. Иконки подключаются переопределением `MapMarkerIconStyle`.

- Плюсы: не нужно считать проекцию, подкарты и миникарта бесплатно, минимум XAML, совместимость с Better Maps выше (они трогают страницы, а не тему).
- Минусы: работает только для загруженных сущностей-предметов (NPC, ловушки-триггеры, вероятно, нет); переопределение `DefaultShared.Styles.xaml` (2259 строк) хрупкое при патчах; не проверено, создаёт ли игра маркер, если компонент добавлен в рантайме, и синхронизируется ли он с клиентом.

### B. Свой слой поверх карты

Переопределяем `JournalMap.xaml` и `Minimap.xaml`: добавляем поверх `LSWorldMap` свой `ItemsControl` на `Canvas`, привязанный к нашей ViewModel. Lua читает текущий масштаб и смещение карты через `GetProperty` и пересчитывает экранные позиции точек из `points.json` по `WorldMapMetaData`.

- Плюсы: полный контроль (любые точки, включая NPC, ловушки и незагруженные объекты, кластеризация, свои иконки, поиск с подсветкой).
- Минусы: нужно найти внутренние свойства `LSWorldMap` с трансформацией (не проверено, что они вообще доступны); пересчёт тысяч точек из Lua при каждом сдвиге карты; прямой конфликт с Better Maps.

### C. Гибрид (итоговая рекомендация)

- Иконки точек: вариант A, если пробы в игре подтвердят, что рантайм-компонент создаёт маркер. Иначе B.
- Панель фильтров, поиск и карточка: свой небольшой виджет в собственном GUI-модуле мода (как у ImpUI), поверх журнальной карты, без переопределения `JournalMap.xaml`. Если не получится, минимальная вставка в `JournalMap.xaml` или настройки через MCM, как разрешает спека.

## 7. Что проверить в игре до выбора (проба этапа 0.5)

Нужен установленный SE и маленький отладочный мод. Проверить в консоли SE:

1. `GetAllProperties()` у `LSWorldMap` журнальной карты и у `CurrentPlayer.WorldMap`: есть ли масштаб, центр, коллекция маркеров.
2. Добавить `MapMarkerStyle = "WithersWardrobe"` на сундук рядом с игроком (сервер, затем клиент) и посмотреть, появится ли маркер на карте и миникарте.
3. Взять позицию игрока и проверить формулу мир-карта на одной точке.
