import type { DurationsFile, Station, TrainTime } from "../../domain/types";
import { TRAIN_ESTIMATE_KMH } from "../../domain/types";
import { haversineKm, minutesFromDistance } from "../../lib/geo";

/**
 * Offline duration: minimum direct-trip time from the SNCF GTFS feed, or a
 * straight-line estimate when the pair has no direct service.
 * Used for the reachability map (one call per station, must stay synchronous)
 * and as a fallback when the live SNCF API is unavailable.
 */
export function trainTimeStatic(
  from: Station,
  to: Station,
  table: DurationsFile | null,
): TrainTime {
  const minutes = table?.minutes[`${from.uic}|${to.uic}`];
  if (minutes != null) {
    return {
      minutes,
      method: "gtfs",
      label: "Horaire TER (GTFS, train direct)",
      source: table?.source ?? "SNCF GTFS",
      journeys: [],
    };
  }

  const distanceKm = haversineKm(from, to);
  return {
    minutes: minutesFromDistance(distanceKm, TRAIN_ESTIMATE_KMH),
    method: "estimate",
    label: `Estimation (${TRAIN_ESTIMATE_KMH} km/h à vol d'oiseau)`,
    source: `Aucune desserte directe dans le GTFS · ${distanceKm.toFixed(0)} km`,
    journeys: [],
  };
}
