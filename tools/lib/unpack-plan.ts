export interface UnpackJob {
  pak: string;
  pattern: string;
  dest: string;
  loca?: "english" | "russian";
}

export function isBaseLoca(file: string, lang: string): boolean {
  const parts = file.split(/[\\/]/);
  const name = parts[parts.length - 1].toLowerCase();
  const folder = (parts[parts.length - 2] ?? "").toLowerCase();
  return name === `${lang}.loca` && folder === lang;
}

const dataPaks = ["Shared.pak", "Gustav.pak", "GustavX.pak"];
const dataPatterns: [string, string][] = [
  ["*RootTemplates/*", "templates"],
  ["*/Stats/Generated/Data/*", "stats"],
  ["*/Tags/*", "tags"],
];

export function unpackJobs(): UnpackJob[] {
  const jobs: UnpackJob[] = [
    { pak: "Gustav.pak", pattern: "Mods/Gustav/Levels/WLD_*", dest: "gustav-levels" },
    { pak: "Gustav.pak", pattern: "Mods/GustavDev/Levels/WLD_*", dest: "gustavdev-levels" },
  ];
  for (const pak of dataPaks) {
    for (const [pattern, kind] of dataPatterns) {
      jobs.push({ pak, pattern, dest: `${pak.replace(".pak", "").toLowerCase()}-${kind}` });
    }
  }
  jobs.push({ pak: "Localization/English.pak", pattern: "*", dest: "loca-english", loca: "english" });
  jobs.push({ pak: "Localization/Russian/Russian.pak", pattern: "*", dest: "loca-russian", loca: "russian" });
  return jobs;
}
