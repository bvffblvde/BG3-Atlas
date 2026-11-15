import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { XMLValidator } from "fast-xml-parser";
import { divine, findGameDir, repoRoot } from "./game.ts";
import { layerXaml } from "./layerxaml.ts";
import { injectWorldMapLayer } from "./xaml-patch.ts";

export interface ThemeSource {
  pak: string;
  file: string;
}

export const worldMapThemes: ThemeSource[] = [
  { pak: "Game", file: "Public/Game/GUI/Theme/DefaultShared.Styles.xaml" },
  { pak: "Patch8_HotFix9", file: "Public/Game/GUI/Override/Clairmont/Theme/DefaultShared.Styles.xaml" },
];

export function unpackedPath(src: ThemeSource): string {
  return path.join(repoRoot, "work", "unpacked", src.pak, ...src.file.split("/"));
}

export function ensureUnpacked(src: ThemeSource): string {
  const target = unpackedPath(src);
  if (!existsSync(target)) {
    const pak = path.join(findGameDir(), "Data", `${src.pak}.pak`);
    divine(["-a", "extract-package", "-s", pak, "-d", path.join(repoRoot, "work", "unpacked", src.pak), "-x", src.file]);
  }
  if (!existsSync(target)) throw new Error(`cannot extract ${src.file} from ${src.pak}.pak`);
  return target;
}

export function layerSnippet(): string {
  return layerXaml();
}

export function patchTheme(src: ThemeSource): string {
  const xaml = readFileSync(ensureUnpacked(src), "utf8");
  const patched = injectWorldMapLayer(xaml, layerSnippet());
  const valid = XMLValidator.validate(patched);
  if (valid !== true) throw new Error(`patched ${src.file} is not well formed: ${JSON.stringify(valid.err)}`);
  return patched;
}
