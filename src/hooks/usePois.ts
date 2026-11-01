import { useEffect, useState } from "react";
import type { Poi } from "../domain/types";
import { loadPois } from "../services/pois";

type State = {
  pois: Poi[];
  source: string | null;
  loading: boolean;
  error: string | null;
};

/** Loads the large POI catalogue only when `enabled` becomes true. */
export function usePois(enabled: boolean): State {
  const [state, setState] = useState<State>({
    pois: [],
    source: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    loadPois()
      .then((file) => {
        if (!cancelled) {
          setState({
            pois: file.pois,
            source: file.source,
            loading: false,
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          pois: [],
          source: null,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Impossible de charger les lieux touristiques.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
