import { useMemo } from "react";
import { SAMPLE_ACTIVITIES } from "../data/sampleActivities";
import type { Activity, Station, UserPreferences } from "../types";

export function useActivitiesNearStation(
  station: Station | null,
  preferences: UserPreferences,
): Activity[] {
  return useMemo(() => {
    if (!station?.uic) return [];

    const enabled = new Set(
      (Object.entries(preferences) as [keyof UserPreferences, boolean][])
        .filter(([, on]) => on)
        .map(([cat]) => cat),
    );

    return SAMPLE_ACTIVITIES.filter(
      (a) => a.stationUic === station.uic && enabled.has(a.category),
    ).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [station, preferences]);
}
