import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import {
  transportModes,
  type LatLngTuple,
  type RouteSummary,
  type TransportModeId,
} from "./routingConfig";
type RoutingProps = {
  mode: TransportModeId;
  waypoints: LatLngTuple[];
  onRouteError: () => void;
  onRouteFound: (summary: RouteSummary) => void;
};

function Routing({
  mode,
  onRouteError,
  onRouteFound,
  waypoints,
}: RoutingProps) {
  const map = useMap();

  useEffect(() => {
    if (waypoints.length < 2) {
      return;
    }

    const modeConfig = transportModes[mode];
    const leafletWaypoints = waypoints.map((point) => L.latLng(point));

    const routingControl = L.Routing.control({
      addWaypoints: false,
      collapsible: true,
      fitSelectedRoutes: true,
      lineOptions: {
        addWaypoints: false,
        extendToWaypoints: true,
        missingRouteTolerance: 0,
        styles: [
          { color: "rgba(255,255,255,0.82)", opacity: 0.82, weight: 5 },
          { color: modeConfig.shadow, opacity: 0.58, weight: 4 },
          { color: modeConfig.color, opacity: 0.82, weight: 2.5 },
        ],
      },
      plan: L.Routing.plan(leafletWaypoints, {
        addWaypoints: false,
        createMarker: () => false as unknown as L.Marker,
        draggableWaypoints: false,
        routeWhileDragging: false,
      }),
      router: L.Routing.osrmv1({
        language: "pl",
        profile: modeConfig.profile,
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
      routeWhileDragging: false,
      show: false,
      showAlternatives: false,
    }).addTo(map);

    routingControl.on("routesfound", (event: L.Routing.RoutingResultEvent) => {
      const summary = event.routes[0]?.summary;
      if (!summary) return;

      onRouteFound({
        distance: Math.round(summary.totalDistance),
        time: Math.max(60, Math.round(summary.totalDistance / modeConfig.speedMps)),
      });
    });

    routingControl.on("routingerror", onRouteError);

    return () => {
      map.removeControl(routingControl);
    };
  }, [map, mode, onRouteError, onRouteFound, waypoints]);

  return null;
}

export default Routing;
