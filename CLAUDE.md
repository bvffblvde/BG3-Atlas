# BG3 Atlas: interactive map inside Baldur's Gate 3

A mod for BG3 (Steam, Windows) that draws points of interest by category on the in-game map (journal, M) and on the minimap, like Map Genie: chests, items, traps, books, traders, NPCs, stashes, levers and so on. Points have category filters, "hide found", search and a hover card.

Full specification: `docs/SPEC.md`. Read it before any task. Track the current stage and progress in `docs/PROGRESS.md`.

## Project rules

### Git

- All commits and pushes go straight to `main`. Do not create branches, pull requests or worktrees.
- Commit after each finished step. Messages are short, in English, in the imperative mood: `Add map layer prototype`.
- The repository is MIT licensed and intended to be public. Do not change its visibility, publish releases, upload builds or post anywhere without a direct request from the maintainer.
- Unpacked game files, Larian assets and built paks never go into git: `work/`, `dist/`, `*.pak` are in `.gitignore`.
- Never commit secrets, tokens, personal paths or personal data.

### Code

- No comments in code.
- No em dashes or en dashes in text, code or commits.
- Use the relevant skills and agents: brainstorming before a new feature, writing-plans before a multi-step task, systematic-debugging for bugs, frontend-design for UI, verification-before-completion before calling something done. Hand broad searches over unpacked game files to the Explore agent.
- Map Genie is a UX reference only. Do not download or parse anything from mapgenie.io: no data, icons or text. All data comes from the game files.
- Do not copy data from other mods (for example BG3-LootDB) without a license.
- Never modify game files. Unpack only into `work/unpacked` (ignored by git).
- If unsure about the Script Extender API or a game file format, check the sources and docs first, then write code. Mark guesses in `docs/PROGRESS.md` as "unverified".
- Docs, README and commit messages are in English. `README.uk.md` mirrors `README.md` in Ukrainian.

## Environment

- OS: Windows, PowerShell terminal.
- Tooling language: TypeScript on Node (`tools/`), run with `npx tsx`.
- Mod logic: Lua through BG3 Script Extender (Norbyte).
- Mod UI: Noesis XAML (the game's UI engine).

## Where things are (verify on the machine, paths may differ)

Game install. Find it through Steam:
1. `reg query "HKCU\Software\Valve\Steam" /v SteamPath`
2. `<SteamPath>\steamapps\libraryfolders.vdf` lists all libraries. One of them contains `steamapps\common\Baldurs Gate 3`.
3. Default: `C:\Program Files (x86)\Steam\steamapps\common\Baldurs Gate 3`.

Inside the install:
- `Data\*.pak`: game archives. `Data\Localization\*.pak`: text.
- `bin\bg3.exe`, `bin\bg3_dx11.exe`: Script Extender's `DWrite.dll` goes next to them.

User data: `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\`
- `Mods\`: mod `.pak` files.
- `PlayerProfiles\Public\modsettings.lsx`: mod order and activation.
- Script Extender logs: see `ScriptExtenderSettings.json` in `bin` and the SE docs (console and log file options).

Tools (download if missing, ask the maintainer before downloading):
- LSLib (Norbyte), contains the `Divine.exe` CLI: https://github.com/Norbyte/lslib/releases
- BG3 Script Extender: https://github.com/Norbyte/bg3se (docs in `Docs/`, Lua API in `Docs/API.md`)
- Online search over game files: https://bg3.norbyte.dev/search
- Mod Configuration Menu (MCM) for a settings screen, if we decide to rely on it.

Divine commands (check the current syntax with `Divine.exe --help`):
```
Divine.exe -g bg3 -a list-package -s "<pak>"
Divine.exe -g bg3 -a extract-package -s "<pak>" -d "work\unpacked\<name>"
Divine.exe -g bg3 -a convert-resources -s "<lsf folder>" -d "<lsx folder>" -i lsf -o lsx
Divine.exe -g bg3 -a create-package -s "build\BG3Atlas" -d "dist\BG3Atlas.pak"
```

## Where to look in the unpacked files

Real paths found so far are recorded in `docs/GAME_FILES.md`. Add new findings there right away so nobody has to search again.

- Map UI: `Public/Game/GUI/` in `Game.pak` (XAML pages and widgets, search for `Map`, `Minimap`, `Journal`). Map textures: `Public/Game/GUI/Assets/Map`.
- Level objects: `Levels/<Level>/Items`, `Characters`, `Triggers` in the `Gustav*` and `Shared` paks. Act 1 surface: `WLD_Main_A`.
- Object templates: `RootTemplates/_merged.lsf`.
- Names: `Localization/English/english.loca`.

## Repository layout

```
CLAUDE.md
docs/SPEC.md
docs/PROGRESS.md
docs/GAME_FILES.md
tools/            TypeScript: game lookup, unpacking, data extractor, pak build, media
data/             generated JSON (only the schema and a small sample are in git)
mod/BG3Atlas/     mod sources (meta.lsx, ScriptExtender, GUI)
.github/          CI, issue templates, README images
work/             unpacked and temporary files (ignored)
dist/             built .pak (ignored)
```

## How to verify work

- Tooling: `vitest` unit tests for parsing and categorization (`npm test`).
- Mod: build the pak, put it into `Mods`, enable it in `modsettings.lsx`, start the game and read the Script Extender log. The maintainer launches the game and checks the screen: ask them and describe exactly what to check.
- Do not call a stage done without meeting its acceptance criteria in `docs/SPEC.md`.
