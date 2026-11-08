import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Upload,
  Trash2,
  RefreshCw,
  Globe,
  Mail,
  Phone,
  MessageSquare,
  Lock,
  Save,
  ShieldAlert,
  FileText,
  MapPin,
  Terminal
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { CompanyProfile, BusinessEntityType } from '../../types/erp';
import { TenantMasterService } from '../../services/tenantMasterService';
import { MediaService } from '../../services/mediaService';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AddressForm, validateStandardAddress } from '../common/AddressForm';
import { IndonesiaRegionPlayground } from './IndonesiaRegionPlayground';

const BUSINESS_ENTITIES: { value: BusinessEntityType; label: string }[] = [
  { value: 'PT', label: 'Limited Liability Company (PT)' },
  { value: 'PT_PERORANGAN', label: 'Sole Proprietorship LLC (PT Perorangan)' },
  { value: 'CV', label: 'Limited Partnership (CV)' },
  { value: 'FIRMA', label: 'General Partnership (Firma)' },
  { value: 'UD', label: 'Sole Proprietorship (UD)' },
  { value: 'KOPERASI', label: 'Cooperative (Koperasi)' },
  { value: 'YAYASAN', label: 'Foundation (Yayasan)' },
  { value: 'PERORANGAN', label: 'Individual / Sole Trader' }
];

