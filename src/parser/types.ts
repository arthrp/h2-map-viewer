import type { GroundId } from "./ground";

export type MapFormat = "fh2m" | "mp2";
export type GameVersion = "successionWars" | "priceOfLoyalty";

export interface MapHeader {
  format: MapFormat;
  difficulty: number;
  availablePlayerColors: number;
  humanPlayerColors: number;
  computerPlayerColors: number;
  width: number;
  name: string;
  description: string;
  version?: number;
  isCampaign?: boolean;
  mainLanguage?: number;
  creatorNotes?: string;
  gameVersion?: GameVersion;
}

export interface TileInfo {
  terrainIndex: number;
  terrainFlags: number;
  ground: GroundId;
}

export interface TownInfo {
  x: number;
  y: number;
  colorIndex: number;
  raceIndex: number;
  isCastle: boolean;
}

export interface ParsedMap {
  header: MapHeader;
  tiles: TileInfo[];
  towns: TownInfo[];
}
