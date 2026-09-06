import type { ParsedMap, TownInfo } from "../parser/types";
import { playerColor } from "./playerColors";
import { TERRAIN_RGB } from "./terrainColors";

const DEFAULT_TILE_SIZE = 6;

export function renderMap(
  canvas: HTMLCanvasElement,
  map: ParsedMap,
  tileSize = DEFAULT_TILE_SIZE,
): void {
  const { width } = map.header;
  const source = document.createElement("canvas");
  source.width = width;
  source.height = width;

  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) {
    throw new Error("Unable to create an offscreen 2D context");
  }

  const image = sourceCtx.createImageData(width, width);
  const pixels = image.data;

  for (let i = 0; i < map.tiles.length; i++) {
    const color = TERRAIN_RGB[map.tiles[i]!.ground];
    const offset = i * 4;
    pixels[offset] = color.r;
    pixels[offset + 1] = color.g;
    pixels[offset + 2] = color.b;
    pixels[offset + 3] = 255;
  }

  sourceCtx.putImageData(image, 0, 0);

  canvas.width = width * tileSize;
  canvas.height = width * tileSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create a 2D canvas context");
  }

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  for (const town of map.towns) {
    drawTownMarker(ctx, town, tileSize);
  }
}

function drawTownMarker(ctx: CanvasRenderingContext2D, town: TownInfo, tileSize: number): void {
  const cx = town.x * tileSize + tileSize / 2;
  const cy = town.y * tileSize + tileSize / 2;
  ctx.fillStyle = playerColor(town.colorIndex);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, tileSize / 6);

  if (town.isCastle) {
    const size = tileSize * 1.8;
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    return;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, (tileSize * 1.4) / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
