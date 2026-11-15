# Прогресс

## Текущий этап: 0. Разведка

Сделано:
- Найдена установка игры, перечислены паки, листинги в `work/lists/`.
- Скачаны LSLib v1.20.4 (`tools/bin/lslib`, вне git) и SE v33 (`work/refs/bg3se-dl/DWrite.dll`, исходники `work/refs/bg3se`).
- Распакованы `Game.pak`, `Shared.pak`, `GustavX.pak`, хотфиксы Patch 8, `English.pak` и выборочно из `Gustav.pak`: уровень `WLD_Main_A`, `RootTemplates`, `Localization`.
- Найдены XAML карты, схема маркеров, данные привязки мира к карте (`WorldMap/*.lsf`). Выводы в `docs/RECON.md`.

- Пользователь согласовал гибридный подход (RECON.md, раздел 6C). Better Maps не ставим, работаем с ванильной картой.
- SE установлен, собран и установлен пробный мод (`mod/BG3Atlas`, консольные команды `!atlas_*`).

Осталось:
- Проба в игре (раздел 7 в `RECON.md`), разбор `probe_ui.txt` и логов.

## Что установлено в игру и как откатить

- `E:\steam  games\steamapps\common\Baldurs Gate 3\bin\DWrite.dll`: Script Extender v33 (updater). Удалить файл, чтобы отключить SE.
- `...\bin\ScriptExtenderSettings.json`: консоль, логи в `work/selogs`, DeveloperMode. Удалить вместе с DWrite.dll.
- `%LOCALAPPDATA%\Larian Studios\Baldur's Gate 3\Mods\BG3Atlas.pak`: наш мод.
- `modsettings.lsx`: добавлен один узел `BG3Atlas`, бэкап до изменения в `work/backup/`.

## Сборка и установка

- `npm run build`: собрать `dist/BG3Atlas.pak`.
- `npm run install-mod`: скопировать пак в `Mods` и зарегистрировать в `modsettings.lsx` (с бэкапом, повторно не добавляет).
- `npm test`: юнит-тесты и проверка синтаксиса Lua.

## Не проверено

- `WorldX/WorldZ` в `WorldMapMetaData`: центр области или угол, направление оси Z.
- Создаёт ли игра маркер на карте, если `MapMarkerStyle` добавлен предмету в рантайме.
- Доступны ли из Lua масштаб и смещение `LSWorldMap`.
- Как Better Maps All-In-One меняет карту (паков нет).

## Заметки по окружению

- Divine из LSLib v1.20.4 требует .NET 8, на машине есть .NET 9: запускать с `DOTNET_ROLL_FORWARD=Major`.
- Divine принимает только абсолютные пути в `-d`.
- Маска `-x` при распаковке работает как glob по пути внутри пака, например `-x "Mods/Gustav/Levels/WLD_Main_A/*"`.
