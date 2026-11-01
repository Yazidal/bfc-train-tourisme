#!/usr/bin/env python3
"""Build app JSON from data/Gare_BFC.csv, data/BFC.csv and SNCF GTFS."""

from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
DATA = APP / "data"
PUBLIC = APP / "public" / "data"
UIC_RE = re.compile(r"(\d{8})")
MAX_POI_KM = 5.0
THEMES = [
    "Nature & paysages",
    "Parcs & jardins",
    "Patrimoine & monuments",
    "Culture & musées",
    "Gastronomie & produits locaux",
    "Restaurants, cafés & bars",
    "Loisirs & attractions",
    "Sports & activités",
    "Événements",
    "Hébergements",
    "Commerces & services",
    "Transport & mobilité",
]
THEME_INDEX = {name: i for i, name in enumerate(THEMES)}

# ---------------------------------------------------------------------------
# DATAtourisme sub-categories
# ---------------------------------------------------------------------------
# `petite_categorie` is a "|"-separated list of ontology classes. Base classes
# (PointOfInterest, PlaceOfInterest, Product, LodgingBusiness…) carry no
# information on their own, so tokens are ranked: the most specific one wins,
# then it is labelled in French. Group order = priority (first group wins).
SUB_CATEGORY_GROUPS: list[tuple[str, tuple[str, ...]]] = [
    ("Château fort", ("FortifiedCastle",)),
    ("Château", ("Castle", "Palace", "Dungeon")),
    ("Citadelle / fort", ("Citadel", "Fort", "FortifiedSet", "DefenceSite")),
    ("Cathédrale", ("Cathedral",)),
    ("Basilique", ("Basilica",)),
    (
        "Abbaye / couvent",
        (
            "Abbey", "Monastery", "Convent", "Cloister", "Collegiate",
            "Chartreuse", "Commanderie",
        ),
    ),
    ("Église / chapelle", ("Church", "Chapel")),
    ("Tour / arche", ("Tower", "TriumphalArch")),
    ("Lieu de culte", ("Temple", "Calvary", "ReligiousSite")),
    ("Musée", ("Museum",)),
    ("Centre d'interprétation", ("InterpretationCentre",)),
    ("Galerie / exposition", ("Exhibition", "ExhibitionEvent")),
    ("Théâtre / opéra", ("Theater", "Opera")),
    ("Cinéma", ("Cinema", "MovieTheater")),
    ("Casino / cabaret", ("Casino", "Cabaret", "NightClub")),
    ("Bibliothèque", ("Library",)),
    (
        "Site archéologique",
        ("ArcheologicalSite", "MegalithDolmenMenhir", "RomanPath", "Stone"),
    ),
    ("Ruines", ("Ruins",)),
    (
        "Monument / édifice remarquable",
        (
            "RemarkableHouse", "RemarkableBuilding", "SmallCulturalHeritage",
            "CityHeritage", "TechnicalHeritage", "IndustrialSite", "PigeonLoft",
            "WashHouse", "Mill", "Mine", "Bridge", "Aqueduct", "Fountain",
            "MilitaryCemetery", "RemembranceSite", "Commemoration",
        ),
    ),
    ("Restaurant gastronomique", ("GourmetRestaurant",)),
    (
        "Restaurant",
        (
            "Restaurant", "HotelRestaurant", "BoatRestaurant",
            "FastFoodRestaurant", "SelfServiceCafeteria", "StreetFood",
        ),
    ),
    (
        "Brasserie / bar",
        (
            "BrasserieOrTavern", "BistroOrWineBar", "BarOrPub",
            "CafeOrCoffeeShop", "CafeOrTeahouse",
        ),
    ),
    ("Boulangerie / glacier", ("Bakery", "IceCreamShop", "Glacier")),
    ("Domaine viticole", ("Winery", "Cellar", "Distillery", "Brewery")),
    (
        "Marché / produits locaux",
        (
            "Market", "LocalProductsShop", "CraftsmanShop", "Cooperative",
            "Producer", "ProducersGroup", "Farmer", "Farm", "TeachingFarm",
            "Tasting", "TastingProvider",
        ),
    ),
    ("Hôtel", ("Hotel",)),
    ("Chambre d'hôtes", ("BedAndBreakfast", "Guesthouse", "ChildrensGite")),
    ("Ferme-auberge", ("FarmhouseInn", "TableHotes")),
    (
        "Auberge / hébergement collectif",
        (
            "Hostel", "CollectiveHostel", "StopOverOrGroupLodge",
            "YouthHostelAndInternationalCenter", "CollectiveAccommodation",
        ),
    ),
    (
        "Camping",
        (
            "Camping", "CampingAndCaravanning", "CamperVanArea", "CampingCar",
            "FarmCamping", "NaturalCampingArea",
        ),
    ),
    (
        "Village vacances",
        (
            "HolidayCentre", "HolidayResort", "ClubOrHolidayVillage",
            "MountainResort", "ResidentialLeisurePark",
        ),
    ),
    (
        "Location de vacances",
        ("SelfCateringAccommodation", "RentalAccommodation"),
    ),
    # Below accommodation on purpose: hotels with seminar rooms often carry
    # Conference/BusinessEvent, and should stay labelled "Hôtel".
    (
        "Centre de congrès",
        ("ConventionCentre", "Conference", "Congress", "BusinessEvent"),
    ),
    ("Festival", ("Festival",)),
    (
        "Concert / spectacle",
        (
            "Concert", "Recital", "ShowEvent", "TheaterEvent", "MusicEvent",
            "VisualArtsEvent", "ScreeningEvent",
        ),
    ),
    (
        "Fête traditionnelle",
        (
            "PilgrimageAndProcession", "TraditionalCelebration", "Carnival",
            "Parade", "ReligiousEvent",
        ),
    ),
    (
        "Foire / salon",
        (
            "FairOrShow", "SaleEvent", "GarageSale", "OpenDay", "LocalAnimation",
            "CulturalEvent", "ChildrensEvent", "SocialEvent",
        ),
    ),
    (
        "Événement sportif",
        ("SportsEvent", "SportsCompetition", "SportsDemonstration", "Rally"),
    ),
    ("Parc / jardin", ("NaturalPark", "ParkAndGarden", "Park")),
    ("Forêt", ("Forest",)),
    (
        "Lac / rivière",
        ("Lake", "Pond", "River", "Stream", "Waterfall", "Source", "Canal"),
    ),
    (
        "Site naturel",
        (
            "Gorge", "Cliff", "Mountain", "Summit", "Valley", "Plateau", "Plain",
            "Grassland", "Bocage", "Bog", "Swamp", "Beach", "PointOfView",
            "OutstandingTree", "NaturalCuriosity", "CaveSinkholeOrAven",
            "ChalkyLawn", "Landform", "Cirque",
        ),
    ),
    ("Zoo / aquarium", ("Zoo", "ZooAnimalPark", "Aquarium", "VivariumAquarium")),
    (
        "Parc d'attractions",
        (
            "AmusementPark", "ThemePark", "AdventurePark", "LeisureComplex",
            "MultiActivity",
        ),
    ),
    ("Aire de jeux", ("PlayArea", "Game", "CircusPlace")),
    ("Golf", ("GolfCourse", "MiniGolf")),
    ("Bowling / billard", ("BowlingAlley", "BilliardRoom", "BoulesPitch")),
    ("Piscine / patinoire", ("SwimmingPool", "IceSkatingRink")),
    (
        "Sport",
        (
            "TennisComplex", "SquashCourt", "ClimbingWall", "Gymnasium",
            "FitnessCenter", "FitnessPath", "Stadium", "StadiumOrArena",
            "Racetrack", "RacingCircuit", "EquestrianCenter",
        ),
    ),
    (
        "Sports nautiques",
        ("NauticalCentre", "YachtClub", "Marina", "SightseeingBoat"),
    ),
    ("Bien-être", ("Spa", "BalneotherapyCentre", "ThalassotherapyCentre")),
    (
        "Ski",
        (
            "CrossCountrySkiResort", "CrossCountrySkiTrail",
            "DownhillSkiResort", "DownhillSkiRun",
        ),
    ),
    (
        "Activité de plein air",
        (
            "SummerToboggan", "TobogganBobsleigh", "RailBike",
            "TrackRollerOrSkateBoard", "Course", "TrainingWorkshop",
            "EducationalTrail", "Rambling", "RoadTour",
        ),
    ),
    (
        "Commerce / artisanat",
        (
            "Store", "Trader", "BricABrac", "EquipmentRentalShop",
            "EquipmentRepairShop",
        ),
    ),
    (
        "Service",
        (
            "MedicalPlace", "ServiceProvider", "SchoolOrTrainingCentre",
            "NonHousingRealEstateRental",
        ),
    ),
    ("Transport", ("Transport", "Airfield", "TouristTrain")),
    ("Visite / circuit", ("Tour", "WalkingTour", "Visit", "ActivityProvider")),
    (
        "Office de tourisme",
        ("LocalTouristOffice", "TouristInformationCenter"),
    ),
]

