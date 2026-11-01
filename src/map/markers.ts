import L from "leaflet";

function dot(className: string, size: number) {
  return L.divIcon({
    className,
    html: "<span></span>",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Distinct icons: departure station, arrival station, reachable station, POI. */
export const MARKER_ICONS = {
  station: dot("station-marker", 12),
  departure: dot("station-marker station-marker--departure", 18),
  arrival: dot("station-marker station-marker--arrival", 16),
  reachable: dot("station-marker station-marker--reachable", 12),
  poi: dot("poi-marker", 10),
  poiSelected: dot("poi-marker poi-marker--selected", 14),
};
