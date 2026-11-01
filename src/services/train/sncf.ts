import type { Station, TrainJourney } from "../../domain/types";
import { API_BASE } from "../config";
import { getJson } from "../http";

export type SncfJourneysResponse = {
  source: string;
  fetchedAt: string;
  journeys: TrainJourney[];
};

export type TrainApiMode = "live" | "mock" | "unconfigured";

export type TrainApiStatus = {
  mode: TrainApiMode;
  configured: boolean;
  mock: boolean;
  base: string;
  coverage: string;
};

/** Tells the UI whether live SNCF data, a simulation, or nothing is available. */
export async function fetchTrainApiStatus(
  signal?: AbortSignal,
): Promise<TrainApiStatus | null> {
  try {
    return await getJson<TrainApiStatus>(`${API_BASE}/sncf/status`, signal);
  } catch {
    return null;
  }
}

/**
 * Calls the local BFF, which holds the SNCF token server-side.
 * Returns null when the API is not configured/unavailable so the caller can
 * fall back to GTFS or the distance estimate.
 */
export async function fetchSncfJourneys(
  from: Station,
  to: Station,
  signal?: AbortSignal,
): Promise<SncfJourneysResponse | null> {
  if (!from.uic || !to.uic) return null;

  const params = new URLSearchParams({ from: from.uic, to: to.uic });
  try {
    const data = await getJson<SncfJourneysResponse>(
      `${API_BASE}/sncf/journeys?${params.toString()}`,
      signal,
    );
    if (!Array.isArray(data.journeys)) return null;
    return data;
  } catch {
    return null;
  }
}
