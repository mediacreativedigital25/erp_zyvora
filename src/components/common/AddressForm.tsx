import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { StandardAddressData, AddressFieldConfig } from '../../types/erp';
import {
  IndonesiaRegionService,
  SUPPORTED_COUNTRIES,
  RegionItem
} from '../../services/indonesiaRegionService';
import { PROVINCES, Province } from '../../data/indonesiaRegions';

export interface AddressFormProps {
  value: StandardAddressData;
  onChange: (updated: StandardAddressData) => void;
  errors?: Record<string, string>;
  onClearError?: (fieldKey: string) => void;
  disabled?: boolean;
  config?: AddressFieldConfig;
  className?: string;
}

/**
 * Standard Address Validator
 * Can be reused across any module before submitting.
 */
export function validateStandardAddress(
  address: StandardAddressData,
  config: AddressFieldConfig = {}
): Record<string, string> {
  const errors: Record<string, string> = {};

  const countryRequired = config.countryRequired !== false;
  const provinceRequired = config.provinceRequired !== false;
  const regencyRequired = config.regencyRequired !== false;
  const districtRequired = config.districtRequired !== false;
  const villageRequired = config.villageRequired !== false;
  const addressRequired = config.addressRequired !== false;
  const postalCodeRequired = config.postalCodeRequired === true;

  const country = address.country || 'Indonesia';

  if (countryRequired && (!address.country || address.country.trim() === '')) {
    errors.country = 'Country is required.';
  }

  if (country === 'Indonesia') {
    if (provinceRequired && !address.provinceId && !address.provinceName) {
      errors.province = 'Province is required.';
    }
    if (regencyRequired && !address.regencyId && !address.regencyName) {
      errors.regency = 'Regency / City is required.';
    }
    if (districtRequired && !address.districtId && !address.districtName) {
      errors.district = 'District is required.';
    }
    if (villageRequired && !address.villageId && !address.villageName) {
      errors.village = 'Village / Subdistrict is required.';
    }
  }

  if (addressRequired && (!address.address || address.address.trim().length < 5)) {
    errors.address = 'Full address is required (minimum 5 characters).';
  }

  if (address.postalCode && address.postalCode.trim() !== '') {
    if (!/^\d{5}$/.test(address.postalCode.trim())) {
      errors.postalCode = 'Indonesian postal code must consist of 5 numeric digits.';
    }
  } else if (postalCodeRequired) {
    errors.postalCode = 'Postal code is required.';
  }

  return errors;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  value,
  onChange,
  errors = {},
  onClearError,
  disabled = false,
  config = {},
  className = ''
}) => {
  const provinces = PROVINCES;
  const [regencies, setRegencies] = useState<RegionItem[]>([]);
  const [districts, setDistricts] = useState<RegionItem[]>([]);
  const [villages, setVillages] = useState<RegionItem[]>([]);

  const [isLoadingRegencies, setIsLoadingRegencies] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingVillages, setIsLoadingVillages] = useState(false);

  const [errorRegencies, setErrorRegencies] = useState<string | null>(null);
  const [errorDistricts, setErrorDistricts] = useState<string | null>(null);
  const [errorVillages, setErrorVillages] = useState<string | null>(null);

  const [isPostalCodeSuggested, setIsPostalCodeSuggested] = useState(false);
  const [isSearchingPostalCode, setIsSearchingPostalCode] = useState(false);

  const showHeader = config.showHeader !== false;
  const title = config.title || 'Alamat Domisili Legal';
  const description =
    config.description ||
    'Hirarki wilayah administratif resmi Indonesia (Negara, Provinsi, Kab/Kota, Kecamatan, Kelurahan/Desa, Kode Pos, & Alamat Lengkap).';
  const showRtRw = Boolean(config.showRtRw);
  const addressRows = config.addressRows || 3;
  const addressPlaceholder =
    config.addressPlaceholder ||
    'Contoh: Gedung Menara Mandiri Lt. 18, Jl. Jend. Sudirman Kav. 54-55';

  const currentCountry = value.country || 'Indonesia';
  const isIndonesia = currentCountry === 'Indonesia';

  // 1. Initial Cascade Restoration
  const loadCascadeForValue = useCallback(async (addr: StandardAddressData) => {
    if ((addr.country || 'Indonesia') !== 'Indonesia' || !addr.provinceId) {
      return;
    }

    try {
      // Regencies
      setIsLoadingRegencies(true);
      setErrorRegencies(null);
      const regList = await IndonesiaRegionService.getRegencies(addr.provinceId);
      let effectiveRegList = regList;
      if (
        addr.regencyName &&
        !regList.some(
          (r) =>
            r.id === addr.regencyId ||
            r.name.toLowerCase() === addr.regencyName!.toLowerCase()
        )
      ) {
        effectiveRegList = [
          { id: addr.regencyId || 'legacy-reg', name: addr.regencyName },
          ...regList
        ];
      }
      setRegencies(effectiveRegList);

      const matchedReg = effectiveRegList.find(
        (r) =>
          r.id === addr.regencyId ||
          r.name.toLowerCase() === addr.regencyName?.toLowerCase()
      );
      const effectiveRegId = matchedReg?.id || addr.regencyId;
      if (!effectiveRegId) return;

      // Districts
      setIsLoadingDistricts(true);
      setErrorDistricts(null);
      const distList = await IndonesiaRegionService.getDistricts(effectiveRegId);
      let effectiveDistList = distList;
      if (
        addr.districtName &&
        !distList.some(
          (d) =>
            d.id === addr.districtId ||
            d.name.toLowerCase() === addr.districtName!.toLowerCase()
        )
      ) {
        effectiveDistList = [
          { id: addr.districtId || 'legacy-dist', name: addr.districtName },
          ...distList
        ];
      }
      setDistricts(effectiveDistList);

      const matchedDist = effectiveDistList.find(
        (d) =>
          d.id === addr.districtId ||
          d.name.toLowerCase() === addr.districtName?.toLowerCase()
      );
      const effectiveDistId = matchedDist?.id || addr.districtId;
      if (!effectiveDistId) return;

      // Villages
      setIsLoadingVillages(true);
      setErrorVillages(null);
      const villList = await IndonesiaRegionService.getVillages(effectiveDistId);
      let effectiveVillList = villList;
      if (
        addr.villageName &&
        !villList.some(
          (v) =>
            v.id === addr.villageId ||
            v.name.toLowerCase() === addr.villageName!.toLowerCase()
        )
      ) {
        effectiveVillList = [
          {
            id: addr.villageId || 'legacy-vill',
            name: addr.villageName,
            postalCode: addr.postalCode
          },
          ...villList
        ];
      }
      setVillages(effectiveVillList);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingRegencies(false);
      setIsLoadingDistricts(false);
      setIsLoadingVillages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCascadeForValue(value);
  }, [value.provinceId, value.regencyId, value.districtId, loadCascadeForValue]);

  // Handler: Country Change
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    if (newCountry === currentCountry) return;

    if (newCountry !== 'Indonesia') {
      onChange({
        ...value,
        country: newCountry,
        provinceId: '',
        provinceName: '',
        regencyId: '',
        regencyName: '',
        districtId: '',
        districtName: '',
        villageId: '',
        villageName: '',
        postalCode: ''
      });
      setRegencies([]);
      setDistricts([]);
      setVillages([]);
      setIsPostalCodeSuggested(false);
    } else {
      onChange({
        ...value,
        country: 'Indonesia'
      });
    }

    if (onClearError) {
      onClearError('country');
      onClearError('province');
      onClearError('regency');
      onClearError('district');
      onClearError('village');
    }
  };

  // Handler: Province Change -> Cascade Reset All Children
  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    const pObj = provinces.find((p) => p.id === pId);

    onChange({
      ...value,
      provinceId: pId,
      provinceName: pObj ? pObj.name : '',
      // Cascade reset
      regencyId: '',
      regencyName: '',
      districtId: '',
      districtName: '',
      villageId: '',
      villageName: '',
      postalCode: ''
    });

    setRegencies([]);
    setDistricts([]);
    setVillages([]);
    setIsPostalCodeSuggested(false);

    if (onClearError) {
      onClearError('province');
      onClearError('regency');
      onClearError('district');
      onClearError('village');
    }

    if (!pId) return;

    setIsLoadingRegencies(true);
    setErrorRegencies(null);
    try {
      const list = await IndonesiaRegionService.getRegencies(pId);
      setRegencies(list);
    } catch {
      setErrorRegencies('Gagal memuat daftar kabupaten/kota.');
    } finally {
      setIsLoadingRegencies(false);
    }
  };

  // Handler: Regency Change -> Cascade Reset District, Village, Postal Code
  const handleRegencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rId = e.target.value;
    const rObj = regencies.find((r) => r.id === rId);

    const coords = IndonesiaRegionService.lookupCoordinates(undefined, undefined, rObj ? rObj.name : '');
    onChange({
      ...value,
      regencyId: rId,
      regencyName: rObj ? rObj.name : '',
      // Cascade reset
      districtId: '',
      districtName: '',
      villageId: '',
      villageName: '',
      postalCode: '',
      latitude: coords?.latitude ?? value.latitude,
      longitude: coords?.longitude ?? value.longitude
    });

    setDistricts([]);
    setVillages([]);
    setIsPostalCodeSuggested(false);

    if (onClearError) {
      onClearError('regency');
      onClearError('district');
      onClearError('village');
    }

    if (!rId) return;

    setIsLoadingDistricts(true);
    setErrorDistricts(null);
    try {
      const list = await IndonesiaRegionService.getDistricts(rId);
      setDistricts(list);
    } catch {
      setErrorDistricts('Gagal memuat daftar kecamatan.');
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  // Handler: District Change -> Cascade Reset Village, Postal Code
  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dId = e.target.value;
    const dObj = districts.find((d) => d.id === dId);
    const dName = dObj ? dObj.name : '';

    const districtSuggestedCode = dName
      ? IndonesiaRegionService.suggestPostalCode(undefined, undefined, dId, dName, value.regencyName)
      : '';

    const districtCoords = IndonesiaRegionService.lookupCoordinates(undefined, dName, value.regencyName);

    onChange({
      ...value,
      districtId: dId,
      districtName: dName,
      // Cascade reset village, pre-suggest district postal code if available
      villageId: '',
      villageName: '',
      postalCode: districtSuggestedCode || '',
      latitude: districtCoords?.latitude ?? value.latitude,
      longitude: districtCoords?.longitude ?? value.longitude
    });

    setVillages([]);
    setIsPostalCodeSuggested(Boolean(districtSuggestedCode));

    if (onClearError) {
      onClearError('district');
      onClearError('village');
      if (districtSuggestedCode) onClearError('postalCode');
    }

    if (!dId) return;

    setIsLoadingVillages(true);
    setErrorVillages(null);
    try {
      const list = await IndonesiaRegionService.getVillages(dId);
      setVillages(list);
    } catch {
      setErrorVillages('Gagal memuat daftar kelurahan/desa.');
    } finally {
      setIsLoadingVillages(false);
    }
  };

  // Handler: Village Change -> Auto-suggest Postal Code
  const handleVillageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value;
    const vObj = villages.find((v) => v.id === vId);
    const vName = vObj ? vObj.name : '';

    let suggestedPostalCode = vObj?.postalCode || '';
    if (!suggestedPostalCode && vName) {
      suggestedPostalCode = IndonesiaRegionService.suggestPostalCode(
        vId,
        vName,
        value.districtId,
        value.districtName,
        value.regencyName
      );
    }

    const coords = vObj?.latitude !== undefined && vObj?.longitude !== undefined
      ? { latitude: vObj.latitude, longitude: vObj.longitude }
      : IndonesiaRegionService.lookupCoordinates(vName, value.districtName, value.regencyName);

    onChange({
      ...value,
      villageId: vId,
      villageName: vName,
      postalCode: suggestedPostalCode || value.postalCode,
      latitude: coords?.latitude ?? value.latitude,
      longitude: coords?.longitude ?? value.longitude
    });

    setIsPostalCodeSuggested(Boolean(suggestedPostalCode));

    if (onClearError) {
      onClearError('village');
      if (suggestedPostalCode) onClearError('postalCode');
    }

    // Always attempt asynchronous query if not yet matched or to ensure highest accuracy
    if (vName) {
      setIsSearchingPostalCode(true);
      IndonesiaRegionService.fetchPostalCodeOnline(vName, value.districtName, value.regencyName)
        .then((onlineCode) => {
          if (onlineCode) {
            onChange({
              ...value,
              villageId: vId,
              villageName: vName,
              postalCode: onlineCode,
              latitude: coords?.latitude ?? value.latitude,
              longitude: coords?.longitude ?? value.longitude
            });
            setIsPostalCodeSuggested(true);
            if (onClearError) onClearError('postalCode');
          }
        })
        .finally(() => {
          setIsSearchingPostalCode(false);
        });
    }
  };

  // Handler: Postal Code Manual Edit
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[^0-9]/g, '');
    onChange({ ...value, postalCode: clean });
    setIsPostalCodeSuggested(false);
    if (onClearError) onClearError('postalCode');
  };

  // Handler: Address Change
  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...value, address: e.target.value });
    if (onClearError) onClearError('address');
  };

  // Retry handlers
  const handleRetryRegencies = () => {
    if (!value.provinceId) return;
    setIsLoadingRegencies(true);
    setErrorRegencies(null);
    IndonesiaRegionService.getRegencies(value.provinceId)
      .then((list) => setRegencies(list))
      .catch(() => setErrorRegencies('Failed to load regencies/cities.'))
      .finally(() => setIsLoadingRegencies(false));
  };

  const handleRetryDistricts = () => {
    if (!value.regencyId) return;
    setIsLoadingDistricts(true);
    setErrorDistricts(null);
    IndonesiaRegionService.getDistricts(value.regencyId)
      .then((list) => setDistricts(list))
      .catch(() => setErrorDistricts('Failed to load districts.'))
      .finally(() => setIsLoadingDistricts(false));
  };

  const handleRetryVillages = () => {
    if (!value.districtId) return;
    setIsLoadingVillages(true);
    setErrorVillages(null);
    IndonesiaRegionService.getVillages(value.districtId)
      .then((list) => setVillages(list))
      .catch(() => setErrorVillages('Failed to load villages/subdistricts.'))
      .finally(() => setIsLoadingVillages(false));
  };

  return (
    <div
      className={`bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs ${className}`}
    >
      {showHeader && (
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#DCE5EC]">
          <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">{title}</h2>
            <p className="text-[11px] text-[#475569]">{description}</p>
          </div>
        </div>
      )}

      <div className="space-y-4 text-xs">
        {/* ROW 1: COUNTRY & PROVINCE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Country */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>
                1. Country {config.countryRequired !== false && <span className="text-red-500">*</span>}
              </span>
              <span className="text-[10px] text-[#64748B] font-normal">Default: Indonesia</span>
            </label>
            <select
              disabled={disabled}
              value={currentCountry}
              onChange={handleCountryChange}
              className={`w-full bg-white border ${
                errors.country ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
            {errors.country && <p className="text-[11px] text-red-600 mt-1">{errors.country}</p>}
          </div>

          {/* 2. Province */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>
                2. Province {isIndonesia && config.provinceRequired !== false && <span className="text-red-500">*</span>}
              </span>
              <span className="text-[10px] text-[#64748B] font-normal">38 Official Provinces</span>
            </label>
            <select
              disabled={disabled || !isIndonesia}
              value={value.provinceId || ''}
              onChange={handleProvinceChange}
              className={`w-full bg-white border ${
                errors.province ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="">-- Select Province --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.province && <p className="text-[11px] text-red-600 mt-1">{errors.province}</p>}
          </div>
        </div>

        {/* ROW 2: REGENCY/CITY & DISTRICT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 3. Regency / City */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-[#0F172A]">
                3. Regency / City {isIndonesia && config.regencyRequired !== false && <span className="text-red-500">*</span>}
              </label>
              {isLoadingRegencies && (
                <span className="text-[10px] text-[#086288] flex items-center gap-1 font-normal">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Loading areas...
                </span>
              )}
              {errorRegencies && (
                <button
                  type="button"
                  onClick={handleRetryRegencies}
                  className="text-[10px] text-red-600 hover:text-red-800 flex items-center gap-0.5 cursor-pointer underline"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Retry
                </button>
              )}
            </div>
            <select
              disabled={disabled || !isIndonesia || !value.provinceId || isLoadingRegencies}
              value={value.regencyId || ''}
              onChange={handleRegencyChange}
              className={`w-full bg-white border ${
                errors.regency ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="">
                {!value.provinceId
                  ? '-- Select Province First --'
                  : isLoadingRegencies
                  ? '-- Loading Regencies/Cities... --'
                  : '-- Select Regency / City --'}
              </option>
              {regencies.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {errors.regency && <p className="text-[11px] text-red-600 mt-1">{errors.regency}</p>}
          </div>

          {/* 4. District */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-[#0F172A]">
                4. District {isIndonesia && config.districtRequired !== false && <span className="text-red-500">*</span>}
              </label>
              {isLoadingDistricts && (
                <span className="text-[10px] text-[#086288] flex items-center gap-1 font-normal">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Loading districts...
                </span>
              )}
              {errorDistricts && (
                <button
                  type="button"
                  onClick={handleRetryDistricts}
                  className="text-[10px] text-red-600 hover:text-red-800 flex items-center gap-0.5 cursor-pointer underline"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Retry
                </button>
              )}
            </div>
            <select
              disabled={disabled || !isIndonesia || !value.regencyId || isLoadingDistricts}
              value={value.districtId || ''}
              onChange={handleDistrictChange}
              className={`w-full bg-white border ${
                errors.district ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="">
                {!value.regencyId
                  ? '-- Select Regency/City First --'
                  : isLoadingDistricts
                  ? '-- Loading Districts... --'
                  : '-- Select District --'}
              </option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {errors.district && <p className="text-[11px] text-red-600 mt-1">{errors.district}</p>}
          </div>
        </div>

        {/* ROW 3: VILLAGE / SUBDISTRICT & POSTAL CODE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 5. Village / Subdistrict */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-[#0F172A]">
                5. Village / Subdistrict {isIndonesia && config.villageRequired !== false && <span className="text-red-500">*</span>}
              </label>
              {isLoadingVillages && (
                <span className="text-[10px] text-[#086288] flex items-center gap-1 font-normal">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Loading villages...
                </span>
              )}
              {errorVillages && (
                <button
                  type="button"
                  onClick={handleRetryVillages}
                  className="text-[10px] text-red-600 hover:text-red-800 flex items-center gap-0.5 cursor-pointer underline"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Retry
                </button>
              )}
            </div>
            <select
              disabled={disabled || !isIndonesia || !value.districtId || isLoadingVillages}
              value={value.villageId || ''}
              onChange={handleVillageChange}
              className={`w-full bg-white border ${
                errors.village ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
              <option value="">
                {!value.districtId
                  ? '-- Select District First --'
                  : isLoadingVillages
                  ? '-- Loading Villages/Subdistricts... --'
                  : '-- Select Village / Subdistrict --'}
              </option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {errors.village && <p className="text-[11px] text-red-600 mt-1">{errors.village}</p>}
          </div>

          {/* 6. Postal Code */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>
                6. Postal Code {config.postalCodeRequired && <span className="text-red-500">*</span>}
              </span>
              {isSearchingPostalCode ? (
                <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" /> Mencari kode pos...
                </span>
              ) : (isPostalCodeSuggested || value.postalCode) ? (
                <span className="text-[10px] text-[#086288] font-medium flex items-center gap-1 bg-[#EFF7FA] px-1.5 py-0.5 rounded border border-[#B7DDEA]">
                  <CheckCircle2 className="w-3 h-3 text-[#086288]" /> Auto-suggested
                </span>
              ) : null}
            </label>
            <input
              type="text"
              disabled={disabled}
              maxLength={5}
              value={value.postalCode || ''}
              onChange={handlePostalCodeChange}
              placeholder="5-digit postal code (e.g. 12190)"
              className={`w-full bg-white border ${
                errors.postalCode ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            />
            {errors.postalCode ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.postalCode}</p>
            ) : (
              <p className="text-[10px] text-[#64748B] mt-1">
                Auto-suggested based on selected village or enter manually if required.
              </p>
            )}
          </div>
        </div>

        {/* OPTIONAL: RT & RW */}
        {showRtRw && (
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5">RT</label>
              <input
                type="text"
                disabled={disabled}
                maxLength={5}
                value={value.rt || ''}
                onChange={(e) => onChange({ ...value, rt: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="001"
                className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1.5">RW</label>
              <input
                type="text"
                disabled={disabled}
                maxLength={5}
                value={value.rw || ''}
                onChange={(e) => onChange({ ...value, rw: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="005"
                className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {/* ROW 4: FULL OPERATIONAL ADDRESS */}
        <div>
          <label className="block font-semibold text-[#0F172A] mb-1.5">
            7. Full Operational Address {config.addressRequired !== false && <span className="text-red-500">*</span>}
            <span className="text-[11px] font-normal text-[#64748B] ml-2">
              (Street name, building number, tower, floor, block, lot, & landmark notes)
            </span>
          </label>
          <textarea
            rows={addressRows}
            disabled={disabled}
            value={value.address || ''}
            onChange={handleAddressChange}
            placeholder={addressPlaceholder}
            className={`w-full bg-white border ${
              errors.address ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
            } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed leading-relaxed`}
          />
          {errors.address && <p className="text-[11px] text-red-600 mt-1">{errors.address}</p>}
        </div>
      </div>
    </div>
  );
};
