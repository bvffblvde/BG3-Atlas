import { categoryRules, type CategoryId } from "../categories.ts";
import { categoryIcons } from "../../mod/xaml/icons.ts";
import { iconCanvas } from "./layerxaml.ts";

const groupOrder = ["loot", "world", "npc", "danger"];

export function panelOrder(): CategoryId[] {
  const ids = categoryRules.map((r) => r.id);
  return groupOrder.flatMap((g) => ids.filter((id) => categoryIcons[id].group === g));
}

const pad = (n: number) => " ".repeat(n);
const ink = "#FFF2DDA0";
const dim = "#FFB8A57A";

function flatButton(indent: number, command: string, parameter: string | null, body: string[], cell = ""): string[] {
  const p = parameter ? ` CommandParameter="${parameter}"` : "";
  return [
    `${pad(indent)}<Button Command="{Binding ${command}}"${p}${cell}>`,
    `${pad(indent + 4)}<Button.Template>`,
    `${pad(indent + 8)}<ControlTemplate TargetType="Button">`,
    `${pad(indent + 12)}<Border Background="#01000000" Padding="6,4,6,4">`,
    `${pad(indent + 16)}<ContentPresenter/>`,
    `${pad(indent + 12)}</Border>`,
    `${pad(indent + 8)}</ControlTemplate>`,
    `${pad(indent + 4)}</Button.Template>`,
    ...body,
    `${pad(indent)}</Button>`,
  ];
}

export type PanelMode = "mouse" | "pad";

function row(id: CategoryId, indent: number, index: number, mode: PanelMode): string[] {
  const cell = ` Grid.Row="${Math.floor(index / 2)}" Grid.Column="${index % 2}"`;
  const selection =
    mode === "pad" ? [`${pad(indent + 8)}<Rectangle Grid.ColumnSpan="3" Margin="-4,-2,-4,-2" Fill="#40F2DDA0" Opacity="{Binding Sel_${id}}"/>`] : [];
  return flatButton(indent, "Toggle", id, [
    `${pad(indent + 4)}<Grid Opacity="{Binding Alpha_${id}}">`,
    `${pad(indent + 8)}<Grid.ColumnDefinitions>`,
    `${pad(indent + 12)}<ColumnDefinition Width="44"/>`,
    `${pad(indent + 12)}<ColumnDefinition Width="*"/>`,
    `${pad(indent + 12)}<ColumnDefinition Width="Auto"/>`,
    `${pad(indent + 8)}</Grid.ColumnDefinitions>`,
    ...selection,
    `${pad(indent + 8)}<Viewbox Width="34" Height="34" HorizontalAlignment="Left">`,
    `${pad(indent + 12)}<Canvas Width="24" Height="24">`,
    iconCanvas(id, indent + 16),
    `${pad(indent + 12)}</Canvas>`,
    `${pad(indent + 8)}</Viewbox>`,
    `${pad(indent + 8)}<TextBlock Grid.Column="1" Text="{Binding Label_${id}}" Foreground="${ink}" FontSize="26" VerticalAlignment="Center" TextTrimming="CharacterEllipsis"/>`,
    `${pad(indent + 8)}<TextBlock Grid.Column="2" Text="{Binding Count_${id}}" Foreground="${dim}" FontSize="22" VerticalAlignment="Center" Margin="8,0,4,0"/>`,
    `${pad(indent + 4)}</Grid>`,
  ], cell);
}

function searchRow(i: number): string[] {
  return [
    `${pad(i + 8)}<Grid Margin="0,0,0,10">`,
    `${pad(i + 12)}<Border BorderBrush="#FF8C7346" BorderThickness="0,0,0,1" Margin="0,0,140,0">`,
    `${pad(i + 16)}<TextBox Text="{Binding Query, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}" Style="{StaticResource DefaultInputBox}" TextAlignment="Left" FontSize="26" Foreground="${ink}"/>`,
    `${pad(i + 12)}</Border>`,
    `${pad(i + 12)}<TextBlock x:Name="BG3A_SearchInfo" Text="{Binding SearchHint}" Foreground="${dim}" FontSize="22" HorizontalAlignment="Right" VerticalAlignment="Center"/>`,
    `${pad(i + 8)}</Grid>`,
  ];
}

