import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe2,
  Terminal,
  Send,
  Copy,
  Check,
  RefreshCw,
  Code2,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Layers,
  Search,
  Database,
  ArrowRight,
  ExternalLink,
  Building,
  Sparkles
} from 'lucide-react';
import {
  IndonesiaRegionService,
  EmsifaV2Province,
  EmsifaV2Regency,
  EmsifaV2District,
  EmsifaV2Village,
  EmsifaV2PathData,
  EmsifaV2PostalCodeResult,
  ApiCallResult,
  SUPPORTED_COUNTRIES
} from '../../services/indonesiaRegionService';
import { useErp } from '../../context/ErpContext';
import { RegionMapViewer } from './RegionMapViewer';
import { StandardAddressData } from '../../types/erp';

export type EndpointCategory =
  | 'provinces'
  | 'regencies'
  | 'districts'
  | 'villages'
  | 'paths'
  | 'postal_codes';

export interface IndonesiaRegionPlaygroundProps {
  initialAddress?: StandardAddressData;
  onAddressChange?: (address: StandardAddressData) => void;
  onApplyToForm?: (address: Partial<StandardAddressData>) => void;
  showFullAddressLine?: boolean;
  disabled?: boolean;
  errors?: Record<string, string>;
  onClearError?: (key: string) => void;
  className?: string;
  isSuperAdmin?: boolean;
  showApiRequestSection?: boolean;
}

