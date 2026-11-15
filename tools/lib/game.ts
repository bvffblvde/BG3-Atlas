import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(import.meta.dirname, "..", "..");

export function parseLibraryFolders(vdf: string): string[] {
  const result: string[] = [];
  for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
    result.push(m[1].replace(/\\\\/g, "\\"));
  }
  return result;
}

function steamPath(): string {
  const out = execFileSync("reg", ["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"], { encoding: "utf8" });
  const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
  if (!m) throw new Error("SteamPath not found in registry");
  return path.normalize(m[1].trim());
}

export function findGameDir(): string {
  if (process.env.BG3_DIR) return process.env.BG3_DIR;
  const steam = steamPath();
  const vdf = readFileSync(path.join(steam, "steamapps", "libraryfolders.vdf"), "utf8");
  for (const lib of [steam, ...parseLibraryFolders(vdf)]) {
    const dir = path.join(lib, "steamapps", "common", "Baldurs Gate 3");
    if (existsSync(path.join(dir, "Data", "Game.pak"))) return dir;
  }
  throw new Error("Baldur's Gate 3 not found in Steam libraries");
}

export function userDataDir(): string {
  const local = process.env.LOCALAPPDATA;
  if (!local) throw new Error("LOCALAPPDATA is not set");
  return path.join(local, "Larian Studios", "Baldur's Gate 3");
}

export const divineExe = path.join(repoRoot, "tools", "bin", "lslib", "Packed", "Tools", "Divine.exe");

export function divine(args: string[]): string {
  if (!existsSync(divineExe)) throw new Error(`Divine.exe not found at ${divineExe}`);
  return execFileSync(divineExe, ["-g", "bg3", ...args], {
    encoding: "utf8",
    env: { ...process.env, DOTNET_ROLL_FORWARD: "Major" },
  });
}
