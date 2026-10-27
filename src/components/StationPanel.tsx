import type { Activity, Station } from "../types";
import { ACTIVITY_CATEGORIES } from "../types";

type Props = {
  station: Station | null;
  activities: Activity[];
  onClose: () => void;
};

const categoryLabel = Object.fromEntries(
  ACTIVITY_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<string, string>;

export function StationPanel({ station, activities, onClose }: Props) {
  if (!station) {
    return (
      <aside className="panel panel--empty">
        <h2>Choisissez une gare</h2>
        <p>
          Cliquez sur un point de la carte pour voir les activités à proximité
          selon vos préférences.
        </p>
        <p className="panel-meta">260 gares SNCF · Bourgogne-Franche-Comté</p>
      </aside>
    );
  }

  return (
    <aside className="panel">
      <div className="panel-header">
        <div>
          <h2>{station.name}</h2>
          {station.uic && <p className="panel-meta">UIC {station.uic}</p>}
        </div>
        <button type="button" className="panel-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </div>

      <p className="panel-coords">
        {station.lat.toFixed(5)}°N, {station.lon.toFixed(5)}°E
      </p>

      <section className="panel-section">
        <h3>Activités à proximité</h3>
        {activities.length === 0 ? (
          <p className="panel-hint">
            Aucune activité exemple pour cette gare avec vos filtres actuels.
            Branchez votre catalogue POI sur le code UIC{" "}
            <code>{station.uic ?? "—"}</code>.
          </p>
        ) : (
          <ul className="activity-list">
            {activities.map((a) => (
              <li key={a.id} className="activity-card">
                <div className="activity-card-top">
                  <span className="activity-tag">{categoryLabel[a.category]}</span>
                  <span className="activity-distance">{a.distanceKm} km</span>
                </div>
                <strong>{a.title}</strong>
                <p>{a.description}</p>
                <span className="activity-duration">~{a.durationMinutes} min</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
