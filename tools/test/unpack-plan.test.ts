import { describe, expect, it } from "vitest";
import { isBaseLoca, unpackJobs } from "../lib/unpack-plan.ts";

describe("isBaseLoca", () => {
  it.each([
    ["raw/loca-english/Localization/English/english.loca", "english", true],
    ["raw/loca-english/Localization/English/english_M_to_X.loca", "english", false],
    ["raw/loca-english/Localization/English/Gender/Female/english.loca", "english", false],
    ["raw\\loca-russian\\Localization\\Russian\\russian.loca", "russian", true],
    ["raw/loca-russian/Localization/Russian/Gender/Neutral/russian_X_to_M.loca", "russian", false],
  ])("%s -> %s", (file, lang, expected) => {
    expect(isBaseLoca(file, lang)).toBe(expected);
  });
});

describe("unpackJobs", () => {
  const jobs = unpackJobs();
  const has = (pak: string, pattern: string) => jobs.some((j) => j.pak === pak && j.pattern === pattern);

  it.each(["SCL", "CTY", "BGO", "CRE", "INT", "END", "IRN", "TUT", "EPI"])("includes %s levels from both Gustav modules", (prefix) => {
    expect(has("Gustav.pak", `Mods/Gustav/Levels/${prefix}_*`)).toBe(true);
    expect(has("Gustav.pak", `Mods/GustavDev/Levels/${prefix}_*`)).toBe(true);
  });

  it("includes wilderness levels from both Gustav modules", () => {
    expect(has("Gustav.pak", "Mods/Gustav/Levels/WLD_*")).toBe(true);
    expect(has("Gustav.pak", "Mods/GustavDev/Levels/WLD_*")).toBe(true);
  });

  it.each(["Gustav.pak", "Shared.pak", "GustavX.pak"])("includes templates, stats and tags from %s", (pak) => {
    expect(has(pak, "*RootTemplates/*")).toBe(true);
    expect(has(pak, "*/Stats/Generated/Data/*")).toBe(true);
    expect(has(pak, "*/Tags/*")).toBe(true);
  });

  it("includes english and russian localization paks whole", () => {
    expect(jobs.some((j) => j.pak === "Localization/English.pak" && j.pattern === "*" && j.loca === "english")).toBe(true);
    expect(jobs.some((j) => j.pak === "Localization/Russian/Russian.pak" && j.pattern === "*" && j.loca === "russian")).toBe(true);
  });

  it("includes level globals and waypoint name keys from Gustav", () => {
    expect(has("Gustav.pak", "Mods/*/Globals/*")).toBe(true);
    expect(has("Gustav.pak", "Mods/*/Localization/Waypointshrines*")).toBe(true);
    expect(has("Gustav.pak", "Mods/*/Story/RawFiles/Goals/_Gustav_Waypoints*")).toBe(true);
  });

  it("gives every job its own destination", () => {
    expect(new Set(jobs.map((j) => j.dest)).size).toBe(jobs.length);
  });
});
