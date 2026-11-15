# Прогресс

## Текущий этап: 0. Разведка

Сделано:
- Найдена установка игры, перечислены паки, листинги в `work/lists/`.
- Скачаны LSLib v1.20.4 (`tools/bin/lslib`, вне git) и SE v33 (`work/refs/bg3se-dl/DWrite.dll`, исходники `work/refs/bg3se`).
- Распакованы `Game.pak`, `Shared.pak`, `GustavX.pak`, хотфиксы Patch 8, `English.pak` и выборочно из `Gustav.pak`: уровень `WLD_Main_A`, `RootTemplates`, `Localization`.
- Найдены XAML карты, схема маркеров, данные привязки мира к карте (`WorldMap/*.lsf`). Выводы в `docs/RECON.md`.

Осталось:
- Согласовать с пользователем подход к UI.
- Проба в игре (раздел 7 в `RECON.md`): нужен установленный SE.

## Не проверено

- `WorldX/WorldZ` в `WorldMapMetaData`: центр области или угол, направление оси Z.
- Создаёт ли игра маркер на карте, если `MapMarkerStyle` добавлен предмету в рантайме.
- Доступны ли из Lua масштаб и смещение `LSWorldMap`.
- Как Better Maps All-In-One меняет карту (паков нет).

## Заметки по окружению

- Divine из LSLib v1.20.4 требует .NET 8, на машине есть .NET 9: запускать с `DOTNET_ROLL_FORWARD=Major`.
- Divine принимает только абсолютные пути в `-d`.
- Маска `-x` при распаковке работает как glob по пути внутри пака, например `-x "Mods/Gustav/Levels/WLD_Main_A/*"`.
