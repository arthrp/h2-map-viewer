export const PLAYER_COUNT = 6;
export const NEUTRAL_COLOR_INDEX = 6;
export const RANDOM_RACE_INDEX = 7;

const PLAYER_COLOR_NAMES = ["Blue", "Green", "Red", "Yellow", "Orange", "Purple"] as const;
const RACE_NAMES = ["Knight", "Barbarian", "Sorceress", "Warlock", "Wizard", "Necromancer"] as const;

export function playerColorName(colorIndex: number): string {
  return PLAYER_COLOR_NAMES[colorIndex] ?? "Unknown";
}

export function raceName(raceIndex: number): string {
  if (raceIndex === RANDOM_RACE_INDEX) {
    return "Random";
  }
  return RACE_NAMES[raceIndex] ?? "Unknown";
}

export function playerColorMask(colorIndex: number): number {
  return 1 << colorIndex;
}
