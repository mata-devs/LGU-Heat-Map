import { MapPin } from "lucide-react";
import { formatValue } from "@/data/datasets";

interface HoverInfoCardProps {
  name: string | null;
  value: number | null;
  unit: string;
  type?: "city" | "municipality";
}

export function HoverInfoCard({ name, value, unit, type }: HoverInfoCardProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[1000] glass-panel-subtle px-4 py-3 min-w-[200px] animate-fade-in">
      {name && value != null ? (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {type || "LGU"}
            </span>
          </div>
          <p className="text-base font-semibold text-foreground leading-tight">{name}</p>
          <p className="text-lg font-bold text-primary mt-0.5 font-mono">
            {formatValue(value, unit)}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-sm">Hover over an LGU</span>
        </div>
      )}
    </div>
  );
}
