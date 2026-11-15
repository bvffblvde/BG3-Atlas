# Этап 4 (часть 1): «найдено», скрытие найденного, карточка, ручная отметка

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** точки, которые игрок уже залутал, подобрал или убил, автоматически помечаются найденными и рисуются приглушённо или скрываются; при наведении на иконку видно название, клик переключает «найдено»; панель показывает «найдено/всего» и переключатель «скрыть найденное». Поиск в следующей части.

**Spec:** `docs/SPEC.md` (этап 4, «Состояние найдено»). Ограничения из `docs/superpowers/plans/2026-11-15-stage3-points-filters.md` (Global Constraints) действуют.

## Решения

- Хранение: переменная мода `Found` (таблица `id -> true`), `Ext.Vars.RegisterModVariable(uuid, "Found", { Server = true, Client = true, WriteableOnClient = true, SyncToServer = true, SyncToClient = true })` в общем коде. Пишет клиент (переприсваиванием всей таблицы, иначе SE не видит изменение).
- Автоопределение на клиенте, пачками по 150 точек раз в 250 мс:
  - предметы (`weapon_unique`, `armor_unique`, `accessory`, `scroll`, `book`, `key`, `ingredient`, `valuable`): найдено, если у сущности есть `InventoryMember` или сущности нет, при условии что раньше в этой сессии она была видна в мире (защита от не загруженных сущностей);
  - `chest`: найдено, если в контейнере (`InventoryOwner.PrimaryInventory` -> `InventoryContainer.Items`) были предметы, а стало ноль;
  - `boss`: найдено, если `Health.Hp <= 0`;
  - остальные категории только вручную.
- Отображение: в слое на каждую категорию два `ItemsControl`: `BG3A_Cat_<id>` (активные) и `BG3A_Found_<id>` (`Opacity="0.45"`). Перенос точки = удаление из одной коллекции (`coll[i] = nil`) и добавление в другую.
- Карточка: у иконки `ToolTip="{Binding Label}"` (строка: название и флаги). Ручная отметка: иконка внутри `Button` с `Command="{Binding Mark}"` на ViewModel точки. Слой становится видимым для мыши (`IsHitTestVisible` снимается с корневого `Grid`), но сам `Grid` без фона, поэтому перетаскивание карты по пустому месту работает.
- Панель: счётчики `найдено/всего`, кнопка «Скрыть найденное» / «Показать найденное».

## Задачи

- [ ] 1. `tools/lib/layerxaml.ts`: второй `ItemsControl` на категорию, иконка в `Button` с `Command="{Binding Mark}"` и `ToolTip="{Binding Label}"`, корневой `Grid` без `IsHitTestVisible="False"`. Тесты: по два именованных контрола на категорию, запрещённых конструкций нет, патч темы проходит.
- [ ] 2. `Shared/Found.lua`: регистрация переменной, `IsFound(id)`, `SetFound(id, on)`, `All()`. Подключить в обоих bootstrap.
- [ ] 3. `Client/Detect.lua`: пакетная проверка по правилам выше, вызывает `Found.SetFound`.
- [ ] 4. `Client/Layer.lua`: ViewModel точки с `Id`, `Label`, `Mark`; распределение по `Cat_`/`Found_` при построении; каждый тик синхронизация изменившихся точек; `Visibility` слоёв `Found_` по настройке `hideFound`.
- [ ] 5. `Client/Settings.lua`: `hideFound`. `Client/Panel.lua` и `tools/lib/panelxaml.ts`: счётчики `найдено/всего`, кнопка `ToggleFound`. Тесты генератора панели.
- [ ] 6. Сборка, установка, запись в `docs/PROGRESS.md` (что не проверено в игре), коммит и пуш.
