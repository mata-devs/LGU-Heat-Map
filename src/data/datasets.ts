export interface DatasetMeta {
  id: string;
  label: string;
  unit: string;
  lastUpdated: string;
  source: string;
}

export const DATASETS: DatasetMeta[] = [
  { id: "tourist_arrivals", label: "Tourist Arrivals", unit: "visitors", lastUpdated: "2026-04-01", source: "DOT-7 Cebu" },
  { id: "motorist_volume", label: "Motorist Volume", unit: "vehicles/day", lastUpdated: "2026-03-28", source: "DPWH Region 7" },
  { id: "voting_population", label: "Voting Population", unit: "registered voters", lastUpdated: "2026-03-15", source: "COMELEC" },
  { id: "fuel_allocation", label: "Fuel Allocation", unit: "liters", lastUpdated: "2026-04-05", source: "DOE Region 7" },
  { id: "power_monitoring", label: "Power Monitoring", unit: "MW", lastUpdated: "2026-04-07", source: "VECO / CEBECO" },
  { id: "municipalities_only", label: "Municipalities (No Cities)", unit: "population indicator", lastUpdated: "2026-04-09", source: "Combined Sources" },
];

// Sample data per LGU per dataset
export const SAMPLE_DATA: Record<string, Record<string, number>> = {
  tourist_arrivals: {
    "Cebu City": 185000, "Lapu-Lapu City": 142000, "Mandaue City": 35000,
    "Talisay City": 12000, "Consolacion": 8500, "Liloan": 6200,
    "Compostela": 3100, "Danao City": 9800, "Carmen": 4500,
    "Catmon": 2800, "Sogod": 1900, "Borbon": 2100,
    "Tabogon": 1500, "Bogo City": 7200, "San Remigio": 3800,
    "Medellin": 5600, "Daanbantayan": 28000, "Bantayan": 45000,
    "Santa Fe": 38000, "Madridejos": 8200, "Tuburan": 2400,
    "Asturias": 3200, "Balamban": 4100, "Toledo City": 6500,
    "Pinamungajan": 2900, "Aloguinsan": 5800, "Barili": 7400,
    "Moalboal": 52000, "Badian": 18000, "Alegria": 4200,
    "Malabuyoc": 1800, "Ginatilan": 2600, "Samboan": 9500,
    "Oslob": 62000, "Santander": 8800, "Dalaguete": 6100,
    "Alcoy": 3400, "Boljoon": 2200, "Argao": 11000,
    "Sibonga": 4800, "Carcar City": 8900, "San Fernando": 5200,
    "Naga City": 14000, "Minglanilla": 7600, "Cordova": 9200,
    "Alcantara": 2100, "Dumanjug": 3800, "Pilar": 1200,
    "Poro": 2800, "Ronda": 1900, "San Francisco": 3200,
    "Tabuelan": 1600, "Tudela": 900,
  },
  motorist_volume: {
    "Cebu City": 320000, "Lapu-Lapu City": 180000, "Mandaue City": 250000,
    "Talisay City": 95000, "Consolacion": 72000, "Liloan": 48000,
    "Compostela": 22000, "Danao City": 38000, "Carmen": 18000,
    "Catmon": 8500, "Sogod": 6200, "Borbon": 7100,
    "Tabogon": 5800, "Bogo City": 32000, "San Remigio": 12000,
    "Medellin": 15000, "Daanbantayan": 18000, "Bantayan": 9200,
    "Santa Fe": 6800, "Madridejos": 5400, "Tuburan": 9800,
    "Asturias": 11000, "Balamban": 14000, "Toledo City": 42000,
    "Pinamungajan": 12000, "Aloguinsan": 7500, "Barili": 15000,
    "Moalboal": 18000, "Badian": 8200, "Alegria": 5600,
    "Malabuyoc": 3800, "Ginatilan": 4500, "Samboan": 6200,
    "Oslob": 14000, "Santander": 7800, "Dalaguete": 11000,
    "Alcoy": 5200, "Boljoon": 3600, "Argao": 16000,
    "Sibonga": 9800, "Carcar City": 38000, "San Fernando": 18000,
    "Naga City": 52000, "Minglanilla": 65000, "Cordova": 15000,
    "Alcantara": 4200, "Dumanjug": 9500, "Pilar": 3100,
    "Poro": 5800, "Ronda": 3400, "San Francisco": 6200,
    "Tabuelan": 4800, "Tudela": 2200,
  },
  voting_population: {
    "Cebu City": 680000, "Lapu-Lapu City": 310000, "Mandaue City": 280000,
    "Talisay City": 185000, "Consolacion": 98000, "Liloan": 82000,
    "Compostela": 38000, "Danao City": 95000, "Carmen": 42000,
    "Catmon": 25000, "Sogod": 18000, "Borbon": 22000,
    "Tabogon": 19000, "Bogo City": 62000, "San Remigio": 35000,
    "Medellin": 42000, "Daanbantayan": 55000, "Bantayan": 48000,
    "Santa Fe": 28000, "Madridejos": 22000, "Tuburan": 32000,
    "Asturias": 35000, "Balamban": 45000, "Toledo City": 125000,
    "Pinamungajan": 42000, "Aloguinsan": 18000, "Barili": 48000,
    "Moalboal": 22000, "Badian": 28000, "Alegria": 15000,
    "Malabuyoc": 12000, "Ginatilan": 18000, "Samboan": 16000,
    "Oslob": 22000, "Santander": 15000, "Dalaguete": 32000,
    "Alcoy": 14000, "Boljoon": 11000, "Argao": 52000,
    "Sibonga": 35000, "Carcar City": 88000, "San Fernando": 52000,
    "Naga City": 95000, "Minglanilla": 120000, "Cordova": 42000,
    "Alcantara": 8500, "Dumanjug": 28000, "Pilar": 6200,
    "Poro": 15000, "Ronda": 7800, "San Francisco": 18000,
    "Tabuelan": 12000, "Tudela": 4500,
  },
  fuel_allocation: {
    "Cebu City": 2800000, "Lapu-Lapu City": 1500000, "Mandaue City": 1800000,
    "Talisay City": 650000, "Consolacion": 420000, "Liloan": 320000,
    "Compostela": 150000, "Danao City": 380000, "Carmen": 180000,
    "Catmon": 85000, "Sogod": 62000, "Borbon": 72000,
    "Tabogon": 58000, "Bogo City": 280000, "San Remigio": 120000,
    "Medellin": 145000, "Daanbantayan": 185000, "Bantayan": 125000,
    "Santa Fe": 82000, "Madridejos": 68000, "Tuburan": 95000,
    "Asturias": 105000, "Balamban": 135000, "Toledo City": 420000,
    "Pinamungajan": 115000, "Aloguinsan": 72000, "Barili": 145000,
    "Moalboal": 98000, "Badian": 75000, "Alegria": 52000,
    "Malabuyoc": 38000, "Ginatilan": 45000, "Samboan": 58000,
    "Oslob": 88000, "Santander": 62000, "Dalaguete": 105000,
    "Alcoy": 48000, "Boljoon": 35000, "Argao": 155000,
    "Sibonga": 92000, "Carcar City": 350000, "San Fernando": 165000,
    "Naga City": 420000, "Minglanilla": 480000, "Cordova": 125000,
    "Alcantara": 42000, "Dumanjug": 95000, "Pilar": 28000,
    "Poro": 58000, "Ronda": 32000, "San Francisco": 72000,
    "Tabuelan": 48000, "Tudela": 18000,
  },
  power_monitoring: {
    "Cebu City": 850, "Lapu-Lapu City": 420, "Mandaue City": 580,
    "Talisay City": 180, "Consolacion": 95, "Liloan": 62,
    "Compostela": 28, "Danao City": 75, "Carmen": 32,
    "Catmon": 12, "Sogod": 8, "Borbon": 10,
    "Tabogon": 7, "Bogo City": 55, "San Remigio": 22,
    "Medellin": 28, "Daanbantayan": 35, "Bantayan": 25,
    "Santa Fe": 15, "Madridejos": 12, "Tuburan": 18,
    "Asturias": 22, "Balamban": 32, "Toledo City": 120,
    "Pinamungajan": 25, "Aloguinsan": 12, "Barili": 28,
    "Moalboal": 18, "Badian": 14, "Alegria": 8,
    "Malabuyoc": 5, "Ginatilan": 7, "Samboan": 9,
    "Oslob": 15, "Santander": 10, "Dalaguete": 22,
    "Alcoy": 8, "Boljoon": 5, "Argao": 35,
    "Sibonga": 18, "Carcar City": 72, "San Fernando": 38,
    "Naga City": 95, "Minglanilla": 110, "Cordova": 28,
    "Alcantara": 6, "Dumanjug": 15, "Pilar": 4,
    "Poro": 10, "Ronda": 5, "San Francisco": 12,
    "Tabuelan": 8, "Tudela": 3,
  },
  municipalities_only: {
    // Municipalities only (cities excluded)
    "Consolacion": 8500, "Liloan": 6200,
    "Compostela": 3100, "Carmen": 4500,
    "Catmon": 2800, "Sogod": 1900, "Borbon": 2100,
    "Tabogon": 1500, "San Remigio": 3800,
    "Medellin": 5600, "Daanbantayan": 28000, "Bantayan": 45000,
    "Santa Fe": 38000, "Madridejos": 8200, "Tuburan": 2400,
    "Asturias": 3200, "Balamban": 4100,
    "Pinamungajan": 2900, "Aloguinsan": 5800, "Barili": 7400,
    "Moalboal": 52000, "Badian": 18000, "Alegria": 4200,
    "Malabuyoc": 1800, "Ginatilan": 2600, "Samboan": 9500,
    "Oslob": 62000, "Santander": 8800, "Dalaguete": 6100,
    "Alcoy": 3400, "Boljoon": 2200, "Argao": 11000,
    "Sibonga": 4800, "San Fernando": 5200,
    "Minglanilla": 7600, "Cordova": 9200,
    "Alcantara": 2100, "Dumanjug": 3800, "Pilar": 1200,
    "Poro": 2800, "Ronda": 1900, "San Francisco": 3200,
    "Tabuelan": 1600, "Tudela": 900,
  },
};

export function getDataRange(datasetId: string): { min: number; max: number } {
  const data = SAMPLE_DATA[datasetId];
  if (!data) return { min: 0, max: 100 };
  const values = Object.values(data);
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function getColorForValue(value: number, min: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  // Teal gradient: light to dark
  const lightness = 82 - ratio * 60; // 82% down to 22%
  const saturation = 45 + ratio * 30; // 45% up to 75%
  return `hsl(174, ${saturation}%, ${lightness}%)`;
}

export function getFillOpacity(value: number, min: number, max: number): number {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  return 0.4 + ratio * 0.5;
}

export function formatValue(value: number, unit: string): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M ${unit}`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K ${unit}`;
  return `${value.toLocaleString()} ${unit}`;
}
