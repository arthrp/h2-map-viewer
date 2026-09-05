import { Ground, type GroundId } from "../parser/ground";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hex(value: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) {
    throw new Error(`Invalid color ${value}`);
  }
  const n = Number.parseInt(match[1]!, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

export const TERRAIN_COLORS: Record<GroundId, string> = {
  [Ground.WATER]: "#4160a8",
  [Ground.GRASS]: "#4c8c20",
  [Ground.SNOW]: "#d8d8d8",
  [Ground.SWAMP]: "#4c7068",
  [Ground.LAVA]: "#58484c",
  [Ground.DESERT]: "#c8a058",
  [Ground.DIRT]: "#78583c",
  [Ground.WASTELAND]: "#b06030",
  [Ground.BEACH]: "#d8c088",
  [Ground.UNKNOWN]: "#ff00ff",
};

export const TERRAIN_RGB: Record<GroundId, Rgb> = Object.fromEntries(
  Object.entries(TERRAIN_COLORS).map(([id, color]) => [Number(id), hex(color)]),
) as Record<GroundId, Rgb>;

export const LEGEND_GROUNDS: GroundId[] = [
  Ground.WATER,
  Ground.GRASS,
  Ground.SNOW,
  Ground.SWAMP,
  Ground.LAVA,
  Ground.DESERT,
  Ground.DIRT,
  Ground.WASTELAND,
  Ground.BEACH,
];
