import { existsSync, readFileSync } from "node:fs";
import { patchTheme, unpackedPath, worldMapThemes } from "../lib/themes.ts";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "../lib/game.ts";
import { injectWorldMapLayer, layerMarker } from "../lib/xaml-patch.ts";

const theme = [
  '<ResourceDictionary xmlns:ls="clr-namespace:ls">',
  '    <Style TargetType="ls:LSWorldMap">',
  "        <Setter Property=\"Template\">",
  "            <Setter.Value>",
  '                <ControlTemplate TargetType="ls:LSWorldMap" >',
  '                    <Grid x:Name="Root">',
  '                        <Grid x:Name="MapHolder">',
  '                            <Image x:Name="MapImage"/>',
  '                            <Grid x:Name="Shroud">',
  '                                <Style TargetType="Grid">',
  "                                </Style>",
  "                            </Grid>",
  "                        </Grid>",
  "",
  '                        <Canvas x:Name="PART_Area"/>',
  "                    </Grid>",
  "                </ControlTemplate>",
  "            </Setter.Value>",
  "        </Setter>",
  "    </Style>",
  "</ResourceDictionary>",
].join("\r\n");

const snippet = '<ItemsControl x:Name="BG3A_Layer">\n</ItemsControl>\n';

describe("injectWorldMapLayer", () => {
  it("inserts the layer as the last child of MapHolder", () => {
    const lines = injectWorldMapLayer(theme, snippet).split("\r\n");
    const i = lines.findIndex((l) => l.includes(layerMarker));
    expect(lines[i - 1]).toContain("</Grid>");
    expect(lines[i - 2]).toContain("</Style>");
    expect(lines[i + 1]).toBe("</ItemsControl>");
    expect(lines[i + 2]).toBe("                        </Grid>");
    expect(lines[i + 4]).toContain("PART_Area");
  });

  it("refuses to inject twice", () => {
    expect(() => injectWorldMapLayer(injectWorldMapLayer(theme, snippet), snippet)).toThrow();
  });

  it("fails loudly when the template changes", () => {
    expect(() => injectWorldMapLayer(theme.replace("PART_Area", "Other"), snippet)).toThrow(/PART_Area/);
  });

  it.each(worldMapThemes.filter((t) => existsSync(unpackedPath(t))).map((t) => [t.file, t] as const))(
    "patches the real %s into well formed XML",
    (_, theme) => {
      const out = patchTheme(theme);
      expect(out.split(layerMarker).length).toBe(2);
    },
  );

  it("produces a well formed layer snippet", () => {
    const real = readFileSync(path.join(repoRoot, "mod", "xaml", "WorldMapLayer.xaml"), "utf8");
    const opens = (real.match(/<ItemsControl[\s>]/g) ?? []).length;
    const closes = (real.match(/<\/ItemsControl>/g) ?? []).length;
    expect(opens).toBe(closes);
    expect(real).toContain(layerMarker);
  });
});
