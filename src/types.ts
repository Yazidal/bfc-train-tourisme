export type ActivityCategory =
  | "nature"
  | "culture"
  | "gastronomy"
  | "family"
  | "sport"
  | "wellness";

export type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  uic: string | null;
};

export type Activity = {
  id: string;
  stationUic: string;
  title: string;
  description: string;
  category: ActivityCategory;
  distanceKm: number;
  durationMinutes: number;
};

export type UserPreferences = Record<ActivityCategory, boolean>;

export const ACTIVITY_CATEGORIES: {
  id: ActivityCategory;
  label: string;
}[] = [
  { id: "nature", label: "Nature" },
  { id: "culture", label: "Culture" },
  { id: "gastronomy", label: "Gastronomie" },
  { id: "family", label: "Famille" },
  { id: "sport", label: "Sport" },
  { id: "wellness", label: "Bien-être" },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  nature: true,
  culture: true,
  gastronomy: true,
  family: false,
  sport: false,
  wellness: false,
};
