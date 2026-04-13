import { BarChart3, TrendingUp, TrendingDown, Sigma } from "lucide-react";
import { formatValue } from "@/data/datasets";
import type { DatasetMeta } from "@/data/datasets";

interface LguRankingPanelProps {
  open: boolean;
  data: Record<string, number>;
  dataset: DatasetMeta;
  highlightedLGU?: string | null;
  selectedLGU?: string | null;
  onSelectLGU?: (name: string | null) => void;
}

export function LguRankingPanel({ open, data, dataset, highlightedLGU, selectedLGU, onSelectLGU }: LguRankingPanelProps) {
  if (!open) return null;

  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const values = Object.values(data);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const total = values.reduce((s, v) => s + v, 0);
  
  return (
    <div className="fixed top-16 left-4 bottom-4 z-[999] w-72 glass-panel flex flex-col animate-fade-in overflow-hidden">
      {/* Stats summary */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{dataset.label}</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatChip label="Total" value={formatValue(total, "")} icon={<Sigma className="w-3 h-3" />} />
          <StatChip label="Highest" value={formatValue(max, "")} icon={<TrendingUp className="w-3 h-3" />} />
          <StatChip label="Lowest" value={formatValue(min, "")} icon={<TrendingDown className="w-3 h-3" />} />
        </div>
      </div>

      {/* Ranking list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
        <div className="mb-2 px-1 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Rankings · {sorted.length} LGUs</p>
          {selectedLGU && (
            <button
              type="button"
              onClick={() => onSelectLGU?.(null)}
              className="text-[10px] text-primary hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
        {sorted.map(([name, value], i) => {
          const ratio = (value - min) / (max - min || 1);
          const isHighlighted = highlightedLGU === name;
          const isSelected = selectedLGU === name;
          return (
            <div 
              key={name} 
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary/25 border border-primary/50'
                  : isHighlighted
                    ? 'bg-primary/20 border border-primary/40'
                    : 'hover:bg-secondary/30'
              }`}
              onClick={() => onSelectLGU?.(isSelected ? null : name)}
            >
              <span className={`text-xs w-5 text-right font-mono ${isHighlighted || isSelected ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs truncate ${isHighlighted || isSelected ? 'text-primary font-medium' : 'text-foreground'}`}>{name}</p>
                <div className="mt-0.5 h-1 rounded-full bg-secondary/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isHighlighted || isSelected ? 'bg-primary' : 'bg-primary/70'}`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
              <span className={`text-xs font-mono shrink-0 ${isHighlighted || isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
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
