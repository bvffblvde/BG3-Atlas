# Stage 2: Wilderness point extractor. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npx tsx tools/extract.ts` builds `data/points.json` with all points of interest in Wilderness (WLD_Main_A and its sublevels) by the categories of the starting set, with names from localization, a submap and flags, and prints a coverage report.

**Architecture:** A pipeline of small modules in `tools/lib/`: unpacking the needed parts of the paks into lsx, parsing LSX into a tree, collecting level objects with conversion of sublevel local coordinates to world coordinates, resolving the root template along the `ParentTemplateId` chain, stats with `using` inheritance, localization, submap assignment by `WorldMap` triggers, categorization by the rules in `tools/categories.ts`. Each module is tested on small fixtures, the whole pipeline is checked with a report on real data.

**Tech Stack:** TypeScript, Node 26, `tsx`, `vitest`, `fast-xml-parser` (already in devDependencies), Divine from LSLib (`tools/lib/game.ts: divine()`).

**Spec:** `docs/SPEC.md` (stage 2, point format, categories), facts about files: `docs/RECON.md`, `docs/GAME_FILES.md`.

## Global Constraints

- No comments in code. No long dashes anywhere.
- Data only from game files. Nothing from mapgenie.io, no data from other people's mods.
- Unpacked and generated files are not committed: `work/`, `dist/`, `data/*.json` except `data/schema.json` and `data/sample.json`.
- Run Divine only through `divine()` from `tools/lib/game.ts` (it sets `DOTNET_ROLL_FORWARD=Major`), paths in `-d` are absolute.
- Level modules: `Mods/Gustav/Levels/<L>` and `Mods/GustavDev/Levels/<L>` are merged. `Mods/Honour/...` is not used (Honour mode).
- World coordinate system: x, y (height), z. The map uses x and z.
- One commit per task, short English imperative messages, no co-authors.
- The point format is from the spec, the `id` field is the instance `MapKey`. Names: `name` (English) and `nameRu`.

## Established facts (verified against the files, do not re-check)

- `WorldMapMetaData`: `WorldX/WorldZ` is the center of the area, `WorldWidth/WorldHeight` is the full size, 20 px per unit. The area trigger: `Position` is the center, `Extents` is half the size, `RotationQuat` is the rotation (usually only around Y).
- WLD_Main_A objects lie in world coordinates (checked in game on the barrel `01882a87-db88-4a9d-9bdc-e8365775cbc1`, 212.35 24.92 425.93).
- Sublevels are attached by objects with `Type="LevelTemplate"` in `<L>/LevelTemplates/_merged.lsx`. Their `TemplateName` points to a root template with the attribute `SubLevelName`. Sublevel objects use local coordinates: world = LT.Position + rotate(LT.RotationQuat, local * LT.Scale). Example: `LT_WLD_Grove` (213.57 0 689.44) attaches `WLD_RangerCamp_I`; `LT_WLD_GoblinCamp` is rotated 90° around Y.
- A sublevel can be attached several times (camp variants). For Wilderness we take only sublevels with the `WLD_` prefix, except `WLD_CIN_*`, and only the first attachment. The others (`CMP_`, `CLT_`, `GLO_`, `PLT_`, `SYS_`, `GUS_`, `LT_`) are skipped.
- `WorldMap/*.lsx` exists for both the main level and the sublevels; for a sublevel the coordinates of the metadata and of its triggers are local.
- Instance fields on top of the template: `DisplayName` (TranslatedString, attribute `handle`), `Stats`, `LockDifficultyClassID`, `DisarmDifficultyClassID`, `IsTrap`, `Key`, `IsKey`, `BookId`, `InventoryType`, `StoryItem`, `ItemList/Item/TemplateID` (contents).
- Template fields: `Name`, `ParentTemplateId`, `Type` (item, character, trigger, LevelTemplate...), `DisplayName`, `Description`, `Icon`, `Stats`, `IsTrap`, `IsPortal`, `BookId`, `BookType`, `InventoryType`, `IsKey`, `Key`, `SecretDoor`, `LockDC`, `IsLootable`, `StoryItem`, `Tags/Tag/Object` nodes (tag GUID), `TradeTreasures` (on traders).
- Level characters: `DisplayName`, `Stats`, `DefaultDialog`, `IsBoss`, `Equipment`.
- Stats: `Public/{Shared,SharedDev,Gustav,GustavDev,GustavX}/Stats/Generated/Data/*.txt`, format `new entry "X"` / `type "Weapon"` / `using "Parent"` / `data "Key" "Value"`. Rarity: `data "Rarity"`.
- Localization: `Divine -a convert-loca -s <.loca> -d <.xml>` gives `<content contentuid="h..." version="N">text</content>`. English: `English.pak` (`english.loca`, `english_M_to_X.loca`, `english_to_F.loca`), Russian: `Localization/Russian/Russian.pak`.
- Tags: `Public/*/Tags/<guid>.lsf`, each has a `Name`.

