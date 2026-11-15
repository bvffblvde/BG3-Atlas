import { describe, expect, it } from "vitest";
import { parseLsx } from "../lib/lsx.ts";
import { loadTagNames } from "../lib/tags.ts";

describe("loadTagNames", () => {
  it("maps tag guid to name and ignores nodes without a name", () => {
    const a = parseLsx(`<save><region id="Tags"><node id="Tags">
<attribute id="Name" type="FixedString" value="ANIMAL" />
<attribute id="UUID" type="guid" value="g1" />
</node></region></save>`);
    const b = parseLsx(`<save><region id="Tags"><node id="Tags">
<attribute id="UUID" type="guid" value="g2" />
</node></region></save>`);
    const names = loadTagNames([a, b]);
    expect(names.get("g1")).toBe("ANIMAL");
    expect(names.has("g2")).toBe(false);
  });
});
