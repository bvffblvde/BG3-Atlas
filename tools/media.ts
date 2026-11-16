import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { categoryColors, categoryIcons, iconGlyph } from "../mod/xaml/icons.ts";
import type { CategoryId } from "./categories.ts";
import { repoRoot } from "./lib/game.ts";

const outDir = path.join(repoRoot, ".github", "assets");

export function argbToCss(argb: string): string {
  const h = argb.replace("#", "");
  if (h.length === 6) return `#${h}`;
  const a = parseInt(h.slice(0, 2), 16) / 255;
  const r = parseInt(h.slice(2, 4), 16);
  const g = parseInt(h.slice(4, 6), 16);
  const b = parseInt(h.slice(6, 8), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

export function iconSvg(id: CategoryId, size: number): string {
  const c = categoryColors[id];
  const i = categoryIcons[id];
  return `<svg width="${size}" height="${size}" viewBox="-1.2 -1.2 26.4 26.4"><circle cx="12" cy="12" r="11" fill="${argbToCss(c.disc)}" stroke="${argbToCss(c.rim)}" stroke-width="2.2"/><path d="${i.glyph}" fill="none" stroke="${argbToCss(iconGlyph)}" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
}

export function logoSvg(): string {
  const glyph = categoryIcons.waypoint.glyph;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-1.2 -1.2 26.4 26.4"><circle cx="12" cy="12" r="11" fill="#1A1208" stroke="#C9A45C" stroke-width="2.2"/><circle cx="12" cy="12" r="8.4" fill="none" stroke="#C9A45C" stroke-opacity="0.45" stroke-width="0.6"/><path d="${glyph}" fill="none" stroke="#F2DDA0" stroke-width="1.5" stroke-linejoin="round"/></svg>
`;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function contours(w: number, h: number, step: number, levels: number[], seed: number): string {
  const rand = rng(seed);
  const hills = Array.from({ length: 9 }, () => ({ x: rand() * w, y: rand() * h, r: 160 + rand() * 340, a: 0.6 + rand() * 0.9 }));
  const f = (x: number, y: number) => {
    let v = 0.18 * Math.sin(x / 97 + y / 151) + 0.12 * Math.sin(y / 63 - x / 211);
    for (const p of hills) {
      const d2 = (x - p.x) ** 2 + (y - p.y) ** 2;
      v += p.a * Math.exp(-d2 / (2 * p.r * p.r));
    }
    return v;
  };
  const cols = Math.ceil(w / step) + 1;
  const rows = Math.ceil(h / step) + 1;
  const grid: number[][] = [];
  for (let j = 0; j < rows; j++) {
    grid.push([]);
    for (let i = 0; i < cols; i++) grid[j].push(f(i * step, j * step));
  }
  const segs: string[] = [];
  for (const lv of levels) {
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const x = i * step;
        const y = j * step;
        const v = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
        const corners = [
          [x, y],
          [x + step, y],
          [x + step, y + step],
          [x, y + step],
        ];
        const pts: number[][] = [];
        for (let e = 0; e < 4; e++) {
          const a = v[e];
          const b = v[(e + 1) % 4];
          if ((a < lv) !== (b < lv)) {
            const t = (lv - a) / (b - a);
            const [x1, y1] = corners[e];
            const [x2, y2] = corners[(e + 1) % 4];
            pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
          }
        }
        if (pts.length >= 2) segs.push(`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}L${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`);
        if (pts.length === 4) segs.push(`M${pts[2][0].toFixed(1)},${pts[2][1].toFixed(1)}L${pts[3][0].toFixed(1)},${pts[3][1].toFixed(1)}`);
      }
    }
  }
  return segs.join("");
}

const fonts = `font-family: "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;`;

const base = `
  html, body { margin: 0; padding: 0; }
  body { width: 1920px; height: 1080px; overflow: hidden; background: #1b130b; color: #f2dda0; ${fonts} }
  .ground { position: absolute; inset: 0; background: radial-gradient(ellipse 70% 80% at 66% 48%, #33251a 0%, #22180f 55%, #120c06 100%); }
  .topo { position: absolute; inset: 0; }
  .vignette { position: absolute; inset: 0; box-shadow: inset 0 0 240px 60px rgba(0,0,0,0.75); pointer-events: none; }
`;

interface Placed {
  id: CategoryId;
  x: number;
  y: number;
  size: number;
  found?: boolean;
}

export function coverHtml(): string {
  const topo = contours(1920, 1080, 8, [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2], 7);
  const placed: Placed[] = [
    { id: "chest", x: 1012, y: 214, size: 54 },
    { id: "waypoint", x: 1196, y: 132, size: 54 },
    { id: "book", x: 1384, y: 248, size: 54, found: true },
    { id: "key", x: 1564, y: 176, size: 54 },
    { id: "trap", x: 1712, y: 322, size: 54 },
    { id: "hidden_stash", x: 1250, y: 420, size: 72 },
    { id: "trader", x: 1068, y: 566, size: 54 },
    { id: "lever", x: 1530, y: 540, size: 54 },
    { id: "valuable", x: 1650, y: 590, size: 54, found: true },
    { id: "weapon_unique", x: 1326, y: 676, size: 54 },
    { id: "boss", x: 1554, y: 790, size: 54 },
    { id: "scroll", x: 1146, y: 800, size: 54, found: true },
    { id: "locked_door", x: 1754, y: 918, size: 54 },
    { id: "armor_unique", x: 1380, y: 934, size: 54 },
    { id: "accessory", x: 960, y: 940, size: 54 },
    { id: "quest_npc", x: 1802, y: 120, size: 54 },
    { id: "animal", x: 912, y: 392, size: 54, found: true },
    { id: "ingredient", x: 1830, y: 726, size: 54 },
  ];
  const icons = placed
    .map((p) => `<div class="pin${p.found ? " found" : ""}" style="left:${p.x - p.size / 2}px;top:${p.y - p.size / 2}px">${iconSvg(p.id, p.size)}</div>`)
    .join("");
  const hover = placed.find((p) => p.id === "hidden_stash")!;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${base}
  .pin { position: absolute; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7)); }
  .pin.found { opacity: 0.38; }
  .ring { position: absolute; border-radius: 50%; }
  .tip { position: absolute; padding: 12px 20px 13px; background: rgba(18,12,6,0.94); border: 1px solid #8a6d3b; border-radius: 3px; font-size: 26px; color: #f2dda0; white-space: nowrap; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
  .tip small { display: block; font-size: 17px; color: #b89a64; font-style: italic; margin-top: 3px; }
  .fade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(14,9,4,0.96) 0%, rgba(14,9,4,0.88) 34%, rgba(14,9,4,0.0) 58%); }
  .title { position: absolute; left: 150px; top: 330px; width: 760px; }
  .title h1 { margin: 0; font-weight: normal; font-size: 168px; line-height: 0.92; letter-spacing: -2px; color: #f4e2ac; text-shadow: 0 4px 30px rgba(0,0,0,0.8); }
  .title h1 span { display: block; font-size: 64px; letter-spacing: 1px; color: #c9a45c; margin-bottom: 18px; }
  .rule { width: 120px; height: 2px; background: #c9a45c; margin: 40px 0 34px; }
  .title p { margin: 0; font-size: 34px; line-height: 1.38; color: #dcc896; font-style: italic; max-width: 640px; }
  </style></head><body>
  <div class="ground"></div>
  <svg class="topo" width="1920" height="1080"><path d="${topo}" fill="none" stroke="#8a6a40" stroke-opacity="0.4" stroke-width="1.3"/></svg>
  ${icons}
  <div class="ring" style="left:${hover.x - 54}px;top:${hover.y - 54}px;width:104px;height:104px;border:4px solid #fff1c4"></div>
  <div class="ring" style="left:${hover.x - 68}px;top:${hover.y - 68}px;width:132px;height:132px;border:2.5px solid rgba(255,241,196,0.6)"></div>
  <div class="tip" style="left:${hover.x + 80}px;top:${hover.y - 40}px">Hidden stash</div>
  <div class="fade"></div>
  <div class="vignette"></div>
  <div class="title">
    <h1><span>BG3</span>Atlas</h1>
    <div class="rule"></div>
    <p>Every chest, stash, trap and trader, marked on your in-game map.</p>
  </div>
  </body></html>`;
}

const groups: { title: string; ids: CategoryId[] }[] = [
  { title: "Loot", ids: ["chest", "container", "remains", "weapon_unique", "armor_unique", "accessory", "scroll", "book", "key", "ingredient", "valuable"] },
  { title: "World", ids: ["trap", "hidden_stash", "lever", "locked_door", "waypoint"] },
  { title: "Characters", ids: ["trader", "quest_npc", "boss", "animal"] },
];

export const names: Record<CategoryId, { en: string; ru: string }> = {
  chest: { en: "Chests", ru: "Сундуки" },
  container: { en: "Barrels and crates", ru: "Бочки и ящики" },
  remains: { en: "Remains", ru: "Останки" },
  weapon_unique: { en: "Unique weapons", ru: "Уникальное оружие" },
  armor_unique: { en: "Unique armour", ru: "Уникальная броня" },
  accessory: { en: "Accessories", ru: "Аксессуары" },
  scroll: { en: "Scrolls", ru: "Свитки" },
  book: { en: "Books and notes", ru: "Книги и записки" },
  key: { en: "Keys", ru: "Ключи" },
  ingredient: { en: "Ingredients", ru: "Ингредиенты" },
  valuable: { en: "Valuables", ru: "Ценности" },
  trap: { en: "Traps", ru: "Ловушки" },
  hidden_stash: { en: "Hidden stashes", ru: "Тайники" },
  lever: { en: "Levers and buttons", ru: "Рычаги и кнопки" },
  locked_door: { en: "Locked doors", ru: "Запертые двери" },
  waypoint: { en: "Waypoints", ru: "Рунные круги" },
  trader: { en: "Traders", ru: "Торговцы" },
  quest_npc: { en: "Quest characters", ru: "Персонажи" },
  boss: { en: "Bosses", ru: "Боссы" },
  animal: { en: "Talking animals", ru: "Животные" },
};

export function legendHtml(): string {
  const topo = contours(1920, 1080, 8, [0.3, 0.6, 0.9, 1.2], 21);
  const cols = groups
    .map(
      (g) =>
        `<section><h2>${g.title}</h2>${g.ids
          .map((id) => `<div class="row">${iconSvg(id, 60)}<div><b>${names[id].en}</b><i>${names[id].ru}</i></div></div>`)
          .join("")}</section>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${base}
  .wrap { position: absolute; left: 150px; right: 150px; top: 170px; }
  h1 { margin: 0 0 56px; font-weight: normal; font-size: 64px; color: #f4e2ac; }
  h1 em { font-size: 34px; color: #b89a64; margin-left: 24px; }
  .cols { display: grid; grid-template-columns: 1.6fr 1fr 0.9fr; column-gap: 72px; }
  section:first-child { display: grid; grid-template-columns: 1fr 1fr; column-gap: 40px; align-content: start; }
  section:first-child h2 { grid-column: 1 / -1; }
  h2 { margin: 0 0 22px; font-weight: normal; font-size: 32px; color: #c9a45c; border-bottom: 1px solid rgba(201,164,92,0.4); padding-bottom: 10px; }
  .row { display: flex; align-items: center; gap: 20px; height: 84px; }
  .row svg { flex: none; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.6)); }
  .row b { display: block; font-weight: normal; font-size: 26px; color: #f2dda0; }
  .row i { display: block; font-size: 19px; color: #a88c5c; margin-top: 2px; }
  </style></head><body>
  <div class="ground"></div>
  <svg class="topo" width="1920" height="1080"><path d="${topo}" fill="none" stroke="#8a6a40" stroke-opacity="0.16" stroke-width="1.3"/></svg>
  <div class="vignette"></div>
  <div class="wrap"><h1>Twenty categories<em>turn each on or off on the map</em></h1><div class="cols">${cols}</div></div>
  </body></html>`;
}

function findEdge(): string {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error("Edge or Chrome not found");
  return found;
}

export function coverShotHtml(background: string, layout: "left" | "right" = "left"): string {
  const right = layout === "right";
  const fade = right
    ? "linear-gradient(0deg, rgba(14,9,4,0.92) 0%, rgba(14,9,4,0.55) 26%, rgba(14,9,4,0) 46%), linear-gradient(270deg, rgba(14,9,4,0.75) 0%, rgba(14,9,4,0) 40%)"
    : "linear-gradient(90deg, rgba(14,9,4,0.97) 0%, rgba(14,9,4,0.9) 30%, rgba(14,9,4,0.35) 52%, rgba(14,9,4,0) 70%)";
  const place = right ? "right: 130px; bottom: 90px; text-align: right;" : "left: 150px; top: 330px;";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${base}
  .shot { position: absolute; inset: 0; background: url("${background}") center / cover no-repeat; }
  .fade { position: absolute; inset: 0; background: ${fade}; }
  .title { position: absolute; ${place} width: 760px; }
  .title .rule { margin-left: ${right ? "auto" : "0"}; }
  .title p { margin-left: ${right ? "auto" : "0"} !important; }
  .title h1 { margin: 0; font-weight: normal; font-size: 168px; line-height: 0.92; letter-spacing: -2px; color: #f4e2ac; text-shadow: 0 4px 30px rgba(0,0,0,0.8); }
  .title h1 span { display: block; font-size: 64px; letter-spacing: 1px; color: #c9a45c; margin-bottom: 18px; }
  .rule { width: 120px; height: 2px; background: #c9a45c; margin: 40px 0 34px; }
  .title p { margin: 0; font-size: 34px; line-height: 1.38; color: #dcc896; font-style: italic; max-width: 600px; }
  </style></head><body>
  <div class="shot"></div>
  <div class="fade"></div>
  <div class="vignette"></div>
  <div class="title">
    <h1><span>BG3</span>Atlas</h1>
    <div class="rule"></div>
    <p>Every chest, stash, trap and trader, marked on your in-game map.</p>
  </div>
  </body></html>`;
}

function render(name: string, html: string, dir = outDir): void {
  const htmlPath = path.join(dir, `${name}.html`);
  const pngPath = path.join(dir, `${name}.png`);
  writeFileSync(htmlPath, html);
  execFileSync(findEdge(), [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1920,1080",
    `--screenshot=${pngPath}`,
    pathToFileURL(htmlPath).href,
  ]);
  console.log(`wrote ${pngPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const shot = process.argv.indexOf("--shot");
  if (shot > 0) {
    const bg = path.resolve(process.argv[shot + 1]);
    const layout = process.argv.includes("--right") ? "right" : "left";
    render("cover-shot", coverShotHtml(pathToFileURL(bg).href, layout), path.dirname(bg));
    process.exit(0);
  }
  mkdirSync(outDir, { recursive: true });
  render("cover", coverHtml());
  render("legend", legendHtml());
  writeFileSync(path.join(outDir, "logo.svg"), logoSvg());
  console.log("wrote logo.svg");
}
