import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
  Compass
} from 'lucide-react';

export interface RegionMapViewerProps {
  regionName: string;
  regionId: string;
  hasPath?: boolean;
  rawPath?: unknown;
  lat?: number;
  lng?: number;
  levelLabel?: string;
  className?: string;
}

export const RegionMapViewer: React.FC<RegionMapViewerProps> = ({
  regionName,
  regionId,
  hasPath = false,
  rawPath,
  lat,
  lng,
  levelLabel = 'Region',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polygonLayerRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Normalize polygon paths into Array<Array<[number, number]>> for Leaflet
  const parseCoordinates = (data: unknown): Array<Array<[number, number]>> | null => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    try {
      const first = data[0];
      if (!Array.isArray(first) || first.length === 0) return null;

      // Case 1: [ [lat, lng], [lat, lng], ... ] (Single ring)
      if (typeof first[0] === 'number' && typeof first[1] === 'number') {
        const ring = data.filter(
          (pt: any) => Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number'
        ) as [number, number][];
        return ring.length >= 3 ? [ring] : null;
      }

      // Case 2: [ [ [lat, lng], ... ], [ [lat, lng], ... ] ] (Multi-ring / Islands)
      if (Array.isArray(first[0])) {
        const rings: Array<Array<[number, number]>> = [];
        for (const item of data) {
          if (Array.isArray(item)) {
            const validPts = item.filter(
              (pt: any) => Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number'
            ) as [number, number][];
            if (validPts.length >= 3) {
              rings.push(validPts);
            }
          }
        }
        return rings.length > 0 ? rings : null;
      }
    } catch (err) {
      console.warn('Gagal memproses koordinat polygon:', err);
    }
    return null;
  };

  const parsedRings = parseCoordinates(rawPath);
  const hasValidPolygon = Boolean(hasPath && parsedRings && parsedRings.length > 0);
  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);

  // Initialize Leaflet map safely (only in client browser)
  useEffect(() => {
    let isCancelled = false;

    if (typeof window === 'undefined' || !containerRef.current) return;

    const initMap = async () => {
      try {
        const LModule: any = await import('leaflet');
        const L = (window as any).L || (LModule?.default?.map ? LModule.default : (LModule?.map ? LModule : LModule?.default || LModule));
        
        // Inject Leaflet CSS dynamically if not already injected
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (isCancelled || !containerRef.current) return;

        // Reset previous container state if needed
        if ((containerRef.current as any)._leaflet_id) {
          (containerRef.current as any)._leaflet_id = null;
        }

        // If instance already exists, cleanup before re-attaching
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch {
            // ignore
          }
          mapInstanceRef.current = null;
        }

        const map = L.map(containerRef.current, {
          center: [-2.5, 118.0], // Indonesia archipelago center
          zoom: 5,
          zoomControl: false,
          attributionControl: false
        });

        // Crisp OpenStreetMap vector tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c']
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapReady(true);
      } catch (err) {
        console.error('Error initializing Leaflet map:', err);
        setLoadError('Failed to load interactive map library.');
      }
    };

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update polygons and markers when region selection changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    let isCancelled = false;

    const updateLayers = async () => {
      try {
        const LModule: any = await import('leaflet');
        const L = (window as any).L || (LModule?.default?.map ? LModule.default : (LModule?.map ? LModule : LModule?.default || LModule));
        if (isCancelled || !mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        // Clear existing polygon layer
        if (polygonLayerRef.current) {
          map.removeLayer(polygonLayerRef.current);
          polygonLayerRef.current = null;
        }

        // Clear existing marker layer
        if (markerLayerRef.current) {
          map.removeLayer(markerLayerRef.current);
          markerLayerRef.current = null;
        }

        let boundsToFit: any = null;

        // 1. Add Polygon if valid
        if (hasValidPolygon && parsedRings) {
          const polygon = L.polygon(parsedRings as any, {
            color: '#086288',
            weight: 2.5,
            opacity: 0.9,
            fillColor: '#086288',
            fillOpacity: 0.22,
            dashArray: undefined
          }).addTo(map);

          polygon.bindTooltip(
            `<strong>${regionName}</strong><br/><span style="font-size:11px;color:#475569;">${levelLabel} (ID: ${regionId})</span>`,
            { sticky: true, className: 'zyvora-map-tooltip' }
          );

          polygonLayerRef.current = polygon;
          boundsToFit = polygon.getBounds();
        }

        // 2. Add Center Coordinate Marker
        if (hasCoordinates) {
          const marker = L.circleMarker([lat!, lng!], {
            radius: 7,
            color: '#FFFFFF',
            weight: 2,
            fillColor: '#086288',
            fillOpacity: 1
          }).addTo(map);

          marker.bindPopup(
            `<div style="font-size:12px;font-family:sans-serif;line-height:1.4;">
              <strong style="color:#086288;">${regionName}</strong>
              <div style="color:#475569;font-size:11px;">${levelLabel} &bull; Code: ${regionId}</div>
              <div style="font-family:monospace;font-size:10px;margin-top:4px;color:#334155;">
                Lat: ${lat!.toFixed(6)}, Lng: ${lng!.toFixed(6)}
              </div>
            </div>`
          );

          markerLayerRef.current = marker;
          if (!boundsToFit) {
            map.setView([lat!, lng!], 11, { animate: true });
          }
        }

        // Fit map view if polygon bounds exist
        if (boundsToFit && boundsToFit.isValid()) {
          map.fitBounds(boundsToFit, {
            padding: [24, 24],
            maxZoom: 14,
            animate: true
          });
        }
      } catch (err) {
        console.warn('Error updating map layers:', err);
      }
    };

    updateLayers();

    return () => {
      isCancelled = true;
    };
  }, [mapReady, regionId, regionName, hasValidPolygon, parsedRings, hasCoordinates, lat, lng, levelLabel]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    if (polygonLayerRef.current) {
      mapInstanceRef.current.fitBounds(polygonLayerRef.current.getBounds(), { padding: [24, 24] });
    } else if (hasCoordinates) {
      mapInstanceRef.current.setView([lat!, lng!], 11);
    } else {
      mapInstanceRef.current.setView([-2.5, 118.0], 5);
    }
  };

  return (
    <div className={`relative bg-slate-50 border border-[#DCE5EC] rounded-xl overflow-hidden shadow-2xs ${className}`}>
      {/* Top Map Bar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xs border border-[#DCE5EC] rounded-lg px-2.5 py-1.5 shadow-2xs pointer-events-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#086288] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#0F172A] truncate max-w-[200px] sm:max-w-xs">
            {regionName || 'Indonesia Regional Map'}
          </span>
          {hasValidPolygon ? (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
              Active Boundary Polygon ({parsedRings?.length || 1} Ring)
            </span>
          ) : (
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
              Coordinate Center
            </span>
          )}
        </div>

        {/* Map Controls */}
        <div className="bg-white/95 backdrop-blur-xs border border-[#DCE5EC] rounded-lg p-1 shadow-2xs pointer-events-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#475569] hover:text-[#086288] transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#475569] hover:text-[#086288] transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Reset View / Fit Bounds"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#475569] hover:text-[#086288] transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div
        ref={containerRef}
        style={{ minHeight: '300px', height: '340px' }}
        className="w-full bg-slate-100 z-0"
      />

      {/* Notice Overlay if polygon is unavailable */}
      {!hasValidPolygon && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[1000] pointer-events-none">
          <div className="bg-amber-50/95 backdrop-blur-xs border border-amber-200 text-amber-800 rounded-lg p-2.5 text-[11px] flex items-start gap-2 shadow-2xs pointer-events-auto">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <strong>Boundary Polygon Unavailable:</strong> Regional dataset does not have polygon boundary coordinates for this {levelLabel.toLowerCase()} (<code className="font-mono text-[10px] bg-amber-100 px-1 rounded">has_path: false</code>). Boundaries are never fabricated.
              {hasCoordinates && (
                <span className="block mt-1 text-slate-600">
                  Map displays geographic coordinate center at <code className="font-mono text-[10px]">{lat?.toFixed(5)}, {lng?.toFixed(5)}</code>.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-[1001]">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-xs font-semibold text-slate-800">{loadError}</p>
        </div>
      )}
    </div>
  );
};
