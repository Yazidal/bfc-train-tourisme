import { useEffect, useRef, useState } from "react";
import type { Station, Town } from "../../domain/types";
import { stationForHit, useStationHits } from "./useStationHits";

type Props = {
  stations: Station[];
  towns: Town[];
  placeholder?: string;
  onPickStation: (station: Station) => void;
};

export function StationSearch({
  stations,
  towns,
  placeholder = "Gare ou commune…",
  onPickStation,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const hits = useStationHits(stations, towns, query);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () =>
      document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [open]);

  const pick = (hit: ReturnType<typeof useStationHits>[number]) => {
    const station = stationForHit(stations, hit);
    if (!station) return;
    onPickStation(station);
    setQuery(station.name);
    setOpen(false);
  };

  const showList = open && query.trim().length > 0;

  return (
    <div className="search-box" ref={boxRef}>
      <input
        type="search"
        role="combobox"
        aria-expanded={showList && hits.length > 0}
        aria-controls="search-hits"
        aria-autocomplete="list"
        aria-label="Rechercher une gare ou une commune"
        aria-activedescendant={
          showList && hits[activeIndex]
            ? `search-hit-${activeIndex}`
            : undefined
        }
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, hits.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter") {
            const hit = hits[activeIndex];
            if (hit) {
              event.preventDefault();
              pick(hit);
            }
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {showList && (
        <ul
          className="search-hits"
          id="search-hits"
          role="listbox"
          aria-label="Résultats de recherche"
        >
          {hits.length === 0 && (
            <li className="search-empty" role="status">
              Aucune gare ni commune en Bourgogne-Franche-Comté.
            </li>
          )}
          {hits.map((hit, index) => (
            <li
              key={
                hit.kind === "station"
                  ? `s-${hit.station.id}`
                  : `t-${hit.town.name}`
              }
              id={`search-hit-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`search-option ${
                index === activeIndex ? "search-option--active" : ""
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pick(hit)}
            >
              <span>{hit.kind === "station" ? "Gare" : "Commune"}</span>
              {hit.kind === "station" ? hit.station.name : hit.town.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
