import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import type {
  AccessMode,
  DurationsFile,
  GeoPoint,
  MapTarget,
  Poi,
  RouteResult,
  Station,
  Town,
} from "../../domain/types";
import {
  BIKE_KMH,
  BIKE_RADIUS_KM,
  MAX_POI_MINUTES,
  THEMES,
  WALK_KMH,
  WALK_RADIUS_KM,
} from "../../domain/types";
import { useTrainApiStatus } from "../../hooks/useTrainApiStatus";
import { useTrainTime } from "../../hooks/useTrainTime";
import { haversineKm, minutesFromDistance, nearest } from "../../lib/geo";
import { convexHull } from "../../lib/hull";
import { MapCanvas } from "../../map/MapCanvas";
import { PoiLayer } from "../../map/layers/PoiLayer";
import { ReachabilityLayer } from "../../map/layers/ReachabilityLayer";
import { RegionLayer } from "../../map/layers/RegionLayer";
import { RouteLayer } from "../../map/layers/RouteLayer";
import { StationLayer } from "../../map/layers/StationLayer";
import { TRAIN_API_ENABLED } from "../../services/config";
import { RATINGS_MOCK, hasRatings, ratingOf } from "../../services/ratings";
import { fetchRoute } from "../../services/routing";
import { trainTimeStatic } from "../../services/train";
import { PoiDetailDialog } from "../pois/PoiDetailDialog";
import { FiltersPanel } from "../filters/FiltersPanel";
import { SidePanel } from "../station-details/SidePanel";
import { TripPlanner } from "../trip/TripPlanner";
import { ApiStatusBadge } from "../train-time/ApiStatusBadge";

const PAGE_SIZE = 20;

type Props = {
  stations: Station[];
  towns: Town[];
  pois: Poi[];
  poisLoading: boolean;
  poisError: string | null;
  durations: DurationsFile;
  boundary: FeatureCollection | null;
  initialDeparture: Station | null;
  onHome: () => void;
};

