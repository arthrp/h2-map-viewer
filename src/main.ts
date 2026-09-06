import "./style.css";

import { groundName } from "./parser/ground";
import { parseMap } from "./parser/parseMap";
import { PLAYER_COUNT, playerColorName, raceName } from "./parser/players";
import type { MapHeader, ParsedMap, TownInfo } from "./parser/types";
import { playerColor } from "./render/playerColors";
import { renderMap } from "./render/renderMap";
import { LEGEND_GROUNDS, TERRAIN_COLORS } from "./render/terrainColors";

const TILE_SIZE = 6;

const mapUrls = import.meta.glob("../maps/*.fh2m", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

const maps = Object.entries(mapUrls)
  .map(([path, url]) => ({
    name: fileName(path),
    url,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const select = requiredElement("#map-select", HTMLSelectElement);
const canvas = requiredElement("#map-canvas", HTMLCanvasElement);
const meta = requiredElement("#meta", HTMLElement);
const players = requiredElement("#players", HTMLElement);
const hover = requiredElement("#hover", HTMLElement);
const legend = requiredElement("#legend", HTMLUListElement);
const uploadButton = requiredElement("#upload-button", HTMLButtonElement);
const uploadInput = requiredElement("#upload-input", HTMLInputElement);

let uploadedGroup: HTMLOptGroupElement | null = null;

let currentMap: ParsedMap | null = null;
let townsByTile = new Map<number, TownInfo>();

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

function requiredElement<T extends HTMLElement>(
  selector: string,
  ctor: new () => T,
): T {
  const element = document.querySelector(selector);
  if (!(element instanceof ctor)) {
    throw new Error(`Missing ${selector}`);
  }
  return element;
}

function fillMapLegend(): void {
  legend.replaceChildren(
    ...LEGEND_GROUNDS.map((ground) => {
      const item = document.createElement("li");
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = TERRAIN_COLORS[ground];
      item.append(swatch, document.createTextNode(groundName(ground)));
      return item;
    }),
  );
}

function formatLabel(header: MapHeader): string {
  if (header.format === "fh2m") {
    return header.version === undefined ? "fh2m" : `fh2m v${header.version}`;
  }
  if (header.gameVersion === "priceOfLoyalty") {
    return "MX2 (Price of Loyalty)";
  }
  if (header.gameVersion === "successionWars") {
    return "MP2 (Succession Wars)";
  }
  return "MP2/MX2";
}

function showMeta(map: ParsedMap): void {
  const { header } = map;
  meta.textContent = [
    `${header.name}  ${header.width}x${header.width}  ${formatLabel(header)}`,
    header.description,
  ].join("\n");
  showPlayers(map.towns);
}

function showPlayers(towns: TownInfo[]): void {
  const counts = Array.from({ length: PLAYER_COUNT }, () => ({ castles: 0, towns: 0 }));
  for (const town of towns) {
    const count = counts[town.colorIndex];
    if (!count) {
      continue;
    }
    if (town.isCastle) {
      count.castles += 1;
    } else {
      count.towns += 1;
    }
  }

  players.replaceChildren(
    ...counts.flatMap((count, colorIndex) => {
      if (count.castles === 0 && count.towns === 0) {
        return [];
      }

      const item = document.createElement("span");
      item.className = "player";
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = playerColor(colorIndex);
      item.append(swatch, document.createTextNode(`${playerColorName(colorIndex)}: ${playerSummary(count)}`));
      return [item];
    }),
  );
}

function playerSummary(count: { castles: number; towns: number }): string {
  const parts: string[] = [];
  if (count.castles > 0) {
    parts.push(`${count.castles} ${count.castles === 1 ? "castle" : "castles"}`);
  }
  if (count.towns > 0) {
    parts.push(`${count.towns} ${count.towns === 1 ? "town" : "towns"}`);
  }
  return parts.join(", ");
}

function townLabel(town: TownInfo): string {
  return `${playerColorName(town.colorIndex)} ${town.isCastle ? "castle" : "town"} (${raceName(town.raceIndex)})`;
}

function tileFromEvent(event: MouseEvent): { x: number; y: number } | null {
  if (!currentMap) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
  const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
  if (x < 0 || y < 0 || x >= currentMap.header.width || y >= currentMap.header.width) {
    return null;
  }
  return { x, y };
}

canvas.addEventListener("mousemove", (event) => {
  const tile = tileFromEvent(event);
  if (!currentMap || !tile) {
    hover.textContent = "Hover a tile to inspect it.";
    return;
  }

  const index = tile.y * currentMap.header.width + tile.x;
  const info = currentMap.tiles[index]!;
  const town = townsByTile.get(index);
  const parts = [`(${tile.x}, ${tile.y})  ${groundName(info.ground)}  terrain ${info.terrainIndex}`];
  if (town) {
    parts.push(townLabel(town));
  }
  hover.textContent = parts.join("  ");
});

canvas.addEventListener("mouseleave", () => {
  hover.textContent = "Hover a tile to inspect it.";
});

async function showMap(buffer: ArrayBuffer, fileName?: string): Promise<void> {
  const map = await parseMap(buffer, fileName);
  currentMap = map;
  townsByTile = new Map(
    map.towns.map((town) => [town.y * map.header.width + town.x, town]),
  );
  renderMap(canvas, map, TILE_SIZE);
  showMeta(map);
  hover.textContent = "Hover a tile to inspect it.";
}

async function loadMap(url: string, fileName?: string): Promise<void> {
  hover.textContent = "Loading…";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load map: ${response.status}`);
  }

  await showMap(await response.arrayBuffer(), fileName);
}

function showError(error: unknown): void {
  meta.textContent = error instanceof Error ? error.message : String(error);
}

function uploadedOptGroup(): HTMLOptGroupElement {
  if (!uploadedGroup) {
    uploadedGroup = document.createElement("optgroup");
    uploadedGroup.label = "Uploaded";
    select.append(uploadedGroup);
  }
  return uploadedGroup;
}

async function uploadMap(file: File): Promise<void> {
  hover.textContent = "Loading…";
  await showMap(await file.arrayBuffer(), file.name);

  const url = URL.createObjectURL(file);
  const option = document.createElement("option");
  option.value = url;
  option.textContent = file.name;
  uploadedOptGroup().append(option);
  select.value = url;
}

function populateMapsSelect(): void {
  if (maps.length === 0) {
    throw new Error("No .fh2m maps found in maps/");
  }

  for (const map of maps) {
    const option = document.createElement("option");
    option.value = map.url;
    option.textContent = map.name;
    select.append(option);
  }

  select.addEventListener("change", () => {
    void loadMap(select.value, getSelectedFilename()).catch(showError);
  });
}

function bindUpload(): void {
  uploadButton.addEventListener("click", () => {
    uploadInput.click();
  });

  uploadInput.addEventListener("change", () => {
    const file = uploadInput.files?.[0];
    uploadInput.value = "";
    if (!file) {
      return;
    }

    void uploadMap(file).catch(showError);
  });
}

function getSelectedFilename(): string | undefined {
  return select.selectedOptions[0]?.textContent ?? undefined;
}

fillMapLegend();
populateMapsSelect();
bindUpload();
void loadMap(select.value, getSelectedFilename()).catch(showError);
