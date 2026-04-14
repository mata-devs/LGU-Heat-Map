import { useEffect, useRef, useState } from "react";
import { ChevronDown, Layers, Clock, PanelLeft, RefreshCw, Map } from "lucide-react";

interface DatasetOption {
  id: string;
  label: string;
  unit?: string;
  source?: string;
}

interface MapToolbarProps {
  datasetOptions: DatasetOption[];
  activeDataset: DatasetOption;
  activeDatasetId: string;
  onDatasetChange: (id: string) => void;
  showDropdown: boolean;
  onToggleDropdown: () => void;
  onToggleSidePanel: () => void;
  sidePanelOpen: boolean;
  tileLayer: 'cartoDark' | 'openStreetMap';
  onToggleTileLayer: () => void;
  lastUpdated?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  autoRefreshMinutes?: number;
  autoRefreshOptions?: number[];
  onAutoRefreshMinutesChange?: (minutes: number) => void;
}

export function MapToolbar({ 
  datasetOptions,
  activeDataset,
  activeDatasetId,
  onDatasetChange, 
  showDropdown, 
  onToggleDropdown, 
  onToggleSidePanel, 
  sidePanelOpen, 
  tileLayer,
  onToggleTileLayer,
  lastUpdated,
  showRefresh,
  onRefresh,
  isRefreshing,
  autoRefreshMinutes = 5,
  autoRefreshOptions = [1, 3, 5],
  onAutoRefreshMinutesChange,
}: MapToolbarProps) {
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const refreshMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!refreshMenuRef.current) return;
      if (!refreshMenuRef.current.contains(event.target as Node)) {
        setShowRefreshMenu(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

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
        <span className="text-sm font-semibold text-foreground">Cebu Insights</span>
      </div>

      {/* Dataset dropdown */}
      <div className="relative pointer-events-auto">
        <button
          onClick={onToggleDropdown}
          className="glass-panel flex items-center gap-2 px-3 py-2 min-w-[200px] hover:bg-secondary/40 transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm text-foreground truncate flex-1 text-left">
            {activeDataset?.label || 'Select Dataset'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showDropdown && datasetOptions.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-full min-w-[220px] glass-panel shadow-lg overflow-hidden z-[1001]">
            {datasetOptions.map((ds) => (
              <button
                key={ds.id}
                onClick={() => onDatasetChange(ds.id)}
                className={`w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors ${
                  ds.id === activeDatasetId ? 'bg-primary/10' : ''
                }`}
              >
                <div className={`text-sm ${ds.id === activeDatasetId ? 'text-primary font-medium' : 'text-foreground'}`}>
                  {ds.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {ds.unit || 'units'}{ds.source ? ` • ${ds.source}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tile layer toggle */}
      <button
        onClick={onToggleTileLayer}
        className="glass-panel flex items-center gap-2 px-3 py-2 pointer-events-auto hover:bg-secondary/40 transition-colors text-muted-foreground"
        title={tileLayer === 'cartoDark' ? 'Switch to OpenStreetMap' : 'Switch to Carto Dark'}
      >
        <Map className="w-3.5 h-3.5" />
        <span className="text-xs">{tileLayer === 'cartoDark' ? 'Carto Dark' : 'OpenStreetMap'}</span>
      </button>

      {/* Right: refresh + last updated */}
      <div className="ml-auto flex items-center gap-2">
        {showRefresh && onRefresh && (
          <div ref={refreshMenuRef} className="relative pointer-events-auto">
            <div className="glass-panel flex items-stretch overflow-hidden">
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-secondary/40 transition-colors disabled:opacity-50"
                title="Refresh data from Google Sheet"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-xs">Refresh</span>
              </button>
              <button
                onClick={() => setShowRefreshMenu((p) => !p)}
                className="border-l border-border/60 flex items-center gap-1.5 px-3 py-2 hover:bg-secondary/40 transition-colors"
                title="Set auto refresh interval"
              >
                <span className="text-xs text-muted-foreground">{autoRefreshMinutes} min</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${showRefreshMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showRefreshMenu && (
              <div className="absolute top-full right-0 mt-1 min-w-[140px] glass-panel shadow-lg overflow-hidden z-[1001]">
                {autoRefreshOptions.map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => {
                      onAutoRefreshMinutesChange?.(minutes);
                      setShowRefreshMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary/40 transition-colors ${
                      minutes === autoRefreshMinutes ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    Auto refresh: {minutes} min
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="glass-panel-subtle flex items-center gap-1.5 px-3 py-2 pointer-events-auto">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Updated {lastUpdated || 'N/A'}{activeDataset?.source ? ` • ${activeDataset.source}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}