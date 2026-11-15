export interface MapGroup {
  main: string;
  prefix: string;
}

export const mapGroups: MapGroup[] = [
  { main: "WLD_Main_A", prefix: "WLD" },
  { main: "SCL_Main_A", prefix: "SCL" },
  { main: "CTY_Main_A", prefix: "CTY" },
  { main: "BGO_Main_A", prefix: "BGO" },
  { main: "CRE_Main_A", prefix: "CRE" },
  { main: "INT_Main_A", prefix: "INT" },
  { main: "END_Main", prefix: "END" },
  { main: "IRN_Main_A", prefix: "IRN" },
  { main: "TUT_Avernus_C", prefix: "TUT" },
  { main: "EPI_Main_A", prefix: "EPI" },
];

export function isSubLevelOf(group: MapGroup, level: string): boolean {
  return level.startsWith(`${group.prefix}_`) && !/_CIN_/i.test(level) && level !== group.main;
}
