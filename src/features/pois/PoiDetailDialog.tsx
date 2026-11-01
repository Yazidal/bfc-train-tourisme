import { useEffect, useRef } from "react";
import type { Poi, RouteResult, Station } from "../../domain/types";
import { usePoiGallery, usePoiSummary } from "../../hooks/usePoiMedia";
import { formatKm, formatMinutes, formatRating } from "../../lib/format";
import { ratingOf } from "../../services/ratings";

type Props = {
  poi: Poi;
  station: Station | null;
  walkRoute: RouteResult | null;
  bikeRoute: RouteResult | null;
  onClose: () => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PoiDetailDialog({
  poi,
  station,
  walkRoute,
  bikeRoute,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const summary = usePoiSummary(poi);
  const photos = usePoiGallery(poi);
  const rating = ratingOf(poi);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose]);

  const gallery = photos.filter((photo) => photo.url !== summary?.imageUrl);

  return (
    <div
      className="poi-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="poi-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="poi-dialog-title"
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="poi-dialog__head">
          <div>
            <p className="eyebrow">{poi.subCategory}</p>
            <h2 id="poi-dialog-title">{poi.name}</h2>
            {rating && (
              <p className="poi-rating">
                <span aria-hidden="true">★</span> {formatRating(rating.value)}
                <span className="poi-rating-count">
                  ({rating.count} avis
                  {rating.simulated ? " simulés" : ` ${rating.source}`})
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            className="poi-dialog__close"
            onClick={onClose}
            aria-label="Fermer la fiche"
          >
            ×
          </button>
        </header>

        {summary?.imageUrl && (
          <img
            className="poi-dialog__hero"
            src={summary.imageUrl}
            alt={summary.title ?? poi.name}
            loading="lazy"
            decoding="async"
          />
        )}

        {summary === null && (
          <p className="panel-hint" role="status">
            Chargement des informations…
          </p>
        )}

        {summary?.description && (
          <p className="poi-dialog__text">{summary.description}</p>
        )}
        {summary !== null && !summary.description && (
          <p className="panel-hint">
            Pas de description encyclopédique pour ce lieu. Les informations
            ci-dessous proviennent de DATAtourisme.
          </p>
        )}

        <dl className="poi-dialog__meta">
          <div>
            <dt>Catégorie</dt>
            <dd>{poi.subCategory}</dd>
          </div>
          <div>
            <dt>Thèmes</dt>
            <dd>{poi.themes.join(" · ")}</dd>
          </div>
          <div>
            <dt>Adresse</dt>
            <dd>{poi.address}</dd>
          </div>
          <div>
            <dt>Commune</dt>
            <dd>{poi.commune || "—"}</dd>
          </div>
        </dl>

        <section className="poi-dialog__access" aria-label="Temps d'accès">
          <h3>Depuis {station?.name ?? "la gare"}</h3>
          {station ? (
            <>
              {walkRoute && (
                <p>
                  À pied : {formatMinutes(walkRoute.minutes)} ·{" "}
                  {formatKm(walkRoute.distanceKm)}
                </p>
              )}
              {bikeRoute && (
                <p>
                  À vélo : {formatMinutes(bikeRoute.minutes)} ·{" "}
                  {formatKm(bikeRoute.distanceKm)}
                </p>
              )}
              <p className="panel-meta">
                Itinéraire : {(walkRoute ?? bikeRoute)?.engine ?? "calcul…"}
              </p>
            </>
          ) : (
            <p className="panel-hint">
              Choisissez une gare pour afficher les temps d’accès.
            </p>
          )}
        </section>

        {gallery.length > 0 && (
          <section className="poi-dialog__gallery" aria-label="Photos du lieu">
            <h3>Photos alentour</h3>
            <div className="poi-dialog__grid">
              {gallery.map((photo) => (
                <a
                  key={photo.url}
                  href={photo.pageUrl ?? photo.url}
                  target="_blank"
                  rel="noreferrer"
                  title={photo.title ?? "Photo Wikimedia Commons"}
                >
                  <img
                    src={photo.url}
                    alt={photo.title ?? ""}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              ))}
            </div>
            <p className="panel-meta">
              Photos :{" "}
              <a
                href="https://commons.wikimedia.org"
                target="_blank"
                rel="noreferrer"
              >
                Wikimedia Commons
              </a>
            </p>
          </section>
        )}

        <footer className="poi-dialog__footer">
          {summary?.pageUrl && (
            <a
              className="btn-secondary"
              href={summary.pageUrl}
              target="_blank"
              rel="noreferrer"
            >
              Voir sur Wikipédia
            </a>
          )}
          <button type="button" className="btn-primary" onClick={onClose}>
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
}
