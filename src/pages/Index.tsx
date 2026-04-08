import { useState, useCallback } from "react";
import { CebuMap } from "@/components/CebuMap";
import { TopBar } from "@/components/TopBar";
import { SidePanel } from "@/components/SidePanel";
import { HoverInfoCard } from "@/components/HoverInfoCard";
import { MapLegend } from "@/components/MapLegend";
import { DATASETS } from "@/data/datasets";

const Index = () => {
  const [datasetId, setDatasetId] = useState("tourist_arrivals");
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [hovered, setHovered] = useState<{
    name: string | null;
    value: number | null;
    type?: "city" | "municipality";
  }>({ name: null, value: null });

  const activeDataset = DATASETS.find(d => d.id === datasetId) || DATASETS[0];

  const handleHover = useCallback((name: string | null, value: number | null, type?: "city" | "municipality") => {
    setHovered({ name, value, type });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <CebuMap datasetId={datasetId} onHover={handleHover} />

      <TopBar
        activeDataset={activeDataset}
        onDatasetChange={setDatasetId}
        showDropdown={showDropdown}
        onToggleDropdown={() => setShowDropdown(p => !p)}
        onToggleSidePanel={() => setSidePanelOpen(p => !p)}
        sidePanelOpen={sidePanelOpen}
      />

      <SidePanel open={sidePanelOpen} dataset={activeDataset} />

      <HoverInfoCard
        name={hovered.name}
        value={hovered.value}
        unit={activeDataset.unit}
        type={hovered.type}
      />

      <MapLegend dataset={activeDataset} />
    </div>
  );
};

export default Index;
