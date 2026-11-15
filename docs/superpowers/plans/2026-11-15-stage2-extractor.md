# Этап 2: экстрактор точек Wilderness. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npx tsx tools/extract.ts` собирает `data/points.json` со всеми точками интереса Wilderness (WLD_Main_A и его подуровни) по категориям стартового набора, с названиями из локализации, подкартой и флагами, и печатает отчёт покрытия.

**Architecture:** Конвейер из маленьких модулей в `tools/lib/`: распаковка нужных частей паков в lsx, разбор LSX в дерево, сбор объектов уровня с переводом локальных координат подуровней в мировые, разрешение root template по цепочке `ParentTemplateId`, статы с наследованием `using`, локализация, назначение подкарты по триггерам `WorldMap`, категоризация правилами `tools/categories.ts`. Каждый модуль тестируется на маленьких фикстурах, весь конвейер проверяется отчётом на реальных данных.

**Tech Stack:** TypeScript, Node 26, `tsx`, `vitest`, `fast-xml-parser` (уже в devDependencies), Divine из LSLib (`tools/lib/game.ts: divine()`).

**Spec:** `docs/SPEC.md` (этап 2, формат точки, категории), факты о файлах: `docs/RECON.md`, `docs/GAME_FILES.md`.

## Global Constraints

- Никаких комментариев в коде. Никаких длинных тире нигде.
- Данные только из файлов игры. Ничего с mapgenie.io, никаких данных чужих модов.
- Распакованное и сгенерированное не коммитим: `work/`, `dist/`, `data/*.json` кроме `data/schema.json` и `data/sample.json`.
- Divine запускать только через `divine()` из `tools/lib/game.ts` (ставит `DOTNET_ROLL_FORWARD=Major`), пути в `-d` абсолютные.
- Модули уровня: `Mods/Gustav/Levels/<L>` и `Mods/GustavDev/Levels/<L>` объединяются. `Mods/Honour/...` не берём (режим Honour).
- Мировая система координат: x, y (высота), z. Карта использует x и z.
- Коммиты по одной задаче, короткие английские сообщения в повелительном наклонении, без соавторов.
- Формат точки из спеки, поле `id` это `MapKey` экземпляра. Названия: `name` (английский) и `nameRu`.

## Установленные факты (проверены по файлам, не перепроверять)

- `WorldMapMetaData`: `WorldX/WorldZ` это центр области, `WorldWidth/WorldHeight` полный размер, 20 px на единицу. Триггер области: `Position` центр, `Extents` половина размера, `RotationQuat` поворот (обычно только вокруг Y).
- Объекты WLD_Main_A лежат в мировых координатах (сверено в игре на бочке `01882a87-db88-4a9d-9bdc-e8365775cbc1`, 212.35 24.92 425.93).
- Подуровни подключаются объектами `Type="LevelTemplate"` в `<L>/LevelTemplates/_merged.lsx`. Их `TemplateName` указывает на root template с атрибутом `SubLevelName`. Объекты подуровня лежат в локальных координатах: world = LT.Position + rotate(LT.RotationQuat, local * LT.Scale). Пример: `LT_WLD_Grove` (213.57 0 689.44) подключает `WLD_RangerCamp_I`; `LT_WLD_GoblinCamp` повёрнут на 90° вокруг Y.
- Подуровень может быть подключён несколько раз (лагерные варианты). Для Wilderness берём только подуровни с префиксом `WLD_`, кроме `WLD_CIN_*`, и только первое подключение. Остальные (`CMP_`, `CLT_`, `GLO_`, `PLT_`, `SYS_`, `GUS_`, `LT_`) пропускаем.
- `WorldMap/*.lsx` есть и у главного уровня, и у подуровней; у подуровня координаты метаданных и его триггеров локальные.
- Поля экземпляра поверх шаблона: `DisplayName` (TranslatedString, атрибут `handle`), `Stats`, `LockDifficultyClassID`, `DisarmDifficultyClassID`, `IsTrap`, `Key`, `IsKey`, `BookId`, `InventoryType`, `StoryItem`, `ItemList/Item/TemplateID` (содержимое).
- Поля шаблонов: `Name`, `ParentTemplateId`, `Type` (item, character, trigger, LevelTemplate...), `DisplayName`, `Description`, `Icon`, `Stats`, `IsTrap`, `IsPortal`, `BookId`, `BookType`, `InventoryType`, `IsKey`, `Key`, `SecretDoor`, `LockDC`, `IsLootable`, `StoryItem`, узлы `Tags/Tag/Object` (GUID тега), `TradeTreasures` (у торговцев).
- Персонажи уровня: `DisplayName`, `Stats`, `DefaultDialog`, `IsBoss`, `Equipment`.
- Статы: `Public/{Shared,SharedDev,Gustav,GustavDev,GustavX}/Stats/Generated/Data/*.txt`, формат `new entry "X"` / `type "Weapon"` / `using "Parent"` / `data "Key" "Value"`. Редкость: `data "Rarity"`.
- Локализация: `Divine -a convert-loca -s <.loca> -d <.xml>` даёт `<content contentuid="h..." version="N">текст</content>`. Английский: `English.pak` (`english.loca`, `english_M_to_X.loca`, `english_to_F.loca`), русский: `Localization/Russian/Russian.pak`.
- Теги: `Public/*/Tags/<guid>.lsf`, в каждом `Name`.

