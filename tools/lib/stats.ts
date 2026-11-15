export interface StatEntry {
  name: string;
  type: string;
  data: Record<string, string>;
}

export function parseStats(text: string): StatEntry[] {
  const out: StatEntry[] = [];
  let cur: StatEntry | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    let m = line.match(/^new entry "([^"]*)"/);
    if (m) {
      cur = { name: m[1], type: "", data: {} };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    if ((m = line.match(/^type "([^"]*)"/))) cur.type = m[1];
    else if ((m = line.match(/^using "([^"]*)"/))) cur.data.__using = m[1];
    else if ((m = line.match(/^data "([^"]*)" "([^"]*)"/))) cur.data[m[1]] = m[2];
  }
  return out;
}

export class StatsIndex {
  private readonly raw = new Map<string, StatEntry>();
  private readonly cache = new Map<string, StatEntry>();

  constructor(entries: StatEntry[]) {
    for (const e of entries) this.raw.set(e.name, e);
  }

  get(name: string): StatEntry | undefined {
    const hit = this.cache.get(name);
    if (hit) return hit;
    const first = this.raw.get(name);
    if (!first) return undefined;
    const data: Record<string, string> = {};
    let type = "";
    const seen = new Set<string>();
    let cur: StatEntry | undefined = first;
    while (cur && !seen.has(cur.name)) {
      seen.add(cur.name);
      for (const [k, v] of Object.entries(cur.data)) {
        if (k !== "__using" && data[k] === undefined) data[k] = v;
      }
      if (!type && cur.type) type = cur.type;
      const parent: string | undefined = cur.data.__using;
      cur = parent ? this.raw.get(parent) : undefined;
    }
    const result = { name, type, data };
    this.cache.set(name, result);
    return result;
  }
}
