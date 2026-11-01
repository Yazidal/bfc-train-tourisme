import { useState } from "react";
import type { Station } from "./domain/types";
import { ExplorePage } from "./features/explore/ExplorePage";
import { HomePage } from "./features/home/HomePage";
import { usePois } from "./hooks/usePois";
import { useReferenceData } from "./hooks/useReferenceData";

type View = "home" | "explore";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [initialDeparture, setInitialDeparture] = useState<Station | null>(null);
  const { data, error } = useReferenceData();
  const pois = usePois(view === "explore");

  if (error) {
    return (
      <main className="boot boot--error">
        <h1>Données indisponibles</h1>
        <p>{error}</p>
        <p className="panel-meta">
          Lancez <code>npm run data:build</code> pour générer{" "}
          <code>public/data</code>, puis rechargez la page.
        </p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="boot">
        <p>Chargement des gares de Bourgogne-Franche-Comté…</p>
      </main>
    );
  }

  if (view === "home") {
    return (
      <HomePage
        stations={data.stations}
        towns={data.towns}
        onStart={(station) => {
          setInitialDeparture(station ?? null);
          setView("explore");
        }}
      />
    );
  }

  return (
    <ExplorePage
      stations={data.stations}
      towns={data.towns}
      pois={pois.pois}
      poisLoading={pois.loading}
      poisError={pois.error}
      durations={data.durations}
      boundary={data.boundary}
      initialDeparture={initialDeparture}
      onHome={() => setView("home")}
    />
  );
}
