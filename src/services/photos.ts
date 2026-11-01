import type { Poi } from "../domain/types";
import { getJson } from "./http";

/** One Wikipedia/Commons photo, with its page for attribution. */
export type PoiPhoto = {
  url: string;
  pageUrl: string | null;
  title: string | null;
};

export type PoiSummary = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  pageUrl: string | null;
  photos: PoiPhoto[];
};

const EMPTY: PoiSummary = {
  title: null,
  description: null,
  imageUrl: null,
  pageUrl: null,
  photos: [],
};

const WIKI = "https://fr.wikipedia.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";

const summaryCache = new Map<string, Promise<PoiSummary>>();
const galleryCache = new Map<string, Promise<PoiPhoto[]>>();

/**
 * Small concurrency limiter: a 20-card page would otherwise fire 20 Wikipedia
 * requests at once. Four in flight keeps Wikimedia happy and the UI responsive.
 */
const MAX_CONCURRENT = 4;
let activeRequests = 0;
const waiters: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeRequests >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  activeRequests += 1;
  try {
    return await task();
  } finally {
    activeRequests -= 1;
    waiters.shift()?.();
  }
}

type WikiPage = {
  pageid?: number;
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
};

type CommonsPage = {
  title?: string;
  imageinfo?: { thumburl?: string; descriptionurl?: string }[];
};

/** Nearest French Wikipedia page: short description + main photo. */
async function fromWikipedia(
  poi: Poi,
  signal?: AbortSignal,
): Promise<Partial<PoiSummary>> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "geosearch",
    ggscoord: `${poi.lat}|${poi.lon}`,
    ggsradius: "800",
    ggslimit: "1",
    prop: "pageimages|extracts",
    exintro: "1",
    explaintext: "1",
    exsentences: "3",
    piprop: "thumbnail",
    pithumbsize: "640",
  });

  const data = await getJson<{ query?: { pages?: Record<string, WikiPage> } }>(
    `${WIKI}?${params.toString()}`,
    signal,
  );
  const pages = Object.values(data.query?.pages ?? {});
  const page = pages[0];
  if (!page) return {};

  return {
    title: page.title?.replace(/\s*\(.+\)$/, "") ?? null,
    description: page.extract?.trim() || null,
    imageUrl: page.thumbnail?.source ?? null,
    pageUrl: page.pageid
      ? `https://fr.wikipedia.org/?curid=${page.pageid}`
      : null,
  };
}

/** Nearby photos on Wikimedia Commons (free, no API key, CORS-enabled). */
async function fromCommons(
  poi: Poi,
  signal?: AbortSignal,
): Promise<PoiPhoto[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "geosearch",
    ggscoord: `${poi.lat}|${poi.lon}`,
    ggsradius: "500",
    ggslimit: "6",
    ggsnamespace: "6",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "640",
  });

  const data = await getJson<{ query?: { pages?: Record<string, CommonsPage> } }>(
    `${COMMONS}?${params.toString()}`,
    signal,
  );

  return Object.values(data.query?.pages ?? {})
    .flatMap((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl) return [];
      return [
        {
          url: info.thumburl,
          pageUrl: info.descriptionurl ?? null,
          title: page.title?.replace(/^File:/, "") ?? null,
        },
      ];
    })
    .slice(0, 6);
}

/**
 * Wikipedia summary only (1 request). Used for the 20 list thumbnails, so the
 * list never triggers the heavier Commons gallery query.
 */
export function loadPoiSummary(
  poi: Poi,
  signal?: AbortSignal,
): Promise<PoiSummary> {
  const cached = summaryCache.get(poi.id);
  if (cached) return cached;

  const request = withSlot(() => fromWikipedia(poi, signal))
    .then((wiki) => ({ ...EMPTY, ...wiki }))
    .catch(() => {
      summaryCache.delete(poi.id);
      return EMPTY;
    });

  summaryCache.set(poi.id, request);
  return request;
}

/** Commons gallery (1 request). Only loaded when the detail dialog opens. */
export function loadPoiGallery(
  poi: Poi,
  signal?: AbortSignal,
): Promise<PoiPhoto[]> {
  const cached = galleryCache.get(poi.id);
  if (cached) return cached;

  const request = withSlot(() => fromCommons(poi, signal)).catch(() => {
    galleryCache.delete(poi.id);
    return [] as PoiPhoto[];
  });

  galleryCache.set(poi.id, request);
  return request;
}

/** Summary + gallery, for callers that need both at once. */
export async function loadPoiDetails(
  poi: Poi,
  signal?: AbortSignal,
): Promise<PoiSummary> {
  const [summary, photos] = await Promise.all([
    loadPoiSummary(poi, signal),
    loadPoiGallery(poi, signal),
  ]);

  return {
    ...summary,
    photos,
    imageUrl: summary.imageUrl ?? photos[0]?.url ?? null,
  };
}