export const CompanyProfileView: React.FC = () => {
  const { tenant, currentUser, addToast, updateCompanyProfileState } = useErp();
  const canEdit = TenantMasterService.canEditMaster(currentUser);
  const isSuperAdmin = currentUser?.role === 'super_admin' || Boolean(currentUser?.isPlatformSuperAdmin) || currentUser?.userCode === '2A';

  const [profile, setProfile] = useState<CompanyProfile>(() =>
    TenantMasterService.getDefaultCompanyProfile(tenant.id, tenant.code)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isConfirmDeleteLogoOpen, setIsConfirmDeleteLogoOpen] = useState(false);
  const [addressMode, setAddressMode] = useState<'playground' | 'form'>('playground');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const data = await TenantMasterService.getCompanyProfile(tenant.id, tenant.code);
        if (mounted) {
          if (!data.country) {
            data.country = 'Indonesia';
          }
          setProfile(data);
        }
      } catch (err) {
        console.warn('Failed to load company profile:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, [tenant.id, tenant.code]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Legal & Brand validation
    if (!profile.legalName || profile.legalName.trim().length < 3) {
      newErrors.legalName = 'Corporate legal name is required (minimum 3 characters).';
    }
    if (!profile.brandName || profile.brandName.trim().length < 2) {
      newErrors.brandName = 'Trade / brand name is required (minimum 2 characters).';
    }
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      newErrors.email = 'Invalid email address format.';
    }
    if (profile.nib && !/^\d{9,13}$/.test(profile.nib.replace(/[^0-9]/g, ''))) {
      newErrors.nib = 'Business Reg ID (NIB) typically consists of 13 numeric digits.';
    }

    // 2. Global Address Standard Validation (Shared Component)
    const addressErrors = validateStandardAddress({
      country: profile.country,
      provinceId: profile.provinceId,
      provinceName: profile.provinceName,
      regencyId: profile.regencyId,
      regencyName: profile.regencyName,
      districtId: profile.districtId,
      districtName: profile.districtName,
      villageId: profile.villageId,
      villageName: profile.villageName,
      postalCode: profile.postalCode,
      address: profile.address
    });
    Object.assign(newErrors, addressErrors);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      addToast('Restricted Access', 'Only Super Admin, Owner, or Tenant Admin can modify company profile.', 'error');
      return;
    }

    if (!validateForm()) {
      addToast('Validation Failed', 'Please review required fields highlighted in red.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const res = await TenantMasterService.saveCompanyProfile(profile, currentUser);
      setProfile(res.profile);
      updateCompanyProfileState(res.profile);
      addToast('Profile Saved', 'Company profile successfully updated.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save company profile.';
      addToast('Save Failed', msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const validation = MediaService.validateImageFile(file);
    if (!validation.valid) {
      addToast('Invalid File Format', validation.error || '', 'error');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const uploadRes = await MediaService.uploadCompanyLogo(tenant.id, file);
      if (uploadRes.success && uploadRes.url) {
        const updated = { ...profile, logoUrl: uploadRes.url };
        setProfile(updated);
        updateCompanyProfileState(updated);
        addToast('Logo Uploaded', 'Company logo uploaded and updated successfully.', 'success');
      } else {
        addToast('Upload Failed', uploadRes.error || 'Error occurred while uploading.', 'error');
      }
    } catch (err: unknown) {
      addToast('Upload Failed', err instanceof Error ? err.message : 'Network error.', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleConfirmDeleteLogo = async () => {
    if (!profile.logoUrl) return;
    try {
      await MediaService.deleteCompanyLogo(tenant.id, profile.logoUrl);
      const updated = { ...profile, logoUrl: undefined };
      setProfile(updated);
      updateCompanyProfileState(updated);
      addToast('Logo Deleted', 'Company logo has been removed.', 'info');
    } catch {
      addToast('Delete Failed', 'Failed to remove logo asset.', 'error');
    } finally {
      setIsConfirmDeleteLogoOpen(false);
    }
  };

  const displayLogoUrl = MediaService.resolveAssetUrl(profile.logoUrl);

  if (isLoading) {
    return (
      <div className="bg-white border border-[#DCE5EC] rounded-lg p-12 text-center text-[#475569]">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#086288] mb-3" />
        <p className="text-xs font-medium">Loading company profile...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* RBAC Notice if user is read-only */}
      {!canEdit && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-3.5 flex items-center gap-3 text-xs text-[#92400E]">
          <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>
            <strong>Read-Only Mode:</strong> Your role ({currentUser.roleTitle || currentUser.role}) is granted view-only permissions. Modifying the company profile requires Super Admin, Tenant Owner, or Tenant Admin authority.
          </span>
        </div>
      )}

      {/* SECTION 1: IDENTITAS LEGAL & BRAND */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#DCE5EC]">
          <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">Legal & Brand Identity</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          {/* Tenant Code (Read-Only) */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center justify-between">
              <span>Tenant Code</span>
              <span className="text-[10px] text-[#64748B] font-normal flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Permanent / Read-only
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={profile.tenantCode}
                className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#086288] cursor-not-allowed select-all"
                title="Tenant Code is permanent and immutable"
              />
            </div>
          </div>

          {/* Nama Legal Perusahaan */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Legal Entity Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={profile.legalName}
              onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
              placeholder="e.g. PT Zyvora Global Pratama"
              className={`w-full bg-white border ${
                errors.legalName ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            />
            {errors.legalName && <p className="text-[11px] text-red-600 mt-1">{errors.legalName}</p>}
          </div>

          {/* Nama Brand */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={profile.brandName}
              onChange={(e) => setProfile({ ...profile, brandName: e.target.value })}
              placeholder="e.g. Zyvora Global"
              className={`w-full bg-white border ${
                errors.brandName ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            />
            {errors.brandName && <p className="text-[11px] text-red-600 mt-1">{errors.brandName}</p>}
          </div>

          {/* Jenis Badan Usaha */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Business Entity Type
            </label>
            <select
              disabled={!canEdit}
              value={profile.businessEntity}
              onChange={(e) => setProfile({ ...profile, businessEntity: e.target.value as BusinessEntityType })}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {BUSINESS_ENTITIES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* NIB */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Business Reg ID (NIB)
            </label>
            <input
              type="text"
              disabled={!canEdit}
              maxLength={13}
              value={profile.nib}
              onChange={(e) => setProfile({ ...profile, nib: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="13-digit NIB"
              className={`w-full bg-white border ${
                errors.nib ? 'border-red-500 ring-1 ring-red-200' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            />
            {errors.nib && <p className="text-[11px] text-red-600 mt-1">{errors.nib}</p>}
          </div>

          {/* NPWP Perusahaan */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Corporate Tax ID (NPWP)
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={profile.npwp}
              onChange={(e) => setProfile({ ...profile, npwp: e.target.value })}
              placeholder="00.000.000.0-000.000"
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Deskripsi Perusahaan */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block font-semibold text-[#0F172A] mb-1.5">
              Company Description
            </label>
            <textarea
              rows={2}
              disabled={!canEdit}
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              placeholder="Company profile overview, business missions, and holding portfolio..."
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: LOGO PERUSAHAAN (Cloud Media Storage) */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#DCE5EC]">
          <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">Official Corporate Logo</h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Logo Preview Box */}
          <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#DCE5EC] bg-[#F8FAFC] flex flex-col items-center justify-center p-2 relative overflow-hidden shrink-0 shadow-2xs">
            {displayLogoUrl ? (
              <img
                src={displayLogoUrl}
                alt={profile.brandName || 'Corporate Logo'}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center text-[#94A3B8] p-2">
                <Building2 className="w-8 h-8 mx-auto mb-1 opacity-50" />
                <span className="text-[10px] block leading-tight">No Logo Uploaded</span>
              </div>
            )}

            {isUploadingLogo && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center text-[#086288]">
                <RefreshCw className="w-5 h-5 animate-spin mb-1" />
                <span className="text-[10px] font-semibold">Uploading...</span>
              </div>
            )}
          </div>

          {/* Action buttons & storage status */}
          <div className="space-y-3 flex-1 text-xs">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={!canEdit || isUploadingLogo}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-md font-medium text-xs shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{displayLogoUrl ? 'Replace Logo' : 'Upload Logo'}</span>
              </button>

              {displayLogoUrl && (
                <button
                  type="button"
                  disabled={!canEdit || isUploadingLogo}
                  onClick={() => setIsConfirmDeleteLogoOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-md font-medium text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-[#475569] space-y-1">
              <p>Supports PNG, JPG, WEBP, or SVG. Maximum file size: 2.0 MB.</p>
              {profile.logoUrl && (
                <p className="font-mono text-[10px] text-[#086288] break-all bg-[#F8FAFC] px-2 py-1 rounded border border-[#DCE5EC]">
                  CDN Endpoint: {profile.logoUrl}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: KONTAK & KOMUNIKASI */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#DCE5EC]">
          <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">Contact & Channels</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          {/* Email Perusahaan */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#086288]" />
              <span>Official Email</span>
            </label>
            <input
              type="email"
              disabled={!canEdit}
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="corporate@company.com"
              className={`w-full bg-white border ${
                errors.email ? 'border-red-500' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed`}
            />
            {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
          </div>

          {/* Telepon Kantor */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#086288]" />
              <span>Office Phone</span>
            </label>
            <input
              type="tel"
              disabled={!canEdit}
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+62 21 0000 0000"
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* WhatsApp Bisnis */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Business WhatsApp</span>
            </label>
            <input
              type="tel"
              disabled={!canEdit}
              value={profile.whatsapp}
              onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
              placeholder="+62 812 0000 0000"
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Website Resmi */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#086288]" />
              <span>Official Website</span>
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={profile.website}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              placeholder="https://www.company.com"
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: ALAMAT DOMISILI LEGAL & PLAYGROUND API WILAYAH */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
        {/* Header with 2 Internal Tabs: Form Alamat vs Playground API */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE5EC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">Registered Legal Address</h2>
            </div>
          </div>

          {/* 2 Internal Tabs: API & Map Playground (Default) vs Standard Address Form */}
          <div className="flex items-center p-1 bg-[#EEF4F8] border border-[#DCE5EC] rounded-lg self-start sm:self-center">
            <button
              type="button"
              onClick={() => setAddressMode('playground')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                addressMode === 'playground'
                  ? 'bg-white text-[#086288] shadow-2xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>API & Map Playground</span>
              <span className="text-[9px] font-mono bg-[#DCEEF5] text-[#086288] px-1.5 py-0.5 rounded-full font-bold">
                Emsifa v2
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAddressMode('form')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                addressMode === 'form'
                  ? 'bg-white text-[#086288] shadow-2xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Standard Address Form</span>
            </button>
          </div>
        </div>

        {/* Tab 1 (Default): Playground API Wilayah Langsung dengan Peta di Atas Form */}
        {addressMode === 'playground' ? (
          <IndonesiaRegionPlayground
            initialAddress={{
              country: profile.country,
              provinceId: profile.provinceId,
              provinceName: profile.provinceName,
              regencyId: profile.regencyId,
              regencyName: profile.regencyName,
              districtId: profile.districtId,
              districtName: profile.districtName,
              villageId: profile.villageId,
              villageName: profile.villageName,
              postalCode: profile.postalCode,
              address: profile.address,
              latitude: profile.latitude,
              longitude: profile.longitude
            }}
            onAddressChange={(updated) => {
              setProfile((prev) => ({
                ...prev,
                country: updated.country || 'Indonesia',
                provinceId: updated.provinceId || '',
                provinceName: updated.provinceName || '',
                regencyId: updated.regencyId || '',
                regencyName: updated.regencyName || '',
                districtId: updated.districtId || '',
                districtName: updated.districtName || '',
                villageId: updated.villageId || '',
                villageName: updated.villageName || '',
                postalCode: updated.postalCode || '',
                address: updated.address || '',
                latitude: updated.latitude !== undefined ? updated.latitude : prev.latitude,
                longitude: updated.longitude !== undefined ? updated.longitude : prev.longitude
              }));
            }}
            isSuperAdmin={isSuperAdmin}
            showApiRequestSection={false}
            disabled={!canEdit}
            errors={errors}
            onClearError={(key) => {
              setErrors((prev) => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
              });
            }}
          />
        ) : (
          /* Tab 2: Form Alamat Saja (Ringkas) */
          <AddressForm
            value={{
              country: profile.country,
              provinceId: profile.provinceId,
              provinceName: profile.provinceName,
              regencyId: profile.regencyId,
              regencyName: profile.regencyName,
              districtId: profile.districtId,
              districtName: profile.districtName,
              villageId: profile.villageId,
              villageName: profile.villageName,
              postalCode: profile.postalCode,
              address: profile.address,
              latitude: profile.latitude,
              longitude: profile.longitude
            }}
            onChange={(addr) => {
              setProfile((prev) => ({
                ...prev,
                country: addr.country || 'Indonesia',
                provinceId: addr.provinceId || '',
                provinceName: addr.provinceName || '',
                regencyId: addr.regencyId || '',
                regencyName: addr.regencyName || '',
                districtId: addr.districtId || '',
                districtName: addr.districtName || '',
                villageId: addr.villageId || '',
                villageName: addr.villageName || '',
                postalCode: addr.postalCode || '',
                address: addr.address || '',
                latitude: addr.latitude !== undefined ? addr.latitude : prev.latitude,
                longitude: addr.longitude !== undefined ? addr.longitude : prev.longitude
              }));
            }}
            errors={errors}
            onClearError={(key) => {
              setErrors((prev) => {
                const copy = { ...prev };
                delete copy[key];
                return copy;
              });
            }}
            disabled={!canEdit}
            config={{
              showHeader: false
            }}
            className="!bg-transparent !border-0 !p-0 !shadow-none"
          />
        )}
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-[#475569]">
          {profile.updatedAt && (
            <span>Last updated: {new Date(profile.updatedAt).toLocaleString('en-US')}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={!canEdit || isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Company Profile</span>
            </>
          )}
        </button>
      </div>

      {/* CONFIRM DELETE LOGO DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmDeleteLogoOpen}
        title="Remove Corporate Logo"
        message="Are you sure you want to remove the corporate logo? This will reset the brand image across documents and invoices."
        confirmLabel="Yes, Remove Logo"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDeleteLogo}
        onCancel={() => setIsConfirmDeleteLogoOpen(false)}
      />
    </form>
  );
};
