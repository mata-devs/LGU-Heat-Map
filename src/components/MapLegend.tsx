import { formatValue } from "@/data/datasets";
import type { DatasetMeta } from "@/data/datasets";

interface MapLegendProps {
  dataset: DatasetMeta;
  dataRange?: { min: number; max: number };
}

export function MapLegend({ dataset, dataRange }: MapLegendProps) {
  const range = dataRange || { min: 0, max: 100 };
  const min = range.min;
  const max = range.max;
  const steps = 5;
  const colors = Array.from({ length: steps }, (_, i) => {
    const ratio = i / (steps - 1);
    const lightness = 82 - ratio * 60;
    const saturation = 45 + ratio * 30;
    return `hsl(174, ${saturation}%, ${lightness}%)`;
  });

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
