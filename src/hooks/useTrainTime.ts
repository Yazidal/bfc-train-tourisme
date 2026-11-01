import { useEffect, useState } from "react";
import type { DurationsFile, Station, TrainTime } from "../domain/types";
import { TRAIN_API_ENABLED } from "../services/config";
import { trainTime, trainTimeStatic } from "../services/train";

type State = {
  result: TrainTime | null;
  /** True while the live SNCF API call is in flight (a fallback is already shown). */
  loading: boolean;
};

export function useTrainTime(
  from: Station | null,
  to: Station | null,
  table: DurationsFile | null,
): State {
  const [state, setState] = useState<State>({ result: null, loading: false });

  useEffect(() => {
    if (!from || !to || from.id === to.id || !table) {
      setState({ result: null, loading: false });
      return;
    }

    const fallback = trainTimeStatic(from, to, table);
    if (!TRAIN_API_ENABLED) {
      setState({ result: fallback, loading: false });
      return;
    }

    const controller = new AbortController();
    setState({ result: fallback, loading: true });

    trainTime(from, to, table, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ result, loading: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ result: fallback, loading: false });
        }
      });

    return () => controller.abort();
  }, [from, to, table]);

  return state;
}
