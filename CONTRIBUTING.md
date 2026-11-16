# Contributing to BG3 Atlas

Thanks for helping. Please read [docs/SPEC.md](docs/SPEC.md) and [CLAUDE.md](CLAUDE.md) first: they describe the rules every change has to follow.

## Workflow

1. Fork and create a branch from `main`.
2. Keep the change small and scoped to one fix or feature.
3. Run `npm test`. If you changed the mod itself, build the pak with `npm run build`, test it in game and attach the relevant part of the Script Extender log to the pull request.
4. Write short commit messages in English, in the imperative mood: `Fix waypoint names in Act 3`.
5. Open a pull request and fill in the template.

## Rules of thumb

- Never commit game files, unpacked assets, built paks or generated data. `work/`, `dist/`, `*.pak` and `data/*.json` are ignored for a reason.
- All point data comes from the game files. Do not copy data, icons or text from map sites or from other mods without a license.
- Category rules live in `tools/categories.ts`. A rule change comes with a test in `tools/test/categories.test.ts`.
- Lua code that touches game entities runs on the main thread only. Noesis UI callbacks (`Ext.UI.Defer`, command handlers) must not read ECS or write mod variables.
- No comments in code, no em dashes or en dashes anywhere.
- If you are not sure how a Script Extender API or a game file format behaves, check the sources first and mark guesses as "unverified" in `docs/PROGRESS.md`.

## Reporting a misplaced point

Open an issue with the area, the category, where the icon is and where the object really is. A screenshot of the map with the icon helps the most.
