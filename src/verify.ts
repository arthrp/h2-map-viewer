import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Ground } from "./parser/ground";
import { parseMap } from "./parser/parseMap";
import type { GameVersion, ParsedMap } from "./parser/types";

const srcDir = dirname(fileURLToPath(import.meta.url));
const mapsDir = join(srcDir, "../maps");
const oldMapsDir = join(srcDir, "../old_maps");

interface MapExpectation {
  width: number;
  tileCount: number;
  maxIndex: number;
  waterPct?: number;
  version?: number;
  gameVersion?: GameVersion;
}

const expected: Record<string, MapExpectation> = {
  "4 Dimensions": {
    version: 10,
    width: 144,
    tileCount: 20736,
    maxIndex: 431,
    waterPct: 44.6,
  },
  Eruption: {
    version: 13,
    width: 108,
    tileCount: 11664,
    maxIndex: 414,
    waterPct: 0,
  },
  "Lost Temple": {
    version: 13,
    width: 72,
    tileCount: 5184,
    maxIndex: 431,
  },
  "Time vs Gravity": {
    width: 144,
    tileCount: 20736,
    maxIndex: 431,
    waterPct: 13.5,
    gameVersion: "priceOfLoyalty",
  },
};

function percent(count: number, total: number): number {
  return Number(((count * 100) / total).toFixed(1));
}

async function listMapFiles(dir: string, extensions: string[]): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((name) =>
      extensions.some((extension) => name.toLowerCase().endsWith(extension)),
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function loadMap(dir: string, file: string): Promise<ParsedMap> {
  const fileBytes = await readFile(join(dir, file));
  return parseMap(new Uint8Array(fileBytes).buffer, file);
}

function verifyMap(file: string, map: ParsedMap): void {
  const expect = expected[map.header.name];
  if (!expect) {
    throw new Error(`Unexpected map ${map.header.name}`);
  }

  const maxIndex = Math.max(...map.tiles.map((tile) => tile.terrainIndex));
  const waterCount = map.tiles.filter((tile) => tile.ground === Ground.WATER).length;
  const unknownCount = map.tiles.filter((tile) => tile.ground === Ground.UNKNOWN).length;

  if (expect.version !== undefined && map.header.version !== expect.version) {
    throw new Error(`${map.header.name}: version ${map.header.version}`);
  }
  if (expect.gameVersion !== undefined && map.header.gameVersion !== expect.gameVersion) {
    throw new Error(`${map.header.name}: gameVersion ${map.header.gameVersion}`);
  }
  if (map.header.width !== expect.width) {
    throw new Error(`${map.header.name}: width ${map.header.width}`);
  }
  if (map.tiles.length !== expect.tileCount) {
    throw new Error(`${map.header.name}: tiles ${map.tiles.length}`);
  }
  if (maxIndex !== expect.maxIndex || maxIndex > 431) {
    throw new Error(`${map.header.name}: maxIndex ${maxIndex}`);
  }
  if (unknownCount !== 0) {
    throw new Error(`${map.header.name}: ${unknownCount} unknown tiles`);
  }
  if (expect.waterPct !== undefined && percent(waterCount, map.tiles.length) !== expect.waterPct) {
    throw new Error(`${map.header.name}: water ${percent(waterCount, map.tiles.length)}%`);
  }

  const label =
    map.header.version === undefined
      ? `${map.header.format}`
      : `v${map.header.version}`;
  console.log(`${file}: ${map.header.name} ${map.header.width}x${map.header.width} ${label} ok`);
}

const files = await listMapFiles(mapsDir, [".fh2m"]);
if (files.length === 0) {
  throw new Error("No .fh2m maps found");
}

for (const file of files) {
  verifyMap(file, await loadMap(mapsDir, file));
}

const oldFiles = await listMapFiles(oldMapsDir, [".mx2", ".mp2"]);
for (const file of oldFiles) {
  verifyMap(file, await loadMap(oldMapsDir, file));
}

console.log("all maps verified");
