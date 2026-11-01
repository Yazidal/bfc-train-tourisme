import type { AccessMode } from "../../domain/types";
import { THEMES } from "../../domain/types";
import { RATINGS_MOCK } from "../../services/ratings";
import { ThemeFilters } from "../theme-filters/ThemeFilters";

type Props = {
  open: boolean;
  themes: Set<string>;
  onThemes: (next: Set<string>) => void;
  mode: AccessMode;
  onMode: (mode: AccessMode) => void;
  maxMinutes: number | null;
  onMaxMinutes: (value: number | null) => void;
  minRating: number;
  onMinRating: (value: number) => void;
  ratingsAvailable: boolean;
  onReset: () => void;
  onClose: () => void;
};

export function FiltersPanel({
  open,
  themes,
  onThemes,
  mode,
  onMode,
  maxMinutes,
  onMaxMinutes,
  minRating,
  onMinRating,
  ratingsAvailable,
  onReset,
  onClose,
}: Props) {
  if (!open) return null;

  const activeThemes = themes.size !== THEMES.length;

  return (
    <section
      className="filters"
      id="filters-panel"
      aria-label="Filtres de recherche"
    >
      <div className="filters__head">
        <h2>Filtres</h2>
        <button
          type="button"
          className="filters__close"
          onClick={onClose}
          aria-label="Fermer les filtres"
        >
          ×
        </button>
      </div>

      <ThemeFilters selected={themes} onChange={onThemes} />

      <div className="filters__grid">
        <label>
          Accès au lieu
          <select
            value={mode}
            onChange={(event) => onMode(event.target.value as AccessMode)}
          >
            <option value="walk">À pied (2 km)</option>
            <option value="bike">À vélo (5 km)</option>
          </select>
        </label>
        <label>
          Temps de train max
          <select
            value={maxMinutes ?? ""}
            onChange={(event) =>
              onMaxMinutes(
                event.target.value ? Number(event.target.value) : null,
              )
            }
          >
            <option value="">Toutes les gares BFC</option>
            <option value="30">30 min</option>
            <option value="60">1 heure</option>
            <option value="120">2 heures</option>
          </select>
        </label>
        <label>
          Avis Google
          <select
            value={minRating}
            onChange={(event) => onMinRating(Number(event.target.value))}
            disabled={!ratingsAvailable}
            title={
              ratingsAvailable
                ? "Filtrer les lieux par note minimale"
                : "Aucune note disponible pour le moment"
            }
          >
            <option value="0">Toutes les notes</option>
            <option value="4.5">★ 4,5 et +</option>
            <option value="4">★ 4 et +</option>
            <option value="3">★ 3 et +</option>
          </select>
        </label>
      </div>

      {RATINGS_MOCK && (
        <p className="panel-meta">Notes simulées (VITE_RATINGS_MOCK=true).</p>
      )}
      {!ratingsAvailable && !RATINGS_MOCK && (
        <p className="panel-meta">
          Avis inactifs : ajoutez <code>data/ratings.csv</code> puis relancez{" "}
          <code>npm run data:build</code>.
        </p>
      )}
      {maxMinutes != null && (
        <p className="panel-meta">
          Zone approximative (enveloppe des gares), pas une isochrone.
          Correspondances exclues.
        </p>
      )}

      <div className="filters__foot">
        <button
          type="button"
          className="linkish"
          onClick={onReset}
          disabled={!activeThemes && mode === "walk" && maxMinutes == null && minRating === 0}
        >
          Tout réinitialiser
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          Voir les résultats
        </button>
      </div>
    </section>
  );
}
