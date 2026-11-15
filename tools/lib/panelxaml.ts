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

function row(id: CategoryId, indent: number, index: number): string[] {
  const cell = ` Grid.Row="${Math.floor(index / 2)}" Grid.Column="${index % 2}"`;
  return flatButton(indent, "Toggle", id, [
    `${pad(indent + 4)}<Grid Opacity="{Binding Alpha_${id}}">`,
    `${pad(indent + 8)}<Grid.ColumnDefinitions>`,
    `${pad(indent + 12)}<ColumnDefinition Width="44"/>`,
    `${pad(indent + 12)}<ColumnDefinition Width="*"/>`,
    `${pad(indent + 12)}<ColumnDefinition Width="Auto"/>`,
    `${pad(indent + 8)}</Grid.ColumnDefinitions>`,
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

export function panelXaml(): string {
  const i = 16;
  const lines = [
    `${pad(i)}<Border x:Name="BG3A_Panel" Grid.Row="1" HorizontalAlignment="Left" VerticalAlignment="Top" Margin="60,170,0,0" Width="680" Background="#E61A1208" BorderBrush="#FF8C7346" BorderThickness="2" Padding="18,12,18,14">`,
    `${pad(i + 4)}<StackPanel>`,
    `${pad(i + 8)}<Grid Margin="0,0,0,8">`,
    `${pad(i + 12)}<TextBlock Text="{Binding Title}" Foreground="${ink}" FontSize="32" VerticalAlignment="Center"/>`,
    `${pad(i + 12)}<StackPanel Orientation="Horizontal" HorizontalAlignment="Right">`,
    ...flatButton(i + 16, "ToggleFound", null, [`${pad(i + 20)}<TextBlock Text="{Binding FoundText}" Foreground="${dim}" FontSize="24"/>`]),
    ...flatButton(i + 16, "ShowAll", null, [`${pad(i + 20)}<TextBlock Text="{Binding AllText}" Foreground="${dim}" FontSize="24"/>`]),
    ...flatButton(i + 16, "HideAll", null, [`${pad(i + 20)}<TextBlock Text="{Binding NoneText}" Foreground="${dim}" FontSize="24"/>`]),
    `${pad(i + 12)}</StackPanel>`,
    `${pad(i + 8)}</Grid>`,
    `${pad(i + 8)}<Rectangle Height="2" Fill="#FF8C7346" Opacity="0.6" Margin="0,0,0,8"/>`,
    `${pad(i + 8)}<Grid Margin="0,0,0,10">`,
    `${pad(i + 12)}<Border BorderBrush="#FF8C7346" BorderThickness="0,0,0,1" Margin="0,0,140,0">`,
    `${pad(i + 16)}<TextBox Text="{Binding Query, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}" Style="{StaticResource DefaultInputBox}" TextAlignment="Left" FontSize="26" Foreground="${ink}"/>`,
    `${pad(i + 12)}</Border>`,
    `${pad(i + 12)}<TextBlock x:Name="BG3A_SearchInfo" Text="{Binding SearchHint}" Foreground="${dim}" FontSize="22" HorizontalAlignment="Right" VerticalAlignment="Center"/>`,
    `${pad(i + 8)}</Grid>`,
    `${pad(i + 8)}<Grid>`,
    `${pad(i + 12)}<Grid.ColumnDefinitions>`,
    `${pad(i + 16)}<ColumnDefinition Width="*"/>`,
    `${pad(i + 16)}<ColumnDefinition Width="*"/>`,
    `${pad(i + 12)}</Grid.ColumnDefinitions>`,
    `${pad(i + 12)}<Grid.RowDefinitions>`,
    ...panelOrder().filter((_, n) => n % 2 === 0).map(() => `${pad(i + 16)}<RowDefinition Height="Auto"/>`),
    `${pad(i + 12)}</Grid.RowDefinitions>`,
    ...panelOrder().flatMap((id, n) => row(id, i + 12, n)),
    `${pad(i + 8)}</Grid>`,
    `${pad(i + 4)}</StackPanel>`,
    `${pad(i)}</Border>`,
    "",
  ];
  return lines.join("\n");
}
