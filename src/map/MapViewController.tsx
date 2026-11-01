import L from "leaflet";
import { useEffect, useRef } from "react";
import type { FeatureCollection } from "geojson";
import { useMap } from "react-leaflet";
import type { GeoPoint, MapTarget } from "../domain/types";
import { BFC_BOUNDS } from "../domain/types";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** Keep the framed area clear of the floating sidebar (desktop) / sheet (mobile). */
function sidePadding(): {
  paddingTopLeft: [number, number];
  paddingBottomRight: [number, number];
} {
  const wide = typeof window !== "undefined" && window.innerWidth > 860;
  return wide
    ? { paddingTopLeft: [420, 24], paddingBottomRight: [40, 40] }
    : { paddingTopLeft: [16, 16], paddingBottomRight: [16, 40] };
}

function FitRegion({
  boundary,
  disabled,
}: {
  boundary: FeatureCollection | null;
  disabled: boolean;
}) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (disabled || done.current) return;
    done.current = true;

    if (!boundary) {
      map.fitBounds(BFC_BOUNDS, { ...sidePadding() });
      return;
    }
    map.fitBounds(L.geoJSON(boundary).getBounds(), {
      ...sidePadding(),
      maxZoom: 9,
    });
  }, [boundary, map, disabled]);

  return null;
}

/**
 * Confine panning/zooming to the region: the app is BFC-only, so there is no
 * reason to let the user wander outside (lighter, no grey areas, no wrap).
 */
function RegionBounds({ boundary }: { boundary: FeatureCollection | null }) {
  const map = useMap();

  useEffect(() => {
    if (!boundary) return;
    const bounds = L.geoJSON(boundary).getBounds();
    map.setMaxBounds(bounds.pad(0.02));
    map.options.maxBoundsViscosity = 1;
    map.setMinZoom(Math.max(7, map.getBoundsZoom(bounds, false)));
  }, [boundary, map]);

  return null;
}

function FlyTo({ target }: { target: MapTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const animate = !prefersReducedMotion();
    map.flyTo([target.lat, target.lon], target.zoom ?? 12, {
      duration: animate ? 0.7 : 0,
      animate,
    });
  }, [target, map]);

  return null;
}

/** Fit several points (e.g. station + POI) so both are visible. */
function FitTo({ points }: { points: GeoPoint[] | null }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = L.latLngBounds(
      points.map((point) => [point.lat, point.lon] as [number, number]),
    );
    map.fitBounds(bounds, {
      ...sidePadding(),
      maxZoom: 16,
      animate: !prefersReducedMotion(),
    });
  }, [points, map]);

  return null;
}

type Props = {
  boundary: FeatureCollection | null;
  /** Fit the region once on mount (disabled when a target is already set). */
  fit: boolean;
  flyTo: MapTarget | null;
  fitTo: GeoPoint[] | null;
};

export function MapViewController({ boundary, fit, flyTo, fitTo }: Props) {
  return (
    <>
      <RegionBounds boundary={boundary} />
      <FitRegion boundary={boundary} disabled={!fit || !!flyTo || !!fitTo} />
      <FlyTo target={flyTo} />
      <FitTo points={fitTo} />
    </>
  );
}

