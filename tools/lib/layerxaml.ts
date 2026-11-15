import { categoryIcons, groupRim, iconDisc, iconGlyph } from "../../mod/xaml/icons.ts";
import { categoryRules, type CategoryId } from "../categories.ts";

const pad = (n: number) => " ".repeat(n);

export function iconCanvas(id: CategoryId, indent: number): string {
  const icon = categoryIcons[id];
  const i = pad(indent);
  return [
    `${i}<Ellipse Width="24" Height="24" Fill="${iconDisc}" Stroke="${groupRim[icon.group]}" StrokeThickness="2"/>`,
    `${i}<Path Data="${icon.glyph}" Stroke="${iconGlyph}" StrokeThickness="1.7"/>`,
  ].join("\n");
}

function pointsControl(id: CategoryId, kind: "Cat" | "Found"): string {
  const scale = "{Binding MinWidth, RelativeSource={RelativeSource AncestorType=ls:LSWorldMap}}";
  const dim = kind === "Found" ? ' Opacity="0.45"' : "";
  return [
    `${pad(32)}<ItemsControl x:Name="BG3A_${kind}_${id}" ItemsSource="{Binding ${kind}_${id}}"${dim}>`,
    `${pad(36)}<ItemsControl.ItemsPanel>`,
    `${pad(40)}<ItemsPanelTemplate>`,
    `${pad(44)}<Canvas />`,
    `${pad(40)}</ItemsPanelTemplate>`,
    `${pad(36)}</ItemsControl.ItemsPanel>`,
    `${pad(36)}<ItemsControl.ItemTemplate>`,
    `${pad(40)}<DataTemplate>`,
    `${pad(44)}<Canvas>`,
    `${pad(48)}<Canvas.RenderTransform>`,
    `${pad(52)}<TransformGroup>`,
    `${pad(56)}<TranslateTransform X="-12" Y="-12"/>`,
    `${pad(56)}<ScaleTransform ScaleX="${scale}" ScaleY="${scale}"/>`,
    `${pad(56)}<TranslateTransform X="{Binding PosX}" Y="{Binding PosY}"/>`,
    `${pad(52)}</TransformGroup>`,
    `${pad(48)}</Canvas.RenderTransform>`,
    `${pad(48)}<Button Command="{Binding Mark}" ToolTip="{Binding Label}" Width="24" Height="24">`,
    `${pad(52)}<Button.Template>`,
    `${pad(56)}<ControlTemplate TargetType="Button">`,
    `${pad(60)}<Canvas Width="24" Height="24" Background="#01000000">`,
    iconCanvas(id, 64),
    `${pad(60)}</Canvas>`,
    `${pad(56)}</ControlTemplate>`,
    `${pad(52)}</Button.Template>`,
    `${pad(48)}</Button>`,
    `${pad(44)}</Canvas>`,
    `${pad(40)}</DataTemplate>`,
    `${pad(36)}</ItemsControl.ItemTemplate>`,
    `${pad(32)}</ItemsControl>`,
  ].join("\n");
}

export function layerXaml(): string {
  return [
    `${pad(28)}<Grid x:Name="BG3A_Layer" Width="{Binding ElementName=MapImage,Path=ActualWidth}" Height="{Binding ElementName=MapImage,Path=ActualHeight}">`,
    `${pad(32)}<Grid.RenderTransform>`,
    `${pad(36)}<TransformGroup>`,
    `${pad(40)}<MatrixTransform Matrix="{Binding ProjectionMatrix,RelativeSource={RelativeSource AncestorType=ls:LSWorldMap}}" />`,
    `${pad(36)}</TransformGroup>`,
    `${pad(32)}</Grid.RenderTransform>`,
    ...categoryRules.map((r) => pointsControl(r.id, "Found")),
    ...categoryRules.map((r) => pointsControl(r.id, "Cat")),
    `${pad(28)}</Grid>`,
    "",
  ].join("\n");
}