export const IndonesiaRegionPlayground: React.FC<IndonesiaRegionPlaygroundProps> = ({
  initialAddress,
  onAddressChange,
  onApplyToForm,
  showFullAddressLine = true,
  disabled = false,
  errors = {},
  onClearError,
  className = '',
  isSuperAdmin,
  showApiRequestSection = false
}) => {
  // Determine if current user is super admin (from prop or context)
  let isSuperAdminFromContext = false;
  try {
    const erp = useErp();
    isSuperAdminFromContext = Boolean(
      erp.currentUser?.role === 'super_admin' ||
      erp.currentUser?.isPlatformSuperAdmin ||
      erp.currentUser?.userCode === '2A'
    );
  } catch {
    // Isolated execution without ErpProvider
  }
  const effectiveIsSuperAdmin = isSuperAdmin !== undefined ? isSuperAdmin : isSuperAdminFromContext;
  // Cascading selections
  const [selectedCountry, setSelectedCountry] = useState<string>(initialAddress?.country || 'Indonesia');
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>(initialAddress?.provinceId || '31'); // Default: DKI Jakarta
  const [selectedRegencyId, setSelectedRegencyId] = useState<string>(initialAddress?.regencyId || '31.71'); // Default: Jakarta Pusat
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(initialAddress?.districtId || '');
  const [selectedVillageId, setSelectedVillageId] = useState<string>(initialAddress?.villageId || '');
  const [postalCode, setPostalCode] = useState<string>(initialAddress?.postalCode || '');
  const [addressLine, setAddressLine] = useState<string>(initialAddress?.address || '');

  // Postal code direct search query for API endpoint testing
  const [postalSearchQuery, setPostalSearchQuery] = useState<string>('12190');

  // Active category under inspection
  const [activeCategory, setActiveCategory] = useState<EndpointCategory>('regencies');

  // Loaded region lists
  const [provinces, setProvinces] = useState<EmsifaV2Province[]>([]);
  const [regencies, setRegencies] = useState<EmsifaV2Regency[]>([]);
  const [districts, setDistricts] = useState<EmsifaV2District[]>([]);
  const [villages, setVillages] = useState<EmsifaV2Village[]>([]);

  // Boundary path for current region
  const [pathData, setPathData] = useState<unknown | null>(null);

  // Live API Response State
  const [currentApiResult, setCurrentApiResult] = useState<ApiCallResult<any> | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);

  // Response Viewer Settings
  const [isResponseVisible, setIsResponseVisible] = useState<boolean>(true);
  const [isFormattedJson, setIsFormattedJson] = useState<boolean>(true);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Active entity details
  const activeProvince = provinces.find((p) => p.id === selectedProvinceId);
  const activeRegency = regencies.find((r) => r.id === selectedRegencyId);
  const activeDistrict = districts.find((d) => d.id === selectedDistrictId);
  const activeVillage = villages.find((v) => v.id === selectedVillageId);

  // Notify parent of address updates
  const notifyAddressChange = useCallback(
    (overrides: Partial<StandardAddressData> = {}) => {
      if (!onAddressChange) return;

      const pId = overrides.provinceId !== undefined ? overrides.provinceId : selectedProvinceId;
      const rId = overrides.regencyId !== undefined ? overrides.regencyId : selectedRegencyId;
      const dId = overrides.districtId !== undefined ? overrides.districtId : selectedDistrictId;
      const vId = overrides.villageId !== undefined ? overrides.villageId : selectedVillageId;

      const pObj = provinces.find((p) => p.id === pId);
      const rObj = regencies.find((r) => r.id === rId);
      const dObj = districts.find((d) => d.id === dId);
      const vObj = villages.find((v) => v.id === vId);

      const computedLat = overrides.latitude !== undefined
        ? overrides.latitude
        : (vObj?.lat ?? dObj?.lat ?? rObj?.lat ?? pObj?.lat ?? initialAddress?.latitude);
      const computedLng = overrides.longitude !== undefined
        ? overrides.longitude
        : (vObj?.lng ?? dObj?.lng ?? rObj?.lng ?? pObj?.lng ?? initialAddress?.longitude);

      onAddressChange({
        country: overrides.country ?? selectedCountry,
        provinceId: pId,
        provinceName: overrides.provinceName ?? (pObj ? pObj.name : initialAddress?.provinceName || ''),
        regencyId: rId,
        regencyName: overrides.regencyName ?? (rObj ? rObj.name : initialAddress?.regencyName || ''),
        districtId: dId,
        districtName: overrides.districtName ?? (dObj ? dObj.name : initialAddress?.districtName || ''),
        villageId: vId,
        villageName: overrides.villageName ?? (vObj ? vObj.name : initialAddress?.villageName || ''),
        postalCode: overrides.postalCode ?? postalCode,
        address: overrides.address ?? addressLine,
        latitude: computedLat,
        longitude: computedLng
      });
    },
    [
      onAddressChange,
      provinces,
      regencies,
      districts,
      villages,
      selectedCountry,
      selectedProvinceId,
      selectedRegencyId,
      selectedDistrictId,
      selectedVillageId,
      postalCode,
      addressLine,
      initialAddress
    ]
  );

  // 1. Initial Load: Provinces list
  useEffect(() => {
    let mounted = true;
    const loadProvinces = async () => {
      const res = await IndonesiaRegionService.fetchV2Provinces();
      if (mounted && res.ok && Array.isArray(res.data)) {
        setProvinces(res.data);
      }
    };
    loadProvinces();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Cascading: Load Regencies when Province changes
  useEffect(() => {
    let mounted = true;
    if (!selectedProvinceId) {
      setRegencies([]);
      setSelectedRegencyId('');
      return;
    }

    const loadRegencies = async () => {
      const res = await IndonesiaRegionService.fetchV2Regencies(selectedProvinceId);
      if (mounted && res.ok && Array.isArray(res.data)) {
        setRegencies(res.data);
        if (selectedRegencyId && !res.data.some((r) => r.id === selectedRegencyId)) {
          setSelectedRegencyId(res.data[0]?.id || '');
        }
      }
    };
    loadRegencies();
    return () => {
      mounted = false;
    };
  }, [selectedProvinceId]);

  // 3. Cascading: Load Districts when Regency changes
  useEffect(() => {
    let mounted = true;
    if (!selectedRegencyId) {
      setDistricts([]);
      setSelectedDistrictId('');
      return;
    }

    const loadDistricts = async () => {
      const res = await IndonesiaRegionService.fetchV2Districts(selectedRegencyId);
      if (mounted && res.ok && Array.isArray(res.data)) {
        setDistricts(res.data);
        if (selectedDistrictId && !res.data.some((d) => d.id === selectedDistrictId)) {
          setSelectedDistrictId(res.data[0]?.id || '');
        }
      }
    };
    loadDistricts();
    return () => {
      mounted = false;
    };
  }, [selectedRegencyId]);

  // 4. Cascading: Load Villages when District changes
  useEffect(() => {
    let mounted = true;
    if (!selectedDistrictId) {
      setVillages([]);
      setSelectedVillageId('');
      return;
    }

    const loadVillages = async () => {
      const res = await IndonesiaRegionService.fetchV2Villages(selectedDistrictId);
      if (mounted && res.ok && Array.isArray(res.data)) {
        setVillages(res.data);
        if (selectedVillageId && !res.data.some((v) => v.id === selectedVillageId)) {
          setSelectedVillageId(res.data[0]?.id || '');
        }
      }
    };
    loadVillages();
    return () => {
      mounted = false;
    };
  }, [selectedDistrictId]);

  // Determine current active region for map and info
  const getCurrentActiveRegion = () => {
    if (selectedVillageId && activeVillage) {
      return {
        level: 'Subdistrict / Village',
        id: activeVillage.id,
        name: activeVillage.name,
        has_path: activeVillage.has_path ?? false,
        lat: activeVillage.lat,
        lng: activeVillage.lng,
        postal_code: activeVillage.postal_code,
        extra: null
      };
    }
    if (selectedDistrictId && activeDistrict) {
      return {
        level: 'District',
        id: activeDistrict.id,
        name: activeDistrict.name,
        has_path: activeDistrict.has_path ?? false,
        lat: activeDistrict.lat,
        lng: activeDistrict.lng,
        postal_code: undefined,
        extra: null
      };
    }
    if (selectedRegencyId && activeRegency) {
      return {
        level: 'City / Regency',
        id: activeRegency.id,
        name: activeRegency.name,
        has_path: activeRegency.has_path ?? false,
        lat: activeRegency.lat,
        lng: activeRegency.lng,
        postal_code: undefined,
        extra: {
          capital: activeRegency.capital,
          population: activeRegency.population,
          total_area: activeRegency.total_area,
          tz: activeRegency.tz,
          elv: activeRegency.elv
        }
      };
    }
    if (selectedProvinceId && activeProvince) {
      return {
        level: 'Province',
        id: activeProvince.id,
        name: activeProvince.name,
        has_path: activeProvince.has_path ?? false,
        lat: activeProvince.lat,
        lng: activeProvince.lng,
        postal_code: undefined,
        extra: {
          capital: activeProvince.capital,
          population: activeProvince.population,
          total_area: activeProvince.total_area,
          tz: activeProvince.tz,
          elv: activeProvince.elv
        }
      };
    }
    return {
      level: 'National',
      id: '31',
      name: 'Indonesia',
      has_path: false,
      lat: -2.5,
      lng: 118.0,
      postal_code: undefined,
      extra: null
    };
  };

  const activeRegion = getCurrentActiveRegion();

  // Load path whenever active region has_path === true
  useEffect(() => {
    let mounted = true;
    if (activeRegion.has_path && activeRegion.id) {
      IndonesiaRegionService.fetchV2Path(activeRegion.id).then((res) => {
        if (mounted) {
          if (res.ok && res.data) {
            setPathData((res.data as any).path || res.data);
          } else {
            setPathData(null);
          }
        }
      });
    } else {
      setPathData(null);
    }
    return () => {
      mounted = false;
    };
  }, [activeRegion.id, activeRegion.has_path]);

  // Construct current endpoint URL based on category
  const getCurrentEndpoint = useCallback((): string => {
    switch (activeCategory) {
      case 'provinces':
        return '/provinces.json';
      case 'regencies':
        return `/regencies/${selectedProvinceId || '31'}.json`;
      case 'districts':
        return `/districts/${selectedRegencyId || '31.71'}.json`;
      case 'villages':
        return `/villages/${selectedDistrictId || '31.71.01'}.json`;
      case 'paths':
        return `/paths/${activeRegion.id || '31'}.json`;
      case 'postal_codes':
        return `/postal-codes/${postalSearchQuery.trim() || '12190'}.json`;
    }
  }, [
    activeCategory,
    selectedProvinceId,
    selectedRegencyId,
    selectedDistrictId,
    activeRegion.id,
    postalSearchQuery
  ]);

  // Trigger Live API Request
  const handleExecuteRequest = useCallback(
    async (forceRefresh = true) => {
      setIsLoadingApi(true);
      const endpoint = getCurrentEndpoint();
      try {
        const result = await IndonesiaRegionService.executeV2Request(endpoint, forceRefresh);
        setCurrentApiResult(result);
      } catch (err: unknown) {
        setCurrentApiResult({
          url: `${IndonesiaRegionService.EMSIFA_V2_BASE_URL}${endpoint}`,
          method: 'GET',
          status: 0,
          statusText: 'Client Exception',
          durationMs: 0,
          ok: false,
          data: null,
          rawText: '',
          error: err instanceof Error ? err.message : 'Failed to send API request'
        });
      } finally {
        setIsLoadingApi(false);
      }
    },
    [getCurrentEndpoint]
  );

  // Auto-run request when category or parameters change
  useEffect(() => {
    handleExecuteRequest(false);
  }, [handleExecuteRequest]);

  // Handle Copy URL
  const handleCopyUrl = async () => {
    const fullUrl = `${IndonesiaRegionService.EMSIFA_V2_BASE_URL}${getCurrentEndpoint()}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Handle Copy JSON
  const handleCopyJson = async () => {
    if (!currentApiResult) return;
    try {
      const text = isFormattedJson
        ? JSON.stringify(currentApiResult.data || currentApiResult, null, 2)
        : currentApiResult.rawText || JSON.stringify(currentApiResult.data);
      await navigator.clipboard.writeText(text);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Handle Apply to Form callback if separate
  const handleApply = () => {
    if (!onApplyToForm) return;

    onApplyToForm({
      country: selectedCountry,
      provinceId: selectedProvinceId,
      provinceName: activeProvince?.name || '',
      regencyId: selectedRegencyId,
      regencyName: activeRegency?.name || '',
      districtId: selectedDistrictId,
      districtName: activeDistrict?.name || '',
      villageId: selectedVillageId,
      villageName: activeVillage?.name || '',
      postalCode: postalCode || activeVillage?.postal_code || activeRegion.postal_code || '',
      address: addressLine
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. PLAYGROUND HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#EFF7FA] via-white to-[#F8FAFC] border border-[#B7DDEA] rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#086288] text-white flex items-center justify-center shadow-2xs shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                  Indonesia Regional API Playground
                </h3>
                <span className="text-[10px] font-mono font-semibold bg-[#DCEEF5] text-[#086288] border border-[#B7DDEA] px-2 py-0.5 rounded-full">
                  v2.0 Kemendagri / BPS
                </span>
              </div>
              <p className="text-[11px] text-[#475569] mt-0.5">
                Interactive exploration of Indonesian regional datasets with polygon boundaries, coordinate center, and live endpoints.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Official Documentation: Displayed for Super Admin */}
            {effectiveIsSuperAdmin && (
              <a
                href="https://www.emsifa.com/api-wilayah-indonesia/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-[#086288] hover:text-[#064B6A] bg-white border border-[#DCE5EC] hover:border-[#086288] px-3 py-1.5 rounded-md font-medium transition-colors"
                title="Official Regional API Documentation (Emsifa v2) — Super Admin Only"
              >
                <span>Official Documentation</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {onApplyToForm && (
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-1.5 text-[11px] bg-[#086288] hover:bg-[#064B6A] text-white px-3 py-1.5 rounded-md font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Apply active region to Legal Registered Address Form"
              >
                <ArrowRight className="w-3 h-3" />
                <span>Apply to Form</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE MAP VIEWER */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DCE5EC]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#086288]" />
            <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
              Interactive Map & Regional Boundary Highlights
            </h4>
          </div>
          <span className="text-[11px] text-[#64748B]">
            Highlights selected boundary polygon if <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">has_path: true</code> or displays central coordinate pin
          </span>
        </div>

        <RegionMapViewer
          regionName={activeRegion.name}
          regionId={activeRegion.id}
          levelLabel={activeRegion.level}
          hasPath={activeRegion.has_path}
          rawPath={pathData}
          lat={activeRegion.lat}
          lng={activeRegion.lng}
        />
      </div>

      {/* 3. ADMINISTRATIVE REGION PICKER & DOMICILE ADDRESS FORM */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DCE5EC]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#086288]" />
            <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
              Administrative Regions & Legal Domicile Address Form
            </h4>
          </div>
          <span className="text-[11px] text-[#64748B]">
            Hierarchical administrative cascade; parent updates dynamically synchronize the map above
          </span>
        </div>

        {/* Row 1: Country & Province */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>Country <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-[#64748B] font-mono">Default: Indonesia</span>
            </label>
            <select
              disabled={disabled}
              value={selectedCountry}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCountry(val);
                notifyAddressChange({ country: val });
                if (onClearError) onClearError('country');
              }}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>Province <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-[#64748B] font-mono">{provinces.length} options</span>
            </label>
            <select
              disabled={disabled || selectedCountry !== 'Indonesia'}
              value={selectedProvinceId}
              onChange={(e) => {
                const pId = e.target.value;
                const pObj = provinces.find((p) => p.id === pId);
                setSelectedProvinceId(pId);
                setSelectedRegencyId('');
                setSelectedDistrictId('');
                setSelectedVillageId('');
                setPostalCode('');
                setActiveCategory('regencies');
                notifyAddressChange({
                  provinceId: pId,
                  provinceName: pObj?.name || '',
                  regencyId: '',
                  regencyName: '',
                  districtId: '',
                  districtName: '',
                  villageId: '',
                  villageName: '',
                  postalCode: ''
                });
                if (onClearError) {
                  onClearError('province');
                  onClearError('regency');
                  onClearError('district');
                  onClearError('village');
                }
              }}
              className={`w-full bg-white border ${
                errors.province ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="">-- Select Province --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (ID: {p.id})
                </option>
              ))}
            </select>
            {errors.province && <p className="text-[11px] text-red-600 mt-1">{errors.province}</p>}
          </div>
        </div>

        {/* Row 2: City / Regency & District */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>City / Regency <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-[#64748B] font-mono">{regencies.length} options</span>
            </label>
            <select
              disabled={disabled || selectedCountry !== 'Indonesia' || !selectedProvinceId || regencies.length === 0}
              value={selectedRegencyId}
              onChange={(e) => {
                const rId = e.target.value;
                const rObj = regencies.find((r) => r.id === rId);
                setSelectedRegencyId(rId);
                setSelectedDistrictId('');
                setSelectedVillageId('');
                setPostalCode('');
                setActiveCategory('districts');
                notifyAddressChange({
                  regencyId: rId,
                  regencyName: rObj?.name || '',
                  districtId: '',
                  districtName: '',
                  villageId: '',
                  villageName: '',
                  postalCode: ''
                });
                if (onClearError) {
                  onClearError('regency');
                  onClearError('district');
                  onClearError('village');
                }
              }}
              className={`w-full bg-white border ${
                errors.regency ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="">-- Select City / Regency --</option>
              {regencies.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (ID: {r.id})
                </option>
              ))}
            </select>
            {errors.regency && <p className="text-[11px] text-red-600 mt-1">{errors.regency}</p>}
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>District <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-[#64748B] font-mono">{districts.length} options</span>
            </label>
            <select
              disabled={disabled || selectedCountry !== 'Indonesia' || !selectedRegencyId || districts.length === 0}
              value={selectedDistrictId}
              onChange={(e) => {
                const dId = e.target.value;
                const dObj = districts.find((d) => d.id === dId);
                setSelectedDistrictId(dId);
                setSelectedVillageId('');
                setPostalCode('');
                setActiveCategory('villages');
                notifyAddressChange({
                  districtId: dId,
                  districtName: dObj?.name || '',
                  villageId: '',
                  villageName: '',
                  postalCode: ''
                });
                if (onClearError) {
                  onClearError('district');
                  onClearError('village');
                }
              }}
              className={`w-full bg-white border ${
                errors.district ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="">-- Select District --</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (ID: {d.id})
                </option>
              ))}
            </select>
            {errors.district && <p className="text-[11px] text-red-600 mt-1">{errors.district}</p>}
          </div>
        </div>

        {/* Row 3: Subdistrict / Village & Postal Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>Subdistrict / Village <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-[#64748B] font-mono">{villages.length} options</span>
            </label>
            <select
              disabled={disabled || selectedCountry !== 'Indonesia' || !selectedDistrictId || villages.length === 0}
              value={selectedVillageId}
              onChange={(e) => {
                const vId = e.target.value;
                const vObj = villages.find((v) => v.id === vId);
                setSelectedVillageId(vId);
                setActiveCategory('villages');

                const suggestedPostal = vObj?.postal_code || IndonesiaRegionService.suggestPostalCode(vId, vObj?.name, selectedDistrictId, activeDistrict?.name);
                if (suggestedPostal) {
                  setPostalCode(suggestedPostal);
                }

                notifyAddressChange({
                  villageId: vId,
                  villageName: vObj?.name || '',
                  postalCode: suggestedPostal || postalCode,
                  latitude: vObj?.lat,
                  longitude: vObj?.lng
                });
                if (onClearError) onClearError('village');
              }}
              className={`w-full bg-white border ${
                errors.village ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="">-- Select Subdistrict / Village --</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} (Postal Code: {v.postal_code || '-'})
                </option>
              ))}
            </select>
            {errors.village && <p className="text-[11px] text-red-600 mt-1">{errors.village}</p>}
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>Postal Code</span>
              {activeVillage?.postal_code && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono border border-emerald-200">
                  Suggested: {activeVillage.postal_code}
                </span>
              )}
            </label>
            <input
              type="text"
              disabled={disabled}
              maxLength={5}
              value={postalCode}
              onChange={(e) => {
                const clean = e.target.value.replace(/[^0-9]/g, '');
                setPostalCode(clean);
                notifyAddressChange({ postalCode: clean });
                if (onClearError) onClearError('postalCode');
              }}
              placeholder="5-digit postal code (e.g. 12190)"
              className={`w-full bg-white border ${
                errors.postalCode ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            />
            {errors.postalCode && <p className="text-[11px] text-red-600 mt-1">{errors.postalCode}</p>}
          </div>
        </div>

        {/* Row 4: Street Address Line (Full Width) */}
        {showFullAddressLine && (
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Street Address Line <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              disabled={disabled}
              value={addressLine}
              onChange={(e) => {
                const val = e.target.value;
                setAddressLine(val);
                notifyAddressChange({ address: val });
                if (onClearError) onClearError('address');
              }}
              placeholder="Street name, building number, suite/unit, block, and additional domicile details..."
              className={`w-full bg-white border ${
                errors.address ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed leading-relaxed`}
            />
            {errors.address && <p className="text-[11px] text-red-600 mt-1">{errors.address}</p>}
          </div>
        )}
      </div>

      {/* 4. SELECTED REGION METADATA CARD */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#DCE5EC]">
          <MapPin className="w-4 h-4 text-[#086288]" />
          <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
            Selected Region Metadata (Emsifa API v2 Snapshot)
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs">
          {/* Region Name & Level */}
          <div className="col-span-2 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-3">
            <span className="text-[10px] text-[#64748B] uppercase font-bold block mb-1">
              Region Name & Administrative Level
            </span>
            <div className="text-xs font-bold text-[#0F172A] truncate">
              {activeRegion.name || 'None Selected'}
            </div>
            <div className="text-[11px] text-[#086288] mt-0.5">{activeRegion.level}</div>
          </div>

          {/* Region Code */}
          <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-3">
            <span className="text-[10px] text-[#64748B] uppercase font-bold block mb-1">
              Region Code (ID)
            </span>
            <div className="text-xs font-mono font-bold text-[#086288]">
              {activeRegion.id || '-'}
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Kemendagri Standard</div>
          </div>

          {/* Postal Code */}
          <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-3">
            <span className="text-[10px] text-[#64748B] uppercase font-bold block mb-1">Postal Code</span>
            <div className="text-xs font-mono font-bold text-[#0F172A]">
              {postalCode || activeRegion.postal_code || (activeVillage?.postal_code ? activeVillage.postal_code : '-')}
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">
              {postalCode || activeRegion.postal_code ? 'Available' : 'Pending village selection'}
            </div>
          </div>

          {/* Coordinates Lat/Lng */}
          <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-3">
            <span className="text-[10px] text-[#64748B] uppercase font-bold block mb-1">Coordinates</span>
            <div className="text-[11px] font-mono font-semibold text-[#0F172A] truncate">
              {activeRegion.lat !== undefined ? `${activeRegion.lat.toFixed(4)}, ${activeRegion.lng?.toFixed(4)}` : '-'}
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Latitude, Longitude</div>
          </div>

          {/* Polygon Status has_path */}
          <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-3">
            <span className="text-[10px] text-[#64748B] uppercase font-bold block mb-1">Polygon Status</span>
            <div>
              {activeRegion.has_path ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> has_path: true
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  has_path: false
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#64748B] mt-0.5">Geographic Boundary</div>
          </div>
        </div>

        {/* Extra info if available (Capital, Population, Area) */}
        {activeRegion.extra && (
          <div className="mt-3.5 pt-3 border-t border-[#F1F5F9] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {activeRegion.extra.capital && (
              <div className="text-[11px]">
                <span className="text-[#64748B]">Capital: </span>
                <strong className="text-[#0F172A]">{activeRegion.extra.capital}</strong>
              </div>
            )}
            {activeRegion.extra.population && (
              <div className="text-[11px]">
                <span className="text-[#64748B]">Population: </span>
                <strong className="text-[#0F172A] font-mono">
                  {activeRegion.extra.population.toLocaleString('en-US')} residents
                </strong>
              </div>
            )}
            {activeRegion.extra.total_area && (
              <div className="text-[11px]">
                <span className="text-[#64748B]">Total Area: </span>
                <strong className="text-[#0F172A] font-mono">
                  {activeRegion.extra.total_area.toLocaleString('en-US')} km²
                </strong>
              </div>
            )}
            {activeRegion.extra.tz && (
              <div className="text-[11px]">
                <span className="text-[#64748B]">Timezone: </span>
                <strong className="text-[#0F172A]">
                  UTC+{activeRegion.extra.tz} ({activeRegion.extra.tz === 7 ? 'WIB' : activeRegion.extra.tz === 8 ? 'WITA' : 'WIT'})
                </strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5 & 6. REQUEST API BAR & RESPONSE VIEWER (Hidden for clean presentation and standard roles) */}
      {showApiRequestSection && (
        <>
          {/* 5. REQUEST API BAR & ENDPOINT SWITCHER */}
          <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DCE5EC]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#086288]" />
                <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
                  API Request (Active Method & Endpoint)
                </h4>
              </div>
              <span className="text-[10px] text-[#64748B] font-mono">Emsifa API v2 Live</span>
            </div>

            {/* Level Inspector Tab Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              <span className="text-[11px] font-semibold text-[#64748B] mr-1">Test Endpoint:</span>

              <button
                type="button"
                onClick={() => setActiveCategory('provinces')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeCategory === 'provinces'
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF4F8]'
                }`}
              >
                /provinces.json
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('regencies')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeCategory === 'regencies'
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF4F8]'
                }`}
              >
                /regencies/{selectedProvinceId || '{prov}'}.json
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('districts')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeCategory === 'districts'
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF4F8]'
                }`}
              >
                /districts/{selectedRegencyId || '{reg}'}.json
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('villages')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeCategory === 'villages'
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF4F8]'
                }`}
              >
                /villages/{selectedDistrictId || '{dist}'}.json
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('paths')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeCategory === 'paths'
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF4F8]'
                }`}
              >
                /paths/{activeRegion.id || '{id}'}.json
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('postal_codes')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  activeCategory === 'postal_codes'
                    ? 'bg-[#086288] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF4F8]'
                }`}
              >
                /postal-codes/{postalSearchQuery || '{code}'}.json
              </button>
            </div>

            {/* If postal codes tab active, show quick postal input */}
            {activeCategory === 'postal_codes' && (
              <div className="bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg p-2.5 flex flex-col sm:flex-row items-center gap-2.5 mb-2">
                <span className="text-xs font-semibold text-[#086288] shrink-0">Search Postal Code:</span>
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    maxLength={5}
                    value={postalSearchQuery}
                    onChange={(e) => setPostalSearchQuery(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 5-digit postal code (e.g. 12190, 50134, 40135)..."
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-1.5 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleExecuteRequest(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] text-white text-xs font-semibold rounded-md hover:bg-[#064B6A] transition-colors cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search Region</span>
                </button>
              </div>
            )}

            {/* Request Execution Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md font-mono text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>GET</span>
              </div>

              <div className="flex-1 bg-[#F8FAFC] border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] overflow-x-auto whitespace-nowrap select-all">
                {IndonesiaRegionService.EMSIFA_V2_BASE_URL}
                <span className="text-[#086288] font-bold">{getCurrentEndpoint()}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-[#DCE5EC] hover:border-[#086288] text-[#0F172A] rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteRequest(true)}
                  disabled={isLoadingApi}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApi ? 'animate-spin' : ''}`} />
                  <span>{isLoadingApi ? 'Loading...' : 'Send Request'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 6. RESPONSE VIEWER */}
          <div className="bg-[#0B132B] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#1C2541] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#29324D]">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>

                <span className="text-xs font-mono font-bold text-slate-200 ml-1">
                  Response Viewer
                </span>

                {currentApiResult && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      currentApiResult.ok
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                        : 'bg-red-900/60 text-red-300 border border-red-700/50'
                    }`}
                  >
                    {currentApiResult.status} {currentApiResult.statusText}
                  </span>
                )}

                {currentApiResult && (
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded">
                    ⚡ {currentApiResult.durationMs} ms
                  </span>
                )}

                {currentApiResult?.data && Array.isArray(currentApiResult.data) && (
                  <span className="text-[10px] font-mono text-slate-400">
                    ({currentApiResult.data.length} items)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsFormattedJson(!isFormattedJson)}
                  className="text-[11px] font-mono text-slate-300 hover:text-white px-2 py-1 rounded bg-[#29324D] hover:bg-[#3A4569] transition-colors cursor-pointer"
                >
                  {isFormattedJson ? 'Minify' : 'Format JSON'}
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  disabled={!currentApiResult}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 hover:text-white px-2 py-1 rounded bg-[#29324D] hover:bg-[#3A4569] transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsResponseVisible(!isResponseVisible)}
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                  title={isResponseVisible ? 'Hide Response' : 'Show Response'}
                >
                  {isResponseVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isResponseVisible && (
              <div className="p-4 overflow-x-auto max-h-64 text-xs font-mono leading-relaxed">
                {isLoadingApi ? (
                  <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                    <span className="text-xs">Fetching data from regional API...</span>
                  </div>
                ) : currentApiResult?.error ? (
                  <div className="p-3 bg-red-950/40 border border-red-800/50 rounded text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-0.5">Failed to Load Response:</strong>
                      <span>{currentApiResult.error}</span>
                      {currentApiResult.status === 404 && (
                        <p className="mt-1 text-[11px] text-red-400/80">
                          The requested endpoint or parameter was not found on the regional API.
                        </p>
                      )}
                    </div>
                  </div>
                ) : currentApiResult ? (
                  <pre className="text-cyan-300/90 whitespace-pre font-mono text-[11px] selection:bg-[#086288] selection:text-white">
                    {isFormattedJson
                      ? JSON.stringify(
                          currentApiResult.meta
                            ? { data: currentApiResult.data, meta: currentApiResult.meta }
                            : currentApiResult.data || currentApiResult,
                          null,
                          2
                        )
                      : currentApiResult.rawText}
                  </pre>
                ) : (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    Click "Send Request" to test the live endpoint.
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
