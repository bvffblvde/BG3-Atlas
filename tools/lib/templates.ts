import { attr, child, findAll, type LsxNode } from "./lsx.ts";

export interface Template {
  id: string;
  name: string;
  parent?: string;
  type: string;
  attrs: Record<string, string>;
  tags: string[];
  hasTradeTreasures: boolean;
  inventory: string[];
}

export interface ResolvedTemplate {
  id: string;
  names: string[];
  type: string;
  attrs: Record<string, string>;
  tags: string[];
  hasTradeTreasures: boolean;
  inventory: string[];
}

const traderTableRe = /Trade|Vendor/i;

export function isTraderTable(table: string): boolean {
  return traderTableRe.test(table);
}

export function treasureTables(node: LsxNode, listId: string, itemId: string): string[] {
  const list = child(node, listId);
  if (!list) return [];
  return findAll(list.children, itemId)
    .map((i) => attr(i, "Object"))
    .filter((v): v is string => !!v && v !== "Empty");
}

export function nodeTags(node: LsxNode): string[] {
  const tags = child(node, "Tags");
  if (!tags) return [];
  return findAll(tags.children, "Tag")
    .map((t) => attr(t, "Object"))
    .filter((t): t is string => !!t);
}

export function nodeAttrs(node: LsxNode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(node.attrs)) out[key] = attr(node, key) ?? "";
  return out;
}

function toTemplate(node: LsxNode): Template | undefined {
  const id = attr(node, "MapKey");
  if (!id) return undefined;
  const parent = attr(node, "ParentTemplateId");
  return {
    id,
    name: attr(node, "Name") ?? "",
    ...(parent ? { parent } : {}),
    type: attr(node, "Type") ?? "",
    attrs: nodeAttrs(node),
    tags: nodeTags(node),
    hasTradeTreasures: treasureTables(node, "TradeTreasures", "TreasureItem").some(isTraderTable),
    inventory: treasureTables(node, "InventoryList", "InventoryItem"),
  };
}

export class TemplateIndex {
  private readonly byId = new Map<string, Template>();
  private readonly cache = new Map<string, ResolvedTemplate>();

  constructor(files: LsxNode[][]) {
    for (const roots of files) {
      for (const node of findAll(roots, "GameObjects")) {
        const t = toTemplate(node);
        if (t) this.byId.set(t.id, t);
      }
    }
  }

  get(id: string): Template | undefined {
    return this.byId.get(id);
  }

  all(): IterableIterator<Template> {
    return this.byId.values();
  }

  chain(id: string): Template[] {
    const out: Template[] = [];
    const seen = new Set<string>();
    let cur = this.byId.get(id);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      out.push(cur);
      cur = cur.parent ? this.byId.get(cur.parent) : undefined;
    }
    return out;
  }

  resolved(id: string): ResolvedTemplate {
    const hit = this.cache.get(id);
    if (hit) return hit;
    const chain = this.chain(id);
    const attrs: Record<string, string> = {};
    const tags = new Set<string>();
    const inventory = new Set<string>();
    let type = "";
    let trade = false;
    for (const t of chain) {
      for (const [k, v] of Object.entries(t.attrs)) {
        if (v !== "" && attrs[k] === undefined) attrs[k] = v;
      }
      for (const tag of t.tags) tags.add(tag);
      for (const inv of t.inventory) inventory.add(inv);
      if (!type && t.type) type = t.type;
      trade ||= t.hasTradeTreasures;
    }
    const result = { id, names: chain.map((t) => t.name), type, attrs, tags: [...tags], hasTradeTreasures: trade, inventory: [...inventory] };
    this.cache.set(id, result);
    return result;
  }
}

export function subLevelIndex(index: TemplateIndex): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of index.all()) {
    const s = t.attrs.SubLevelName;
    if (s) out.set(t.id, s);
  }
  return out;
}
