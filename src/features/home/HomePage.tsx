import type { Station, Town } from "../../domain/types";
import { StationSearch } from "../station-search/StationSearch";

type Props = {
  stations: Station[];
  towns: Town[];
  onStart: (station?: Station) => void;
};

export function HomePage({ stations, towns, onStart }: Props) {
  return (
    <main className="home">
      <div className="home-card">
        <p className="eyebrow">TER · Bourgogne-Franche-Comté</p>
        <h1>Partez d’une gare, découvrez la région</h1>
        <p className="home-lead">
          Trouvez une gare TER, voyez les sites et activités autour (données
          DATAtourisme), et estimez le temps de train, à pied ou à vélo.
        </p>
        <StationSearch
          stations={stations}
          towns={towns}
          placeholder="Rechercher une gare ou une commune…"
          onPickStation={(station) => onStart(station)}
        />
        <div className="home-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onStart()}
          >
            Accéder à la carte
          </button>
        </div>
      </div>
    </main>
  );
}