## Review Focus

- Подуровень с поворотом (GoblinCamp, ZhentarimBasement): точки должны встать по повороту, а не по сдвигу. Тест в задаче 3 на 90° вокруг Y.
- Шаблон без `DisplayName` у экземпляра и у всей цепочки: имя берётся по цепочке, иначе `Name` шаблона, но не пустая строка. Тест в задаче 4.
- Цикл или обрыв в `ParentTemplateId` (родитель не найден): разрешение не падает и не зацикливается. Тест в задаче 4.
- Точка вне всех триггеров `WorldMap`: `submap` = `null`, точка не теряется. Тест в задаче 7.
- Handle локализации, которого нет в loca: имя падает на английский или на `Name` шаблона, а не на сам handle. Тест в задаче 5.

---

### Task 1: Распаковка нужных частей игры

**Files:**
- Create: `tools/unpack.ts`, `tools/lib/unpack-plan.ts`
- Test: `tools/test/unpack-plan.test.ts`

**Interfaces:**
- Consumes: `divine(args: string[]): string`, `findGameDir(): string`, `repoRoot` из `tools/lib/game.ts`.
- Produces: `unpackJobs(): UnpackJob[]` где `UnpackJob = { pak: string; pattern: string; dest: string }` (`pak` относительно `Data/`, `dest` подпапка `work/unpacked/`). После `npm run unpack` в `work/unpacked/lsx/` лежат lsx всех нужных файлов в их путях внутри пака, а в `work/unpacked/loca/english.xml` и `russian.xml` вся локализация.

- [ ] **Step 1: Тест `unpackJobs`**: задания содержат `Mods/Gustav/Levels/WLD_*` и `Mods/GustavDev/Levels/WLD_*` из `Gustav.pak`, `*RootTemplates/*`, `*/Stats/Generated/Data/*`, `*/Tags/*` из `Gustav.pak`, `Shared.pak`, `GustavX.pak`, а также `Localization/English.pak` и `Localization/Russian/Russian.pak` целиком; все `dest` разные.
- [ ] **Step 2:** `npx vitest run tools/test/unpack-plan.test.ts`, ожидается FAIL (модуль не найден).
- [ ] **Step 3:** Реализовать `unpackJobs()` и `tools/unpack.ts`: для каждого задания `extract-package -x pattern` в `work/unpacked/raw/<dest>`, затем `convert-resources -i lsf -o lsx` в `work/unpacked/lsx/`, txt и lsx копировать как есть, все `.loca` языка конвертировать `convert-loca` и склеить в один `<lang>.xml`. Пропускать задание, если папка назначения уже есть, флаг `--force` перераспаковывает. Добавить в `package.json` скрипт `"unpack": "tsx tools/unpack.ts"`.
- [ ] **Step 4:** Тест проходит. Запустить `npm run unpack`, ожидается `work/unpacked/lsx/Mods/Gustav/Levels/WLD_GoblinCamp_D/Items/_merged.lsx` и `work/unpacked/loca/russian.xml`.
- [ ] **Step 5:** Обновить `docs/GAME_FILES.md` (список подуровней, где лежат статы, теги, русская локализация). Коммит `Add game data unpacker`.

### Task 2: Разбор LSX

**Files:**
- Create: `tools/lib/lsx.ts`
- Test: `tools/test/lsx.test.ts`

