import { existsSync, readFileSync } from "node:fs";
import { XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { categoryRules } from "../categories.ts";
import { padHintBar, panelXaml } from "../lib/panelxaml.ts";
import { injectBefore } from "../lib/xaml-patch.ts";
import { journalPages, patchJournal, unpackedPath } from "../lib/themes.ts";

const ids = categoryRules.map((r) => r.id);
const xaml = panelXaml();
const wrapped = `<Grid xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">${xaml}</Grid>`;

describe("panelXaml", () => {
  it("is well formed", () => {
    expect(XMLValidator.validate(wrapped)).toBe(true);
  });

  it("has one named panel and a toggle button per category", () => {
    expect(xaml.split('x:Name="BG3A_Panel"').length).toBe(2);
    for (const id of ids) {
      expect(xaml).toContain(`CommandParameter="${id}"`);
      expect(xaml).toContain(`{Binding Alpha_${id}}`);
      expect(xaml).toContain(`{Binding Label_${id}}`);
      expect(xaml).toContain(`{Binding Count_${id}}`);
    }
    expect(xaml).toContain("{Binding ShowAll}");
    expect(xaml).toContain("{Binding HideAll}");
    expect(xaml).toContain("{Binding ToggleFound}");
    expect(xaml).toContain('<ls:LSTextBox x:Name="BG3A_SearchBox" Text="{Binding Query, Mode=TwoWay}" TextImmediateSourceUpdate="True"');
    expect(xaml).not.toContain("<TextBox");
    expect(xaml).toContain('Style="{StaticResource DefaultInputBox}"');
    expect(xaml).toContain('x:Name="BG3A_SearchInfo"');
    expect(xaml).toContain("{Binding FoundText}");
    expect(xaml).toContain("{Binding ToggleFog}");
    expect(xaml).toContain("{Binding FogText}");
  });

  it("puts the search box in the title row so the panel stays above the legend", () => {
    const title = xaml.indexOf("{Binding Title}");
    const search = xaml.indexOf('x:Name="BG3A_SearchBox"');
    const showAll = xaml.indexOf("{Binding ShowAll}");
    expect(title).toBeLessThan(search);
    expect(search).toBeLessThan(showAll);
    expect(xaml).toContain('Grid.Row="1" Margin="60,170,0,0"');
  });

  it("avoids constructs that crashed the game", () => {
    expect(xaml).not.toContain("DataTrigger");
    expect(xaml).not.toContain("{x:Null}");
    expect(xaml).not.toContain("AncestorType=ItemsControl");
    expect(xaml).not.toContain("ElementName");
  });
});

describe("panelXaml pad mode", () => {
  const padXaml = panelXaml("pad");
  const bar = padHintBar();

  it("is well formed", () => {
    expect(XMLValidator.validate(`<Grid xmlns:x="x" xmlns:ls="ls">${padXaml}${bar}</Grid>`)).toBe(true);
  });

  it("shows the panel only while the pad toggle is on and has no text box", () => {
    expect(padXaml).toContain('Visibility="{Binding IsChecked, ElementName=BG3A_PadBtn, Converter={StaticResource BoolToVisibleConverter}}"');
    expect(padXaml).not.toContain("<TextBox");
    expect(padXaml).toContain("{Binding PadHint}");
    expect(padXaml).toContain('x:Name="BG3A_CursorInfo"');
    for (const id of ids) expect(padXaml).toContain(`{Binding Sel_${id}}`);
  });

  it("binds the toggle to UIFilter and moves the selection with left, right and accept", () => {
    expect(bar).toContain('x:Name="BG3A_PadBtn" ls:LSToggleButton.BoundEvent="UIFilter"');
    for (const [event, command] of [["UILeft", "PadPrev"], ["UIRight", "PadNext"], ["UIUp", "PadUp"], ["UIDown", "PadDown"]]) {
      expect(bar).toContain(`BoundEvent="${event}" Command="{Binding DataContext.${command}, ElementName=BG3A_Panel}"`);
    }
  });

  it("sits below the zone name on the pad page", () => {
    expect(padXaml).toContain('Margin="60,230,0,0"');
  });

  it("shows the accept glyph as the localized toggle hint and never binds Y events", () => {
    const toggles = bar.split("\n").filter((l) => l.includes("DataContext.PadToggle"));
    expect(toggles).toHaveLength(1);
    expect(toggles[0]).toContain('ls:LSButton.BoundEvent="UIAccept"');
    expect(toggles[0]).toContain("ConverterParameter=UIAccept");
    expect(toggles[0]).toContain('Tag="{Binding DataContext.ToggleMarkText, ElementName=BG3A_Panel}"');
    expect(bar).not.toContain("UITakeAll");
    expect(bar).not.toContain("Вкл/выкл");
    expect(bar).toMatch(/ls:LSButton[^>]*Visibility="\{Binding IsChecked, ElementName=BG3A_PadBtn, Converter=\{StaticResource BoolToVisibleConverter\}\}"/);
  });

  it("adds one found button for the point under the cursor while the panel is open", () => {
    const buttons = bar.split("\n").filter((l) => l.includes('ls:LSButton.BoundEvent="UIMessageBoxY"'));
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toContain('Command="{Binding DataContext.PadFound, ElementName=BG3A_Panel}"');
    expect(buttons[0]).toContain('Tag="{Binding DataContext.FoundMarkText, ElementName=BG3A_Panel}"');
    expect(buttons[0]).toContain("ConverterParameter=UIMessageBoxY");
    expect(buttons[0]).toContain('ls:LSButton.EatInput="True"');
    expect(buttons[0]).toContain("ElementName=BG3A_PadBtn, Converter={StaticResource BoolToVisibleConverter}");
    expect(panelXaml("mouse")).not.toContain("UIMessageBoxY");
  });
});

describe("injectBefore", () => {
  const page = ["<Grid>", "    <!-- legend -->", '    <Grid x:Name="Legend">', "    </Grid>", "</Grid>"].join("\r\n");

  it("inserts the snippet on its own lines before the anchor line", () => {
    const out = injectBefore(page, '<Grid x:Name="Legend"', "<Border/>\n", 'x:Name="BG3A_Panel"').split("\r\n");
    expect(out[2]).toBe("<Border/>");
    expect(out[3]).toBe('    <Grid x:Name="Legend">');
  });

  it("fails when the anchor is missing or already patched", () => {
    expect(() => injectBefore(page, '<Grid x:Name="Nope"', "<Border/>", "X")).toThrow(/anchor/);
    expect(() => injectBefore(page, '<Grid x:Name="Legend"', "<Border/>", "Legend")).toThrow(/already/);
  });
});

const unpackedPages = journalPages.filter((t) => existsSync(unpackedPath(t)));

describe.skipIf(unpackedPages.length === 0)("patchJournal", () => {
  it.each(unpackedPages.map((t) => [t.file, t] as const))("patches %s once before the legend", (_, page) => {
    const out = patchJournal(page);
    expect(out.split('x:Name="BG3A_Panel"').length).toBe(2);
    expect(out.indexOf('x:Name="BG3A_Panel"')).toBeLessThan(out.indexOf('x:Name="Legend"'));
    expect(out.length).toBeGreaterThan(readFileSync(unpackedPath(page), "utf8").length);
    const padButtons = out.split('x:Name="BG3A_PadBtn"').length - 1;
    expect(padButtons).toBe(page.mode === "pad" ? 1 : 0);
    if (page.mode === "pad") expect(out.indexOf('x:Name="BG3A_PadBtn"')).toBeLessThan(out.indexOf('x:Name="LegendBtn"'));
  });
});
