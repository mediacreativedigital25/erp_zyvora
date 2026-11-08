/**
 * Zyvora ERP 1.0.0 — Address Map View & Geolocation Pinpicker
 * Official Integration with Emsifa API Wilayah Indonesia v2:
 * https://www.emsifa.com/api-wilayah-indonesia/v2
 *
 * Features:
 * - Direct geolocation (lat, lng) resolution from Emsifa v2 endpoints:
 *   - /provinces.json
 *   - /regencies/{provinceId}.json
 *   - /districts/{regencyId}.json
 *   - /villages/{districtId}.json
 * - Official territorial boundary polygon overlays from /paths/{regionId}.json
 * - Interactive Leaflet map with custom Zyvora branding pin (#086288) and draggable precision coordinates.
 * - In-memory caching for sub-millisecond response on repeated queries.
 * - GPS locator and Google Maps external viewer.
 * - 100% English copywriting & Zyvora design tokens.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  RotateCcw,
  ExternalLink,
  Layers,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Globe2,
  Loader2
} from 'lucide-react';
import { StandardAddressData } from '../../types/erp';

const EMSIFA_V2_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/v2';

// In-memory cache for Emsifa v2 API responses
const emsifaCache = new Map<string, any>();

async function fetchEmsifaV2<T>(endpoint: string): Promise<T | null> {
  const url = `${EMSIFA_V2_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (emsifaCache.has(url)) {
    return emsifaCache.get(url) as T;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const json = await res.json();
    const data = (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
    emsifaCache.set(url, data);
    return data;
  } catch (err) {
    console.warn(`[Emsifa v2 API] Failed fetching ${url}:`, err);
    return null;
  }
}

/**
 * Normalizes Kemendagri / BPS ID into standard Emsifa v2 dotted format
 * e.g. '3173' -> '31.73', '317306' -> '31.73.06', '3173061001' -> '31.73.06.1001'
 */
function normalizeEmsifaId(id?: string): string {
  if (!id) return '';
  const clean = id.trim();
  if (clean.includes('.')) return clean;

  if (clean.length === 4) {
    return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  }
  if (clean.length === 6) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4)}`;
  }
  if (clean.length === 7) {
    // Some formats have 7 digits e.g. 3173010
    return `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4, 6)}`;
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4, 6)}.${clean.slice(6)}`;
  }
  return clean;
}

export interface AddressMapViewProps {
  addressData: StandardAddressData;
  onCoordinatesChange?: (coords: { latitude: number; longitude: number }) => void;
  className?: string;
  height?: string;
  readOnly?: boolean;
}

