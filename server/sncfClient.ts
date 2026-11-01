/**
 * Minimal SNCF (Navitia) journey client.
 * Runs server-side only: the API token never reaches the browser.
 *
 * Confirmed endpoint shape (api.sncf.com):
 *   GET /v1/coverage/{coverage}/journeys
 *       ?from=stop_area:SNCF:<uic>&to=stop_area:SNCF:<uic>
 *       &datetime=YYYYMMDDTHHMMSS&max_nb_transfers=0&count=5&depth=1
 *   Authorization: Basic base64("<token>:")
 */

export type SncfClientOptions = {
  base: string;
  coverage: string;
  token: string;
  /** "basic" (api.sncf.com) or "bearer" (api.navitia.io). */
  authMode: string;
  /**
   * Development placeholder: when true, return synthetic journeys instead of
   * calling SNCF. Lets the whole UI (durations, next departures, method badge)
   * be exercised while the API token is still unavailable.
   */
  mock?: boolean;
};

export type SncfApiMode = "live" | "mock" | "unconfigured";

export type SncfJourney = {
  departure: string;
  arrival: string;
  minutes: number;
  transfers: number;
  status?: string;
};

type NavitiaJourney = {
  duration?: number;
  nb_transfers?: number;
  departure_date_time?: string;
  arrival_date_time?: string;
  status?: string;
};

type NavitiaResponse = {
  journeys?: NavitiaJourney[];
  error?: { message?: string; id?: string };
};

export class SncfConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SncfConfigError";
  }
}

export function navitiaDatetime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 100_000;
  }
  return result;
}

/**
 * Deterministic fake timetable: three direct departures (+10, +40, +70 min).
 * Duration (18–82 min) is stable for a station pair, so the UI does not jump
 * between renders. Replace by the real API by unsetting SNCF_API_MOCK.
 */
export function mockJourneys(fromUic: string, toUic: string): SncfJourney[] {
  const minutes = 18 + (hash(`${fromUic}|${toUic}`) % 65);
  const start = new Date(Date.now() + 10 * 60_000);

  return [0, 30, 60].map((offset) => {
    const departure = new Date(start.getTime() + offset * 60_000);
    const arrival = new Date(departure.getTime() + minutes * 60_000);
    return {
      departure: navitiaDatetime(departure),
      arrival: navitiaDatetime(arrival),
      minutes,
      transfers: 0,
      status: "mock",
    };
  });
}

export function createSncfClient(options: SncfClientOptions) {
  const base = options.base.replace(/\/$/, "");
  const configured = Boolean(options.token);
  const mock = Boolean(options.mock);
  const token = options.token;

  const mode: SncfApiMode = mock
    ? "mock"
    : configured
      ? "live"
      : "unconfigured";

  function authorization(): string {
    if (options.authMode === "bearer") return token;
    return `Basic ${btoa(`${token}:`)}`;
  }

  async function fetchJourneys(
    fromUic: string,
    toUic: string,
    at: Date = new Date(),
  ): Promise<SncfJourney[]> {
    if (mock) return mockJourneys(fromUic, toUic);

    if (!configured) {
      throw new SncfConfigError(
        "SNCF_API_TOKEN manquant : ajoutez-le dans .env (voir .env.example).",
      );
    }

    const params = new URLSearchParams({
      from: `stop_area:SNCF:${fromUic}`,
      to: `stop_area:SNCF:${toUic}`,
      datetime: navitiaDatetime(at),
      max_nb_transfers: "0",
      count: "5",
      depth: "1",
    });

    const url = `${base}/coverage/${encodeURIComponent(options.coverage)}/journeys?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: authorization(),
        Accept: "application/json",
      },
      // Never let a slow/unreachable SNCF endpoint block the UI fallback.
      signal: AbortSignal.timeout(8000),
    });

    const body = (await response.json().catch(() => ({}))) as NavitiaResponse;

    if (!response.ok) {
      throw new Error(
        body.error?.message ??
          `API SNCF ${response.status} ${response.statusText}`,
      );
    }

    return (body.journeys ?? [])
      .filter(
        (journey) =>
          journey.departure_date_time &&
          journey.arrival_date_time &&
          typeof journey.duration === "number",
      )
      .map((journey) => ({
        departure: journey.departure_date_time as string,
        arrival: journey.arrival_date_time as string,
        minutes: Math.max(1, Math.round((journey.duration as number) / 60)),
        transfers: journey.nb_transfers ?? 0,
        status: journey.status,
      }))
      .filter((journey) => journey.transfers === 0)
      .sort((a, b) => a.departure.localeCompare(b.departure));
  }

  return { configured, mock, mode, fetchJourneys };
}

export type SncfClient = ReturnType<typeof createSncfClient>;