## Review Focus

- A rotated sublevel (GoblinCamp, ZhentarimBasement): points must be placed by the rotation, not just by the offset. The test in task 3 uses 90° around Y.
- A template without `DisplayName` on the instance and across the whole chain: the name is taken along the chain, otherwise the template `Name`, but never an empty string. The test in task 4.
- A cycle or a break in `ParentTemplateId` (parent not found): resolution does not crash and does not loop. The test in task 4.
- A point outside all `WorldMap` triggers: `submap` = `null`, the point is not lost. The test in task 7.
- A localization handle that is not in loca: the name falls back to English or to the template `Name`, not to the handle itself. The test in task 5.

---

### Task 1: Unpacking the needed parts of the game

**Files:**
- Create: `tools/unpack.ts`, `tools/lib/unpack-plan.ts`
- Test: `tools/test/unpack-plan.test.ts`

**Interfaces:**
- Consumes: `divine(args: string[]): string`, `findGameDir(): string`, `repoRoot` from `tools/lib/game.ts`.
- Produces: `unpackJobs(): UnpackJob[]` where `UnpackJob = { pak: string; pattern: string; dest: string }` (`pak` is relative to `Data/`, `dest` is a subfolder of `work/unpacked/`). After `npm run unpack`, `work/unpacked/lsx/` holds the lsx of all needed files at their paths inside the pak, and `work/unpacked/loca/english.xml` and `russian.xml` hold all the localization.

- [ ] **Step 1: Test `unpackJobs`**: the jobs contain `Mods/Gustav/Levels/WLD_*` and `Mods/GustavDev/Levels/WLD_*` from `Gustav.pak`, `*RootTemplates/*`, `*/Stats/Generated/Data/*`, `*/Tags/*` from `Gustav.pak`, `Shared.pak`, `GustavX.pak`, as well as `Localization/English.pak` and `Localization/Russian/Russian.pak` in full; all `dest` values are different.
- [ ] **Step 2:** `npx vitest run tools/test/unpack-plan.test.ts`, FAIL expected (module not found).
- [ ] **Step 3:** Implement `unpackJobs()` and `tools/unpack.ts`: for each job `extract-package -x pattern` into `work/unpacked/raw/<dest>`, then `convert-resources -i lsf -o lsx` into `work/unpacked/lsx/`, copy txt and lsx as is, convert all `.loca` of a language with `convert-loca` and merge them into one `<lang>.xml`. Skip a job if the destination folder already exists, the `--force` flag unpacks again. Add the script `"unpack": "tsx tools/unpack.ts"` to `package.json`.
- [ ] **Step 4:** The test passes. Run `npm run unpack`, expect `work/unpacked/lsx/Mods/Gustav/Levels/WLD_GoblinCamp_D/Items/_merged.lsx` and `work/unpacked/loca/russian.xml`.
- [ ] **Step 5:** Update `docs/GAME_FILES.md` (the list of sublevels, where stats, tags and Russian localization live). Commit `Add game data unpacker`.

### Task 2: LSX parsing

**Files:**
- Create: `tools/lib/lsx.ts`
- Test: `tools/test/lsx.test.ts`

