import type {
  AccessMode,
  Poi,
  RouteResult,
  Station,
  TrainTime,
} from "../../domain/types";
import { TRAIN_METHOD_LABELS } from "../../domain/types";
import { formatClock, formatKm, formatMinutes } from "../../lib/format";
import { haversineKm } from "../../lib/geo";
import { ratingOf } from "../../services/ratings";
import { PoiCard } from "../pois/PoiCard";

type Props = {
  departure: Station | null;
  arrival: Station | null;
  train: TrainTime | null;
  trainLoading: boolean;
  pois: Poi[];
  totalPois: number;
  hasMore: boolean;
  poisLoading: boolean;
  poisError: string | null;
  selectedPoi: Poi | null;
  walkRoute: RouteResult | null;
  bikeRoute: RouteResult | null;
  mode: AccessMode;
  activeStation: Station | null;
  onSelectPoi: (poi: Poi) => void;
  onOpenDetail: (poi: Poi) => void;
  onShowMore: () => void;
  onCollapse: () => void;
};

export function SidePanel({
  departure,
  arrival,
  train,
  trainLoading,
  pois,
  totalPois,
  hasMore,
  poisLoading,
  poisError,
  selectedPoi,
  walkRoute,
  bikeRoute,
  mode,
  activeStation,
  onSelectPoi,
  onOpenDetail,
  onShowMore,
  onCollapse,
}: Props) {
  const route = mode === "walk" ? walkRoute : bikeRoute;

  return (
    <aside className="panel" aria-label="Détails et lieux à proximité">
      <div className="panel-toolbar">
        <span className="panel-toolbar__title">Trajet & lieux</span>
        <button
          type="button"
          className="panel-toolbar__collapse"
          onClick={onCollapse}
          aria-label="Réduire le panneau pour agrandir la carte"
          title="Réduire le panneau"
        >
          ⟨
        </button>
      </div>

      <section className="panel-section">
        <h2>Itinéraire TER</h2>

        {departure && arrival ? (
          arrival.id === departure.id ? (
            <p className="panel-hint">
              L’arrivée doit être différente de la gare de départ.
            </p>
          ) : (
            <>
              <p className="trip-summary">
                <strong>{departure.name}</strong>
                <span aria-hidden="true"> → </span>
                <strong>{arrival.name}</strong>
              </p>

              {train && (
                <div className="duration-box">
                  <div className="duration-head">
                    <p className="duration-value">
                      {formatMinutes(train.minutes)}
                    </p>
                    <span className={`badge badge--${train.method}`}>
                      {TRAIN_METHOD_LABELS[train.method]}
                    </span>
                  </div>
                  <p className="panel-meta">{train.label}</p>
                  <p className="panel-meta">{train.source}</p>
                  {train.journeys.length > 0 && (
                    <ul className="journey-list">
                      {train.journeys.slice(0, 4).map((journey) => (
                        <li key={journey.departure}>
                          <span>{formatClock(journey.departure)}</span>
                          <span aria-hidden="true">→</span>
                          <span>{formatClock(journey.arrival)}</span>
                          <span className="panel-meta">
                            {formatMinutes(journey.minutes)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {trainLoading && (
                    <p className="panel-meta" role="status">
                      Actualisation des horaires SNCF…
                    </p>
                  )}
                  {train.fetchedAt && (
                    <p className="panel-meta">
                      Données SNCF du{" "}
                      {new Date(train.fetchedAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                  <p className="panel-meta">
                    MVP : trajets directs uniquement, pas de correspondance.
                  </p>
                </div>
              )}
            </>
          )
        ) : (
          <p className="panel-hint">
            Renseignez un départ et une destination ci-dessus, ou cliquez deux
            gares sur la carte.
          </p>
        )}
      </section>

      <section className="panel-section">
        <div className="panel-section-head">
          <h3>Lieux autour de {activeStation?.name ?? "la gare"}</h3>
          <span className="panel-count" aria-live="polite">
            {totalPois}
          </span>
        </div>
        <p className="panel-meta">
          Rayon {mode === "walk" ? "2 km à pied" : "5 km à vélo"} · trajets
          estimés &gt; 30 min exclus
        </p>

        {poisLoading && (
          <p className="panel-hint" role="status">
            Chargement des lieux…
          </p>
        )}
        {poisError && (
          <p className="panel-hint">Lieux indisponibles : {poisError}</p>
        )}
        {!poisLoading && !poisError && totalPois === 0 && (
          <p className="panel-hint">
            Aucun lieu touristique trouvé autour de cette gare pour les filtres
            et le rayon choisis.
          </p>
        )}

        {pois.length > 0 && (
          <>
            <ul className="poi-list">
              {pois.map((item) => (
                <PoiCard
                  key={item.id}
                  poi={item}
                  active={selectedPoi?.id === item.id}
                  distanceKm={
                    activeStation ? haversineKm(activeStation, item) : 0
                  }
                  rating={ratingOf(item)}
                  onSelect={() => onSelectPoi(item)}
                  onOpenDetail={() => onOpenDetail(item)}
                />
              ))}
            </ul>
            {hasMore && (
              <button type="button" className="pager" onClick={onShowMore}>
                Afficher {Math.min(20, totalPois - pois.length)} lieux de plus
              </button>
            )}
          </>
        )}
      </section>

      {selectedPoi && activeStation && (
        <section className="panel-section">
          <h3>{selectedPoi.name}</h3>
          <p className="panel-meta">{selectedPoi.subCategory}</p>
          <div className="duration-box">
            {walkRoute && (
              <p>
                À pied : {formatMinutes(walkRoute.minutes)} ·{" "}
                {formatKm(walkRoute.distanceKm)}
              </p>
            )}
            {bikeRoute && (
              <p>
                À vélo : {formatMinutes(bikeRoute.minutes)} ·{" "}
                {formatKm(bikeRoute.distanceKm)}
              </p>
            )}
            <p className="panel-meta">Itinéraire : {route?.engine}</p>
            <button
              type="button"
              className="linkish"
              onClick={() => onOpenDetail(selectedPoi)}
              aria-haspopup="dialog"
            >
              Voir la fiche complète
            </button>
          </div>
        </section>
      )}
    </aside>
  );
}
