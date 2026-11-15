import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";

export interface LsxAttr {
  type: string;
  value: string;
  handle?: string;
}

export interface LsxNode {
  id: string;
  attrs: Record<string, LsxAttr>;
  children: LsxNode[];
}

interface RawNode {
  "@_id"?: string;
  attribute?: Record<string, string>[];
  children?: { node?: RawNode[] }[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name) => name === "region" || name === "node" || name === "attribute" || name === "children",
});

function convert(raw: RawNode): LsxNode {
  const attrs: Record<string, LsxAttr> = {};
  for (const a of raw.attribute ?? []) {
    const id = a["@_id"];
    if (!id) continue;
    attrs[id] = { type: a["@_type"] ?? "", value: a["@_value"] ?? "", ...(a["@_handle"] !== undefined ? { handle: a["@_handle"] } : {}) };
  }
  const children: LsxNode[] = [];
  for (const c of raw.children ?? []) {
    for (const n of c.node ?? []) children.push(convert(n));
  }
  return { id: raw["@_id"] ?? "", attrs, children };
}

export function parseLsx(xml: string): LsxNode[] {
  const doc = parser.parse(xml) as { save?: { region?: { node?: RawNode[] }[] } };
  const roots: LsxNode[] = [];
  for (const region of doc.save?.region ?? []) {
    for (const n of region.node ?? []) roots.push(convert(n));
  }
  return roots;
}

export function readLsxFile(file: string): LsxNode[] {
  return parseLsx(readFileSync(file, "utf8"));
}

export function findAll(nodes: LsxNode[], id: string): LsxNode[] {
  const out: LsxNode[] = [];
  const stack = [...nodes].reverse();
  while (stack.length) {
    const n = stack.pop()!;
    if (n.id === id) out.push(n);
    for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
  }
  return out;
}

export function child(node: LsxNode, id: string): LsxNode | undefined {
  return node.children.find((c) => c.id === id);
}

export function attr(node: LsxNode, id: string): string | undefined {
  const a = node.attrs[id];
  if (!a) return undefined;
  return a.handle ?? a.value;
}
