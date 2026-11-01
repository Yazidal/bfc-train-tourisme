import type { Plugin } from "vite";
import { createSncfClient, type SncfClient } from "./sncfClient";

const MOUNT = "/api/sncf";
const UIC = /^\d{8}$/;

function send(res: any, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function createHandler(
  client: SncfClient,
  meta: { base: string; coverage: string },
) {
  return async function handler(req: any, res: any): Promise<void> {
    if (req.method && req.method !== "GET") {
      send(res, 405, { error: "Méthode non autorisée" });
      return;
    }

    const path = (req.url ?? "/").split("?")[0].replace(/\/+$/, "");

    // Health/status endpoint: lets the UI say whether live data is used.
    if (path === "/status") {
      send(res, 200, {
        mode: client.mode,
        configured: client.configured,
        mock: client.mock,
        base: meta.base,
        coverage: meta.coverage,
      });
      return;
    }

    if (path !== "/journeys") {
      send(res, 404, { error: "Route inconnue. Utilisez /journeys ou /status." });
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";

    if (!UIC.test(from) || !UIC.test(to)) {
      send(res, 400, {
        error: "Paramètres requis : from et to (code UIC à 8 chiffres).",
      });
      return;
    }

    if (!client.configured && !client.mock) {
      send(res, 503, {
        error: "API SNCF non configurée",
        detail:
          "Ajoutez SNCF_API_TOKEN dans .env (voir .env.example), puis relancez `npm run dev`. Pour tester sans jeton : SNCF_API_MOCK=true.",
      });
      return;
    }

    try {
      const journeys = await client.fetchJourneys(from, to);
      send(res, 200, {
        source: client.mock
          ? "SNCF (simulation locale — SNCF_API_MOCK)"
          : "SNCF (API Navitia)",
        fetchedAt: new Date().toISOString(),
        journeys,
      });
    } catch (error) {
      send(res, 502, {
        error: "Échec de l'API SNCF",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

/**
 * Vite plugin exposing GET /api/sncf/journeys during `dev` and `preview`.
 * In production this same handler must be deployed as a serverless function
 * (Vercel/Netlify/Cloudflare) so the token stays private.
 */
export function sncfApiPlugin(env: Record<string, string>): Plugin {
  const base = env.SNCF_API_BASE || "https://api.sncf.com/v1";
  const coverage = env.SNCF_API_COVERAGE || "sncf";

  const client = createSncfClient({
    base,
    coverage,
    token: env.SNCF_API_TOKEN || "",
    authMode: env.SNCF_API_AUTH_MODE || "basic",
    mock: env.SNCF_API_MOCK === "true",
  });

  const handler = createHandler(client, { base, coverage });

  return {
    name: "sncf-api-proxy",
    configureServer(server) {
      server.middlewares.use(MOUNT, handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(MOUNT, handler);
    },
  };
}
