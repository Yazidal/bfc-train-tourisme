import type { AccessMode, RouteResult } from "../domain/types";
import { BIKE_KMH, WALK_KMH } from "../domain/types";
import { haversineKm, minutesFromDistance } from "../lib/geo";
import { ROUTING_ENABLED } from "./config";

const ENGINES: Record<AccessMode, string> = {
  walk: "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
  bike: "https://routing.openstreetmap.de/routed-bike/route/v1/driving",
};

const ENGINE_LABEL = "OSRM (routing.openstreetmap.de / FOSSGIS)";

function straightLine(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  mode: AccessMode,
  reason: string,
): RouteResult {
  const distanceKm = haversineKm(from, to);
  const speed = mode === "walk" ? WALK_KMH : BIKE_KMH;
  return {
    mode,
    minutes: minutesFromDistance(distanceKm, speed),
    distanceKm,
    geometry: [
      [from.lat, from.lon],
      [to.lat, to.lon],
    ],
    engine: `${reason} — estimation à vol d'oiseau (${speed} km/h)`,
  };
}

/** Walk/bike route between a station and a POI, with an estimate fallback. */
export async function fetchRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  mode: AccessMode,
): Promise<RouteResult> {
  if (!ROUTING_ENABLED) {
    return straightLine(from, to, mode, "Routage désactivé");
  }

  const url = `${ENGINES[mode]}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route?.geometry?.coordinates) throw new Error("no route");

    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (coordinate: [number, number]) => [coordinate[1], coordinate[0]],
    );

    return {
      mode,
      minutes: Math.max(1, Math.round(route.duration / 60)),
      distanceKm: route.distance / 1000,
      geometry: coordinates,
      engine: ENGINE_LABEL,
    };
  } catch {
    return straightLine(from, to, mode, "OSRM indisponible");
  }
}
