import L from "leaflet";
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";
import type { FeatureCollection } from "geojson";
import type { Station } from "../types";

const BFC_BOUNDS: L.LatLngBoundsExpression = [
  [46.15, 2.85],
  [48.45, 7.25],
];

const stationIcon = L.divIcon({
  className: "station-marker",
  html: '<span aria-hidden="true"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const selectedIcon = L.divIcon({
  className: "station-marker station-marker--selected",
  html: '<span aria-hidden="true"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

type Props = {
  stations: Station[];
  boundary: FeatureCollection | null;
  selected: Station | null;
  onSelect: (station: Station) => void;
};

function FitRegion({ boundary }: { boundary: FeatureCollection | null }) {
  const map = useMap();

  useEffect(() => {
    if (!boundary) {
      map.fitBounds(BFC_BOUNDS, { padding: [24, 24] });
      return;
    }
    const layer = L.geoJSON(boundary);
    map.fitBounds(layer.getBounds(), { padding: [32, 32], maxZoom: 9 });
  }, [boundary, map]);

  return null;
}

function FocusStation({ station }: { station: Station | null }) {
  const map = useMap();

  useEffect(() => {
    if (!station) return;
    map.flyTo([station.lat, station.lon], 12, { duration: 0.8 });
  }, [station, map]);

  return null;
}

export function RegionMap({ stations, boundary, selected, onSelect }: Props) {
  const regionStyle = useMemo(
    () => ({
      color: "#2d4a3e",
      weight: 1.5,
      fillColor: "#3d6b58",
      fillOpacity: 0.08,
    }),
    [],
  );

  return (
    <MapContainer
      className="map"
      bounds={BFC_BOUNDS}
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitRegion boundary={boundary} />
      <FocusStation station={selected} />
      {boundary && <GeoJSON data={boundary} style={() => regionStyle} />}
      {stations.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lon]}
          icon={selected?.id === s.id ? selectedIcon : stationIcon}
          eventHandlers={{
            click: () => onSelect(s),
          }}
        />
      ))}
    </MapContainer>
  );
}
