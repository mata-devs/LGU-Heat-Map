import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SAMPLE_DATA, getDataRange, formatValue } from "@/data/datasets";
import type { DatasetMeta } from "@/data/datasets";

interface SidePanelProps {
  open: boolean;
  dataset: DatasetMeta;
}

export function SidePanel({ open, dataset }: SidePanelProps) {
  if (!open) return null;

  const data = SAMPLE_DATA[dataset.id] || {};
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const { min, max } = getDataRange(dataset.id);
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const avg = total / Object.keys(data).length;

  return (
    <div className="fixed top-20 left-4 bottom-4 z-[999] w-72 glass-panel flex flex-col animate-fade-in overflow-hidden">
      {/* Stats summary */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{dataset.label}</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatChip label="Total" value={formatValue(total, "")} icon={<Minus className="w-3 h-3" />} />
          <StatChip label="Highest" value={formatValue(max, "")} icon={<TrendingUp className="w-3 h-3" />} />
          <StatChip label="Lowest" value={formatValue(min, "")} icon={<TrendingDown className="w-3 h-3" />} />
        </div>
      </div>

      {/* Ranking list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
        <p className="text-xs text-muted-foreground mb-2 px-1">Rankings · {sorted.length} LGUs</p>
        {sorted.map(([name, value], i) => {
          const ratio = (value - min) / (max - min || 1);
          return (
            <div key={name} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/30 transition-colors group">
              <span className="text-xs text-muted-foreground w-5 text-right font-mono">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{name}</p>
                <div className="mt-0.5 h-1 rounded-full bg-secondary/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {formatValue(value, "")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatChip({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-secondary/40 rounded-lg p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">{icon}<span className="text-[10px]">{label}</span></div>
      <p className="text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}
