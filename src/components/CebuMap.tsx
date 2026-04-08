import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { cebuGeoJSON, CEBU_CENTER, CEBU_BOUNDS } from "@/data/cebu-geo";
import { SAMPLE_DATA, getDataRange, getColorForValue, getFillOpacity } from "@/data/datasets";

interface CebuMapProps {
  datasetId: string;
  onHover: (name: string | null, value: number | null, type?: "city" | "municipality") => void;
}

export function CebuMap({ datasetId, onHover }: CebuMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  const updateLayer = useCallback(() => {
    if (!mapRef.current) return;
    const data = SAMPLE_DATA[datasetId] || {};
    const { min, max } = getDataRange(datasetId);

    if (layerRef.current) {
      mapRef.current.removeLayer(layerRef.current);
    }

    layerRef.current = L.geoJSON(cebuGeoJSON as any, {
      style: (feature) => {
        const name = feature?.properties?.name || "";
        const value = data[name] || 0;
        return {
          fillColor: getColorForValue(value, min, max),
          fillOpacity: getFillOpacity(value, min, max),
          color: "hsl(174, 50%, 35%)",
          weight: 1.5,
          opacity: 0.6,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.name || "";
        const type = feature.properties?.type;
        const value = data[name] || 0;

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 2.5, color: "hsl(174, 72%, 60%)", fillOpacity: 0.9 });
            l.bringToFront();
            onHover(name, value, type);
          },
          mouseout: (e) => {
            layerRef.current?.resetStyle(e.target);
            onHover(null, null);
          },
        });
      },
    }).addTo(mapRef.current);
  }, [datasetId, onHover]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: CEBU_CENTER,
      zoom: 10,
      maxBounds: CEBU_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

    // Dark tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      maxZoom: 15,
      minZoom: 8,
    }).addTo(mapRef.current);

    // Labels layer on top
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
      maxZoom: 15,
      minZoom: 8,
      pane: "overlayPane",
    }).addTo(mapRef.current);

    updateLayer();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    updateLayer();
  }, [datasetId, updateLayer]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
