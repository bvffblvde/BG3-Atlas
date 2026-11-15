export interface ModInfo {
  folder: string;
  name: string;
  uuid: string;
  version64: string;
}

function attr(xml: string, id: string): string {
  const m = xml.match(new RegExp(`<attribute id="${id}" type="[^"]+" value="([^"]*)"`));
  if (!m) throw new Error(`attribute ${id} not found`);
  return m[1];
}

export function readModInfo(metaXml: string): ModInfo {
  const info = metaXml.slice(metaXml.indexOf('<node id="ModuleInfo">'));
  return {
    folder: attr(info, "Folder"),
    name: attr(info, "Name"),
    uuid: attr(info, "UUID"),
    version64: attr(info, "Version64"),
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;");
}

export function moduleShortDesc(mod: ModInfo, indent: string): string {
  const a = indent + "    ";
  return [
    `${indent}<node id="ModuleShortDesc">`,
    `${a}<attribute id="Folder" type="LSString" value="${escapeXml(mod.folder)}"/>`,
    `${a}<attribute id="MD5" type="LSString" value=""/>`,
    `${a}<attribute id="Name" type="LSString" value="${escapeXml(mod.name)}"/>`,
    `${a}<attribute id="PublishHandle" type="uint64" value="0"/>`,
    `${a}<attribute id="UUID" type="guid" value="${mod.uuid}"/>`,
    `${a}<attribute id="Version64" type="int64" value="${mod.version64}"/>`,
    `${indent}</node>`,
  ].join("\n");
}

export function hasModule(settingsXml: string, uuid: string): boolean {
  return new RegExp(`id="UUID" type="[^"]+" value="${uuid}"`, "i").test(settingsXml);
}

export function addModule(settingsXml: string, mod: ModInfo): string {
  if (hasModule(settingsXml, mod.uuid)) return settingsXml;
  const start = settingsXml.indexOf('<node id="Mods">');
  if (start < 0) throw new Error('node "Mods" not found');
  const childrenOpen = settingsXml.indexOf("<children>", start);
  if (childrenOpen < 0) throw new Error('node "Mods" has no children');
  let depth = 0;
  const re = /<children>|<\/children>/g;
  re.lastIndex = childrenOpen;
  let close = -1;
  for (let m = re.exec(settingsXml); m; m = re.exec(settingsXml)) {
    depth += m[0] === "<children>" ? 1 : -1;
    if (depth === 0) {
      close = m.index;
      break;
    }
  }
  if (close < 0) throw new Error('unterminated "Mods" children');
  const lineStart = settingsXml.lastIndexOf("\n", close) + 1;
  const closeIndent = settingsXml.slice(lineStart, close);
  const eol = settingsXml.includes("\r\n") ? "\r\n" : "\n";
  const block = moduleShortDesc(mod, closeIndent + "    ").replace(/\n/g, eol);
  return settingsXml.slice(0, lineStart) + block + eol + settingsXml.slice(lineStart);
}
