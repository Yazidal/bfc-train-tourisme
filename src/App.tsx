import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import { PreferencesBar } from "./components/PreferencesBar";
import { RegionMap } from "./components/RegionMap";
import { StationPanel } from "./components/StationPanel";
import { useActivitiesNearStation } from "./hooks/useActivitiesNearStation";
import type { Station, UserPreferences } from "./types";
import { DEFAULT_PREFERENCES } from "./types";
import stationsData from "./data/stations.json";

export default function App() {
  const stations = stationsData as Station[];
  const [boundary, setBoundary] = useState<FeatureCollection | null>(null);
  const [selected, setSelected] = useState<Station | null>(null);
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [query, setQuery] = useState("");

  const activities = useActivitiesNearStation(selected, preferences);

  useEffect(() => {
    fetch("/data/bfc-boundary.geojson")
      .then((r) => r.json())
      .then(setBoundary)
      .catch(() => setBoundary(null));
  }, []);

  const filteredStations = query.trim()
    ? stations.filter((s) =>
        s.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : stations;

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">SNCF · GTFS déc. 2025</p>
          <h1>Bourgogne-Franche-Comté</h1>
          <p className="subtitle">
            Carte des gares — base pour recommander des activités selon vos
            envies.
          </p>
        </div>
        <label className="search">
          <span className="visually-hidden">Rechercher une gare</span>
          <input
            type="search"
            list="station-list"
            placeholder="Rechercher une gare…"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              const exact = stations.find(
                (s) => s.name.toLowerCase() === value.trim().toLowerCase(),
              );
              if (exact) setSelected(exact);
            }}
          />
          <datalist id="station-list">
            {stations.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>
      </header>

      <PreferencesBar preferences={preferences} onChange={setPreferences} />

      <div className="layout">
        <div className="map-wrap">
          <RegionMap
            stations={filteredStations}
            boundary={boundary}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
        <StationPanel
          station={selected}
          activities={activities}
          onClose={() => setSelected(null)}
        />
      </div>
    </div>
  );
}
