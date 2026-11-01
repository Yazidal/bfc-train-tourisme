#!/usr/bin/env python3
"""Minimum direct-trip duration between BFC stations from SNCF GTFS."""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = Path(__file__).resolve().parents[1]
STATIONS_CSV = ROOT / "bourgogne-franche-comte" / "stations.csv"
STOP_TIMES = ROOT / "stop_times.txt"
OUT = APP / "public" / "data" / "durations.json"

UIC_RE = re.compile(r"(\d{8})")


def parse_clock(value: str) -> int | None:
    parts = value.strip().split(":")
    if len(parts) != 3:
        return None
    h, m, s = (int(p) for p in parts)
    return h * 3600 + m * 60 + s


def main() -> None:
    stations: dict[str, dict] = {}
    uic_to_id: dict[str, str] = {}
    with STATIONS_CSV.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            uic = (row.get("uic_code") or "").strip()
            sid = row["stop_id"]
            stations[sid] = {"id": sid, "name": row["stop_name"], "uic": uic}
            if uic:
                uic_to_id[uic] = sid

    stop_to_station: dict[str, str] = {}
    with (ROOT / "stops.txt").open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            stop_id = row["stop_id"]
            match = UIC_RE.search(stop_id)
            if not match:
                continue
            uic = match.group(1)
            if uic in uic_to_id:
                stop_to_station[stop_id] = uic_to_id[uic]

    trips: dict[str, list[tuple[int, str]]] = defaultdict(list)
    with STOP_TIMES.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            station_id = stop_to_station.get(row["stop_id"])
            if not station_id:
                continue
            clock = parse_clock(row["departure_time"] or row["arrival_time"])
            if clock is None:
                continue
            seq = int(row["stop_sequence"])
            trips[row["trip_id"]].append((seq, clock, station_id))

    best: dict[tuple[str, str], int] = {}
    for stops in trips.values():
        stops.sort(key=lambda x: x[0])
        ordered: list[tuple[int, str]] = []
        seen_last = None
        for _, clock, station_id in stops:
            if seen_last == station_id:
                continue
            ordered.append((clock, station_id))
            seen_last = station_id
        for i, (t1, a) in enumerate(ordered):
            for t2, b in ordered[i + 1 :]:
                minutes = int(round((t2 - t1) / 60))
                if minutes <= 0:
                    continue
                key = (a, b)
                prev = best.get(key)
                if prev is None or minutes < prev:
                    best[key] = minutes

    # Canonical shape consumed by src/domain/types.ts (DurationsFile).
    minutes = {f"{a}|{b}": m for (a, b), m in best.items()}
    payload = {
        "source": "SNCF GTFS (export local, TER/TGV/Intercités)",
        "method": "Durée minimale d’un trajet direct (même trip_id, sans correspondance)",
        "estimate": "Si aucune desserte directe : estimation à 70 km/h à vol d’oiseau",
        "minutes": minutes,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(minutes)} directed pairs to {OUT}")


if __name__ == "__main__":
    main()
