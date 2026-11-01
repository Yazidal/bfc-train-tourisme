type Pt = { lat: number; lon: number };

function cross(o: Pt, a: Pt, b: Pt): number {
  return (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);
}

/** Convex hull in [lat, lon] pairs for Leaflet polygons. */
export function convexHull(points: Pt[]): [number, number][] {
  const unique = [...new Map(points.map((p) => [`${p.lat}|${p.lon}`, p])).values()];
  if (unique.length < 3) return unique.map((p) => [p.lat, p.lon]);

  const sorted = unique.sort((a, b) => a.lon - b.lon || a.lat - b.lat);
  const lower: Pt[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper].map((p) => [p.lat, p.lon]);
}
