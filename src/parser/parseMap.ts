import { MAGIC_SIGNATURE as FH2M_MAGIC_SIGNATURE, parseNewFormatMap } from "./parseNewFormatMap";
import { MP2_MAGIC_SIGNATURE, parseOldFormatMap } from "./parseOldFormatMap";
import type { ParsedMap } from "./types";

export async function parseMap(buffer: ArrayBuffer, fileName?: string): Promise<ParsedMap> {
  const bytes = new Uint8Array(buffer);

  if (startsWith(bytes, FH2M_MAGIC_SIGNATURE)) {
    return parseNewFormatMap(buffer);
  }

  if (bytes.length >= 4) {
    const magic =
      ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
    if (magic === MP2_MAGIC_SIGNATURE) {
      return parseOldFormatMap(buffer, fileName);
    }
  }

  throw new Error("Unrecognized map format: expected an fh2m or MP2/MX2 file");
}

function startsWith(bytes: Uint8Array, magic: Uint8Array): boolean {
  if (bytes.length < magic.length) {
    return false;
  }
  return magic.every((value, index) => bytes[index] === value);
}
