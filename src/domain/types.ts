/**
 * Pure domain types and business constants.
 * No React, no Leaflet, no fetch: safe to import anywhere.
 */

export type GeoPoint = { lat: number; lon: number };

export type Station = {
  id: string;
  uic: string;
  name: string;
  trigram: string;
  insee: string;
  lat: number;
  lon: number;
};

export type Town = {
  name: string;
  lat: number;
  lon: number;
  nearestStationId: string;
};

export type Poi = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address: string;
  commune: string;
  themes: string[];
  /** Readable DATAtourisme sub-category, e.g. "Château", "Restaurant". */
  subCategory: string;
  /** Optional: filled at build time from data/ratings.csv. */
  rating?: number;
  ratingCount?: number;
  ratingSource?: string;
};

/** A map camera target: a point, optionally with a zoom level. */
export type MapTarget = GeoPoint & { zoom?: number };

export type DurationsFile = {
  source: string;
  method: string;
  estimate: string;
  minutes: Record<string, number>;
};

/** Where a train duration comes from. Displayed on screen (MVP requirement). */
export type TravelMethod = "sncf" | "gtfs" | "estimate";

export const TRAIN_METHOD_LABELS: Record<TravelMethod, string> = {
  sncf: "API SNCF",
  gtfs: "GTFS",
  estimate: "Estimation",
};

/** One direct train journey, as returned by the SNCF journey API. */
export type TrainJourney = {
  /** Local SNCF datetime, e.g. "20260111T081500". */
  departure: string;
  arrival: string;
  minutes: number;
  transfers: number;
  status?: string;
};

export type TrainTime = {
  minutes: number;
  method: TravelMethod;
  /** Human readable method, e.g. "Estimation (70 km/h à vol d'oiseau)". */
  label: string;
  /** Data source, e.g. "SNCF (API Navitia)". */
  source: string;
  /** Next direct departures when live data is available. */
  journeys: TrainJourney[];
  fetchedAt?: string;
};

export type AccessMode = "walk" | "bike";

export type RouteResult = {
  mode: AccessMode;
  minutes: number;
  distanceKm: number;
  geometry: [number, number][];
  engine: string;
};

export type ReferenceData = {
  stations: Station[];
  towns: Town[];
  durations: DurationsFile;
  boundary: GeoJSON.FeatureCollection | null;
};

/** DATAtourisme-derived themes used by the UI filters. */
export const THEMES = [
  "Nature & paysages",
  "Parcs & jardins",
  "Patrimoine & monuments",
  "Culture & musées",
  "Gastronomie & produits locaux",
  "Restaurants, cafés & bars",
  "Loisirs & attractions",
  "Sports & activités",
  "Événements",
  "Hébergements",
  "Commerces & services",
  "Transport & mobilité",
] as const;

export const WALK_RADIUS_KM = 2;
export const BIKE_RADIUS_KM = 5;
export const MAX_POI_MINUTES = 30;
export const WALK_KMH = 4.5;
export const BIKE_KMH = 15;
export const TRAIN_ESTIMATE_KMH = 70;

export const BFC_BOUNDS: [[number, number], [number, number]] = [
  [46.15, 2.85],
  [48.45, 7.25],
];
