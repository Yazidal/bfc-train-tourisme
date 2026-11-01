import { Polyline } from "react-leaflet";
import type { RouteResult } from "../../domain/types";

export function RouteLayer({ route }: { route: RouteResult }) {
  return (
    <Polyline
      positions={route.geometry}
      pathOptions={{ color: "#c45c26", weight: 4 }}
    />
  );
}
