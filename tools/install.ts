import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { repoRoot, userDataDir } from "./lib/game.ts";
import { addModule, hasModule, readModInfo } from "./lib/modsettings.ts";

const pak = path.join(repoRoot, "dist", "BG3Atlas.pak");
if (!existsSync(pak)) throw new Error("dist/BG3Atlas.pak not found, run npm run build first");

const mod = readModInfo(readFileSync(path.join(repoRoot, "mod", "BG3Atlas", "Mods", "BG3Atlas", "meta.lsx"), "utf8"));
const user = userDataDir();
const modsDir = path.join(user, "Mods");
const settingsPath = path.join(user, "PlayerProfiles", "Public", "modsettings.lsx");

copyFileSync(pak, path.join(modsDir, "BG3Atlas.pak"));
console.log(`copied pak to ${modsDir}`);

const settings = readFileSync(settingsPath, "utf8");
if (hasModule(settings, mod.uuid)) {
  console.log("modsettings.lsx already lists the mod");
} else {
  const backupDir = path.join(repoRoot, "work", "backup");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = path.join(backupDir, `modsettings-${stamp}.lsx`);
  writeFileSync(backup, settings);
  writeFileSync(settingsPath, addModule(settings, mod));
  console.log(`registered ${mod.name} in modsettings.lsx, backup at ${backup}`);
}
