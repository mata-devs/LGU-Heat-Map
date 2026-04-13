import { formatValue } from "@/data/datasets";
import type { DatasetMeta } from "@/data/datasets";

interface ChoroplethLegendProps {
  dataset: DatasetMeta;
  dataRange?: { min: number; max: number };
  tileLayer?: 'cartoDark' | 'openStreetMap';
}

export function ChoroplethLegend({ dataset, dataRange, tileLayer = 'cartoDark' }: ChoroplethLegendProps) {
  const range = dataRange || { min: 0, max: 100 };
  const min = range.min;
  const max = range.max;

  const darkColors = [
    '#134e4a',
    '#115e59',
    '#0f766e',
    '#0d9488',
    '#14b8a6',
    '#2dd4bf',
    '#5eead4',
  ];

  const lightColors = [
    '#fecaca',
    '#fca5a5',
    '#f87171',
    '#ef4444',
    '#dc2626',
    '#991b1b',
    '#7f1d1d',
  ];

  const colors = tileLayer === 'cartoDark' ? darkColors : lightColors;

  return (
    <div className="fixed top-16 right-4 z-[999] glass-panel-subtle px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{dataset.label}</p>
      <div className="flex items-center gap-0">
        {colors.map((c, i) => (
          <div key={i} className="w-8 h-3 first:rounded-l last:rounded-r" style={{ background: c }} />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground font-mono">{formatValue(min, "")}</span>
        <span className="text-[10px] text-muted-foreground font-mono">{formatValue(max, "")}</span>
      </div>
    </div>
  );
}
