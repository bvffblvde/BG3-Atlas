import { describe, expect, it } from "vitest";
import { attr, child, findAll, parseLsx } from "../lib/lsx.ts";

const xml = `<?xml version="1.0" encoding="utf-8"?>
<save>
	<version major="4" />
	<region id="Templates">
		<node id="Templates">
			<children>
				<node id="GameObjects">
					<attribute id="MapKey" type="FixedString" value="aaa" />
					<attribute id="DisplayName" type="TranslatedString" handle="h123" version="1" />
					<children>
						<node id="Tags">
							<children>
								<node id="Tag">
									<attribute id="Object" type="guid" value="tag-1" />
								</node>
							</children>
						</node>
						<node id="Transform">
							<attribute id="Position" type="fvec3" value="1 2 3" />
						</node>
					</children>
				</node>
				<node id="GameObjects">
					<attribute id="MapKey" type="FixedString" value="bbb" />
				</node>
			</children>
		</node>
	</region>
</save>`;

describe("parseLsx", () => {
  const roots = parseLsx(xml);
  const objects = findAll(roots, "GameObjects");

  it("finds all game objects", () => {
    expect(objects.length).toBe(2);
    expect(attr(objects[1], "MapKey")).toBe("bbb");
  });

  it("returns the handle for translated strings", () => {
    expect(attr(objects[0], "DisplayName")).toBe("h123");
  });

  it("reads child nodes and their attributes", () => {
    expect(attr(child(objects[0], "Transform")!, "Position")).toBe("1 2 3");
    expect(child(objects[1], "Transform")).toBeUndefined();
  });

  it("finds nested tag objects", () => {
    expect(findAll([objects[0]], "Tag").map((t) => attr(t, "Object"))).toEqual(["tag-1"]);
  });

  it("keeps attribute types", () => {
    expect(objects[0].attrs.Position).toBeUndefined();
    expect(objects[0].attrs.MapKey.type).toBe("FixedString");
  });
});
