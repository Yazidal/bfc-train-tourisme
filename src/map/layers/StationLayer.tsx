import { Marker, Popup } from "react-leaflet";
import type { Station } from "../../domain/types";
import { MARKER_ICONS } from "../markers";

type Props = {
  stations: Station[];
  departureId: string | null;
  arrivalId: string | null;
  reachableIds: Set<string> | null;
  onSelect: (station: Station) => void;
};

function iconFor(
  station: Station,
  departureId: string | null,
  arrivalId: string | null,
  reachableIds: Set<string> | null,
) {
  if (departureId === station.id) return MARKER_ICONS.departure;
  if (arrivalId === station.id) return MARKER_ICONS.arrival;
  if (reachableIds?.has(station.id)) return MARKER_ICONS.reachable;
  return MARKER_ICONS.station;
}

export function StationLayer({
  stations,
  departureId,
  arrivalId,
  reachableIds,
  onSelect,
}: Props) {
  return (
    <>
      {stations.map((station) => (
        <Marker
          key={station.id}
          position={[station.lat, station.lon]}
          icon={iconFor(station, departureId, arrivalId, reachableIds)}
          eventHandlers={{ click: () => onSelect(station) }}
        >
          <Popup>
            <strong>{station.name}</strong>
            <div className="popup-meta">Gare TER · UIC {station.uic}</div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
