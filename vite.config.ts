import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { sncfApiPlugin } from "./server/sncfProxy";

export default defineConfig(({ mode }) => {
  // Third argument "" loads every variable, not only VITE_* ones, so the
  // SNCF token stays server-side (available to the proxy, never to the client).
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react(), sncfApiPlugin(env)],
    server: { port: 5173 },
  };
});
