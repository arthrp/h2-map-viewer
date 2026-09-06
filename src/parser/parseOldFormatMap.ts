import { ByteReader } from "./byteReader";
import { getGroundByImageIndex } from "./ground";
import { PLAYER_COUNT, RANDOM_RACE_INDEX } from "./players";
import type { GameVersion, MapHeader, ParsedMap, TileInfo, TownInfo } from "./types";

export const MP2_MAGIC_SIGNATURE = 0x5c000000;

const MAP_INFO_SIZE = 428;
const TILE_STRUCTURE_SIZE = 20;
const ADDON_STRUCTURE_SIZE = 15;
const CASTLE_STRUCTURE_SIZE = 70;
const CASTLE_COUNT = 72;
const CAPTURE_OBJECT_COUNT = 144;
const CAPTURE_OBJECT_POSITION_SIZE = 3;
const EMPTY_CASTLE_COORD = 0xff;
const NEUTRAL_OWNER = 255;
const OBJ_CASTLE = 163;
const OBJ_RANDOM_TOWN = 176;
const OBJ_RANDOM_CASTLE = 177;
const CASTLE_OBJECT_TYPES = new Set([OBJ_CASTLE, OBJ_RANDOM_TOWN, OBJ_RANDOM_CASTLE]);
const DIFFICULTY_OFFSET = 4;
const KINGDOM_COLORS_OFFSET = 8;
const HUMAN_COLORS_OFFSET = 14;
const COMPUTER_COLORS_OFFSET = 20;
const NAME_OFFSET = 58;
const NAME_LENGTH = 16;
const DESCRIPTION_OFFSET = 118;
const DESCRIPTION_LENGTH = 200;
const WIDTH_OFFSET = 420;
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

  const { tiles, castleTiles } = parseTiles(reader, tileCount);
  const towns = parseTowns(reader, castleTiles, width);

  return { header, tiles, towns };
}

interface CastleTile {
  index: number;
  blockIndex: number;
}

function parseTiles(
  reader: ByteReader,
  tileCount: number,
): { tiles: TileInfo[]; castleTiles: CastleTile[] } {
  const tiles: TileInfo[] = [];
  const castleTiles: CastleTile[] = [];

  for (let i = 0; i < tileCount; i++) {
    const terrainIndex = reader.u16le();
    reader.skip(2);
    const quantity1 = reader.u8();
    const quantity2 = reader.u8();
    reader.skip(2);
    const terrainFlags = reader.u8();
    const mapObjectType = reader.u8();
    reader.skip(TILE_STRUCTURE_SIZE - 10);
    tiles.push({
      terrainIndex,
      terrainFlags,
      ground: getGroundByImageIndex(terrainIndex),
    });

    if (CASTLE_OBJECT_TYPES.has(mapObjectType)) {
      castleTiles.push({
        index: i,
        blockIndex: ((quantity2 << 8) + quantity1) >> 3,
      });
    }
  }

  return { tiles, castleTiles };
}

function parseTowns(reader: ByteReader, castleTiles: CastleTile[], width: number): TownInfo[] {
  try {
    return readTowns(reader, castleTiles, width);
  } catch {
    return [];
  }
}

function readTowns(reader: ByteReader, castleTiles: CastleTile[], width: number): TownInfo[] {
  const addonCount = reader.u32le();
  reader.skip(addonCount * ADDON_STRUCTURE_SIZE);

  const castleShapes = readCastleTable(reader, width);
  reader.skip(CAPTURE_OBJECT_COUNT * CAPTURE_OBJECT_POSITION_SIZE);
  reader.skip(1);

  const infoBlockCount = readInfoBlockCount(reader);
  const owners = readCastleOwners(reader, infoBlockCount);
  const towns: TownInfo[] = [];

  for (const tile of castleTiles) {
    const owner = owners[tile.blockIndex - 1];
    if (owner === undefined || owner >= PLAYER_COUNT || owner === NEUTRAL_OWNER) {
      continue;
    }

    const shape = castleShapes.get(tile.index) ?? { raceIndex: RANDOM_RACE_INDEX, isCastle: true };
    towns.push({
      x: tile.index % width,
      y: Math.floor(tile.index / width),
      colorIndex: owner,
      raceIndex: shape.raceIndex,
      isCastle: shape.isCastle,
    });
  }

  return towns;
}

function readCastleTable(reader: ByteReader, width: number): Map<number, { raceIndex: number; isCastle: boolean }> {
  const shapes = new Map<number, { raceIndex: number; isCastle: boolean }>();

  for (let i = 0; i < CASTLE_COUNT; i++) {
    const x = reader.u8();
    const y = reader.u8();
    const castleType = reader.u8();
    if (x === EMPTY_CASTLE_COORD && y === EMPTY_CASTLE_COORD) {
      continue;
    }

    const rawRace = castleType & 0x7f;
    shapes.set(y * width + x, {
      raceIndex: rawRace === 6 ? RANDOM_RACE_INDEX : rawRace,
      isCastle: castleType >= 0x80,
    });
  }

  return shapes;
}

function readInfoBlockCount(reader: ByteReader): number {
  let infoBlockCount = 0;
  while (true) {
    const low = reader.u8();
    const high = reader.u8();
    if (low === 0 && high === 0) {
      break;
    }
    infoBlockCount = 256 * high + low - 1;
  }
  return infoBlockCount;
}

function readCastleOwners(reader: ByteReader, infoBlockCount: number): (number | undefined)[] {
  const owners: (number | undefined)[] = [];
  for (let i = 0; i < infoBlockCount; i++) {
    const size = reader.u16le();
    if (size === CASTLE_STRUCTURE_SIZE) {
      owners.push(reader.u8());
      reader.skip(CASTLE_STRUCTURE_SIZE - 1);
    } else {
      owners.push(undefined);
      reader.skip(size);
    }
  }
  return owners;
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