# Classes that never describe the place by themselves.
GENERIC_TOKENS = {
    "PlaceOfInterest", "PointOfInterest", "Product", "Practice", "OrderedList",
    "Event", "EntertainmentAndEvent", "LocalBusiness", "CulturalSite",
    "NaturalHeritage", "SportsAndLeisurePlace", "Accommodation",
    "AccommodationProduct", "LodgingBusiness", "FoodEstablishment", "HotelTrade",
    "BusinessPlace", "CivicStructure", "Rental",
}

SUB_CATEGORY_LABELS: dict[str, str] = {}
SUB_CATEGORY_PRIORITY: dict[str, int] = {}
for _index, (_label, _tokens) in enumerate(SUB_CATEGORY_GROUPS):
    for _token in _tokens:
        SUB_CATEGORY_LABELS[_token] = _label
        SUB_CATEGORY_PRIORITY[_token] = 1000 - _index

# Rare classes that occur in BFC.csv outside the station buffers today. Mapped
# anyway so a future re-export never surfaces an English label in a French UI.
EXTRA_TOKENS = {
    "AlpinePasture": "Pâturage d'altitude",
    "BuddhistTemple": "Temple bouddhiste",
    "CivilCemetery": "Cimetière",
    "Col": "Col / crête",
    "Crest": "Col / crête",
    "CyclingTour": "Circuit cycliste",
    "IslandPeninsula": "Île / presqu'île",
    "KidsClub": "Club enfants",
    "Lock": "Écluse",
    "TourOperatorOrTravelAgency": "Agence de voyage",
    "TourismCableCar": "Téléphérique touristique",
    "Trampoline": "Trampoline",
}
for _token, _label in EXTRA_TOKENS.items():
    SUB_CATEGORY_LABELS[_token] = _label
    SUB_CATEGORY_PRIORITY[_token] = 500


