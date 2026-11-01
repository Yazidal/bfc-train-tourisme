import type {
  DurationsFile,
  ReferenceData,
  Station,
  Town,
} from "../domain/types";
import { getJson } from "./http";

const DATA = "/data";

type Boundary = ReferenceData["boundary"];

let cache: Promise<ReferenceData> | null = null;

/**
 * Small, shared reference datasets (stations, towns, GTFS durations, region
 * boundary). Fetched once per session and memoised.
 */
export function loadReferenceData(): Promise<ReferenceData> {
  cache ??= Promise.all([
    getJson<Station[]>(`${DATA}/stations.json`),
    getJson<Town[]>(`${DATA}/towns.json`),
    getJson<DurationsFile>(`${DATA}/durations.json`),
    getJson<Boundary>(`${DATA}/bfc-boundary.geojson`).catch(() => null),
  ])
    .then(([stations, towns, durations, boundary]) => ({
      stations,
      towns,
      durations,
      boundary,
    }))
    .catch((error: unknown) => {
      cache = null;
      throw error;
    });

  return cache;
}
