import { ByteReader } from "./byteReader";
import { getGroundByImageIndex } from "./ground";
import type { MapHeader, ParsedMap, TileInfo } from "./types";

export const MAGIC_SIGNATURE = new Uint8Array([0x68, 0x32, 0x6d, 0x61, 0x70, 0x00]); // "h2map\0"
const MIN_FILE_SIZE = 512;
const MIN_VERSION = 2;
const MAX_VERSION = 13;
const TILE_OBJECT_SIZE = 9;

export async function parseNewFormatMap(buffer: ArrayBuffer): Promise<ParsedMap> {
  if (buffer.byteLength < MIN_FILE_SIZE) {
    throw new Error(`Map file is too small (${buffer.byteLength} bytes)`);
  }

  const bytes = new Uint8Array(buffer);
  const reader = new ByteReader(bytes);
  expectMagic(reader);

  const header = parseBaseHeader(reader);
  const payload = bytes.subarray(bytes.length - reader.remaining());
  const inflated = await inflateZlib(payload);
  const tiles = parseTiles(new ByteReader(inflated), header.width);

  return { header, tiles };
}

function expectMagic(reader: ByteReader): void {
  for (const expected of MAGIC_SIGNATURE) {
    if (reader.u8() !== expected) {
      throw new Error("Not an fh2m file: missing h2map magic");
    }
  }
}

function parseBaseHeader(reader: ByteReader): MapHeader {
  const version = reader.u16();
  if (version < MIN_VERSION || version > MAX_VERSION) {
    throw new Error(`Unsupported map version ${version}`);
  }

  const isCampaign = reader.bool();
  const difficulty = reader.u8();
  const availablePlayerColors = reader.u8();
  const humanPlayerColors = reader.u8();
  const computerPlayerColors = reader.u8();

  skipVector(reader, () => reader.u8());
  skipArray(reader, 6, () => reader.u8());

  reader.u8();
  reader.bool();
  reader.bool();
  skipVector(reader, () => reader.u32());
  reader.u8();
  skipVector(reader, () => reader.u32());

  const width = reader.i32();
  if (width <= 0) {
    throw new Error(`Invalid map width ${width}`);
  }

  const mainLanguage = reader.u8();
  const name = reader.string();
  const description = reader.string();
  const creatorNotes = version >= 9 ? reader.string() : "";

  if (version >= 11) {
    skipMap(reader, () => {
      reader.u8();
      reader.string();
      reader.string();
      reader.string();
    });
  }

  return {
    format: "fh2m",
    version,
    isCampaign,
    difficulty,
    availablePlayerColors,
    humanPlayerColors,
    computerPlayerColors,
    width,
    mainLanguage,
    name,
    description,
    creatorNotes,
  };
}

function parseTiles(reader: ByteReader, width: number): TileInfo[] {
  skipVector(reader, () => reader.u32());

  const tileCount = reader.u32();
  if (tileCount !== width * width) {
    throw new Error(`Tile count ${tileCount} does not match ${width}x${width}`);
  }

  const tiles: TileInfo[] = [];
  for (let i = 0; i < tileCount; i++) {
    const terrainIndex = reader.u16();
    const terrainFlags = reader.u8();
    const objectCount = reader.u32();
    reader.skip(objectCount * TILE_OBJECT_SIZE);
    tiles.push({
      terrainIndex,
      terrainFlags,
      ground: getGroundByImageIndex(terrainIndex),
    });
  }

  return tiles;
}

function skipVector(reader: ByteReader, skipItem: () => void): void {
  const count = reader.u32();
  for (let i = 0; i < count; i++) {
    skipItem();
  }
}

function skipArray(reader: ByteReader, expectedSize: number, skipItem: () => void): void {
  const size = reader.u32();
  if (size !== expectedSize) {
    throw new Error(`Expected array of ${expectedSize}, got ${size}`);
  }
  for (let i = 0; i < size; i++) {
    skipItem();
  }
}

function skipMap(reader: ByteReader, skipEntry: () => void): void {
  const count = reader.u32();
  for (let i = 0; i < count; i++) {
    skipEntry();
  }
}

async function inflateZlib(payload: Uint8Array): Promise<Uint8Array> {
  if (payload.length === 0) {
    throw new Error("Map payload is empty");
  }

  const stream = new Blob([payload.slice()])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}
