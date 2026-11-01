export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

/**
 * Formats an SNCF/Navitia local datetime ("20260111T081500") as "08:15".
 * Also accepts ISO strings ("2026-01-11T08:15:00").
 */
export function formatClock(value: string): string {
  const compact = /T(\d{2})(\d{2})/.exec(value);
  if (compact) return `${compact[1]}:${compact[2]}`;
  return value;
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