export function ExplorePage({
  stations,
  towns,
  pois,
  poisLoading,
  poisError,
  durations,
  boundary,
  initialDeparture,
  onHome,
}: Props) {
  const [departure, setDeparture] = useState<Station | null>(initialDeparture);
  const [arrival, setArrival] = useState<Station | null>(null);
  const [activeStation, setActiveStation] = useState<Station | null>(
    initialDeparture,
  );
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [detailPoi, setDetailPoi] = useState<Poi | null>(null);
  const [themes, setThemes] = useState<Set<string>>(() => new Set(THEMES));
  const [mode, setMode] = useState<AccessMode>("walk");
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [walkRoute, setWalkRoute] = useState<RouteResult | null>(null);
  const [bikeRoute, setBikeRoute] = useState<RouteResult | null>(null);
  const [focus, setFocus] = useState<MapTarget | null>(initialDeparture);
  const [fitPoints, setFitPoints] = useState<GeoPoint[] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const apiStatus = useTrainApiStatus();

  const focusStation = (station: Station, zoom: number) => {
    setActiveStation(station);
    setSelectedPoi(null);
    setDetailPoi(null);
    setFitPoints(null);
    setFocus({ lat: station.lat, lon: station.lon, zoom });
  };

  const setDepartureStation = (station: Station | null) => {
    setDeparture(station);
    setArrival((previous) =>
      station && previous?.id === station.id ? null : previous,
    );
    if (station) focusStation(station, 13);
    setGeoMessage(null);
  };

  const setArrivalStation = (station: Station | null) => {
    setArrival(station);
    if (station) focusStation(station, 13);
  };

  const swapTrip = () => {
    setDeparture(arrival);
    setArrival(departure);
  };

  /** Map click: fills the departure, then the destination, then only browses. */
  const handleStationClick = (station: Station) => {
    if (!departure) {
      setDepartureStation(station);
      return;
    }
    if (!arrival) {
      setArrivalStation(station);
      return;
    }
    focusStation(station, 12);
  };

  const selectPoi = (poi: Poi) => {
    setSelectedPoi(poi);
    setFocus(null);
    setFitPoints(activeStation ? [activeStation, poi] : [poi]);
  };

  const openDetail = (poi: Poi) => {
    selectPoi(poi);
    setDetailPoi(poi);
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoMessage(
        "La géolocalisation n’est pas disponible. Recherchez une gare ou une commune.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        const station = nearest(here, stations);
        if (!station) return;
        setDepartureStation(station);
        setGeoMessage(`Gare TER la plus proche : ${station.name}.`);
      },
      () => {
        setGeoMessage(
          "Localisation refusée ou indisponible. Utilisez la recherche par gare ou commune.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  /** Approximate reachable area: stations whose static train time fits. */
  const reachable = useMemo(() => {
    if (!departure || maxMinutes == null) return null;

    const ids = new Set<string>([departure.id]);
    const points: Station[] = [departure];

    for (const station of stations) {
      if (station.id === departure.id) continue;
      if (trainTimeStatic(departure, station, durations).minutes <= maxMinutes) {
        ids.add(station.id);
        points.push(station);
      }
    }

    return { ids, hull: convexHull(points) };
  }, [departure, maxMinutes, stations, durations]);

  const visibleStations = useMemo(() => {
    if (!reachable) return stations;
    return stations.filter((station) => reachable.ids.has(station.id));
  }, [stations, reachable]);

  const ratingsAvailable = useMemo(() => hasRatings(pois), [pois]);

  const nearbyPois = useMemo(() => {
    if (!activeStation) return [];

    const radius = mode === "walk" ? WALK_RADIUS_KM : BIKE_RADIUS_KM;
    const speed = mode === "walk" ? WALK_KMH : BIKE_KMH;

    const filtered = pois.filter((poi) => {
      if (!poi.themes.some((theme) => themes.has(theme))) return false;

      const distanceKm = haversineKm(activeStation, poi);
      if (distanceKm > radius) return false;
      if (minutesFromDistance(distanceKm, speed) > MAX_POI_MINUTES) return false;

      if (minRating > 0) {
        const rating = ratingOf(poi);
        if (!rating || rating.value < minRating) return false;
      }
      return true;
    });

    return filtered.sort(
      (a, b) => haversineKm(activeStation, a) - haversineKm(activeStation, b),
    );
  }, [activeStation, pois, themes, mode, minRating]);

  const themeKey = useMemo(() => [...themes].sort().join("|"), [themes]);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeStation?.id, mode, minRating, themeKey]);

  const visiblePois = useMemo(
    () => nearbyPois.slice(0, visibleCount),
    [nearbyPois, visibleCount],
  );

  useEffect(() => {
    if (!selectedPoi || !activeStation) {
      setWalkRoute(null);
      setBikeRoute(null);
      return;
    }

    let cancelled = false;
    Promise.all([
      fetchRoute(activeStation, selectedPoi, "walk"),
      fetchRoute(activeStation, selectedPoi, "bike"),
    ]).then(([walk, bike]) => {
      if (cancelled) return;
      setWalkRoute(walk);
      setBikeRoute(bike);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedPoi, activeStation]);

  const { result: train, loading: trainLoading } = useTrainTime(
    departure,
    arrival,
    durations,
  );

  const drawnRoute = mode === "walk" ? walkRoute : bikeRoute;

  return (
    <div className="app app--map">
      <div className="map-stage">
        <MapCanvas
          boundary={boundary}
          fit={!initialDeparture}
          flyTo={focus}
          fitTo={fitPoints}
        >
          {boundary && <RegionLayer boundary={boundary} />}
          <ReachabilityLayer hull={reachable?.hull ?? []} />
          {drawnRoute && <RouteLayer route={drawnRoute} />}
          <PoiLayer
            pois={visiblePois}
            selectedId={selectedPoi?.id ?? null}
            onSelect={selectPoi}
            onOpenDetail={openDetail}
          />
          <StationLayer
            stations={visibleStations}
            departureId={departure?.id ?? null}
            arrivalId={arrival?.id ?? null}
            reachableIds={reachable?.ids ?? null}
            onSelect={handleStationClick}
          />
        </MapCanvas>

        <div
          className={`map-sidebar ${sidebarOpen ? "" : "map-sidebar--hidden"}`}
        >
          <div className="map-topbar">
            <button
              type="button"
              className="map-iconbtn map-iconbtn--card"
              onClick={onHome}
              title="Accueil"
              aria-label="Retour à l’accueil"
            >
              ←
            </button>

            <TripPlanner
              stations={stations}
              towns={towns}
              departure={departure}
              arrival={arrival}
              onDeparture={setDepartureStation}
              onArrival={setArrivalStation}
              onSwap={swapTrip}
              onLocate={locate}
            />

            <button
              type="button"
              className={`map-iconbtn map-iconbtn--card ${filtersOpen ? "map-iconbtn--on" : ""}`}
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="filters-panel"
              title="Filtres"
              aria-label="Filtres"
            >
              ⚙
            </button>
          </div>

          {filtersOpen && (
            <FiltersPanel
              open={filtersOpen}
              themes={themes}
              onThemes={setThemes}
              mode={mode}
              onMode={setMode}
              maxMinutes={maxMinutes}
              onMaxMinutes={setMaxMinutes}
              minRating={minRating}
              onMinRating={setMinRating}
              ratingsAvailable={ratingsAvailable}
              onReset={() => {
                setThemes(new Set(THEMES));
                setMode("walk");
                setMaxMinutes(null);
                setMinRating(0);
              }}
              onClose={() => setFiltersOpen(false)}
            />
          )}

          <div className="map-sidebar__scroll">
            <SidePanel
              departure={departure}
              arrival={arrival}
              train={train}
              trainLoading={trainLoading}
              pois={visiblePois}
              totalPois={nearbyPois.length}
              hasMore={visiblePois.length < nearbyPois.length}
              poisLoading={poisLoading}
              poisError={poisError}
              selectedPoi={selectedPoi}
              walkRoute={walkRoute}
              bikeRoute={bikeRoute}
              mode={mode}
              activeStation={activeStation}
              onSelectPoi={selectPoi}
              onOpenDetail={openDetail}
              onShowMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
              onCollapse={() => setSidebarOpen(false)}
            />
          </div>
        </div>

        {!sidebarOpen && (
          <button
            type="button"
            className="map-reopen"
            onClick={() => setSidebarOpen(true)}
          >
            Résultats
            <span className="map-reopen__count">{nearbyPois.length}</span>
          </button>
        )}

        <div className="map-status">
          <ApiStatusBadge status={apiStatus} enabled={TRAIN_API_ENABLED} />
          {geoMessage && (
            <p className="map-toast" role="status">
              {geoMessage}
            </p>
          )}
          {RATINGS_MOCK && (
            <p className="map-toast">Notes simulées (VITE_RATINGS_MOCK=true)</p>
          )}
          {!ratingsAvailable && !RATINGS_MOCK && (
            <p className="map-toast">
              Filtre « Avis » inactif : ajoutez data/ratings.csv
            </p>
          )}
          {maxMinutes != null && (
            <p className="map-toast">
              Zone approximative, pas une isochrone.
            </p>
          )}
        </div>
      </div>

      {detailPoi && (
        <PoiDetailDialog
          poi={detailPoi}
          station={activeStation}
          walkRoute={walkRoute}
          bikeRoute={bikeRoute}
          onClose={() => setDetailPoi(null)}
        />
      )}
    </div>
  );
}

