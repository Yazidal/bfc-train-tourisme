/**
 * Runtime configuration.
 * Only non-secret values live here: everything prefixed VITE_ is public.
 * The SNCF token is server-side only (see server/sncfProxy.ts).
 */

/** Base path of the local BFF (Vite dev middleware / future serverless function). */
export const API_BASE = "/api";

/** Set VITE_TRAIN_API=false to skip the live SNCF call and use static GTFS only. */
export const TRAIN_API_ENABLED = import.meta.env.VITE_TRAIN_API !== "false";

/** Set VITE_ROUTING=false to skip OSRM calls and use straight-line estimates. */
export const ROUTING_ENABLED = import.meta.env.VITE_ROUTING !== "false";
