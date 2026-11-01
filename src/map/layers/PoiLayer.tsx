import { Marker, Popup } from "react-leaflet";
import type { Poi } from "../../domain/types";
import { MARKER_ICONS } from "../markers";

type Props = {
  pois: Poi[];
  selectedId: string | null;
  onSelect: (poi: Poi) => void;
  onOpenDetail: (poi: Poi) => void;
};

export function PoiLayer({
  pois,
  selectedId,
  onSelect,
  onOpenDetail,
}: Props) {
  return (
    <>
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.lat, poi.lon]}
          icon={
            selectedId === poi.id
              ? MARKER_ICONS.poiSelected
              : MARKER_ICONS.poi
          }
          eventHandlers={{ click: () => onSelect(poi) }}
        >
          <Popup>
            <strong>{poi.name}</strong>
            <div className="popup-meta">
              {poi.subCategory} · {poi.themes.join(" · ")}
            </div>
            <div className="popup-meta">{poi.address}</div>
            <button
              type="button"
              className="popup-link"
              onClick={() => onOpenDetail(poi)}
            >
              Plus de détails
            </button>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