**Interfaces:**
- Produces:
  - `interface LsxAttr { type: string; value: string; handle?: string }`
  - `interface LsxNode { id: string; attrs: Record<string, LsxAttr>; children: LsxNode[] }`
  - `parseLsx(xml: string): LsxNode[]` возвращает корневые узлы всех регионов.
  - `findAll(nodes: LsxNode[], id: string): LsxNode[]` рекурсивный поиск по `id` узла.
  - `child(node: LsxNode, id: string): LsxNode | undefined`, `attr(node: LsxNode, id: string): string | undefined` (для TranslatedString возвращает `handle`).
  - `readLsxFile(path: string): LsxNode[]`.

- [ ] **Step 1: Тест** на фикстуре из двух `GameObjects`: `attr(go, "MapKey")`, `attr(go, "DisplayName")` равно handle, `child(go, "Transform")` с `Position` `"1 2 3"`, `findAll(roots, "GameObjects").length === 2`, вложенные `Tags/Tag/Object` находятся.
- [ ] **Step 2:** Тест падает.
- [ ] **Step 3:** Реализация на `fast-xml-parser` (`ignoreAttributes: false`, `isArray` для `node`, `attribute`, `children`).
- [ ] **Step 4:** Тест проходит. Ручная проверка: `readLsxFile` на `Items/_merged.lsx` WLD_Main_A даёт 3333 `GameObjects`.
- [ ] **Step 5:** Коммит `Add LSX parser`.

### Task 3: Трансформации и подуровни

**Files:**
- Create: `tools/lib/transform.ts`, `tools/lib/sublevels.ts`
- Test: `tools/test/transform.test.ts`, `tools/test/sublevels.test.ts`

**Interfaces:**
- Produces:
  - `type Vec3 = [number, number, number]; type Quat = [number, number, number, number]` (x, y, z, w как в файлах).
  - `interface Placement { pos: Vec3; rot: Quat; scale: number }`, `identity: Placement`.
  - `rotate(q: Quat, v: Vec3): Vec3`, `toWorld(p: Placement, local: Vec3): Vec3`, `composePlacement(outer: Placement, inner: Placement): Placement`.
  - `parseVec3(s: string): Vec3`, `parseQuat(s: string): Quat`.
  - `interface SubLevelRef { level: string; placement: Placement; via: string }` (`via` это `Name` объекта LT).
  - `findSubLevels(levelTemplates: LsxNode[], subLevelByTemplate: Map<string, string>, accept: (level: string) => boolean): SubLevelRef[]` - первое подключение каждого принятого подуровня.
  - `isWildernessSubLevel(level: string): boolean` - `WLD_` и не `WLD_CIN_`, не `WLD_Main_A`.

