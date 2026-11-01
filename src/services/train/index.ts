import type { DurationsFile, Station, TrainTime } from "../../domain/types";
import { TRAIN_API_ENABLED } from "../config";
import { fetchSncfJourneys } from "./sncf";
import { trainTimeStatic } from "./static";

export { trainTimeStatic } from "./static";

/** Direct journeys only: connecting trains are out of scope for the MVP. */
export function directJourneysOnly(journeys: TrainTime["journeys"]) {
  return journeys.filter((journey) => journey.transfers === 0);
}

/**
 * Resolve the best available train duration for a station pair:
 *   1. live SNCF API (real departures + duration),
 *   2. SNCF GTFS static table (minimum direct trip),
 *   3. straight-line estimate.
 * Every result carries `method`/`label` so the UI can state where it came from.
 */
export async function trainTime(
  from: Station,
  to: Station,
  table: DurationsFile | null,
  signal?: AbortSignal,
): Promise<TrainTime> {
  if (TRAIN_API_ENABLED) {
    const live = await fetchSncfJourneys(from, to, signal);
    const journeys = directJourneysOnly(live?.journeys ?? []);
    if (live && journeys.length > 0) {
      return {
        minutes: journeys[0].minutes,
        method: "sncf",
        label: `Horaire SNCF en direct · ${journeys.length} prochain(s) départ(s)`,
        source: live.source,
        journeys,
        fetchedAt: live.fetchedAt,
      };
    }
  }

  return trainTimeStatic(from, to, table);
}
