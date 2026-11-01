import type { Poi } from "../domain/types";
import { getJson } from "./http";

export type PoiFile = {
  source: string;
  taxonomy: string[];
  count: number;
  pois: Poi[];
};

let cache: Promise<PoiFile> | null = null;

/**
 * Large dataset (~5 MB, 15k POIs). Loaded lazily when the map opens, once per
 * session. When the SNCF/DATAtourisme API lands, this module is the only place
 * that changes: swap the JSON fetch for a station-scoped API call.
 */
export function loadPois(): Promise<PoiFile> {
  cache ??= getJson<PoiFile>("/data/pois.json").catch((error: unknown) => {
    cache = null;
    throw error;
  });
  return cache;
}
