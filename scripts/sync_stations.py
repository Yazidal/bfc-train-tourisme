#!/usr/bin/env python3
"""Copy stations.csv → src/data/stations.json and public/data/stations.json."""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT.parent / "bourgogne-franche-comte" / "stations.csv"

rows = []
with CSV.open(newline="", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        rows.append(
            {
                "id": r["stop_id"],
                "name": r["stop_name"],
                "lat": float(r["stop_lat"]),
                "lon": float(r["stop_lon"]),
                "uic": r["uic_code"] or None,
            }
        )

payload = json.dumps(rows, ensure_ascii=False, indent=2)
for dest in (
    ROOT / "src" / "data" / "stations.json",
    ROOT / "public" / "data" / "stations.json",
):
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(payload + "\n", encoding="utf-8")

print(f"Synced {len(rows)} stations")
