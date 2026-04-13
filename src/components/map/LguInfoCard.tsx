import { MapPin, X } from "lucide-react";
import { formatValue } from "@/data/datasets";

interface LguInfoCardProps {
  name: string | null;
  value: number | null;
  unit: string;
  type?: "city" | "municipality";
  sidePanelOpen?: boolean;
  canClearSelection?: boolean;
  onClearSelection?: () => void;
}

export function LguInfoCard({ name, value, unit, type, sidePanelOpen = false, canClearSelection = false, onClearSelection }: LguInfoCardProps) {
  const positionClass = "left-[20rem]";

  return (
    <div
      className={`fixed bottom-0 z-[998] glass-panel-subtle px-4 py-3 min-w-[200px] animate-fade-in mb-4 transition-all ${positionClass}`}
    >
      {name && value != null ? (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {type || "LGU"}
            </span>
            {canClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="ml-auto rounded-sm p-0.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                title="Clear selected LGU"
                aria-label="Clear selected LGU"
              >
                <X className="w-3 h-3" />
              </button>
            )}
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
