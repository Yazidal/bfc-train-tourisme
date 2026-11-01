import { useMemo } from "react";
import type { Station, Town } from "../../domain/types";

export type StationHit =
  | { kind: "station"; station: Station }
  | { kind: "town"; town: Town };

/** Shared autocomplete logic: stations first, then towns → nearest station. */
export function useStationHits(
  stations: Station[],
  towns: Town[],
  query: string,
  limit = 12,
): StationHit[] {
  return useMemo<StationHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];

    const stationHits: StationHit[] = stations
      .filter(
        (station) =>
          station.name.toLowerCase().includes(q) ||
          station.trigram.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((station) => ({ kind: "station", station }));

    const townHits: StationHit[] = towns
      .filter((town) => town.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((town) => ({ kind: "town", town }));

    return [...stationHits, ...townHits].slice(0, limit);
  }, [stations, towns, query, limit]);
}

export function stationForHit(
  stations: Station[],
  hit: StationHit,
): Station | null {
  if (hit.kind === "station") return hit.station;
  return (
    stations.find((station) => station.id === hit.town.nearestStationId) ?? null
  );
}
