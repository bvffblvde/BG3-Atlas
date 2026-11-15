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
