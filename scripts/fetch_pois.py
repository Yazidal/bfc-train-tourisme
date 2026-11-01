#!/usr/bin/env python3
"""LEGACY / OPTIONAL: fetch tourism POIs from OpenStreetMap (Overpass).

This is NOT what the app serves: `public/data/pois.json` is built by
`prepare_data.py` from the DATAtourisme extract (`data/BFC.csv`). Use this
script only as an OSM fallback; it writes `data/pois-osm.json`, which is a
source file, not a served artifact (schemas differ on purpose).
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
OUT = APP / "data" / "pois-osm.json"

# BFC bounding box (south, west, north, east)
BBOX = (46.15, 2.85, 48.45, 7.25)

# DATAtourisme-aligned themes used in the UI
THEME_MAP = {
    ("tourism", "museum"): ("heritage", "CulturalSite / Museum"),
    ("tourism", "gallery"): ("culture", "CulturalSite / Gallery"),
    ("tourism", "attraction"): ("culture", "PointOfInterest / Attraction"),
    ("tourism", "theme_park"): ("leisure", "SportsAndLeisurePlace"),
    ("tourism", "zoo"): ("nature", "NaturalHeritage / Zoo"),
    ("tourism", "winery"): ("gastronomy", "FoodEstablishment / Wine"),
    ("tourism", "viewpoint"): ("nature", "NaturalHeritage / Viewpoint"),
    ("historic", "castle"): ("heritage", "CulturalSite / DefenceSite"),
    ("historic", "ruins"): ("heritage", "CulturalSite / ArchaeologicalSite"),
    ("historic", "monument"): ("heritage", "CulturalSite / Monument"),
    ("historic", "church"): ("heritage", "CulturalSite / ReligiousSite"),
    ("historic", "abbey"): ("heritage", "CulturalSite / ReligiousSite"),
    ("historic", "archaeological_site"): ("heritage", "CulturalSite / ArchaeologicalSite"),
    ("leisure", "nature_reserve"): ("nature", "NaturalHeritage"),
    ("leisure", "park"): ("nature", "ParkAndGarden"),
    ("amenity", "theatre"): ("culture", "CulturalSite / PerformingArts"),
    ("amenity", "restaurant"): ("gastronomy", "FoodEstablishment"),
}

QUERY = f"""
[out:json][timeout:90];
(
  nwr["tourism"="museum"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["tourism"="gallery"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["tourism"="attraction"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["tourism"="theme_park"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["tourism"="zoo"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["tourism"="winery"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["tourism"="viewpoint"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["historic"="castle"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["historic"="ruins"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["historic"="monument"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["historic"="abbey"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["historic"="archaeological_site"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["leisure"="nature_reserve"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  nwr["amenity"="theatre"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
);
out center tags;
"""


def classify(tags: dict[str, str]) -> tuple[str, str] | None:
    for key, value, theme in (
        ("tourism", tags.get("tourism"), None),
        ("historic", tags.get("historic"), None),
        ("leisure", tags.get("leisure"), None),
        ("amenity", tags.get("amenity"), None),
    ):
        if not value:
            continue
        mapped = THEME_MAP.get((key, value))
        if mapped:
            return mapped
    return None


def address(tags: dict[str, str]) -> str:
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:postcode"),
        tags.get("addr:city") or tags.get("addr:place") or tags.get("is_in:city"),
    ]
    line = " ".join(p for p in parts[:2] if p)
    city = ", ".join(p for p in parts[2:] if p)
    if line and city:
        return f"{line}, {city}"
    return city or line or tags.get("addr:full") or "Adresse non renseignée"


def main() -> None:
    req = urllib.request.Request(
        "https://overpass-api.de/api/interpreter",
        data=QUERY.encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    pois = []
    seen: set[tuple[float, float, str]] = set()
    for el in payload.get("elements", []):
        tags = el.get("tags") or {}
        name = tags.get("name")
        if not name:
            continue
        classified = classify(tags)
        if not classified:
            continue
        theme, dt_type = classified
        if "lat" in el:
            lat, lon = el["lat"], el["lon"]
        else:
            center = el.get("center") or {}
            lat, lon = center.get("lat"), center.get("lon")
        if lat is None or lon is None:
            continue
        key = (round(lat, 5), round(lon, 5), name)
        if key in seen:
            continue
        seen.add(key)
        pois.append(
            {
                "id": f"osm-{el['type']}-{el['id']}",
                "name": name,
                "category": theme,
                "datatourismeType": dt_type,
                "address": address(tags),
                "lat": lat,
                "lon": lon,
                "commune": tags.get("addr:city") or tags.get("is_in:city") or "",
            }
        )

    pois.sort(key=lambda p: p["name"].casefold())
    out = {
        "source": "OpenStreetMap via Overpass, themes aligned to DATAtourisme ontology",
        "taxonomy": "DATAtourisme (CulturalSite, NaturalHeritage, FoodEstablishment, SportsAndLeisurePlace)",
        "note": "Replace this file with the DATAtourisme extract (same schema) when available.",
        "count": len(pois),
        "pois": pois,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(pois)} POIs to {OUT}")


if __name__ == "__main__":
    main()
