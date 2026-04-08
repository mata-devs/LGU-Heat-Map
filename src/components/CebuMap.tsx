import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import { cebuGeoJSON, CEBU_BOUNDS, loadCebuGeoJSON } from "@/data/cebu-geo";
import { SAMPLE_DATA, getDataRange, getColorForValue, getFillOpacity } from "@/data/datasets";

interface CebuMapProps {
  datasetId: string;
  onHover: (name: string | null, value: number | null, type?: "city" | "municipality" | null) => void;
}

export function CebuMap({ datasetId, onHover }: CebuMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const updateLayer = useCallback(() => {
    if (!mapRef.current || !cebuGeoJSON || !isLoaded) return;
    const data = SAMPLE_DATA[datasetId] || {};
    const { min, max } = getDataRange(datasetId);

    if (layerRef.current) {
      mapRef.current.removeLayer(layerRef.current);
    }

    layerRef.current = L.geoJSON(cebuGeoJSON as unknown as GeoJSON.FeatureCollection, {
      style: (feature) => {
        const name = feature?.properties?.name || feature?.properties?.NAME_2 || "";
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
        const name = feature.properties?.name || feature.properties?.NAME_2 || "";
        const type = feature.properties?.type || (feature.properties?.ENGTYPE_2?.includes("City") ? "city" : "municipality") || null;
        const value = data[name] || 0;

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 2.5, color: "hsl(174, 72%, 60%)", fillOpacity: 0.9 });
            l.bringToFront();
            onHover(name, value, type as "city" | "municipality" | null);
          },
          mouseout: (e) => {
            layerRef.current?.resetStyle(e.target);
            onHover(null, null, null);
          },
        });
      },
    }).addTo(mapRef.current);
  }, [datasetId, onHover, isLoaded]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map FIRST with proper bounds and zoom configuration
    const map = L.map(containerRef.current, {
      center: [10.32, 123.90],
      zoom: 10,
      minZoom: 8,
      maxZoom: 15,
      maxBounds: CEBU_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomControl: false,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add zoom control
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add CartoDB dark tile layer with proper retina support
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
      attribution: '© CartoDB',
      subdomains: ['a', 'b', 'c', 'd'],
      maxZoom: 19,
      minZoom: 8,
    }).addTo(map);

    // Now load GeoJSON and render the layer
    const loadAndRenderGeoJSON = async () => {
      try {
        await loadCebuGeoJSON();
        
        if (!cebuGeoJSON || !mapRef.current) {
          console.warn("GeoJSON not loaded or map not ready");
          return;
        }

        const data = SAMPLE_DATA[datasetId] || {};
        const { min, max } = getDataRange(datasetId);

        layerRef.current = L.geoJSON(cebuGeoJSON as unknown as GeoJSON.FeatureCollection, {
          style: (feature) => {
            const name = feature?.properties?.name || feature?.properties?.NAME_2 || "";
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
            const name = feature.properties?.name || feature.properties?.NAME_2 || "";
            const type = feature.properties?.type || (feature.properties?.ENGTYPE_2?.includes("City") ? "city" : "municipality") || null;
            const value = data[name] || 0;

            layer.on({
              mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 2.5, color: "hsl(174, 72%, 60%)", fillOpacity: 0.9 });
                l.bringToFront();
                onHover(name, value, type as "city" | "municipality" | null);
              },
              mouseout: (e) => {
                layerRef.current?.resetStyle(e.target);
                onHover(null, null, null);
              },
            });
          },
        }).addTo(mapRef.current);

        // Fit the map to the GeoJSON layer bounds
        requestAnimationFrame(() => {
          if (mapRef.current && layerRef.current) {
            const bounds = layerRef.current.getBounds();
            if (bounds.isValid()) {
              mapRef.current.fitBounds(bounds, { padding: [20, 20] });
            }
          }
        });

        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load and render GeoJSON:", error);
      }
    };

    loadAndRenderGeoJSON();

    // Handle window resize
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, [datasetId, onHover]);

  useEffect(() => {
    // Update layer when dataset changes and map is loaded
    if (!mapRef.current || !cebuGeoJSON || !isLoaded) return;
    updateLayer();
  }, [datasetId, updateLayer, isLoaded]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
