# BG3 Atlas: интерактивная карта внутри Baldur's Gate 3

Мод для BG3 (Steam, Windows), который рисует на внутриигровой карте (журнал, M) и миникарте точки интереса по категориям, как Map Genie: сундуки, предметы, ловушки, книги, торговцы, NPC, тайники, рычаги и так далее. У точек есть фильтры по категориям, «скрыть собранное», поиск и карточка при наведении.

Полная спецификация: `docs/SPEC.md`. Читай её перед любой задачей. Текущий этап и прогресс веди в `docs/PROGRESS.md`.

## Правила проекта

### Git

- Коммиты и пуши только от имени `bvffblvde <krakenitsmydog@gmail.com>`. Перед первым коммитом выставь локально в репозитории `git config user.name "bvffblvde"` и `git config user.email "krakenitsmydog@gmail.com"` и проверь их перед каждым пушем.
- Без соавторства: никаких строк `Co-Authored-By`, `Generated with`, ссылок на сессии и любых других упоминаний Claude или ИИ в коммитах, тегах и описаниях.
- Все коммиты и пуши сразу в `main`. Веток, пулл-реквестов и worktree не создавать.
- Коммить по завершённым шагам, сообщения короткие, по-английски, в повелительном наклонении: `Add map layer prototype`.
- Репозиторий приватный. Не делать его публичным, не добавлять LICENSE, не публиковать код и сборки никуда без прямой просьбы пользователя. Возможно, позже станет опенсорсом.
- В git никогда не попадают распакованные файлы игры, ассеты Larian и собранные паки: `work/`, `dist/`, `*.pak` в `.gitignore`.

### Код

- Никаких комментариев в коде.
- Никаких длинных тире в тексте, коде и коммитах.
- Используй все нужные скиллы и агентов: brainstorming перед новой фичей, writing-plans перед многошаговой задачей, systematic-debugging при багах, frontend-design для UI, verification-before-completion перед тем, как объявлять что-то готовым. Широкий поиск по распакованным файлам игры отдавай агенту Explore.
- Map Genie только как референс UX. Ничего с mapgenie.io не скачивать и не парсить: ни данные, ни иконки, ни тексты. Все данные берём из файлов игры.
- Данные чужих модов (например BG3-LootDB) без лицензии не копировать.
- Файлы игры не изменять. Распаковка только в `work/unpacked` (в `.gitignore`).
- Если неуверен в API Script Extender или в формате файла игры, сначала проверь по исходникам и докам, потом пиши код. Догадки помечай в `docs/PROGRESS.md` как «не проверено».

## Окружение

- ОС: Windows, терминал PowerShell.
- Язык тулинга: TypeScript на Node (`tools/`), запуск через `npx tsx`.
- Логика мода: Lua через BG3 Script Extender (Norbyte).
- UI мода: Noesis XAML (игровой UI движок).

## Где что лежит (проверь на машине, пути могут отличаться)

Установка игры. Найди через Steam:
1. `reg query "HKCU\Software\Valve\Steam" /v SteamPath`
2. В `<SteamPath>\steamapps\libraryfolders.vdf` перечислены все библиотеки. В какой-то из них лежит `steamapps\common\Baldurs Gate 3`.
3. По умолчанию это `C:\Program Files (x86)\Steam\steamapps\common\Baldurs Gate 3`.

Внутри установки:
- `Data\*.pak`: архивы игры. `Data\Localization\*.pak`: тексты.
- `bin\bg3.exe`, `bin\bg3_dx11.exe`: сюда же кладётся `DWrite.dll` Script Extender.

Пользовательские данные: `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\`
- `Mods\`: сюда кладутся `.pak` модов.
- `PlayerProfiles\Public\modsettings.lsx`: порядок и включение модов.
- Логи Script Extender: смотри `ScriptExtenderSettings.json` в `bin` и доки SE (опция консоли и лог-файлов).

Инструменты (скачать, если нет; спросить пользователя перед скачиванием):
- LSLib (Norbyte), в нём `Divine.exe` CLI: https://github.com/Norbyte/lslib/releases
- BG3 Script Extender: https://github.com/Norbyte/bg3se (доки в `Docs/`, API Lua в `Docs/API.md`)
- Поиск по файлам игры онлайн: https://bg3.norbyte.dev/search
- Mod Configuration Menu (MCM) для экрана настроек, если решим на него опираться.

Команды Divine (проверь актуальный синтаксис через `Divine.exe --help`):
```
Divine.exe -g bg3 -a list-package -s "<pak>"
Divine.exe -g bg3 -a extract-package -s "<pak>" -d "work\unpacked\<имя>"
Divine.exe -g bg3 -a convert-resources -s "<папка с lsf>" -d "<папка lsx>" -i lsf -o lsx
Divine.exe -g bg3 -a create-package -s "build\BG3Atlas" -d "dist\BG3Atlas.pak"
```

## Где искать нужное в распакованных файлах (гипотезы, проверить на этапе 0)

- UI карты: `Public/Game/GUI/` в `Game.pak` (страницы и виджеты XAML, ищи `Map`, `Minimap`, `Journal`). Текстуры карты: `Public/Game/GUI/Assets/Map`.
- Объекты уровней: папки `Levels/<Уровень>/Items`, `Characters`, `Triggers` в паках `Gustav*` и `Shared`. Акт 1 поверхность: `WLD_Main_A`.
- Шаблоны объектов: `RootTemplates/_merged.lsf`.
- Названия: `Localization/English/english.loca`.
- Привязка мира к карте: ищи данные о границах карт уровней и подкартах (Подземье, Гримфорж, интерьеры). Это ключевая неизвестная.

Сразу записывай найденные реальные пути в `docs/GAME_FILES.md`, чтобы не искать повторно.

## Структура репозитория

```
CLAUDE.md
docs/SPEC.md
docs/PROGRESS.md
docs/GAME_FILES.md
tools/            TypeScript: поиск игры, распаковка, экстрактор данных, сборка пака
data/             сгенерированные JSON (в git только схема и маленький сэмпл)
mod/BG3Atlas/     исходники мода (meta.lsx, ScriptExtender, GUI)
work/             распаковка и временные файлы (в .gitignore)
dist/             собранный .pak (в .gitignore)
```

## Как проверять работу

- Тулинг: юнит-тесты на `vitest` для парсинга и категоризации.
- Мод: собрать пак, положить в `Mods`, включить в `modsettings.lsx`, запустить игру и смотреть лог Script Extender. Запуск игры и проверку на экране делает пользователь: попроси его и опиши, что именно проверить.
- Не объявляй этап готовым без выполненных критериев приёмки из `docs/SPEC.md`.