**Interfaces:**
- Produces:
  - `interface LsxAttr { type: string; value: string; handle?: string }`
  - `interface LsxNode { id: string; attrs: Record<string, LsxAttr>; children: LsxNode[] }`
  - `parseLsx(xml: string): LsxNode[]` returns the root nodes of all regions.
  - `findAll(nodes: LsxNode[], id: string): LsxNode[]` recursive search by node `id`.
  - `child(node: LsxNode, id: string): LsxNode | undefined`, `attr(node: LsxNode, id: string): string | undefined` (for TranslatedString it returns `handle`).
  - `readLsxFile(path: string): LsxNode[]`.

- [ ] **Step 1: Test** on a fixture with two `GameObjects`: `attr(go, "MapKey")`, `attr(go, "DisplayName")` equals the handle, `child(go, "Transform")` with `Position` `"1 2 3"`, `findAll(roots, "GameObjects").length === 2`, nested `Tags/Tag/Object` are found.
- [ ] **Step 2:** The test fails.
- [ ] **Step 3:** Implementation on `fast-xml-parser` (`ignoreAttributes: false`, `isArray` for `node`, `attribute`, `children`).
- [ ] **Step 4:** The test passes. Manual check: `readLsxFile` on WLD_Main_A `Items/_merged.lsx` gives 3333 `GameObjects`.
- [ ] **Step 5:** Commit `Add LSX parser`.

### Task 3: Transforms and sublevels

**Files:**
- Create: `tools/lib/transform.ts`, `tools/lib/sublevels.ts`
- Test: `tools/test/transform.test.ts`, `tools/test/sublevels.test.ts`

**Interfaces:**
- Produces:
  - `type Vec3 = [number, number, number]; type Quat = [number, number, number, number]` (x, y, z, w as in the files).
  - `interface Placement { pos: Vec3; rot: Quat; scale: number }`, `identity: Placement`.
  - `rotate(q: Quat, v: Vec3): Vec3`, `toWorld(p: Placement, local: Vec3): Vec3`, `composePlacement(outer: Placement, inner: Placement): Placement`.
  - `parseVec3(s: string): Vec3`, `parseQuat(s: string): Quat`.
  - `interface SubLevelRef { level: string; placement: Placement; via: string }` (`via` is the `Name` of the LT object).
  - `findSubLevels(levelTemplates: LsxNode[], subLevelByTemplate: Map<string, string>, accept: (level: string) => boolean): SubLevelRef[]` - the first attachment of each accepted sublevel.
  - `isWildernessSubLevel(level: string): boolean` - `WLD_` and not `WLD_CIN_`, not `WLD_Main_A`.

