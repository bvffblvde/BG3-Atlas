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

function categoryControl(id: CategoryId): string {
  const tag = "{Binding MinWidth, RelativeSource={RelativeSource AncestorType=ls:LSWorldMap}}";
  return [
    `${pad(32)}<ItemsControl x:Name="BG3A_Cat_${id}" ItemsSource="{Binding Cat_${id}}">`,
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
    `${pad(56)}<ScaleTransform ScaleX="${tag}" ScaleY="${tag}"/>`,
    `${pad(56)}<TranslateTransform X="{Binding PosX}" Y="{Binding PosY}"/>`,
    `${pad(52)}</TransformGroup>`,
    `${pad(48)}</Canvas.RenderTransform>`,
    iconCanvas(id, 48),
    `${pad(44)}</Canvas>`,
    `${pad(40)}</DataTemplate>`,
    `${pad(36)}</ItemsControl.ItemTemplate>`,
    `${pad(32)}</ItemsControl>`,
  ].join("\n");
}

export function layerXaml(): string {
  return [
    `${pad(28)}<Grid x:Name="BG3A_Layer" IsHitTestVisible="False" Width="{Binding ElementName=MapImage,Path=ActualWidth}" Height="{Binding ElementName=MapImage,Path=ActualHeight}">`,
    `${pad(32)}<Grid.RenderTransform>`,
    `${pad(36)}<TransformGroup>`,
    `${pad(40)}<MatrixTransform Matrix="{Binding ProjectionMatrix,RelativeSource={RelativeSource AncestorType=ls:LSWorldMap}}" />`,
    `${pad(36)}</TransformGroup>`,
    `${pad(32)}</Grid.RenderTransform>`,
    ...categoryRules.map((r) => categoryControl(r.id)),
    `${pad(28)}</Grid>`,
    "",
  ].join("\n");
}
