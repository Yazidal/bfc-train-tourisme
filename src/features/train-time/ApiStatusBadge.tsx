import type { TrainApiStatus } from "../../services/train/sncf";

type Props = {
  status: TrainApiStatus | null;
  enabled: boolean;
};

const LABELS = {
  live: "API SNCF connectée",
  mock: "API SNCF simulée (SNCF_API_MOCK)",
  unconfigured: "API SNCF en attente du jeton · repli GTFS / estimation",
} as const;

/**
 * Placeholder-aware status: makes it obvious which source produced the
 * displayed duration, and flips to "connectée" as soon as a token is set.
 */
export function ApiStatusBadge({ status, enabled }: Props) {
  if (!enabled) {
    return (
      <span className="api-status api-status--off">
        API SNCF désactivée · repli GTFS / estimation
      </span>
    );
  }

  if (!status) {
    return (
      <span className="api-status api-status--pending">
        API SNCF : vérification…
      </span>
    );
  }

  return (
    <span
      className={`api-status api-status--${status.mode}`}
      title={`${status.base} · coverage ${status.coverage}`}
    >
      {LABELS[status.mode]}
    </span>
  );
}
