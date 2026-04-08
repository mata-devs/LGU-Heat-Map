// Simplified GeoJSON polygons for Cebu municipalities
// Approximate boundaries for visualization purposes

import type { FeatureCollection, Feature, Polygon } from "geojson";

interface LGUProperties {
  name: string;
  type: "city" | "municipality";
}

function rect(lat: number, lng: number, h: number, w: number): number[][] {
  return [
    [lng - w/2, lat - h/2],
    [lng + w/2, lat - h/2],
    [lng + w/2, lat + h/2],
    [lng - w/2, lat + h/2],
    [lng - w/2, lat - h/2],
  ];
}

function poly(lat: number, lng: number, h: number, w: number, skew = 0): number[][][] {
  const pts = rect(lat, lng, h, w);
  if (skew) {
    pts[0][0] += skew; pts[1][0] += skew;
    pts[3][0] -= skew; pts[4][0] -= skew;
  }
  return [pts];
}

const f = (name: string, type: "city"|"municipality", lat: number, lng: number, h: number, w: number, skew = 0): Feature<Polygon, LGUProperties> => ({
  type: "Feature",
  properties: { name, type },
  geometry: { type: "Polygon", coordinates: poly(lat, lng, h, w, skew) }
});

export const cebuGeoJSON: FeatureCollection<Polygon, LGUProperties> = {
  type: "FeatureCollection",
  features: [
    // Northern Cebu
    f("Daanbantayan", "municipality", 11.25, 124.00, 0.06, 0.12),
    f("Medellin", "municipality", 11.20, 123.98, 0.05, 0.10),
    f("San Remigio", "municipality", 11.17, 123.93, 0.06, 0.10),
    f("Bogo City", "city", 11.05, 123.97, 0.08, 0.10),
    f("Tabogon", "municipality", 11.01, 123.92, 0.05, 0.08),
    f("Borbon", "municipality", 10.95, 123.88, 0.06, 0.08),
    f("Sogod", "municipality", 10.90, 123.85, 0.05, 0.07),
    f("Catmon", "municipality", 10.85, 123.82, 0.06, 0.08),
    
    // Bantayan Island
    f("Bantayan", "municipality", 11.18, 123.73, 0.06, 0.10),
    f("Santa Fe", "municipality", 11.16, 123.80, 0.05, 0.06),
    f("Madridejos", "municipality", 11.22, 123.74, 0.05, 0.08),
    
    // Central-North
    f("Carmen", "municipality", 10.80, 123.84, 0.06, 0.10),
    f("Danao City", "city", 10.55, 124.00, 0.08, 0.10),
    f("Compostela", "municipality", 10.48, 124.02, 0.05, 0.08),
    f("Liloan", "municipality", 10.42, 124.00, 0.04, 0.07),
    f("Consolacion", "municipality", 10.38, 123.96, 0.04, 0.07),
    
    // Western municipalities
    f("Tuburan", "municipality", 10.73, 123.82, 0.07, 0.08),
    f("Asturias", "municipality", 10.60, 123.76, 0.07, 0.08),
    f("Balamban", "municipality", 10.50, 123.72, 0.08, 0.10),
    f("Toledo City", "city", 10.38, 123.65, 0.08, 0.10),
    f("Pinamungajan", "municipality", 10.28, 123.60, 0.07, 0.08),
    f("Aloguinsan", "municipality", 10.22, 123.55, 0.06, 0.08),
    
    // Metro Cebu
    f("Cebu City", "city", 10.32, 123.90, 0.08, 0.10),
    f("Mandaue City", "city", 10.35, 123.94, 0.04, 0.06),
    f("Lapu-Lapu City", "city", 10.32, 124.00, 0.06, 0.10),
    f("Talisay City", "city", 10.26, 123.85, 0.05, 0.08),
    f("Minglanilla", "municipality", 10.22, 123.80, 0.05, 0.08),
    f("Naga City", "city", 10.18, 123.76, 0.05, 0.08),
    f("Cordova", "municipality", 10.26, 123.96, 0.04, 0.06),
    
    // Southern
    f("San Fernando", "municipality", 10.16, 123.72, 0.05, 0.08),
    f("Carcar City", "city", 10.10, 123.68, 0.06, 0.08),
    f("Barili", "municipality", 10.12, 123.56, 0.07, 0.08),
    f("Moalboal", "municipality", 9.95, 123.50, 0.07, 0.08),
    f("Badian", "municipality", 9.88, 123.46, 0.06, 0.08),
    f("Alegria", "municipality", 9.82, 123.43, 0.05, 0.07),
    f("Malabuyoc", "municipality", 9.77, 123.40, 0.05, 0.06),
    f("Ginatilan", "municipality", 9.72, 123.38, 0.05, 0.06),
    f("Samboan", "municipality", 9.67, 123.36, 0.05, 0.06),
    
    // Southeast
    f("Sibonga", "municipality", 10.05, 123.62, 0.06, 0.08),
    f("Argao", "municipality", 9.88, 123.60, 0.07, 0.08),
    f("Dalaguete", "municipality", 9.78, 123.56, 0.06, 0.08),
    f("Boljoon", "municipality", 9.72, 123.50, 0.05, 0.06),
    f("Alcoy", "municipality", 9.68, 123.48, 0.04, 0.06),
    f("Oslob", "municipality", 9.52, 123.44, 0.08, 0.06),
    f("Santander", "municipality", 9.45, 123.42, 0.05, 0.06),
  ],
};

export const CEBU_CENTER: [number, number] = [10.35, 123.80];
export const CEBU_BOUNDS: [[number, number], [number, number]] = [[9.35, 123.25], [11.35, 124.20]];
