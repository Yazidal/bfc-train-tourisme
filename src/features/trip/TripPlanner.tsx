import { useRef } from "react";
import type { Station, Town } from "../../domain/types";
import { StationPicker } from "./StationPicker";

type Props = {
  stations: Station[];
  towns: Town[];
  departure: Station | null;
  arrival: Station | null;
  onDeparture: (station: Station | null) => void;
  onArrival: (station: Station | null) => void;
  onSwap: () => void;
  onLocate: () => void;
};

/**
 * Departure / destination selector. This is the single place where the trip is
 * defined: two fields, a swap button, and "my location" for the departure.
 */
export function TripPlanner({
  stations,
  towns,
  departure,
  arrival,
  onDeparture,
  onArrival,
  onSwap,
  onLocate,
}: Props) {
  const arrivalRef = useRef<HTMLInputElement>(null);

  /** After picking the departure, jump straight to the destination field. */
  const handleDeparture = (station: Station | null) => {
    onDeparture(station);
    if (station && !arrival) arrivalRef.current?.focus();
  };

  return (
    <section className="trip-planner" aria-label="Choix de l’itinéraire">
      <div className="trip-planner__fields">
        <StationPicker
          label="Départ"
          tone="start"
          value={departure}
          stations={stations}
          towns={towns}
          placeholder="Gare de départ"
          onSelect={handleDeparture}
          onClear={() => onDeparture(null)}
        />
        <StationPicker
          label="Destination"
          tone="end"
          value={arrival}
          stations={stations}
          towns={towns}
          placeholder="Gare d’arrivée"
          inputRef={arrivalRef}
          onSelect={(station) => onArrival(station)}
          onClear={() => onArrival(null)}
        />
      </div>

      <div className="trip-planner__actions">
        <button
          type="button"
          className="trip-action"
          onClick={onLocate}
          title="Utiliser ma position comme départ"
          aria-label="Utiliser ma position comme départ"
        >
          ◎
        </button>
        <button
          type="button"
          className="trip-action"
          onClick={onSwap}
          disabled={!departure && !arrival}
          title="Inverser le départ et la destination"
          aria-label="Inverser le départ et la destination"
        >
          ⇅
        </button>
      </div>
    </section>
  );
}
