import { useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Station, Town } from "../../domain/types";
import {
  stationForHit,
  useStationHits,
} from "../station-search/useStationHits";

type Props = {
  label: string;
  tone: "start" | "end";
  value: Station | null;
  stations: Station[];
  towns: Town[];
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onSelect: (station: Station) => void;
  onClear: () => void;
};

/**
 * One trip field: autocomplete + explicit clear. Typing does not drop the
 * current selection until a new station is picked (or the field is cleared),
 * so the itinerary never becomes silently inconsistent.
 */
export function StationPicker({
  label,
  tone,
  value,
  stations,
  towns,
  placeholder,
  inputRef,
  onSelect,
  onClear,
}: Props) {
  const inputId = useId();
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const hits = useStationHits(stations, towns, query);
  const showList = open && query.trim().length > 0;

  useEffect(() => {
    setQuery(value?.name ?? "");
    setOpen(false);
  }, [value?.id, value?.name]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value?.name ?? "");
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () =>
      document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [open, value?.name]);

  const pick = (index: number) => {
    const hit = hits[index];
    const station = hit ? stationForHit(stations, hit) : null;
    if (!station) return;
    onSelect(station);
    setQuery(station.name);
    setOpen(false);
  };

  const clear = () => {
    onClear();
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="trip-field" ref={boxRef}>
      <span className={`trip-dot trip-dot--${tone}`} aria-hidden="true" />

      <div className="trip-field__body">
        <label className="trip-field__label" htmlFor={inputId}>
          {label}
        </label>

        <div className="trip-field__input">
          <input
            id={inputId}
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showList && hits.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showList && hits[activeIndex]
                ? `${listId}-${activeIndex}`
                : undefined
            }
            value={query}
            placeholder={placeholder ?? label}
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
                event.preventDefault();
                pick(activeIndex);
              } else if (event.key === "Escape") {
                setOpen(false);
                setQuery(value?.name ?? "");
              }
            }}
          />

          {(query || value) && (
            <button
              type="button"
              className="trip-field__clear"
              onClick={clear}
              aria-label={`Effacer ${label.toLowerCase()}`}
              title="Effacer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {showList && (
        <ul
          className="search-hits"
          id={listId}
          role="listbox"
          aria-label={`Suggestions ${label.toLowerCase()}`}
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
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`search-option ${
                index === activeIndex ? "search-option--active" : ""
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pick(index)}
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
