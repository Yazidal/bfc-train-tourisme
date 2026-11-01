import { Polygon } from "react-leaflet";

/** Approximate reachable area: convex hull of the stations, not an isochrone. */
export function ReachabilityLayer({ hull }: { hull: [number, number][] }) {
  if (hull.length < 3) return null;

  return (
    <Polygon
      positions={hull}
      pathOptions={{
        color: "#2f5d4a",
        weight: 1,
        fillColor: "#2f5d4a",
        fillOpacity: 0.12,
      }}
    />
  );
}
