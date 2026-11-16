import { categoryColors, categoryIcons, iconGlyph } from "../../mod/xaml/icons.ts";
import { categoryRules, type CategoryId } from "../categories.ts";

const pad = (n: number) => " ".repeat(n);

export function iconCanvas(id: CategoryId, indent: number): string {
  const icon = categoryIcons[id];
  const color = categoryColors[id];
  const i = pad(indent);
  return [
    `${i}<Ellipse Width="24" Height="24" Fill="${color.disc}" Stroke="${color.rim}" StrokeThickness="2.2"/>`,
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
    `${pad(48)}<Canvas Width="24" Height="24" Background="#01000000">`,
    `${pad(52)}<Canvas.ToolTip>`,
    `${pad(56)}<ToolTip Placement="Right" HorizontalOffset="6">`,
    `${pad(60)}<ToolTip.Template>`,
    `${pad(64)}<ControlTemplate TargetType="ToolTip">`,
    `${pad(68)}<Border Background="#F01A1208" BorderBrush="#FF8C7346" BorderThickness="1" Padding="10,6,10,7">`,
    `${pad(72)}<TextBlock Text="{Binding Label}" FontSize="15" Foreground="#FFF2DDA0"/>`,
    `${pad(68)}</Border>`,
    `${pad(64)}</ControlTemplate>`,
    `${pad(60)}</ToolTip.Template>`,
    `${pad(56)}</ToolTip>`,
    `${pad(52)}</Canvas.ToolTip>`,
    iconCanvas(id, 52),
    `${pad(48)}</Canvas>`,
    `${pad(44)}</Canvas>`,
    `${pad(40)}</DataTemplate>`,
    `${pad(36)}</ItemsControl.ItemTemplate>`,
    `${pad(32)}</ItemsControl>`,
  ].join("\n");
}

function searchControl(): string {
  const scale = "{Binding MinWidth, RelativeSource={RelativeSource AncestorType=ls:LSWorldMap}}";
  return [
    `${pad(32)}<ItemsControl x:Name="BG3A_Search" ItemsSource="{Binding Search}" IsHitTestVisible="False">`,
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
    `${pad(48)}<Ellipse Canvas.Left="-8" Canvas.Top="-8" Width="40" Height="40" Stroke="#FFFFF1C4" StrokeThickness="3"/>`,
    `${pad(48)}<Ellipse Canvas.Left="-13" Canvas.Top="-13" Width="50" Height="50" Stroke="#99FFF1C4" StrokeThickness="2"/>`,
    `${pad(44)}</Canvas>`,
    `${pad(40)}</DataTemplate>`,
    `${pad(36)}</ItemsControl.ItemTemplate>`,
    `${pad(32)}</ItemsControl>`,
  ].join("\n");
}

export function layerXaml(): string {
  return [
    `${pad(28)}<Grid x:Name="BG3A_Layer" Panel.ZIndex="{Binding LayerZ}" Width="{Binding ElementName=MapImage,Path=ActualWidth}" Height="{Binding ElementName=MapImage,Path=ActualHeight}">`,
    `${pad(32)}<Grid.RenderTransform>`,
    `${pad(36)}<TransformGroup>`,
    `${pad(40)}<MatrixTransform Matrix="{Binding ProjectionMatrix,RelativeSource={RelativeSource AncestorType=ls:LSWorldMap}}" />`,
    `${pad(36)}</TransformGroup>`,
    `${pad(32)}</Grid.RenderTransform>`,
    ...categoryRules.map((r) => pointsControl(r.id, "Found")),
    ...categoryRules.map((r) => pointsControl(r.id, "Cat")),
    searchControl(),
    `${pad(28)}</Grid>`,
    "",
  ].join("\n");
}
