import { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { GeoJSON } from "react-leaflet";

export function RegionLayer({ boundary }: { boundary: FeatureCollection }) {
  const style = useMemo(
    () => ({
      color: "#2d4a3e",
      weight: 1.4,
      fillColor: "#3d6b58",
      fillOpacity: 0.06,
    }),
    [],
  );

  return <GeoJSON data={boundary} style={() => style} />;
}
