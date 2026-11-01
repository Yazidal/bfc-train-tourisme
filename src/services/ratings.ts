import type { Poi } from "../domain/types";

/**
 * Ratings come from `data/ratings.csv` (merged into pois.json at build time).
 * Without that file, the "Avis" filter stays disabled — or can be demoed with
 * VITE_RATINGS_MOCK=true (clearly labelled as simulated in the UI).
 */
export const RATINGS_MOCK = import.meta.env.VITE_RATINGS_MOCK === "true";

export type PoiRating = {
  value: number;
  count: number;
  source: string;
  simulated: boolean;
};

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 100_000;
  }
  return result;
}

export function ratingOf(poi: Poi): PoiRating | null {
  if (poi.rating != null) {
    return {
      value: poi.rating,
      count: poi.ratingCount ?? 0,
      source: poi.ratingSource ?? "Google",
      simulated: false,
    };
  }
  if (!RATINGS_MOCK) return null;

  const value = hash(poi.id);
  return {
    value: Math.round((3 + (value % 21) / 10) * 10) / 10,
    count: 5 + (value % 800),
    source: "simulation",
    simulated: true,
  };
}

export function hasRatings(pois: Poi[]): boolean {
  return RATINGS_MOCK || pois.some((poi) => poi.rating != null);
}