- [ ] **Step 1: Тесты**: `rotate([0, 0.7071068, 0, 0.7071067], [1, 0, 0])` близко к `[0, 0, -1]` (точность 1e-5); `toWorld({pos:[213.57,0,689.44], rot:[0,0,0,1], scale:1}, [-4.5185, 0, -110.4688])` близко к `[209.0515, 0, 579.0712]`; `findSubLevels` на фикстуре с двумя LT одного подуровня возвращает одно подключение, LT на `CMP_Basement_A` отфильтрован `isWildernessSubLevel`; `isWildernessSubLevel("WLD_CIN_Raft_A") === false`.
- [ ] **Step 2:** Тесты падают.
- [ ] **Step 3:** Реализация (поворот вектора кватернионом: v' = v + 2w(q×v) + 2q×(q×v)).
- [ ] **Step 4:** Тесты проходят.
- [ ] **Step 5:** Коммит `Add transforms and sublevel discovery`.

### Task 4: Root templates

**Files:**
- Create: `tools/lib/templates.ts`
- Test: `tools/test/templates.test.ts`

**Interfaces:**
- Consumes: `LsxNode`, `attr`, `child`, `findAll` (задача 2).
- Produces:
  - `interface Template { id: string; name: string; parent?: string; type: string; attrs: Record<string, string>; tags: string[]; hasTradeTreasures: boolean }`
  - `class TemplateIndex { constructor(files: LsxNode[][]); get(id: string): Template | undefined; chain(id: string): Template[]; resolved(id: string): ResolvedTemplate }` - файлы передаются в порядке приоритета (Shared, SharedDev, Gustav, GustavDev, GustavX), поздний перекрывает ранний по `MapKey`.
  - `interface ResolvedTemplate { id: string; names: string[]; type: string; attrs: Record<string, string>; tags: string[]; hasTradeTreasures: boolean }` - `names` это `Name` по цепочке от экземпляра к корню, `attrs` слиты (ближний к экземпляру выигрывает, пустые строки не перекрывают), `tags` объединены.
  - `subLevelIndex(index: TemplateIndex): Map<string, string>` (`MapKey` → `SubLevelName`).

- [ ] **Step 1: Тесты**: цепочка из трёх шаблонов сливает `Stats` с ближнего, `Icon` с корня, теги объединены; `names` в порядке от ребёнка; шаблон с несуществующим родителем разрешается без ошибки; цикл A→B→A не зацикливается (`chain` длины 2); поздний файл перекрывает шаблон с тем же `MapKey`.
- [ ] **Step 2:** Тесты падают.
- [ ] **Step 3:** Реализация.
- [ ] **Step 4:** Тесты проходят. Ручная проверка на реальных файлах: шаблон `0e31a4ee-81e0-4a63-8584-1659de308a85` разрешается с `SubLevelName = WLD_RangerCamp_I`.
- [ ] **Step 5:** Коммит `Add root template index`.

### Task 5: Статы, теги, локализация

**Files:**
- Create: `tools/lib/stats.ts`, `tools/lib/loca.ts`, `tools/lib/tags.ts`
- Test: `tools/test/stats.test.ts`, `tools/test/loca.test.ts`

**Interfaces:**
- Produces:
  - `interface StatEntry { name: string; type: string; data: Record<string, string> }`
  - `parseStats(text: string): StatEntry[]` (сырые, с полем `using` в `data.__using`), `class StatsIndex { constructor(entries: StatEntry[]); get(name: string): StatEntry | undefined }` - `get` возвращает запись с данными, слитыми по `using`, тип тоже наследуется.
  - `parseLoca(xml: string): Map<string, string>`, `class Loca { constructor(en: Map<string,string>, ru: Map<string,string>); text(handle: string | undefined, lang: "en" | "ru"): string | undefined }` - русский без перевода падает на английский.
  - `loadTagNames(lsxFiles: LsxNode[][]): Map<string, string>` (GUID → `Name`).

- [ ] **Step 1: Тесты**: `using` в два уровня даёт `Rarity` от родителя и `Damage` от ребёнка; запись без `type` наследует тип; `parseLoca` снимает XML-сущности (`&lt;` → `<`); `text("hNONE", "en") === undefined`; `text(h, "ru")` без русской строки возвращает английскую.
- [ ] **Step 2:** Тесты падают.
- [ ] **Step 3:** Реализация.
- [ ] **Step 4:** Тесты проходят.
- [ ] **Step 5:** Коммит `Add stats, tags and localization readers`.

### Task 6: Объекты уровня в мировых координатах

**Files:**
- Create: `tools/lib/level.ts`
- Test: `tools/test/level.test.ts`

**Interfaces:**
- Consumes: задачи 2, 3, 4.
- Produces:
  - `interface RawObject { id: string; kind: "item" | "character"; level: string; name: string; template: string; pos: Vec3; attrs: Record<string, string>; tags: string[]; contents: string[] }` - `attrs` это поля экземпляра, `contents` это `TemplateID` из `ItemList`.
  - `readLevelObjects(lsxRoot: string, level: string, placement: Placement): RawObject[]` - читает `Items/_merged.lsx` и `Characters/_merged.lsx` из `Mods/Gustav/Levels/<level>` и `Mods/GustavDev/Levels/<level>`, переводит позиции в мир.
  - `readWilderness(lsxRoot: string, templates: TemplateIndex): RawObject[]` - WLD_Main_A с `identity` плюс все подуровни из `findSubLevels(..., isWildernessSubLevel)`; дубликаты `id` отбрасываются (первый выигрывает).

- [ ] **Step 1: Тест** на временной папке-фикстуре: подуровень с LT-поворотом 90° вокруг Y, объект в локальной (1,0,0) получает мировую позицию LT.pos + (0,0,-1); персонаж получает `kind: "character"`; `contents` собран из `ItemList`.
- [ ] **Step 2:** Тест падает.
- [ ] **Step 3:** Реализация.
- [ ] **Step 4:** Тест проходит. Ручная проверка: `readWilderness` на реальных данных возвращает больше 3500 предметов, бочка `01882a87-db88-4a9d-9bdc-e8365775cbc1` в (212.35, 24.92, 425.93).
- [ ] **Step 5:** Коммит `Add wilderness level reader`.

### Task 7: Подкарты

**Files:**
- Create: `tools/lib/submaps.ts`
- Test: `tools/test/submaps.test.ts`

**Interfaces:**
- Consumes: задачи 2, 3, 6 (те же размещения подуровней).
- Produces:
  - `interface Submap { trigger: string; building: string | null; floor: number; center: Vec3; half: Vec3; rot: Quat; area: number }` (все в мире, `area = 4 * half.x * half.z`).
  - `loadSubmaps(lsxRoot: string, levels: { level: string; placement: Placement }[]): Submap[]` - `WorldMap/*.lsx` каждого уровня плюс поиск `TriggerId` среди `Triggers/_merged.lsx` того же уровня; если триггер не найден, бокс строится из `WorldX/WorldZ` и `WorldWidth/WorldHeight` с высотой без ограничения.
  - `assignSubmap(pos: Vec3, submaps: Submap[]): { submap: string | null; floor: number | null; trigger: string | null }` - из содержащих точку выбирается здание (`building` не null) с наименьшей площадью, иначе регион с наименьшей площадью, иначе null.
- [ ] **Step 1: Тесты**: точка внутри региона и внутри здания `Underdark` этаж 3 получает здание; повёрнутый бокс на 45° не содержит точку из угла AABB; точка вне всего даёт `{ submap: null, floor: null, trigger: null }`.
- [ ] **Step 2:** Тесты падают.
- [ ] **Step 3:** Реализация (точка переводится в систему бокса обратным поворотом).
- [ ] **Step 4:** Тесты проходят. Ручная проверка: на реальных данных доля точек с `submap = null` выводится в отчёт задачи 9.
- [ ] **Step 5:** Коммит `Add submap assignment`.

### Task 8: Категории и флаги

**Files:**
- Create: `tools/categories.ts`
- Test: `tools/test/categories.test.ts`

**Interfaces:**
- Consumes: `ResolvedTemplate`, `StatEntry`.
- Produces:
  - `type CategoryId = "chest" | "weapon_unique" | "armor_unique" | "accessory" | "scroll" | "book" | "key" | "ingredient" | "valuable" | "trap" | "hidden_stash" | "lever" | "locked_door" | "waypoint" | "trader" | "quest_npc" | "boss" | "animal"`
  - `interface CategoryInput { kind: "item" | "character"; name: string; templateNames: string[]; attrs: Record<string, string>; tags: string[]; stat?: StatEntry; hasTradeTreasures: boolean; contents: string[] }` (`attrs` = слияние шаблона и экземпляра, экземпляр выигрывает).
  - `categorize(input: CategoryInput): CategoryId | null`
  - `flags(input: CategoryInput): ("locked" | "trapped" | "hidden")[]`
  - `isInteresting(input: CategoryInput): boolean`
  - `export const categoryRules: { id: CategoryId; test: (i: CategoryInput) => boolean }[]` - порядок важен, первое совпадение выигрывает.

Правила (порядок):
1. `trader`: персонаж с `hasTradeTreasures`.
2. `boss`: персонаж с `IsBoss = True`.
3. `animal`: персонаж, у которого в `templateNames` или тегах есть `ANIMAL`/`Animal`, или `stat.type`-цепочка статов начинается с `Animal`.
4. `quest_npc`: персонаж с непустым `DefaultDialog`.
5. `waypoint`: `IsPortal = True` или имя содержит `Waypoint`.
6. `trap`: `IsTrap = True` или имя содержит `Trap` (но не `SmokepowderTrap`, это бочки, категория по общим правилам).
7. `hidden_stash`: `SecretDoor = True` или имя/шаблон содержит `Hidden`, `Stash`, `Secret`, `Buried`.
8. `locked_door`: шаблон с `DOOR_` в `templateNames` и флаг `locked`.
9. `lever`: имя/шаблон начинается с `PUZ_` и содержит `Lever`, `Button`, `Switch`, `Pressure`.
10. `key`: `IsKey = True` или `stat.data.ItemUseType`/имя содержит `Key`.
11. `book`: непустой `BookId`.
12. `scroll`: `stat.name` начинается с `SCROLL_` или имя содержит `SCROLL`.
13. `weapon_unique`: `stat.type = Weapon` и `Rarity` в (`Uncommon`, `Rare`, `VeryRare`, `Legendary`) или `StoryItem = True`.
14. `armor_unique`: `stat.type = Armor`, слот не `Amulet`/`Ring`, та же редкость.
15. `accessory`: `stat.type = Armor` со слотом `Amulet` или `Ring` (поле `Slot`).
16. `ingredient`: шаблон или стат с префиксом `CONS_GEN_Ingredient`, `ALCH_`, `CRA_` (ингредиенты алхимии и готовки).
17. `valuable`: шаблон или стат содержит `LOOT_Gold`, `Gold_Stash`, `GEM_`, `LOOT_GEN_Gem`.
18. `chest`: `InventoryType` не `0` и не пусто, либо имя/шаблон начинается с `CONT_`.

Флаги: `locked` если `LockDifficultyClassID` или `LockDC` непусты и не `00000000-0000-0000-0000-000000000000`, либо задан `Key`; `trapped` если `DisarmDifficultyClassID` непуст или `IsTrap = True`; `hidden` если сработало бы правило 7.
`isInteresting`: персонаж с `DefaultDialog`, торговлей или `IsBoss`; предмет-контейнер; предмет со статом типа `Weapon`/`Armor`; книга; ключ; ловушка; `PUZ_`; дверь с замком; портал.

- [ ] **Step 1: Тесты**: по одному на каждую категорию на минимальном `CategoryInput`, по одному на каждый флаг, тест порядка (`CONT_` сундук с `IsTrap = True` получает `trap`, а флаг `trapped` стоит), `null` для `DEC_GEN_Pigeon_Cage_Small_A` без статов, `isInteresting` ложь для декорации.
- [ ] **Step 2:** Тесты падают.
- [ ] **Step 3:** Реализация.
- [ ] **Step 4:** Тесты проходят.
- [ ] **Step 5:** Коммит `Add category rules`.

### Task 9: Сборка points.json и отчёт

**Files:**
- Create: `tools/extract.ts`, `tools/lib/points.ts`, `data/schema.json`, `data/sample.json`
- Modify: `package.json` (скрипт `"extract": "tsx tools/extract.ts"`), `docs/PROGRESS.md`
- Test: `tools/test/points.test.ts`

**Interfaces:**
- Consumes: всё выше.
- Produces:
  - `interface Point { id: string; category: CategoryId; level: string; submap: string | null; floor: number | null; pos: { x: number; y: number; z: number }; template: string; name: string; nameRu: string; description: string; descriptionRu: string; flags: string[] }`
  - `buildPoint(obj: RawObject, ctx: ExtractContext): { point: Point | null; interesting: boolean }` где `ExtractContext = { templates: TemplateIndex; stats: StatsIndex; loca: Loca; tagNames: Map<string,string>; submaps: Submap[] }`.
  - `interface Report { total: number; byCategory: Record<string, number>; interesting: number; uncategorizedInteresting: number; uncategorizedShare: number; noSubmap: number; topUncategorized: { name: string; count: number }[] }`, `buildReport(results): Report`.

Имя: `DisplayName` экземпляра, иначе по цепочке шаблонов, через `Loca`; если текста нет, `Name` шаблона. Описание аналогично через `Description`, иначе пустая строка. Координаты округляются до 0.01.

- [ ] **Step 1: Тест** `buildPoint` на фикстурном контексте: точка с категорией `chest`, флагом `locked`, `nameRu` из русской loca, `submap` из бокса; декорация даёт `{ point: null, interesting: false }`; `buildReport` считает долю `uncategorizedInteresting / interesting`.
- [ ] **Step 2:** Тест падает.
- [ ] **Step 3:** Реализация `points.ts` и `extract.ts`: пишет `data/points.json` (массив `Point`, отсортирован по `category`, затем `id`), `data/report.json`, печатает таблицу категорий и топ-30 неразмеченных интересных имён шаблонов. `data/schema.json` это JSON Schema для `Point[]`; `data/sample.json` это 10 точек прототипа этапа 1 (бочки и ворота у Рощи), сгенерированные тем же кодом.
- [ ] **Step 4:** `npm test` зелёный, `npm run extract` отрабатывает. Критерий приёмки этапа 2: `uncategorizedShare < 0.10`. Если выше, по топу неразмеченных дополнить правила задачи 8 с тестом на каждое новое правило и повторить.
- [ ] **Step 5:** Обновить `docs/PROGRESS.md` (числа отчёта, что не проверено: флаг `hidden` эвристический, категория `animal` эвристическая). Коммит `Add points extractor and coverage report`, пуш.