def humanize_token(token: str) -> str:
    """Fallback for an unmapped class: 'FortifiedCastle' -> 'Fortified Castle'."""
    return re.sub(r"(?<!^)(?=[A-Z])", " ", token)


def sub_category(row: dict) -> str:
    """Most specific DATAtourisme class of the row, as a French label."""
    tokens = [
        token.strip()
        for token in (row.get("petite_categorie") or "").split("|")
        if token.strip()
    ]
    best = ""
    best_score = -1
    for token in tokens:
        if token in GENERIC_TOKENS:
            continue
        score = SUB_CATEGORY_PRIORITY.get(token, 1)
        if score > best_score:
            best, best_score = token, score
    if not best:
        return ""
    return SUB_CATEGORY_LABELS.get(best, humanize_token(best))


def poi_id(name: str, lat: float, lon: float) -> str:
    """Stable id: independent of CSV row order (unlike a line index)."""
    raw = f"{name.casefold()}|{lat:.6f}|{lon:.6f}"
    return "poi-" + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:10]


# ---------------------------------------------------------------------------
# Region mask: keep only points inside Bourgogne-Franche-Comté
# ---------------------------------------------------------------------------


def load_region() -> list[list[list[tuple[float, float]]]]:
    """Boundary polygons as [outer_ring, *holes], each ring a list of (lon, lat)."""
    data = json.loads((PUBLIC / "bfc-boundary.geojson").read_text(encoding="utf-8"))
    polygons: list[list[list[tuple[float, float]]]] = []

    def add_polygon(coords: list) -> None:
        polygons.append(
            [[(float(x), float(y)) for x, y in ring] for ring in coords if ring]
        )

    for feature in data.get("features", []):
        geometry = feature.get("geometry") or {}
        kind = geometry.get("type")
        if kind == "Polygon":
            add_polygon(geometry["coordinates"])
        elif kind == "MultiPolygon":
            for polygon in geometry["coordinates"]:
                add_polygon(polygon)
    return polygons