export const AddressMapView: React.FC<AddressMapViewProps> = ({
  addressData,
  onCoordinatesChange,
  className = '',
  height = '360px',
  readOnly = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polygonLayerRef = useRef<any>(null);

  // Default coordinate: Jakarta Barat Kalideres or Jakarta
  const defaultLat = addressData.latitude || -6.1492;
  const defaultLng = addressData.longitude || 106.6988;

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: defaultLat,
    lng: defaultLng
  });

  const [resolvedRegionName, setResolvedRegionName] = useState<string>('Kalideres, DKI Jakarta');
  const [resolvedRegionId, setResolvedRegionId] = useState<string>('31.73.06.1001');
  const [hasPolygon, setHasPolygon] = useState<boolean>(false);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);

  // Sync coords from props if changed externally
  useEffect(() => {
    if (
      addressData.latitude !== undefined &&
      addressData.longitude !== undefined &&
      (Math.abs(addressData.latitude - coords.lat) > 0.00001 ||
        Math.abs(addressData.longitude - coords.lng) > 0.00001)
    ) {
      setCoords({ lat: addressData.latitude, lng: addressData.longitude });
      if (markerRef.current && mapInstanceRef.current) {
        markerRef.current.setLatLng([addressData.latitude, addressData.longitude]);
      }
    }
  }, [addressData.latitude, addressData.longitude]);

  // Query Emsifa v2 API for official coordinates and territorial boundary polygon
  const resolveLocationFromEmsifaV2 = useCallback(async () => {
    setIsLoadingApi(true);

    const normVillageId = normalizeEmsifaId(addressData.villageId);
    const normDistrictId = normalizeEmsifaId(addressData.districtId);
    const normRegencyId = normalizeEmsifaId(addressData.regencyId);
    const normProvinceId = normalizeEmsifaId(addressData.provinceId);

    let targetLat: number | null = null;
    let targetLng: number | null = null;
    let targetZoom = 14;
    let regionLabel = '';
    let regionId = '';
    let boundaryPath: any = null;

    try {
      // 1. Try Village Level
      if (normDistrictId) {
        const villages = await fetchEmsifaV2<Array<{ id: string; name: string; lat?: number; lng?: number; has_path?: boolean }>>(
          `/villages/${normDistrictId}.json`
        );
        if (villages && villages.length > 0) {
          const match = normVillageId
            ? villages.find((v) => v.id === normVillageId)
            : addressData.villageName
            ? villages.find((v) => v.name.toLowerCase() === addressData.villageName!.toLowerCase())
            : villages[0];

          if (match && match.lat && match.lng) {
            targetLat = match.lat;
            targetLng = match.lng;
            targetZoom = 15;
            regionLabel = match.name;
            regionId = match.id;

            // Fetch polygon boundary from Emsifa v2
            if (match.has_path || match.id) {
              const pathData = await fetchEmsifaV2<{ id: string; path: any }>(`/paths/${match.id}.json`);
              if (pathData && pathData.path) {
                boundaryPath = pathData.path;
              }
            }
          }
        }
      }

      // 2. Try District Level if Village not resolved
      if (targetLat === null && normRegencyId) {
        const districts = await fetchEmsifaV2<Array<{ id: string; name: string; lat?: number; lng?: number; has_path?: boolean }>>(
          `/districts/${normRegencyId}.json`
        );
        if (districts && districts.length > 0) {
          const match = normDistrictId
            ? districts.find((d) => d.id === normDistrictId)
            : addressData.districtName
            ? districts.find((d) => d.name.toLowerCase() === addressData.districtName!.toLowerCase())
            : districts[0];

          if (match && match.lat && match.lng) {
            targetLat = match.lat;
            targetLng = match.lng;
            targetZoom = 14;
            regionLabel = match.name;
            regionId = match.id;

            if (match.has_path || match.id) {
              const pathData = await fetchEmsifaV2<{ id: string; path: any }>(`/paths/${match.id}.json`);
              if (pathData && pathData.path) {
                boundaryPath = pathData.path;
              }
            }
          }
        }
      }

      // 3. Try Regency Level if District not resolved
      if (targetLat === null && normProvinceId) {
        const regencies = await fetchEmsifaV2<Array<{ id: string; name: string; lat?: number; lng?: number; has_path?: boolean }>>(
          `/regencies/${normProvinceId}.json`
        );
        if (regencies && regencies.length > 0) {
          const match = normRegencyId
            ? regencies.find((r) => r.id === normRegencyId)
            : addressData.regencyName
            ? regencies.find((r) => r.name.toLowerCase().includes(addressData.regencyName!.toLowerCase()))
            : regencies[0];

          if (match && match.lat && match.lng) {
            targetLat = match.lat;
            targetLng = match.lng;
            targetZoom = 12;
            regionLabel = match.name;
            regionId = match.id;

            if (match.has_path || match.id) {
              const pathData = await fetchEmsifaV2<{ id: string; path: any }>(`/paths/${match.id}.json`);
              if (pathData && pathData.path) {
                boundaryPath = pathData.path;
              }
            }
          }
        }
      }

      // 4. Try Province Level if Regency not resolved
      if (targetLat === null && normProvinceId) {
        const provinces = await fetchEmsifaV2<Array<{ id: string; name: string; lat?: number; lng?: number; has_path?: boolean }>>(
          '/provinces.json'
        );
        if (provinces && provinces.length > 0) {
          const match = provinces.find((p) => p.id === normProvinceId) ||
            provinces.find((p) => p.name.toLowerCase().includes((addressData.provinceName || '').toLowerCase()));

          if (match && match.lat && match.lng) {
            targetLat = match.lat;
            targetLng = match.lng;
            targetZoom = 10;
            regionLabel = match.name;
            regionId = match.id;

            if (match.has_path || match.id) {
              const pathData = await fetchEmsifaV2<{ id: string; path: any }>(`/paths/${match.id}.json`);
              if (pathData && pathData.path) {
                boundaryPath = pathData.path;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Emsifa v2] Resolution error:', e);
    } finally {
      setIsLoadingApi(false);
    }

    // Default Fallback: Kalideres, Jakarta Barat
    if (targetLat === null || targetLng === null) {
      targetLat = -6.1492;
      targetLng = 106.6988;
      targetZoom = 14;
      regionLabel = addressData.villageName || addressData.districtName || 'Kalideres';
      regionId = normVillageId || '31.73.06.1001';
    }

    setResolvedRegionName(regionLabel);
    setResolvedRegionId(regionId);
    setHasPolygon(Boolean(boundaryPath));

    return {
      lat: targetLat,
      lng: targetLng,
      zoom: targetZoom,
      boundaryPath,
      label: regionLabel,
      regionId
    };
  }, [
    addressData.villageId,
    addressData.villageName,
    addressData.districtId,
    addressData.districtName,
    addressData.regencyId,
    addressData.regencyName,
    addressData.provinceId,
    addressData.provinceName
  ]);

  // Initialize Leaflet Map (SSR & Node safe dynamic import)
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let isMounted = true;

    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css')
    ]).then(async ([LModule]) => {
      if (!isMounted || !containerRef.current) return;
      const L = LModule.default || LModule;

      // Clean up previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Resolve initial position from Emsifa v2 API
      const initialEmsifa = await resolveLocationFromEmsifaV2();
      if (!isMounted || !containerRef.current) return;

      const initLat = addressData.latitude || initialEmsifa.lat;
      const initLng = addressData.longitude || initialEmsifa.lng;
      const initZoom = initialEmsifa.zoom;

      // Custom Zyvora Pin Icon
      const customPinIcon = L.divIcon({
        className: 'zyvora-map-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; transform: translate(-50%, -100%);">
            <div style="
              background: linear-gradient(135deg, #086288 0%, #064B6A 100%);
              width: 34px;
              height: 34px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(8, 98, 136, 0.5);
              border: 2.5px solid #ffffff;
            ">
              <div style="transform: rotate(45deg); color: #ffffff; display: flex; align-items: center; justify-content: center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
            </div>
            <div style="
              position: absolute;
              bottom: -4px;
              left: 50%;
              transform: translateX(-50%);
              width: 10px;
              height: 10px;
              background: rgba(8, 98, 136, 0.4);
              border-radius: 50%;
              filter: blur(1.5px);
            "></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34]
      });

      // Initialize Leaflet Map
      const map = L.map(containerRef.current, {
        center: [initLat, initLng],
        zoom: initZoom,
        zoomControl: false,
        attributionControl: false
      });

      // OpenStreetMap Tile Layer
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Render Emsifa v2 Territorial Boundary Polygon if available
      if (initialEmsifa.boundaryPath) {
        try {
          const poly = L.polygon(initialEmsifa.boundaryPath, {
            color: '#086288',
            fillColor: '#086288',
            fillOpacity: 0.12,
            weight: 2.5,
            dashArray: '5, 6'
          }).addTo(map);
          polygonLayerRef.current = poly;
          map.fitBounds(poly.getBounds(), { padding: [20, 20] });
        } catch (e) {
          console.warn('[Emsifa v2] Polygon render skipped:', e);
        }
      }

      // Add Custom Draggable Marker
      const marker = L.marker([initLat, initLng], {
        icon: customPinIcon,
        draggable: !readOnly
      }).addTo(map);

      const addressLabel = [
        addressData.address,
        addressData.villageName,
        addressData.districtName,
        addressData.regencyName,
        addressData.provinceName
      ].filter(Boolean).join(', ') || initialEmsifa.label || 'Employee Residential Location';

      marker.bindPopup(
        `<div style="font-family: inherit; font-size: 11px;">
          <div style="font-weight: 700; color: #086288; margin-bottom: 2px;">Emsifa API Wilayah v2</div>
          <div style="font-weight: 600; color: #0F172A; margin-bottom: 4px;">${addressLabel}</div>
          <div style="font-size: 10px; color: #64748B;">Lat: ${initLat.toFixed(5)}, Lng: ${initLng.toFixed(5)}</div>
        </div>`
      );

      // Listen for marker drag
      if (!readOnly) {
        marker.on('dragend', (e: any) => {
          const latlng = e.target.getLatLng();
          setCoords({ lat: latlng.lat, lng: latlng.lng });
          onCoordinatesChange?.({ latitude: latlng.lat, longitude: latlng.lng });
        });

        // Click on map to place pin
        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
          onCoordinatesChange?.({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setMapReady(true);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // When Address Region changes in the form, query Emsifa v2 and update the map live
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !markerRef.current) return;
    if (addressData.latitude && addressData.longitude) return;

    let isSubscribed = true;

    resolveLocationFromEmsifaV2().then((result) => {
      if (!isSubscribed || !mapInstanceRef.current || !markerRef.current) return;
      import('leaflet').then((LModule) => {
        const L = LModule.default || LModule;

        setCoords({ lat: result.lat, lng: result.lng });
        markerRef.current.setLatLng([result.lat, result.lng]);

        // Remove old polygon boundary layer
        if (polygonLayerRef.current) {
          mapInstanceRef.current.removeLayer(polygonLayerRef.current);
          polygonLayerRef.current = null;
        }

        // Draw new polygon boundary from Emsifa v2 if available
        if (result.boundaryPath) {
          try {
            const poly = L.polygon(result.boundaryPath, {
              color: '#086288',
              fillColor: '#086288',
              fillOpacity: 0.12,
              weight: 2.5,
              dashArray: '5, 6'
            }).addTo(mapInstanceRef.current);
            polygonLayerRef.current = poly;
            mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [24, 24] });
          } catch {
            mapInstanceRef.current.flyTo([result.lat, result.lng], result.zoom, { duration: 1.0 });
          }
        } else {
          mapInstanceRef.current.flyTo([result.lat, result.lng], result.zoom, { duration: 1.0 });
        }
      });
    });

    return () => {
      isSubscribed = false;
    };
  }, [
    addressData.villageId,
    addressData.villageName,
    addressData.districtId,
    addressData.districtName,
    addressData.regencyId,
    addressData.regencyName,
    addressData.provinceId,
    addressData.provinceName,
    mapReady,
    resolveLocationFromEmsifaV2
  ]);

  // Recenter to current Emsifa v2 region
  const handleRecenterRegion = async () => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    const result = await resolveLocationFromEmsifaV2();
    setCoords({ lat: result.lat, lng: result.lng });
    markerRef.current.setLatLng([result.lat, result.lng]);

    if (polygonLayerRef.current) {
      mapInstanceRef.current.fitBounds(polygonLayerRef.current.getBounds(), { padding: [24, 24] });
    } else {
      mapInstanceRef.current.flyTo([result.lat, result.lng], result.zoom, { duration: 0.8 });
    }
    onCoordinatesChange?.({ latitude: result.lat, longitude: result.lng });
  };

  // Browser GPS Locator
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.0 });
        }
        onCoordinatesChange?.({ latitude, longitude });
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className={`bg-white border border-[#DCE5EC] rounded-xl overflow-hidden flex flex-col shadow-2xs ${className}`}>
      {/* Top Map Toolbar with Emsifa v2 Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#DCE5EC]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] flex items-center justify-center shrink-0">
            <Globe2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5 flex-wrap">
              <span>Interactive Geolocation Map</span>
              <a
                href="https://www.emsifa.com/api-wilayah-indonesia/v2"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] hover:bg-[#B7DDEA]/40 transition-colors"
                title="Powered by official Emsifa API Wilayah Indonesia v2"
              >
                <span>Emsifa API v2</span>
                <ExternalLink className="w-2 h-2" />
              </a>
              {hasPolygon && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Boundary Polygon</span>
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
              {isLoadingApi ? (
                <span className="flex items-center gap-1 text-[#086288]">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Connecting to Emsifa v2 database...</span>
                </span>
              ) : (
                <span>
                  Region: <strong className="text-[#0F172A]">{resolvedRegionName}</strong> (Code: {resolvedRegionId})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            title="Locate via device GPS"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-[#DCE5EC] bg-white text-[#086288] hover:bg-[#EFF7FA] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
            <span>GPS</span>
          </button>

          <button
            type="button"
            onClick={handleRecenterRegion}
            disabled={isLoadingApi}
            title="Recenter to Emsifa v2 region coordinates"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-[#DCE5EC] bg-white text-[#475569] hover:bg-[#F8FAFC] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3 h-3 ${isLoadingApi ? 'animate-spin' : ''}`} />
            <span>Recenter</span>
          </button>
        </div>
      </div>

      {/* Map Body */}
      <div className="relative w-full flex-1" style={{ minHeight: height }}>
        <div
          ref={containerRef}
          className="w-full h-full z-0"
          style={{ minHeight: height }}
        />

        {/* Zoom Controls Overlay */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 bg-white/95 rounded-lg border border-[#DCE5EC] shadow-md p-0.5 backdrop-blur-xs">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-[#0F172A] hover:bg-[#EFF7FA] hover:text-[#086288] rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="h-px bg-[#DCE5EC]" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-[#0F172A] hover:bg-[#EFF7FA] hover:text-[#086288] rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Coordinate Badge & Google Maps Link */}
        <div className="absolute left-3 bottom-3 z-10 bg-white/95 rounded-md border border-[#DCE5EC] shadow-md px-2.5 py-1 flex items-center gap-2 backdrop-blur-xs text-[11px]">
          <MapPin className="w-3 h-3 text-[#086288] shrink-0" />
          <span className="font-mono text-[#086288] font-bold">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </span>
          <a
            href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-[10px] text-[#086288] hover:underline font-semibold ml-1 pl-1.5 border-l border-[#DCE5EC]"
            title="View pin on Google Maps"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};