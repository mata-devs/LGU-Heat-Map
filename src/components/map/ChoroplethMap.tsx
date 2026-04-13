import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GeoJSON as GeoJSONType, Feature } from "geojson";

interface ChoroplethMapProps {
  datasetId: string;
  onHover: (name: string | null, value: number | null, type?: "city" | "municipality" | null) => void;
  data: Record<string, number>;
  dataRange: { min: number; max: number };
  dataSource?: 'sheet' | 'fallback';
  tileLayer?: 'cartoDark' | 'openStreetMap';
  highlightedLGU?: string | null;
  isolatedLGU?: string | null;
}

const TILE_LAYERS = {
  cartoDark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '© CartoDB',
    subdomains: ['a', 'b', 'c', 'd'],
  },
  openStreetMap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    subdomains: ['a', 'b', 'c'],
  },
};

const OSM_COLORS = [
  '#fecaca',
  '#fca5a5',
  '#f87171',
  '#ef4444',
  '#dc2626',
  '#991b1b',
  '#7f1d1d',
];

const DARK_COLORS = [
  '#042f2e', // teal-950
  '#134e4a', // teal-900
  '#0f766e', // teal-700
  '#14b8a6', // teal-500
  '#2dd4bf', // teal-400
  '#5eead4', // teal-300
  '#a7f3d0', // emerald-200
];

export function ChoroplethMap({ datasetId, onHover, data, dataRange, dataSource, tileLayer = 'cartoDark', highlightedLGU = null, isolatedLGU = null }: ChoroplethMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

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

    // Add tile layer
    const tileConfig = TILE_LAYERS.cartoDark;
    const newTileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains,
      maxZoom: 19,
      minZoom: 8,
    }).addTo(map);
    tileLayerRef.current = newTileLayer;

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

  // Switch tile layer when tileLayer prop changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Remove old tile layer
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    
    // Add new tile layer
    const tileConfig = TILE_LAYERS[tileLayer];
    const newTileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains,
      maxZoom: 19,
      minZoom: 8,
    }).addTo(mapRef.current);
    tileLayerRef.current = newTileLayer;
  }, [tileLayer]);

  // Color scale function - takes value and returns color based on tile layer
  const getColor = (value: number | undefined, min: number, max: number, isDark: boolean): string => {
    if (value === undefined || value === 0) return isDark ? '#374151' : '#d1d5db'; // gray for zero/no data
    
    const ratio = (value - min) / (max - min || 1);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const stretchedRatio = Math.pow(clampedRatio, 0.78);
    
    const colors = isDark ? DARK_COLORS : OSM_COLORS;
    const index = Math.min(Math.floor(stretchedRatio * colors.length), colors.length - 1);
    return colors[index];
  };

  // Load and render GeoJSON layer
  useEffect(() => {
    const loadGeoJSON = async () => {
      // Guard against null map during hot reload
      if (!mapRef.current) {
        console.warn('GeoJSON: map not ready, skipping load');
        return;
      }
      
      try {
        const response = await fetch('/data/geo/cebu-lgu-boundaries.geojson');
        const cebuData: GeoJSONType = await response.json();

        // Remove existing layer if present
        if (geoJsonLayerRef.current) {
          mapRef.current!.removeLayer(geoJsonLayerRef.current);
        }

        // Create GeoJSON layer with proper styling
        const geoJsonLayer = L.geoJSON(cebuData, {
          style: (feature) => {
            const name = feature.properties?.name || feature.properties?.NAME || '';
            const value = data[name];
            const isHighlighted = highlightedLGU === name;
            const isDimmed = highlightedLGU && !isHighlighted;
            const isHiddenByIsolation = Boolean(isolatedLGU && isolatedLGU !== name);
            const isDark = tileLayer === 'cartoDark';
            const color = getColor(value !== undefined ? value : undefined, dataRange.min, dataRange.max, isDark);
            const boundaryColor = isDark ? '#14b8a6' : '#334155';
            const boundaryWeight = 2.5;
            const highlightStroke = isDark ? '#a7f3d0' : '#7f1d1d';
            
            return {
              color: isHiddenByIsolation ? 'transparent' : isHighlighted ? highlightStroke : boundaryColor,
              weight: isHiddenByIsolation ? 0 : isHighlighted ? 4 : boundaryWeight,
              opacity: isHiddenByIsolation ? 0 : isDimmed ? 0.2 : 1,
              fillOpacity: isHiddenByIsolation ? 0 : isHighlighted ? 0.8 : isDimmed ? 0.1 : 0.6,
              fillColor: isHiddenByIsolation ? 'transparent' : color,
            };
          },
          onEachFeature: (feature, layer) => {
            const properties = feature.properties || {};
            const name = properties.name || properties.NAME || 'Unknown';
            
            // Add hover interaction
            layer.on('mouseover', () => {
              if (layer instanceof L.Path) {
                layer.setStyle({
                  weight: 3,
                  fillOpacity: 0.8,
                  color: tileLayer === 'cartoDark' ? '#67e8f9' : '#9a3412',
                });
              }
              const value = data[name] || null;
              onHover(name, typeof value === 'number' ? value : null);
            });
            
            layer.on('mouseout', () => {
              if (layer instanceof L.Path && geoJsonLayerRef.current) {
                geoJsonLayerRef.current.resetStyle(layer);
              }
              onHover(null, null);
            });
          },
        });

        geoJsonLayer.addTo(mapRef.current);
        geoJsonLayerRef.current = geoJsonLayer;
        
        // Log loaded municipalities for debugging
        const loadedMunis = new Set<string>();
        geoJsonLayer.eachLayer((layer) => {
          const layerAny = layer as { feature?: { properties?: { name?: string } } };
          if (layerAny.feature?.properties?.name) {
            loadedMunis.add(layerAny.feature.properties.name);
          }
        });
        console.log(`Loaded ${loadedMunis.size} municipalities:`, Array.from(loadedMunis).sort());
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
      }
    };

    loadGeoJSON();
  }, [data, onHover, highlightedLGU, isolatedLGU, tileLayer, dataRange.min, dataRange.max]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}