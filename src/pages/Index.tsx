import { useState, useCallback, useEffect } from "react";
import { CebuMap } from "@/components/CebuMap";
import { TopBar } from "@/components/TopBar";
import { SidePanel } from "@/components/SidePanel";
import { HoverInfoCard } from "@/components/HoverInfoCard";
import { MapLegend } from "@/components/MapLegend";
import { DATASETS } from "@/data/datasets";
import { SAMPLE_DATA, getDataRange } from "@/data/datasets";
import { useSheetData } from "@/hooks/use-sheet-data";
import { getEffectiveSheetUrl, hasAnySheetConfigured } from "@/config/dataset-sheets";
import { RefreshCw } from "lucide-react";

const Index = () => {
  const [datasetId, setDatasetId] = useState("tourist_arrivals");
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(false);
  const [hovered, setHovered] = useState<{
    name: string | null;
    value: number | null;
    type?: "city" | "municipality";
  }>({ name: null, value: null });

  const activeDataset = DATASETS.find(d => d.id === datasetId) || DATASETS[0];
  
  // Get sheet URL for current dataset
  const sheetUrl = getEffectiveSheetUrl(datasetId);
  
  // Use sheet data hook - returns fallback data if no sheet configured
  const { 
    data: sheetData, 
    min, 
    max, 
    lastUpdated, 
    loading: sheetLoading, 
    error: sheetError,
    refresh 
  } = useSheetData(sheetUrl);
  
  // Determine if we should use sheet data or fallback
  const useSheetData_ = hasAnySheetConfigured() && sheetUrl.length > 0;
  
  // Merge sheet data with fallback for any missing municipalities
  const effectiveData = useSheetData_ && Object.keys(sheetData).length > 0
    ? { ...SAMPLE_DATA[datasetId], ...sheetData }
    : SAMPLE_DATA[datasetId];
  
  // Calculate data range
  const effectiveRange = useSheetData_ && Object.keys(sheetData).length > 0
    ? { min, max }
    : getDataRange(datasetId);

  const handleHover = useCallback((name: string | null, value: number | null, type?: "city" | "municipality") => {
    setHovered({ name, value, type });
  }, []);

  // Update last updated timestamp when using sheet data
  useEffect(() => {
    if (useSheetData_ && lastUpdated) {
      // Could update activeDataset.lastUpdated here if needed
    }
  }, [useSheetData_, lastUpdated]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <CebuMap 
        datasetId={datasetId} 
        onHover={handleHover}
        data={effectiveData}
        dataRange={effectiveRange}
        dataSource={useSheetData_ ? 'sheet' : 'fallback'}
        showBoundaries={showBoundaries}
      />

      <TopBar
        activeDataset={activeDataset}
        onDatasetChange={setDatasetId}
        showDropdown={showDropdown}
        onToggleDropdown={() => setShowDropdown(p => !p)}
        onToggleSidePanel={() => setSidePanelOpen(p => !p)}
        sidePanelOpen={sidePanelOpen}
        showBoundaries={showBoundaries}
        onToggleBoundaries={() => setShowBoundaries(p => !p)}
      />

      {/* Refresh button - visible when using sheet data */}
      {useSheetData_ && (
        <button
          onClick={() => refresh()}
          disabled={sheetLoading}
          className="fixed top-20 right-4 z-[1000] glass-panel flex items-center gap-2 px-3 py-2 hover:bg-secondary/40 transition-colors disabled:opacity-50"
          title="Refresh data from Google Sheet"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${sheetLoading ? 'animate-spin' : ''}`} />
          <span className="text-xs text-muted-foreground">
            {sheetLoading ? 'Refreshing...' : 'Refresh'}
          </span>
        </button>
      )}

      <SidePanel 
        open={sidePanelOpen} 
        dataset={{
          ...activeDataset,
          lastUpdated: useSheetData_ && lastUpdated 
            ? new Date(lastUpdated).toLocaleDateString() 
            : activeDataset.lastUpdated
        }} 
      />

      <HoverInfoCard
        name={hovered.name}
        value={hovered.value}
        unit={activeDataset.unit}
        type={hovered.type}
      />

      <MapLegend dataset={activeDataset} dataRange={effectiveRange} />
    </div>
  );
};

export default Index;