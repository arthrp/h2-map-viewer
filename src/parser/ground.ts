export const Ground = {
  UNKNOWN: 0x0000,
  DESERT: 0x0001,
  SNOW: 0x0002,
  SWAMP: 0x0004,
  WASTELAND: 0x0008,
  BEACH: 0x0010,
  LAVA: 0x0020,
  DIRT: 0x0040,
  GRASS: 0x0080,
  WATER: 0x0100,
} as const;

export type GroundId = (typeof Ground)[keyof typeof Ground];

export const GroundImageStartIndex = {
  WATER: 0,
  GRASS: 30,
  SNOW: 92,
  SWAMP: 146,
  LAVA: 208,
  DESERT: 262,
  DIRT: 321,
  WASTELAND: 361,
  BEACH: 415,
  MAX: 432,
} as const;

export function getGroundByImageIndex(terrainImageIndex: number): GroundId {
  if (GroundImageStartIndex.GRASS > terrainImageIndex) {
    return Ground.WATER;
  }
  if (GroundImageStartIndex.SNOW > terrainImageIndex) {
    return Ground.GRASS;
  }
  if (GroundImageStartIndex.SWAMP > terrainImageIndex) {
    return Ground.SNOW;
  }
  if (GroundImageStartIndex.LAVA > terrainImageIndex) {
    return Ground.SWAMP;
  }
  if (GroundImageStartIndex.DESERT > terrainImageIndex) {
    return Ground.LAVA;
  }
  if (GroundImageStartIndex.DIRT > terrainImageIndex) {
    return Ground.DESERT;
  }
  if (GroundImageStartIndex.WASTELAND > terrainImageIndex) {
    return Ground.DIRT;
  }
  if (GroundImageStartIndex.BEACH > terrainImageIndex) {
    return Ground.WASTELAND;
  }
  if (GroundImageStartIndex.MAX > terrainImageIndex) {
    return Ground.BEACH;
  }

  return Ground.UNKNOWN;
}

export function groundName(groundId: GroundId): string {
  switch (groundId) {
    case Ground.DESERT:
      return "Desert";
    case Ground.SNOW:
      return "Snow";
    case Ground.SWAMP:
      return "Swamp";
    case Ground.WASTELAND:
      return "Wasteland";
    case Ground.BEACH:
      return "Beach";
    case Ground.LAVA:
      return "Lava";
    case Ground.DIRT:
      return "Dirt";
    case Ground.GRASS:
      return "Grass";
    case Ground.WATER:
      return "Ocean";
    default:
      return "Unknown";
  }
}
