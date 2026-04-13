import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GeoJSON as GeoJSONType, Feature } from "geojson";

interface CebuMapProps {
  datasetId: string;
  onHover: (name: string | null, value: number | null, type?: "city" | "municipality" | null) => void;
  data: Record<string, number>;
  dataRange: { min: number; max: number };
  dataSource?: 'sheet' | 'fallback';
  showBoundaries?: boolean;
}

export function CebuMap({ datasetId, onHover, data, dataRange, dataSource, showBoundaries = false }: CebuMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [10.32, 123.90],
      zoom: 10,
      minZoom: 8,
      maxZoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add zoom control
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add CartoDB dark tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
      attribution: '© CartoDB',
      subdomains: ['a', 'b', 'c', 'd'],
      maxZoom: 19,
      minZoom: 8,
    }).addTo(map);

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
  }, []);

  // Load and render GeoJSON layer
  useEffect(() => {
    if (!mapRef.current) return;

    const loadGeoJSON = async () => {
      try {
        const response = await fetch('cebu-municipalities.geojson');
        const cebuData: GeoJSONType = await response.json();

        // Remove existing layer if present
        if (geoJsonLayerRef.current) {
          mapRef.current!.removeLayer(geoJsonLayerRef.current);
        }

        // Create GeoJSON layer with proper styling
        const geoJsonLayer = L.geoJSON(cebuData, {
          style: (feature) => ({
            color: '#0891b2', // darker teal stroke
            weight: 2,
            opacity: 1,
            fillOpacity: 0.5,
            fillColor: '#06b6d4', // brighter teal fill
          }),
          onEachFeature: (feature, layer) => {
            const properties = feature.properties || {};
            const name = properties.name || properties.NAME || 'Unknown';
            
            // Add hover interaction
            layer.on('mouseover', () => {
              if (layer instanceof L.Path) {
                layer.setStyle({
                  weight: 3,
                  fillOpacity: 0.8,
                  color: '#00d4ff',
                });
              }
              const value = data[name] || null;
              onHover(name, typeof value === 'number' ? value : null);
            });
            
            layer.on('mouseout', () => {
              if (layer instanceof L.Path) {
                layer.setStyle({
                  weight: 2,
                  fillOpacity: 0.5,
                  color: '#0891b2',
                });
              }
              onHover(null, null);
            });
          },
        });

        geoJsonLayer.addTo(mapRef.current);
        geoJsonLayerRef.current = geoJsonLayer;
        
        // Log loaded municipalities for debugging
        const loadedMunis = new Set<string>();
        geoJsonLayer.eachLayer((layer: any) => {
          if (layer.feature?.properties?.name) {
            loadedMunis.add(layer.feature.properties.name);
          }
        });
        console.log(`Loaded ${loadedMunis.size} municipalities:`, Array.from(loadedMunis).sort());
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
      }
    };

    loadGeoJSON();
  }, [data, onHover]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}