- [ ] **Step 1: Tests**: `rotate([0, 0.7071068, 0, 0.7071067], [1, 0, 0])` is close to `[0, 0, -1]` (precision 1e-5); `toWorld({pos:[213.57,0,689.44], rot:[0,0,0,1], scale:1}, [-4.5185, 0, -110.4688])` is close to `[209.0515, 0, 579.0712]`; `findSubLevels` on a fixture with two LTs of the same sublevel returns one attachment, an LT on `CMP_Basement_A` is filtered out by `isWildernessSubLevel`; `isWildernessSubLevel("WLD_CIN_Raft_A") === false`.
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3:** Implementation (rotating a vector by a quaternion: v' = v + 2w(q×v) + 2q×(q×v)).
- [ ] **Step 4:** The tests pass.
- [ ] **Step 5:** Commit `Add transforms and sublevel discovery`.

### Task 4: Root templates

**Files:**
- Create: `tools/lib/templates.ts`
- Test: `tools/test/templates.test.ts`

**Interfaces:**
- Consumes: `LsxNode`, `attr`, `child`, `findAll` (task 2).
- Produces:
  - `interface Template { id: string; name: string; parent?: string; type: string; attrs: Record<string, string>; tags: string[]; hasTradeTreasures: boolean }`
  - `class TemplateIndex { constructor(files: LsxNode[][]); get(id: string): Template | undefined; chain(id: string): Template[]; resolved(id: string): ResolvedTemplate }` - files are passed in priority order (Shared, SharedDev, Gustav, GustavDev, GustavX), a later one overrides an earlier one by `MapKey`.
  - `interface ResolvedTemplate { id: string; names: string[]; type: string; attrs: Record<string, string>; tags: string[]; hasTradeTreasures: boolean }` - `names` are the `Name` values along the chain from the instance to the root, `attrs` are merged (the one closest to the instance wins, empty strings do not override), `tags` are combined.
  - `subLevelIndex(index: TemplateIndex): Map<string, string>` (`MapKey` → `SubLevelName`).

- [ ] **Step 1: Tests**: a chain of three templates merges `Stats` from the nearest, `Icon` from the root, tags are combined; `names` are in order from the child; a template with a nonexistent parent resolves without an error; a cycle A→B→A does not loop (`chain` of length 2); a later file overrides a template with the same `MapKey`.
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3:** Implementation.
- [ ] **Step 4:** The tests pass. Manual check on real files: the template `0e31a4ee-81e0-4a63-8584-1659de308a85` resolves with `SubLevelName = WLD_RangerCamp_I`.
- [ ] **Step 5:** Commit `Add root template index`.

### Task 5: Stats, tags, localization

**Files:**
- Create: `tools/lib/stats.ts`, `tools/lib/loca.ts`, `tools/lib/tags.ts`
- Test: `tools/test/stats.test.ts`, `tools/test/loca.test.ts`

**Interfaces:**
- Produces:
  - `interface StatEntry { name: string; type: string; data: Record<string, string> }`
  - `parseStats(text: string): StatEntry[]` (raw, with the `using` field in `data.__using`), `class StatsIndex { constructor(entries: StatEntry[]); get(name: string): StatEntry | undefined }` - `get` returns an entry with data merged along `using`, the type is inherited too.
  - `parseLoca(xml: string): Map<string, string>`, `class Loca { constructor(en: Map<string,string>, ru: Map<string,string>); text(handle: string | undefined, lang: "en" | "ru"): string | undefined }` - Russian without a translation falls back to English.
  - `loadTagNames(lsxFiles: LsxNode[][]): Map<string, string>` (GUID → `Name`).

- [ ] **Step 1: Tests**: a two-level `using` gives `Rarity` from the parent and `Damage` from the child; an entry without `type` inherits the type; `parseLoca` decodes XML entities (`&lt;` → `<`); `text("hNONE", "en") === undefined`; `text(h, "ru")` without a Russian string returns the English one.
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3:** Implementation.
- [ ] **Step 4:** The tests pass.
- [ ] **Step 5:** Commit `Add stats, tags and localization readers`.

### Task 6: Level objects in world coordinates

**Files:**
- Create: `tools/lib/level.ts`
- Test: `tools/test/level.test.ts`

**Interfaces:**
- Consumes: tasks 2, 3, 4.
- Produces:
  - `interface RawObject { id: string; kind: "item" | "character"; level: string; name: string; template: string; pos: Vec3; attrs: Record<string, string>; tags: string[]; contents: string[] }` - `attrs` are the instance fields, `contents` are the `TemplateID` values from `ItemList`.
  - `readLevelObjects(lsxRoot: string, level: string, placement: Placement): RawObject[]` - reads `Items/_merged.lsx` and `Characters/_merged.lsx` from `Mods/Gustav/Levels/<level>` and `Mods/GustavDev/Levels/<level>`, converts positions to world coordinates.
  - `readWilderness(lsxRoot: string, templates: TemplateIndex): RawObject[]` - WLD_Main_A with `identity` plus all sublevels from `findSubLevels(..., isWildernessSubLevel)`; duplicate `id` values are dropped (the first wins).

- [ ] **Step 1: Test** on a temporary fixture folder: a sublevel with an LT rotation of 90° around Y, an object at local (1,0,0) gets the world position LT.pos + (0,0,-1); a character gets `kind: "character"`; `contents` is collected from `ItemList`.
- [ ] **Step 2:** The test fails.
- [ ] **Step 3:** Implementation.
- [ ] **Step 4:** The test passes. Manual check: `readWilderness` on real data returns more than 3500 items, the barrel `01882a87-db88-4a9d-9bdc-e8365775cbc1` at (212.35, 24.92, 425.93).
- [ ] **Step 5:** Commit `Add wilderness level reader`.

### Task 7: Submaps

**Files:**
- Create: `tools/lib/submaps.ts`
- Test: `tools/test/submaps.test.ts`

**Interfaces:**
- Consumes: tasks 2, 3, 6 (the same sublevel placements).
- Produces:
  - `interface Submap { trigger: string; building: string | null; floor: number; center: Vec3; half: Vec3; rot: Quat; area: number }` (all in world coordinates, `area = 4 * half.x * half.z`).
  - `loadSubmaps(lsxRoot: string, levels: { level: string; placement: Placement }[]): Submap[]` - the `WorldMap/*.lsx` of each level plus a lookup of `TriggerId` among the `Triggers/_merged.lsx` of the same level; if the trigger is not found, the box is built from `WorldX/WorldZ` and `WorldWidth/WorldHeight` with unlimited height.
  - `assignSubmap(pos: Vec3, submaps: Submap[]): { submap: string | null; floor: number | null; trigger: string | null }` - among those containing the point, a building (`building` not null) with the smallest area is chosen, otherwise a region with the smallest area, otherwise null.
- [ ] **Step 1: Tests**: a point inside both a region and the building `Underdark` floor 3 gets the building; a box rotated by 45° does not contain a point from the corner of its AABB; a point outside everything gives `{ submap: null, floor: null, trigger: null }`.
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3:** Implementation (the point is converted into the box's system by the inverse rotation).
- [ ] **Step 4:** The tests pass. Manual check: on real data the share of points with `submap = null` is printed in the task 9 report.
- [ ] **Step 5:** Commit `Add submap assignment`.

### Task 8: Categories and flags

**Files:**
- Create: `tools/categories.ts`
- Test: `tools/test/categories.test.ts`

**Interfaces:**
- Consumes: `ResolvedTemplate`, `StatEntry`.
- Produces:
  - `type CategoryId = "chest" | "weapon_unique" | "armor_unique" | "accessory" | "scroll" | "book" | "key" | "ingredient" | "valuable" | "trap" | "hidden_stash" | "lever" | "locked_door" | "waypoint" | "trader" | "quest_npc" | "boss" | "animal"`
  - `interface CategoryInput { kind: "item" | "character"; name: string; templateNames: string[]; attrs: Record<string, string>; tags: string[]; stat?: StatEntry; hasTradeTreasures: boolean; contents: string[] }` (`attrs` = the merge of template and instance, the instance wins).
  - `categorize(input: CategoryInput): CategoryId | null`
  - `flags(input: CategoryInput): ("locked" | "trapped" | "hidden")[]`
  - `isInteresting(input: CategoryInput): boolean`
  - `export const categoryRules: { id: CategoryId; test: (i: CategoryInput) => boolean }[]` - order matters, the first match wins.

Rules (in order):
1. `trader`: a character with `hasTradeTreasures`.
2. `boss`: a character with `IsBoss = True`.
3. `animal`: a character whose `templateNames` or tags contain `ANIMAL`/`Animal`, or whose `stat.type` stat chain starts with `Animal`.
4. `quest_npc`: a character with a non-empty `DefaultDialog`.
5. `waypoint`: `IsPortal = True` or the name contains `Waypoint`.
6. `trap`: `IsTrap = True` or the name contains `Trap` (but not `SmokepowderTrap`, those are barrels, the category comes from the general rules).
7. `hidden_stash`: `SecretDoor = True` or the name/template contains `Hidden`, `Stash`, `Secret`, `Buried`.
8. `locked_door`: a template with `DOOR_` in `templateNames` and the `locked` flag.
9. `lever`: the name/template starts with `PUZ_` and contains `Lever`, `Button`, `Switch`, `Pressure`.
10. `key`: `IsKey = True` or `stat.data.ItemUseType`/the name contains `Key`.
11. `book`: a non-empty `BookId`.
12. `scroll`: `stat.name` starts with `SCROLL_` or the name contains `SCROLL`.
13. `weapon_unique`: `stat.type = Weapon` and `Rarity` in (`Uncommon`, `Rare`, `VeryRare`, `Legendary`) or `StoryItem = True`.
14. `armor_unique`: `stat.type = Armor`, slot is not `Amulet`/`Ring`, same rarity.
15. `accessory`: `stat.type = Armor` with slot `Amulet` or `Ring` (the `Slot` field).
16. `ingredient`: a template or stat with the prefix `CONS_GEN_Ingredient`, `ALCH_`, `CRA_` (alchemy and cooking ingredients).
17. `valuable`: a template or stat containing `LOOT_Gold`, `Gold_Stash`, `GEM_`, `LOOT_GEN_Gem`.
18. `chest`: `InventoryType` is not `0` and not empty, or the name/template starts with `CONT_`.

Flags: `locked` if `LockDifficultyClassID` or `LockDC` is non-empty and not `00000000-0000-0000-0000-000000000000`, or `Key` is set; `trapped` if `DisarmDifficultyClassID` is non-empty or `IsTrap = True`; `hidden` if rule 7 would fire.
`isInteresting`: a character with `DefaultDialog`, trading or `IsBoss`; a container item; an item with a stat of type `Weapon`/`Armor`; a book; a key; a trap; `PUZ_`; a locked door; a portal.

- [ ] **Step 1: Tests**: one per category on a minimal `CategoryInput`, one per flag, an order test (a `CONT_` chest with `IsTrap = True` gets `trap`, and the `trapped` flag is set), `null` for `DEC_GEN_Pigeon_Cage_Small_A` without stats, `isInteresting` is false for a decoration.
- [ ] **Step 2:** The tests fail.
- [ ] **Step 3:** Implementation.
- [ ] **Step 4:** The tests pass.
- [ ] **Step 5:** Commit `Add category rules`.

### Task 9: Building points.json and the report

**Files:**
- Create: `tools/extract.ts`, `tools/lib/points.ts`, `data/schema.json`, `data/sample.json`
- Modify: `package.json` (script `"extract": "tsx tools/extract.ts"`), `docs/PROGRESS.md`
- Test: `tools/test/points.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `interface Point { id: string; category: CategoryId; level: string; submap: string | null; floor: number | null; pos: { x: number; y: number; z: number }; template: string; name: string; nameRu: string; description: string; descriptionRu: string; flags: string[] }`
  - `buildPoint(obj: RawObject, ctx: ExtractContext): { point: Point | null; interesting: boolean }` where `ExtractContext = { templates: TemplateIndex; stats: StatsIndex; loca: Loca; tagNames: Map<string,string>; submaps: Submap[] }`.
  - `interface Report { total: number; byCategory: Record<string, number>; interesting: number; uncategorizedInteresting: number; uncategorizedShare: number; noSubmap: number; topUncategorized: { name: string; count: number }[] }`, `buildReport(results): Report`.

Name: the instance `DisplayName`, otherwise along the template chain, through `Loca`; if there is no text, the template `Name`. The description likewise through `Description`, otherwise an empty string. Coordinates are rounded to 0.01.

- [ ] **Step 1: Test** `buildPoint` on a fixture context: a point with category `chest`, flag `locked`, `nameRu` from the Russian loca, `submap` from a box; a decoration gives `{ point: null, interesting: false }`; `buildReport` computes the share `uncategorizedInteresting / interesting`.
- [ ] **Step 2:** The test fails.
- [ ] **Step 3:** Implementation of `points.ts` and `extract.ts`: writes `data/points.json` (an array of `Point`, sorted by `category`, then `id`), `data/report.json`, prints a table of categories and the top 30 unclassified interesting template names. `data/schema.json` is a JSON Schema for `Point[]`; `data/sample.json` is the 10 points of the stage 1 prototype (barrels and the gate at the Grove), generated by the same code.
- [ ] **Step 4:** `npm test` is green, `npm run extract` runs through. Stage 2 acceptance criterion: `uncategorizedShare < 0.10`. If higher, extend the task 8 rules from the top of the unclassified, with a test for each new rule, and repeat.
- [ ] **Step 5:** Update `docs/PROGRESS.md` (the report numbers, what is unverified: the `hidden` flag is heuristic, the `animal` category is heuristic). Commit `Add points extractor and coverage report`, push.
