import { ByteReader } from "./byteReader";
import { getGroundByImageIndex } from "./ground";
import type { GameVersion, MapHeader, ParsedMap, TileInfo } from "./types";

export const MP2_MAGIC_SIGNATURE = 0x5c000000;

const MAP_INFO_SIZE = 428;
const TILE_STRUCTURE_SIZE = 20;
const TILE_TERRAIN_FLAGS_OFFSET = 8;
const DIFFICULTY_OFFSET = 4;
const KINGDOM_COLORS_OFFSET = 8;
const HUMAN_COLORS_OFFSET = 14;
const COMPUTER_COLORS_OFFSET = 20;
const NAME_OFFSET = 58;
const NAME_LENGTH = 16;
const DESCRIPTION_OFFSET = 118;
const DESCRIPTION_LENGTH = 200;
const WIDTH_OFFSET = 420;
const PLAYER_COUNT = 6;
const MAX_DIFFICULTY = 3;
const VALID_SIZES = new Set([36, 72, 108, 144]);

export function parseOldFormatMap(buffer: ArrayBuffer, fileName?: string): ParsedMap {
  if (buffer.byteLength < MAP_INFO_SIZE) {
    throw new Error(`Map file is too small (${buffer.byteLength} bytes)`);
  }

  const reader = new ByteReader(new Uint8Array(buffer));
  if (reader.u32() !== MP2_MAGIC_SIGNATURE) {
    throw new Error("Not an MP2/MX2 file: missing magic");
  }

  reader.seek(DIFFICULTY_OFFSET);
  const difficulty = reader.u16le();
  if (difficulty > MAX_DIFFICULTY) {
    throw new Error(`Unsupported difficulty ${difficulty}`);
  }

  reader.seek(KINGDOM_COLORS_OFFSET);
  const availablePlayerColors = readColorMask(reader);
  reader.seek(HUMAN_COLORS_OFFSET);
  const humanPlayerColors = readColorMask(reader);
  reader.seek(COMPUTER_COLORS_OFFSET);
  const computerPlayerColors = readColorMask(reader);

  reader.seek(NAME_OFFSET);
  const name = reader.fixedString(NAME_LENGTH);
  if (name.length === 0) {
    throw new Error("Map does not contain a name");
  }

  reader.seek(DESCRIPTION_OFFSET);
  const description = reader.fixedString(DESCRIPTION_LENGTH);

  reader.seek(WIDTH_OFFSET);
  const width = reader.u32le();
  const height = reader.u32le();
  if (!VALID_SIZES.has(width) || width !== height) {
    throw new Error(`Invalid map dimensions ${width}x${height}`);
  }

  const tileCount = width * width;
  if (reader.remaining() < tileCount * TILE_STRUCTURE_SIZE) {
    throw new Error("Map file is corrupted: truncated tile data");
  }

  const header: MapHeader = {
    format: "mp2",
    difficulty,
    availablePlayerColors,
    humanPlayerColors,
    computerPlayerColors,
    width,
    name,
    description,
    gameVersion: gameVersionFromFileName(fileName),
  };

  return { header, tiles: parseTiles(reader, tileCount) };
}

function parseTiles(reader: ByteReader, tileCount: number): TileInfo[] {
  const tiles: TileInfo[] = [];
  for (let i = 0; i < tileCount; i++) {
    const terrainIndex = reader.u16le();
    reader.skip(TILE_TERRAIN_FLAGS_OFFSET - 2);
    const terrainFlags = reader.u8();
    reader.skip(TILE_STRUCTURE_SIZE - TILE_TERRAIN_FLAGS_OFFSET - 1);
    tiles.push({
      terrainIndex,
      terrainFlags,
      ground: getGroundByImageIndex(terrainIndex),
    });
  }
  return tiles;
}

function readColorMask(reader: ByteReader): number {
  let mask = 0;
  for (let i = 0; i < PLAYER_COUNT; i++) {
    if (reader.u8() !== 0) {
      mask |= 1 << i;
    }
  }
  return mask;
}

function gameVersionFromFileName(fileName?: string): GameVersion | undefined {
  if (fileName === undefined) {
    return undefined;
  }

  const pos = fileName.lastIndexOf(".");
  if (pos === -1) {
    return undefined;
  }

  const extension = fileName.slice(pos + 1).toLowerCase();
  return extension === "mx2" || extension === "hxc" ? "priceOfLoyalty" : "successionWars";
}
