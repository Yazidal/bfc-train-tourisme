export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const r = 6371;
  const p = Math.PI / 180;
  const dLat = (b.lat - a.lat) * p;
  const dLon = (b.lon - a.lon) * p;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

export function nearest<T extends { lat: number; lon: number }>(
  origin: { lat: number; lon: number },
  items: T[],
): T | null {
  if (items.length === 0) return null;
  let best = items[0];
  let bestD = haversineKm(origin, best);
  for (let i = 1; i < items.length; i += 1) {
    const d = haversineKm(origin, items[i]);
    if (d < bestD) {
      best = items[i];
      bestD = d;
    }
  }
  return best;
}

export function minutesFromDistance(distanceKm: number, speedKmh: number): number {
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}
