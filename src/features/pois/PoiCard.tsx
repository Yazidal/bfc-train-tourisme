import type { Poi } from "../../domain/types";
import { usePoiSummary } from "../../hooks/usePoiMedia";
import { formatKm, formatRating } from "../../lib/format";
import type { PoiRating } from "../../services/ratings";

type Props = {
  poi: Poi;
  active: boolean;
  distanceKm: number;
  rating: PoiRating | null;
  onSelect: () => void;
  onOpenDetail: () => void;
};

function PoiThumb({ poi }: { poi: Poi }) {
  const summary = usePoiSummary(poi);

  if (summary === null) {
    return <span className="poi-thumb poi-thumb--loading" aria-hidden="true" />;
  }
  if (!summary.imageUrl) {
    return (
      <span className="poi-thumb poi-thumb--empty" aria-hidden="true">
        {poi.subCategory.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      className="poi-thumb"
      src={summary.imageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      width={76}
      height={76}
    />
  );
}

export function PoiCard({
  poi,
  active,
  distanceKm,
  rating,
  onSelect,
  onOpenDetail,
}: Props) {
  return (
    <li className={`poi-card ${active ? "poi-card--on" : ""}`}>
      <button
        type="button"
        className="poi-card-main"
        onClick={onSelect}
        aria-pressed={active}
      >
        <PoiThumb poi={poi} />
        <span className="poi-card-body">
          <span className="poi-card-top">
            <span className="poi-card-cat">{poi.subCategory}</span>
            <span className="poi-card-dist">{formatKm(distanceKm)}</span>
          </span>
          <strong className="poi-card-name">{poi.name}</strong>
          <span className="poi-card-address">{poi.address}</span>
          {rating && (
            <span className="poi-rating">
              <span aria-hidden="true">★</span> {formatRating(rating.value)}
              <span className="poi-rating-count">
                ({rating.count} avis{rating.simulated ? " simulés" : ""})
              </span>
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        className="poi-card-more"
        onClick={onOpenDetail}
        aria-haspopup="dialog"
      >
        Plus de détails
      </button>
    </li>
  );
}
