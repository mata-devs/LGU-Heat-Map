import { useState, useCallback, useEffect, useMemo } from "react";
import { ChoroplethMap } from "@/components/map/ChoroplethMap";
import { MapToolbar } from "@/components/map/MapToolbar";
import { LguRankingPanel } from "@/components/map/LguRankingPanel";
import { LguInfoCard } from "@/components/map/LguInfoCard";
import { ChoroplethLegend } from "@/components/map/ChoroplethLegend";
import { normalizeLocationName } from "@/data/cebu-geo";
import { DYNAMIC_REFRESH_INTERVAL_MS, useDynamicDatasets } from "@/config/dataset-sheets";

interface DatasetOption {
  id: string;
  label: string;
  unit?: string;
  source?: string;
}

const Index = () => {
  const refreshStorageKey = "cebu-insights-auto-refresh-minutes";
  const [datasetId, setDatasetId] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [tileLayer, setTileLayer] = useState<'cartoDark' | 'openStreetMap'>('cartoDark');
  const [autoRefreshMinutes, setAutoRefreshMinutes] = useState<number>(() => {
    const raw = localStorage.getItem(refreshStorageKey);
    const parsed = raw ? Number(raw) : NaN;
    return [1, 3, 5].includes(parsed) ? parsed : Math.round(DYNAMIC_REFRESH_INTERVAL_MS / 60000);
  });
  const [selectedLGU, setSelectedLGU] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{
    name: string | null;
    value: number | null;
    type?: "city" | "municipality";
  }>({ name: null, value: null });

  useEffect(() => {
    localStorage.setItem(refreshStorageKey, String(autoRefreshMinutes));
  }, [autoRefreshMinutes]);

  // Dynamically discover datasets from Google Sheets - NO HARD CODING!
  const { sheets, datasetData, loading: sheetsLoading, error: sheetsError, refresh } = useDynamicDatasets(autoRefreshMinutes * 60 * 1000);
  
  // Set default dataset once sheets are loaded
  useEffect(() => {
    if (sheets.length > 0 && !datasetId) {
      setDatasetId(sheets[0].id);
    }
  }, [sheets, datasetId]);

  // Get current dataset info from preloaded data - INSTANT switch!
  const currentData = datasetData[datasetId];
  const sheetData = currentData?.data || {};
  const min = currentData?.min ?? 0;
  const max = currentData?.max ?? 100;
  const lastUpdated = currentData?.lastUpdated;
  
  // Google Sheets is the only source of LGU values.
  const effectiveData = sheetData;
  const effectiveRange = { min, max };

  // Normalize all LGU keys to canonical GeoJSON names so selection/highlighting is consistent.
  const normalizedData = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [rawName, value] of Object.entries(effectiveData)) {
      const canonicalName = normalizeLocationName(rawName) || rawName;
      out[canonicalName] = (out[canonicalName] || 0) + value;
    }
    return out;
  }, [effectiveData]);
  const hasData = Object.keys(normalizedData).length > 0;

  // Get active dataset label
  const activeDataset = sheets.find(s => s.id === datasetId) || { 
    id: datasetId || 'unknown', 
    label: datasetId || 'Unknown', 
    name: datasetId || 'unknown',
    unit: 'value',
  };

  const handleHover = useCallback((name: string | null, value: number | null, type?: "city" | "municipality") => {
    setHovered({ name, value, type });
  }, []);

  const highlightedLGU = selectedLGU;
  const selectedValue = selectedLGU ? normalizedData[selectedLGU] : undefined;
  const infoCardName = hovered.name ?? selectedLGU;
  const infoCardValue = hovered.name ? hovered.value : typeof selectedValue === "number" ? selectedValue : null;
  const infoCardType = hovered.name ? hovered.type : selectedLGU ? "municipality" : undefined;

  // Build dataset options for dropdown from dynamically discovered sheets
  const datasetOptions: DatasetOption[] = useMemo(() => {
    return sheets.map(sheet => ({
      id: sheet.id,
      label: sheet.label,
      unit: sheet.unit,
      source: datasetData[sheet.id]?.source || 'Google Sheets',
    }));
  }, [sheets, datasetData]);

  // Handle dataset change - this triggers fetching from new sheet tab
  const handleDatasetChange = useCallback((newId: string) => {
    setDatasetId(newId);
    setShowDropdown(false);
  }, []);

  // Always render map - show loading briefly, then data
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <ChoroplethMap 
        datasetId={datasetId} 
        onHover={handleHover}
        data={normalizedData}
        dataRange={effectiveRange}
        dataSource={'sheet'}
        tileLayer={tileLayer}
        highlightedLGU={highlightedLGU}
        isolatedLGU={selectedLGU}
      />

      {sheetsLoading && !hasData && (
        <div className="fixed inset-0 z-[1002] pointer-events-none flex items-center justify-center">
          <div className="glass-panel px-4 py-3 text-sm text-foreground/90">
            Loading latest values from Google Sheets...
          </div>
        </div>
      )}

      {!sheetsLoading && sheetsError && !hasData && (
        <div className="fixed inset-0 z-[1002] pointer-events-none flex items-center justify-center">
          <div className="glass-panel px-4 py-3 max-w-md text-sm text-foreground/90 pointer-events-auto">
            <p className="font-semibold mb-1">Unable to load Google Sheets data</p>
            <p className="text-muted-foreground mb-3">{sheetsError}</p>
            <button
              onClick={refresh}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <MapToolbar
        datasetOptions={datasetOptions}
        activeDataset={datasetOptions.find(d => d.id === datasetId) || datasetOptions[0]}
        activeDatasetId={datasetId}
        onDatasetChange={handleDatasetChange}
        showDropdown={showDropdown}
        onToggleDropdown={() => setShowDropdown(p => !p)}
        onToggleSidePanel={() => setSidePanelOpen(p => !p)}
        sidePanelOpen={sidePanelOpen}
        tileLayer={tileLayer}
        onToggleTileLayer={() => setTileLayer(p => p === 'cartoDark' ? 'openStreetMap' : 'cartoDark')}
        lastUpdated={lastUpdated ? new Date(lastUpdated).toLocaleDateString() : undefined}
        showRefresh={true}
        onRefresh={refresh}
        isRefreshing={sheetsLoading}
        autoRefreshMinutes={autoRefreshMinutes}
        autoRefreshOptions={[1, 3, 5]}
        onAutoRefreshMinutesChange={setAutoRefreshMinutes}
      />

      <LguRankingPanel 
        open={sidePanelOpen} 
        data={normalizedData}
        highlightedLGU={highlightedLGU}
        selectedLGU={selectedLGU}
        onSelectLGU={setSelectedLGU}
        dataset={{
          id: activeDataset.id,
          label: activeDataset.label,
          unit: 'value',
          lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleDateString() : new Date().toISOString().split('T')[0],
          source: 'Google Sheets'
        }} 
      />

      <LguInfoCard
        name={infoCardName}
        value={infoCardValue}
        unit={activeDataset.unit || 'value'}
        type={infoCardType}
        sidePanelOpen={sidePanelOpen}
        canClearSelection={Boolean(selectedLGU)}
        onClearSelection={() => setSelectedLGU(null)}
      />

      <ChoroplethLegend 
        dataset={{
          id: activeDataset.id,
          label: activeDataset.label,
          unit: 'value',
          lastUpdated: '',
          source: ''
        }} 
        dataRange={effectiveRange}
        tileLayer={tileLayer}
      />
    </div>
  );
};

export default Index;