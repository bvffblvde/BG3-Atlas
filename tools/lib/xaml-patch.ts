export const layerMarker = 'x:Name="BG3A_Layer"';

export function injectWorldMapLayer(xaml: string, snippet: string): string {
  if (xaml.includes(layerMarker)) throw new Error("layer already injected");
  const styleStart = xaml.indexOf('<Style TargetType="ls:LSWorldMap">');
  if (styleStart < 0) throw new Error("LSWorldMap style not found");
  const indent = xaml.slice(xaml.lastIndexOf("\n", styleStart) + 1, styleStart);
  const closeTag = new RegExp(`\\n${indent}</Style>`, "g");
  closeTag.lastIndex = styleStart;
  const styleEnd = closeTag.exec(xaml)?.index ?? -1;
  if (styleEnd < 0) throw new Error("LSWorldMap style end not found");
  const holder = xaml.indexOf('x:Name="MapHolder"', styleStart);
  if (holder < 0 || holder > styleEnd) throw new Error("MapHolder not found in LSWorldMap style");
  const area = xaml.indexOf('x:Name="PART_Area"', holder);
  if (area < 0 || area > styleEnd) throw new Error("PART_Area not found in LSWorldMap style");
  const holderClose = xaml.lastIndexOf("</Grid>", area);
  if (holderClose < holder) throw new Error("MapHolder closing tag not found");
  const fog = xaml.indexOf('x:Name="ShroudedRooms"', holder);
  const anchor = fog > holder && fog < holderClose ? xaml.lastIndexOf("<", fog) : holderClose;
  const lineStart = xaml.lastIndexOf("\n", anchor) + 1;
  const eol = xaml.includes("\r\n") ? "\r\n" : "\n";
  const body = snippet.replace(/\r?\n/g, eol).replace(new RegExp(`(${eol})+$`), "");
  const holderPart = xaml.slice(lineStart, holderClose).replace(/x:Name="(ShroudedRooms|SemiShroudedRooms|Shroud)"(?! IsHitTestVisible)/g, 'x:Name="$1" IsHitTestVisible="False"');
  return xaml.slice(0, lineStart) + body + eol + holderPart + xaml.slice(holderClose);
}

export function injectBefore(xaml: string, anchor: string, snippet: string, marker: string): string {
  if (xaml.includes(marker)) throw new Error(`${marker} already injected`);
  const at = xaml.indexOf(anchor);
  if (at < 0) throw new Error(`anchor ${anchor} not found`);
  const lineStart = xaml.lastIndexOf("\n", at) + 1;
  const eol = xaml.includes("\r\n") ? "\r\n" : "\n";
  const body = snippet.replace(/\r?\n/g, eol).replace(new RegExp(`(${eol})+$`), "");
  return xaml.slice(0, lineStart) + body + eol + xaml.slice(lineStart);
}
