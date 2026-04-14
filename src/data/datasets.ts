export interface DatasetMeta {
  id: string;
  label: string;
  unit: string;
  lastUpdated: string;
  source: string;
}

export const DATASETS: DatasetMeta[] = [
  { id: "tourist_arrivals", label: "Tourist Arrivals", unit: "visitors", lastUpdated: "2026-04-01", source: "DOT-7 Cebu" },
  { id: "motorist_volume", label: "Motorist Volume for Fuel Allocation", unit: "vehicles/day", lastUpdated: "2026-03-28", source: "DPWH Region 7" },
  { id: "voting_population", label: "Voting Population", unit: "registered voters", lastUpdated: "2026-03-15", source: "COMELEC" },
  { id: "power_monitoring", label: "Power Situation Monitoring", unit: "MW", lastUpdated: "2026-04-07", source: "VECO / CEBECO" },
  { id: "fuel_allocation", label: "Fuel Allocation", unit: "liters", lastUpdated: "2026-04-05", source: "DOE Region 7" },
  { id: "municipalities_only", label: "Municipalities (No Cities)", unit: "population indicator", lastUpdated: "2026-04-09", source: "Combined Sources" },
];

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
