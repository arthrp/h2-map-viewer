export const PLAYER_COLORS: readonly string[] = [
  "#2a5cff",
  "#2d8a2d",
  "#c42b2b",
  "#d4b01a",
  "#d4781a",
  "#7b3fb0",
];

export function playerColor(colorIndex: number): string {
  return PLAYER_COLORS[colorIndex] ?? "#ffffff";
}
