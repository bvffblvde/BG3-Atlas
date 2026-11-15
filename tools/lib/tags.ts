import { attr, findAll, type LsxNode } from "./lsx.ts";

export function loadTagNames(files: LsxNode[][]): Map<string, string> {
  const out = new Map<string, string>();
  for (const roots of files) {
    for (const node of findAll(roots, "Tags")) {
      const id = attr(node, "UUID");
      const name = attr(node, "Name");
      if (id && name) out.set(id, name);
    }
  }
  return out;
}
