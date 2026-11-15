const entities: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

function decode(s: string): string {
  return s.replace(/&(lt|gt|amp|quot|apos);/g, (_, e: string) => entities[e]);
}

export function parseLoca(xml: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /<content contentuid="([^"]+)"[^>]*?(?:\/>|>([\s\S]*?)<\/content>)/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) out.set(m[1], decode(m[2] ?? ""));
  return out;
}

export class Loca {
  constructor(
    private readonly en: Map<string, string>,
    private readonly ru: Map<string, string>,
  ) {}

  text(handle: string | undefined, lang: "en" | "ru"): string | undefined {
    if (!handle) return undefined;
    if (lang === "ru") {
      const r = this.ru.get(handle);
      if (r) return r;
    }
    const e = this.en.get(handle);
    return e ? e : undefined;
  }
}
