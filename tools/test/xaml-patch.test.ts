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

  it("inserts the layer below the fog layers when the template has them", () => {
    const fogTheme = theme.replace('                            <Grid x:Name="Shroud">', '                            <ItemsControl x:Name="ShroudedRooms"/>\r\n                            <Grid x:Name="Shroud">');
    const out = injectWorldMapLayer(fogTheme, snippet);
    expect(out.indexOf(layerMarker)).toBeLessThan(out.indexOf('x:Name="ShroudedRooms"'));
    expect(out.indexOf(layerMarker)).toBeGreaterThan(out.indexOf('x:Name="MapImage"'));
  });

  it("makes the fog layers transparent to the mouse so tooltips under them still work", () => {
    const fogTheme = theme.replace('                            <Grid x:Name="Shroud">', '                            <ItemsControl x:Name="ShroudedRooms"/>\r\n                            <Grid x:Name="Shroud">');
    const out = injectWorldMapLayer(fogTheme, snippet);
    expect(out).toContain('<ItemsControl x:Name="ShroudedRooms" IsHitTestVisible="False"/>');
    expect(out).toContain('<Grid x:Name="Shroud" IsHitTestVisible="False">');
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
      expect(out.indexOf(layerMarker)).toBeLessThan(out.indexOf('x:Name="ShroudedRooms"'));
      for (const name of ["ShroudedRooms", "SemiShroudedRooms", "Shroud"]) {
        expect(out).toMatch(new RegExp(`x:Name="${name}" IsHitTestVisible="False"`));
      }
    },
  );

});
