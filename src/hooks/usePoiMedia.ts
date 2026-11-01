import { useEffect, useState } from "react";
import type { Poi } from "../domain/types";
import {
  loadPoiGallery,
  loadPoiSummary,
  type PoiPhoto,
  type PoiSummary,
} from "../services/photos";

/** Wikipedia summary for one POI (thumbnail + description). */
export function usePoiSummary(poi: Poi | null): PoiSummary | null {
  const [summary, setSummary] = useState<PoiSummary | null>(null);

  useEffect(() => {
    if (!poi) {
      setSummary(null);
      return;
    }

    const controller = new AbortController();
    let alive = true;
    setSummary(null);

    loadPoiSummary(poi, controller.signal).then((next) => {
      if (alive) setSummary(next);
    });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [poi]);

  return summary;
}

/** Commons gallery, loaded only when the detail dialog is open. */
export function usePoiGallery(poi: Poi | null): PoiPhoto[] {
  const [photos, setPhotos] = useState<PoiPhoto[]>([]);

  useEffect(() => {
    if (!poi) {
      setPhotos([]);
      return;
    }

    const controller = new AbortController();
    let alive = true;
    setPhotos([]);

    loadPoiGallery(poi, controller.signal).then((next) => {
      if (alive) setPhotos(next);
    });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [poi]);

  return photos;
}
