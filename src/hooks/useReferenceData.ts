import { useEffect, useState } from "react";
import type { ReferenceData } from "../domain/types";
import { loadReferenceData } from "../services/reference";

type State = {
  data: ReferenceData | null;
  error: string | null;
};

export function useReferenceData(): State {
  const [state, setState] = useState<State>({ data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    loadReferenceData()
      .then((data) => {
        if (!cancelled) setState({ data, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Impossible de charger les données de référence.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
