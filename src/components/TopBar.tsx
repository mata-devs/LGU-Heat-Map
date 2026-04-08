import { ChevronDown, Layers, Clock, PanelLeft } from "lucide-react";
import { DATASETS, type DatasetMeta } from "@/data/datasets";

interface TopBarProps {
  activeDataset: DatasetMeta;
  onDatasetChange: (id: string) => void;
  showDropdown: boolean;
  onToggleDropdown: () => void;
  onToggleSidePanel: () => void;
  sidePanelOpen: boolean;
}

export function TopBar({ activeDataset, onDatasetChange, showDropdown, onToggleDropdown, onToggleSidePanel, sidePanelOpen }: TopBarProps) {
  return (
    <div className="fixed top-4 left-4 right-4 z-[1000] flex items-center gap-3 pointer-events-none">
      {/* Left: toggle + title */}
      <div className="glass-panel flex items-center gap-2 px-3 py-2 pointer-events-auto">
        <button
          onClick={onToggleSidePanel}
          className="p-1 rounded-md hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
          title={sidePanelOpen ? "Hide panel" : "Show panel"}
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-border" />
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground tracking-tight whitespace-nowrap">Cebu LGU Dashboard</span>
      </div>

      {/* Center: dataset switcher */}
      <div className="relative pointer-events-auto">
        <button
          onClick={onToggleDropdown}
          className="glass-panel flex items-center gap-2 px-3 py-2 hover:bg-secondary/40 transition-colors"
        >
          <span className="text-xs text-muted-foreground">Dataset</span>
          <span className="text-sm font-medium text-foreground">{activeDataset.label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        {showDropdown && (
          <div className="absolute top-full left-0 mt-2 glass-panel py-1 min-w-[220px] animate-fade-in">
            {DATASETS.map(ds => (
              <button
                key={ds.id}
                onClick={() => { onDatasetChange(ds.id); onToggleDropdown(); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  ds.id === activeDataset.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-secondary/40'
                }`}
              >
                {ds.label}
                <span className="block text-xs text-muted-foreground">{ds.unit}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: last updated */}
      <div className="ml-auto glass-panel-subtle flex items-center gap-1.5 px-3 py-2 pointer-events-auto">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Updated {activeDataset.lastUpdated}
        </span>
        <span className="text-xs text-muted-foreground/60">· {activeDataset.source}</span>
      </div>
    </div>
  );
}
