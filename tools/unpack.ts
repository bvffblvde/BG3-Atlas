import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { divine, findGameDir, repoRoot } from "./lib/game.ts";
import { isBaseLoca, unpackJobs, type UnpackJob } from "./lib/unpack-plan.ts";

const force = process.argv.includes("--force");
const base = path.join(repoRoot, "work", "unpacked");
const rawRoot = path.join(base, "raw");
const lsxRoot = path.join(base, "lsx");
const locaRoot = path.join(base, "loca");
const dataDir = path.join(findGameDir(), "Data");

function files(dir: string): string[] {
  return (readdirSync(dir, { recursive: true, withFileTypes: true }) as import("node:fs").Dirent[])
    .filter((d) => d.isFile())
    .map((d) => path.join(d.parentPath, d.name));
}

function extract(job: UnpackJob, raw: string): void {
  rmSync(raw, { recursive: true, force: true });
  mkdirSync(raw, { recursive: true });
  const args = ["-a", "extract-package", "-s", path.join(dataDir, job.pak), "-d", raw];
  if (job.pattern !== "*") args.push("-x", job.pattern);
  divine(args);
}

function convertData(raw: string): void {
  divine(["-a", "convert-resources", "-s", raw, "-d", lsxRoot, "-i", "lsf", "-o", "lsx"]);
  for (const file of files(raw)) {
    if (!/\.(txt|lsx)$/i.test(file)) continue;
    const target = path.join(lsxRoot, path.relative(raw, file));
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(file, target);
  }
}

function convertLoca(raw: string, lang: string): void {
  const tmp = path.join(base, "loca-tmp", lang);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const entries: string[] = [];
  for (const file of files(raw).filter((f) => isBaseLoca(f, lang))) {
    const xml = path.join(tmp, `${path.basename(file)}.xml`);
    divine(["-a", "convert-loca", "-s", file, "-d", xml]);
    for (const line of readFileSync(xml, "utf8").split(/\r?\n/)) {
      if (line.trimStart().startsWith("<content ")) entries.push(line.trim());
    }
  }
  mkdirSync(locaRoot, { recursive: true });
  writeFileSync(path.join(locaRoot, `${lang}.xml`), `<?xml version="1.0" encoding="utf-8"?>\n<contentList>\n${entries.join("\n")}\n</contentList>\n`);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`  ${lang}: ${entries.length} strings`);
}

for (const job of unpackJobs()) {
  const raw = path.join(rawRoot, job.dest);
  if (existsSync(raw) && !force) {
    console.log(`skip ${job.pak} ${job.pattern}`);
    continue;
  }
  console.log(`extract ${job.pak} ${job.pattern}`);
  extract(job, raw);
  if (job.loca) convertLoca(raw, job.loca);
  else convertData(raw);
}
console.log(`done: ${lsxRoot}`);
