import { describe, expect, it } from "vitest";
import { addModule, hasModule, readModInfo } from "../lib/modsettings.ts";
import { parseLibraryFolders } from "../lib/game.ts";

const settings = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  "<save>",
  '    <region id="ModuleSettings">',
  '        <node id="root">',
  "            <children>",
  '                <node id="Mods">',
  "                    <children>",
  '                        <node id="ModuleShortDesc">',
  '                            <attribute id="Folder" type="LSString" value="GustavX"/>',
  '                            <attribute id="UUID" type="guid" value="cb555efe-2d9e-131f-8195-a89329d218ea"/>',
  "                        </node>",
  "                    </children>",
  "                </node>",
  "            </children>",
  "        </node>",
  "    </region>",
  "</save>",
].join("\r\n");

const meta = `<node id="Dependencies"/>
<node id="ModuleInfo">
  <attribute id="Folder" type="LSString" value="BG3Atlas"/>
  <attribute id="Name" type="LSString" value="BG3 Atlas"/>
  <attribute id="UUID" type="FixedString" value="09fefa51-cb5f-4d58-802e-fd6fb192e748"/>
  <attribute id="Version64" type="int64" value="36028797018963968"/>
  <children><node id="PublishVersion"><attribute id="Version64" type="int64" value="1"/></node></children>
</node>`;

describe("modsettings", () => {
  const mod = readModInfo(meta);

  it("reads module info from meta.lsx", () => {
    expect(mod).toEqual({
      folder: "BG3Atlas",
      name: "BG3 Atlas",
      uuid: "09fefa51-cb5f-4d58-802e-fd6fb192e748",
      version64: "36028797018963968",
    });
  });

  it("appends the module after existing ones with matching indent and line endings", () => {
    const out = addModule(settings, mod);
    expect(hasModule(out, mod.uuid)).toBe(true);
    const lines = out.split("\r\n");
    const idx = lines.findIndex((l) => l.includes(mod.uuid));
    expect(lines[idx]).toBe('                            <attribute id="UUID" type="guid" value="09fefa51-cb5f-4d58-802e-fd6fb192e748"/>');
    expect(lines[idx + 2]).toBe("                        </node>");
    expect(lines[idx + 3]).toBe("                    </children>");
    expect(out.indexOf("GustavX")).toBeLessThan(out.indexOf("BG3Atlas"));
    expect(out.includes("\n") && !/[^\r]\n/.test(out)).toBe(true);
  });

  it("is idempotent", () => {
    const once = addModule(settings, mod);
    expect(addModule(once, mod)).toBe(once);
  });

  it("escapes names", () => {
    const out = addModule(settings, { ...mod, name: "A & B's" });
    expect(out).toContain('value="A &amp; B&apos;s"');
  });
});

describe("parseLibraryFolders", () => {
  it("extracts and unescapes paths", () => {
    const vdf = String.raw`"libraryfolders"
{
	"0"
	{
		"path"		"C:\\Program Files (x86)\\Steam"
	}
	"1"
	{
		"path"		"E:\\steam  games"
	}
}`;
    expect(parseLibraryFolders(vdf)).toEqual([String.raw`C:\Program Files (x86)\Steam`, String.raw`E:\steam  games`]);
  });
});
