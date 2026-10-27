import type { Activity } from "../types";

/**
 * Placeholder catalogue — replace with API / POI database keyed by station UIC.
 * Only a subset of major hubs is seeded so the UX can be tested end-to-end.
 */
export const SAMPLE_ACTIVITIES: Activity[] = [
  {
    id: "beaune-vignoble",
    stationUic: "87713545",
    title: "Route des Grands Crus à vélo",
    description: "Balade vigneronne entre Beaune et les côtes de Nuits.",
    category: "nature",
    distanceKm: 4.2,
    durationMinutes: 180,
  },
  {
    id: "beaune-hospices",
    stationUic: "87713545",
    title: "Hospices de Beaune",
    description: "Visite des célèbres toits vernissés et du musée.",
    category: "culture",
    distanceKm: 0.8,
    durationMinutes: 90,
  },
  {
    id: "dijon-mustard",
    stationUic: "87713040",
    title: "Atelier moutarde Fallot",
    description: "Découverte artisanale et dégustation.",
    category: "gastronomy",
    distanceKm: 1.1,
    durationMinutes: 60,
  },
  {
    id: "dijon-owl",
    stationUic: "87713040",
    title: "Parcours de la Chouette",
    description: "Balade historique dans le centre de Dijon.",
    category: "culture",
    distanceKm: 0.5,
    durationMinutes: 120,
  },
  {
    id: "besancon-citadelle",
    stationUic: "87718007",
    title: "Citadelle Vauban",
    description: "Forteresse UNESCO, musées et panorama sur le Doubs.",
    category: "culture",
    distanceKm: 2.3,
    durationMinutes: 240,
  },
  {
    id: "besancon-boat",
    stationUic: "87718007",
    title: "Croisière sur le Doubs",
    description: "Descente fluviale au pied de la citadelle.",
    category: "nature",
    distanceKm: 1.5,
    durationMinutes: 75,
  },
  {
    id: "auxerre-cathedral",
    stationUic: "87683573",
    title: "Cathédrale Saint-Étienne",
    description: "Architecture gothique et vitraux au cœur d'Auxerre.",
    category: "culture",
    distanceKm: 0.6,
    durationMinutes: 60,
  },
  {
    id: "belfort-lion",
    stationUic: "87184002",
    title: "Lion de Bartholdi",
    description: "Monument emblématique et vue sur les Vosges du Sud.",
    category: "culture",
    distanceKm: 1.0,
    durationMinutes: 45,
  },
  {
    id: "nevers-cathedral",
    stationUic: "87696005",
    title: "Cathédrale Saint-Cyr-et-Sainte-Julitte",
    description: "Chef-d'œuvre roman et panorama sur la Loire.",
    category: "culture",
    distanceKm: 0.9,
    durationMinutes: 75,
  },
];
