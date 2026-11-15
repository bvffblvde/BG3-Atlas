import { existsSync } from "node:fs";
import { XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { categoryRules } from "../categories.ts";
import { categoryIcons } from "../../mod/xaml/icons.ts";
import { layerXaml } from "../lib/layerxaml.ts";
import { patchTheme, unpackedPath, worldMapThemes } from "../lib/themes.ts";

const ids = categoryRules.map((r) => r.id);
const xaml = layerXaml();
const wrapped = `<Grid xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" xmlns:ls="clr-namespace:ls">${xaml}</Grid>`;

describe("categoryIcons", () => {
  it("has an icon for every category", () => {
    expect(Object.keys(categoryIcons).sort()).toEqual([...ids].sort());
  });

  it.each(ids)("%s glyph uses only path commands and numbers", (id) => {
    expect(categoryIcons[id].glyph).toMatch(/^[MLQAZmlqaz0-9.,\s-]+$/);
  });
});

describe("layerXaml", () => {
  it("is well formed", () => {
    expect(XMLValidator.validate(wrapped)).toBe(true);
  });

  it("has one named layer and two items controls per category", () => {
    expect(xaml.split('x:Name="BG3A_Layer"').length).toBe(2);
    for (const id of ids) {
      expect(xaml.split(`x:Name="BG3A_Cat_${id}"`).length).toBe(2);
      expect(xaml.split(`x:Name="BG3A_Found_${id}"`).length).toBe(2);
      expect(xaml).toContain(`ItemsSource="{Binding Cat_${id}}"`);
      expect(xaml).toContain(`ItemsSource="{Binding Found_${id}}"`);
    }
  });

  it("makes icons clickable with a tooltip, dims found ones, keeps the empty layer transparent to the mouse", () => {
    expect(xaml).not.toContain("Command=");
    expect(xaml.split('ToolTip="{Binding Label}"').length - 1).toBe(ids.length * 2);
    expect(xaml).toMatch(/x:Name="BG3A_Found_trap"[^>]*Opacity="0.45"/);
    expect(xaml).not.toMatch(/x:Name="BG3A_Layer"[^>]*IsHitTestVisible/);
  });

  it("draws search highlights on top without catching the mouse", () => {
    expect(xaml).toMatch(/x:Name="BG3A_Search" ItemsSource="\{Binding Search\}" IsHitTestVisible="False"/);
    expect(xaml.lastIndexOf('x:Name="BG3A_Search"')).toBeGreaterThan(xaml.lastIndexOf('x:Name="BG3A_Cat_'));
  });

  it("avoids constructs that crashed the game", () => {
    expect(xaml).not.toContain("DataTrigger");
    expect(xaml).not.toContain("{x:Null}");
    expect(xaml).not.toContain("AncestorType=ItemsControl");
  });

  it("keeps the projection on the whole layer", () => {
    expect(xaml).toContain("ProjectionMatrix");
    expect(xaml.split("ProjectionMatrix").length).toBe(2);
  });

  it.each(worldMapThemes.filter((t) => existsSync(unpackedPath(t))).map((t) => [t.file, t] as const))("patches %s", (_, theme) => {
    expect(patchTheme(theme).split('x:Name="BG3A_Layer"').length).toBe(2);
  });
});
