import type { ReactNode } from "react";
import type { FeatureCollection } from "geojson";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import type { GeoPoint, MapTarget } from "../domain/types";
import { BFC_BOUNDS } from "../domain/types";
import { MapViewController } from "./MapViewController";

type Props = {
  boundary: FeatureCollection | null;
  fit: boolean;
  flyTo: MapTarget | null;
  fitTo: GeoPoint[] | null;
  children: ReactNode;
};

/**
 * Presentation only: OpenStreetMap base map + imperative camera control.
 * Panning is confined to the region (BFC-only app). The map fills its parent;
 * every UI element is an overlay, so it never steals space from the map.
 */
export function MapCanvas({ boundary, fit, flyTo, fitTo, children }: Props) {
  return (
    <MapContainer
      className="map"
      bounds={BFC_BOUNDS}
      minZoom={7}
      maxBoundsViscosity={1}
      worldCopyJump={false}
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <MapViewController
        boundary={boundary}
        fit={fit}
        flyTo={flyTo}
        fitTo={fitTo}
      />
      {children}
    </MapContainer>
  );
}