export function padHintBar(): string {
  const i = 24;
  const enabled = 'IsEnabled="{Binding IsChecked, ElementName=BG3A_PadBtn}" EatInput="True"';
  return [
    `${pad(i)}<ls:LSToggleButton x:Name="BG3A_PadBtn" ls:LSToggleButton.BoundEvent="UIFilter" Tag="Atlas" ContentTemplate="{StaticResource ControllerButtonHint}" Content="{Binding CurrentPlayer.UIData.InputEvents, ConverterParameter=UIFilter, Converter={StaticResource FindInputEventConverter}}" EatInput="False"/>`,
    `${pad(i)}<ls:LSInputBinding BoundEvent="UILeft" Command="{Binding DataContext.PadPrev, ElementName=BG3A_Panel}" ${enabled}/>`,
    `${pad(i)}<ls:LSInputBinding BoundEvent="UIRight" Command="{Binding DataContext.PadNext, ElementName=BG3A_Panel}" ${enabled}/>`,
    `${pad(i)}<ls:LSInputBinding BoundEvent="UIUp" Command="{Binding DataContext.PadUp, ElementName=BG3A_Panel}" ${enabled}/>`,
    `${pad(i)}<ls:LSInputBinding BoundEvent="UIDown" Command="{Binding DataContext.PadDown, ElementName=BG3A_Panel}" ${enabled}/>`,
    `${pad(i)}<ls:LSInputBinding BoundEvent="UIAccept" Command="{Binding DataContext.PadToggle, ElementName=BG3A_Panel}" ${enabled}/>`,
    `${pad(i)}<ls:LSButton ls:LSButton.BoundEvent="UITakeAll" ls:LSButton.EatInput="True" Tag="Вкл/выкл" ContentTemplate="{StaticResource ControllerButtonHint}" Content="{Binding CurrentPlayer.UIData.InputEvents, ConverterParameter=UITakeAll, Converter={StaticResource FindInputEventConverter}}" Command="{Binding DataContext.PadToggle, ElementName=BG3A_Panel}" Visibility="{Binding IsChecked, ElementName=BG3A_PadBtn, Converter={StaticResource BoolToVisibleConverter}}"/>`,
    "",
  ].join("\n");
}

export function panelXaml(mode: PanelMode = "mouse"): string {
  const i = 16;
  const visibility = mode === "pad" ? ' Visibility="{Binding IsChecked, ElementName=BG3A_PadBtn, Converter={StaticResource BoolToVisibleConverter}}"' : "";
  const placement = mode === "pad" ? 'Margin="60,140,0,0"' : 'Grid.Row="1" Margin="60,170,0,0"';
  const lines = [
    `${pad(i)}<Border x:Name="BG3A_Panel" ${placement} HorizontalAlignment="Left" VerticalAlignment="Top" Width="680" Background="#E61A1208" BorderBrush="#FF8C7346" BorderThickness="2" Padding="18,12,18,14"${visibility}>`,
    `${pad(i + 4)}<StackPanel>`,
    `${pad(i + 8)}<Grid Margin="0,0,0,8">`,
    `${pad(i + 12)}<TextBlock Text="{Binding Title}" Foreground="${ink}" FontSize="32" VerticalAlignment="Center"/>`,
    `${pad(i + 12)}<StackPanel Orientation="Horizontal" HorizontalAlignment="Right">`,
    ...flatButton(i + 16, "ShowAll", null, [`${pad(i + 20)}<TextBlock Text="{Binding AllText}" Foreground="${dim}" FontSize="24"/>`]),
    ...flatButton(i + 16, "HideAll", null, [`${pad(i + 20)}<TextBlock Text="{Binding NoneText}" Foreground="${dim}" FontSize="24"/>`]),
    `${pad(i + 12)}</StackPanel>`,
    `${pad(i + 8)}</Grid>`,
    `${pad(i + 8)}<StackPanel Orientation="Horizontal" Margin="-6,0,0,6">`,
    ...flatButton(i + 12, "ToggleFound", null, [`${pad(i + 16)}<TextBlock Text="{Binding FoundText}" Foreground="${dim}" FontSize="24"/>`]),
    ...flatButton(i + 12, "ToggleFog", null, [`${pad(i + 16)}<TextBlock Text="{Binding FogText}" Foreground="${dim}" FontSize="24"/>`]),
    `${pad(i + 8)}</StackPanel>`,
    `${pad(i + 8)}<Rectangle Height="2" Fill="#FF8C7346" Opacity="0.6" Margin="0,0,0,8"/>`,
    ...(mode === "mouse" ? searchRow(i) : []),
    `${pad(i + 8)}<Grid>`,
    `${pad(i + 12)}<Grid.ColumnDefinitions>`,
    `${pad(i + 16)}<ColumnDefinition Width="*"/>`,
    `${pad(i + 16)}<ColumnDefinition Width="*"/>`,
    `${pad(i + 12)}</Grid.ColumnDefinitions>`,
    `${pad(i + 12)}<Grid.RowDefinitions>`,
    ...panelOrder().filter((_, n) => n % 2 === 0).map(() => `${pad(i + 16)}<RowDefinition Height="Auto"/>`),
    `${pad(i + 12)}</Grid.RowDefinitions>`,
    ...panelOrder().flatMap((id, n) => row(id, i + 12, n, mode)),
    `${pad(i + 8)}</Grid>`,
    ...(mode === "pad"
      ? [
          `${pad(i + 8)}<TextBlock x:Name="BG3A_CursorInfo" Text="" Foreground="${ink}" FontSize="26" Margin="0,10,0,0" TextWrapping="Wrap"/>`,
          `${pad(i + 8)}<TextBlock Text="{Binding PadHint}" Foreground="${dim}" FontSize="22" Margin="0,6,0,0" TextWrapping="Wrap"/>`,
        ]
      : []),
    `${pad(i + 4)}</StackPanel>`,
    `${pad(i)}</Border>`,
    "",
  ];
  return lines.join("\n");
}
