import { useEffect, useState } from "react";
import { TRAIN_API_ENABLED } from "../services/config";
import {
  fetchTrainApiStatus,
  type TrainApiStatus,
} from "../services/train/sncf";

/** One call per session: describes whether the SNCF API is usable. */
export function useTrainApiStatus(): TrainApiStatus | null {
  const [status, setStatus] = useState<TrainApiStatus | null>(null);

  useEffect(() => {
    if (!TRAIN_API_ENABLED) return;
    const controller = new AbortController();

    fetchTrainApiStatus(controller.signal).then((next) => {
      if (!controller.signal.aborted) setStatus(next);
    });

    return () => controller.abort();
  }, []);

  return status;
}