def _in_ring(x: float, y: float, ring: list[tuple[float, float]]) -> bool:
    """Ray casting, adapted from W. Randolph Franklin."""
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def in_region(
    polygons: list[list[list[tuple[float, float]]]], lon: float, lat: float
) -> bool:
    for polygon in polygons:
        if _in_ring(lon, lat, polygon[0]) and not any(
            _in_ring(lon, lat, hole) for hole in polygon[1:]
        ):
            return True
    return False


def load_ratings() -> dict[str, dict]:
    """
    Optional build-time ratings (Google export or any provider).

    data/ratings.csv columns: id,rating,rating_count,source
    `id` is the stable poi id (see poi_id). Missing file => no ratings, and the
    'Avis' filter stays disabled in the UI.
    """
    path = DATA / "ratings.csv"
    if not path.exists():
        return {}

    ratings: dict[str, dict] = {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            key = (row.get("id") or "").strip()
            if not key:
                continue
            try:
                value = float(row.get("rating") or "")
            except ValueError:
                continue
            try:
                count = int(row.get("rating_count") or 0)
            except ValueError:
                count = 0
            ratings[key] = {
                "rating": round(value, 1),
                "ratingCount": count,
                "ratingSource": (row.get("source") or "Google").strip(),
            }
    return ratings


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    r = 6371.0
    lat1, lon1 = a
    lat2, lon2 = b
    p = math.pi / 180
    dlat = (lat2 - lat1) * p
    dlon = (lon2 - lon1) * p
    x = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin(dlon / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(x))


def parse_clock(value: str) -> int | None:
    parts = value.strip().split(":")
    if len(parts) != 3:
        return None
    h, m, s = (int(p) for p in parts)
    return h * 3600 + m * 60 + s


def load_stations() -> list[dict]:
    stations = []
    with (DATA / "Gare_BFC.csv").open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            uic = str(row["Code_UIC"]).strip()
            stations.append(
                {
                    "id": uic,
                    "uic": uic,
                    "name": row["Nom_Gare"].strip(),
                    "trigram": (row.get("Trigramme") or "").strip(),
                    "insee": (row.get("Code commune") or "").strip(),
                    "lat": float(row["Latitude"]),
                    "lon": float(row["Longitude"]),
                }
            )
    stations.sort(key=lambda s: s["name"].casefold())
    return stations


def load_pois(stations: list[dict], region: list) -> list[dict]:
    coords = [(s["lat"], s["lon"]) for s in stations]
    pois = []
    seen: set[tuple[str, float, float]] = set()
    total = 0
    duplicates = 0
    no_theme = 0
    outside = 0

    with (DATA / "BFC.csv").open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            total += 1
            name = (row.get("Nom_du_POI") or "").strip()
            if not name:
                continue
            try:
                lat = float(row["Latitude"])
                lon = float(row["Longitude"])
            except (TypeError, ValueError):
                continue
            if not any(haversine_km((lat, lon), s) <= MAX_POI_KM for s in coords):
                continue
            # Strict region mask: the app only ever displays BFC.
            if region and not in_region(region, lon, lat):
                outside += 1
                continue

            # Same place listed twice in the DATAtourisme extract.
            key = (name.casefold(), round(lat, 5), round(lon, 5))
            if key in seen:
                duplicates += 1
                continue
            seen.add(key)

            bits = 0
            labels = []
            for part in (row.get("grande_categorie") or "").split("|"):
                label = part.strip()
                index = THEME_INDEX.get(label)
                if index is None:
                    continue
                bits |= 1 << index
                labels.append(label)
            if not bits:
                no_theme += 1
                continue

            address = ", ".join(
                p
                for p in (
                    (row.get("Adresse_postale") or "").strip(),
                    (row.get("Code_postal") or "").strip(),
                    (row.get("commune") or "").strip(),
                )
                if p
            )
            pois.append(
                {
                    # Stable across CSV re-exports, unlike an enumerate() index.
                    "id": poi_id(name, lat, lon),
                    "name": name,
                    "lat": lat,
                    "lon": lon,
                    "address": address or "Adresse non renseignée",
                    "commune": (row.get("commune") or "").strip(),
                    "themes": labels,
                    # Readable DATAtourisme sub-category (e.g. "Château").
                    "subCategory": sub_category(row) or labels[0],
                }
            )

    print(
        f"POIs : {total} lus · {len(pois)} conservés · {duplicates} doublons · "
        f"{outside} hors BFC · {no_theme} sans thème"
    )
    return pois


def load_towns(stations: list[dict], pois: list[dict]) -> list[dict]:
    buckets: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for p in pois:
        if p["commune"]:
            buckets[p["commune"]].append((p["lat"], p["lon"]))
    towns = []
    for name, pts in buckets.items():
        lat = sum(p[0] for p in pts) / len(pts)
        lon = sum(p[1] for p in pts) / len(pts)
        nearest = min(stations, key=lambda s: haversine_km((lat, lon), (s["lat"], s["lon"])))
        towns.append(
            {
                "name": name,
                "lat": lat,
                "lon": lon,
                "nearestStationId": nearest["id"],
            }
        )
    towns.sort(key=lambda t: t["name"].casefold())
    return towns


def load_durations(stations: list[dict]) -> dict:
    uics = {s["uic"] for s in stations}
    stop_to_uic: dict[str, str] = {}
    with (ROOT / "stops.txt").open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            match = UIC_RE.search(row["stop_id"])
            if not match:
                continue
            uic = match.group(1)
            if uic in uics:
                stop_to_uic[row["stop_id"]] = uic

    trips: dict[str, list[tuple[int, int, str]]] = defaultdict(list)
    with (ROOT / "stop_times.txt").open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            uic = stop_to_uic.get(row["stop_id"])
            if not uic:
                continue
            clock = parse_clock(row["departure_time"] or row["arrival_time"])
            if clock is None:
                continue
            trips[row["trip_id"]].append((int(row["stop_sequence"]), clock, uic))

    best: dict[str, int] = {}
    for stops in trips.values():
        stops.sort(key=lambda x: x[0])
        ordered: list[tuple[int, str]] = []
        last = None
        for _, clock, uic in stops:
            if uic == last:
                continue
            ordered.append((clock, uic))
            last = uic
        for i, (t1, a) in enumerate(ordered):
            for t2, b in ordered[i + 1 :]:
                minutes = int(round((t2 - t1) / 60))
                if minutes <= 0:
                    continue
                key = f"{a}|{b}"
                prev = best.get(key)
                if prev is None or minutes < prev:
                    best[key] = minutes

    return {
        "source": "SNCF GTFS (export local TER/TGV/Intercités)",
        "method": "Durée minimale d’un train direct (même trip_id, sans correspondance)",
        "estimate": "Si aucune desserte directe : estimation à 70 km/h à vol d’oiseau",
        "minutes": best,
    }


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    stations = load_stations()
    region = load_region()
    pois = load_pois(stations, region)
    towns = load_towns(stations, pois)
    durations = load_durations(stations)

    ratings = load_ratings()
    if ratings:
        matched = 0
        for poi in pois:
            extra = ratings.get(poi["id"])
            if extra:
                poi.update(extra)
                matched += 1
        print(f"Avis : {matched}/{len(pois)} lieux enrichis depuis data/ratings.csv")

    (PUBLIC / "stations.json").write_text(
        json.dumps(stations, ensure_ascii=False), encoding="utf-8"
    )
    (PUBLIC / "pois.json").write_text(
        json.dumps(
            {
                "source": "DATAtourisme (extrait BFC.csv)",
                "taxonomy": THEMES,
                "count": len(pois),
                "pois": pois,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (PUBLIC / "towns.json").write_text(json.dumps(towns, ensure_ascii=False), encoding="utf-8")
    (PUBLIC / "durations.json").write_text(
        json.dumps(durations, ensure_ascii=False), encoding="utf-8"
    )
    print(f"stations {len(stations)} | pois {len(pois)} | towns {len(towns)} | pairs {len(durations['minutes'])}")


if __name__ == "__main__":
    main()
