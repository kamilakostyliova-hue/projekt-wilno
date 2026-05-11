export type LatLngTuple = [number, number];
export type TransportModeId = "walk" | "bike" | "car";

export type RouteSummary = {
  distance: number;
  time: number;
};

export const transportModes: Record<
  TransportModeId,
  {
    label: string;
    profile: "foot" | "bike" | "car";
    speedMps: number;
    color: string;
    shadow: string;
    googleMode: "walking" | "bicycling" | "driving";
  }
> = {
  walk: {
    label: "Pieszo",
    profile: "foot",
    speedMps: 1.25,
    color: "#2563eb",
    shadow: "#93c5fd",
    googleMode: "walking",
  },
  bike: {
    label: "Rower",
    profile: "bike",
    speedMps: 4.2,
    color: "#0ea5e9",
    shadow: "#bae6fd",
    googleMode: "bicycling",
  },
  car: {
    label: "Samochód",
    profile: "car",
    speedMps: 8.4,
    color: "#1d4ed8",
    shadow: "#bfdbfe",
    googleMode: "driving",
  },
};
