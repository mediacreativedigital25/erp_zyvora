import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  FileText,
  GitBranch,
  Layers,
  ArrowRight,
  Eye,
  X,
  AlertCircle,
  Edit3,
  MapPin,
  Phone,
  Mail,
  Globe,
  Briefcase
} from 'lucide-react';
import { Tenant } from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import {
  IndonesiaRegionService,
  EmsifaV2Province,
  EmsifaV2Regency,
  EmsifaV2District,
  EmsifaV2Village
} from '../../services/indonesiaRegionService';

export const TenantManagementView: React.FC = () => {
  const {
    tenant: activeTenant,
    allTenants,
    switchTenant,
    addNewTenant,
    updateTenant,
    branches,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast
  } = useErp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedTenantForDetail, setSelectedTenantForDetail] = useState<Tenant | null>(null);
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<Tenant | null>(null);

  // Active tab in Add/Edit modals
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'address'>('general');
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields State
  const [formName, setFormName] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formSlug, setFormSlug] = useState<string>('');
  const [formTenantNumber, setFormTenantNumber] = useState<string>('');
  const [formPlan, setFormPlan] = useState<'enterprise' | 'growth' | 'starter'>('growth');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');
  const [formDescription, setFormDescription] = useState<string>('');

  // Address & Contact State
  const [formAddress, setFormAddress] = useState<string>('');
  const [formProvinceId, setFormProvinceId] = useState<string>('');
  const [formProvinceName, setFormProvinceName] = useState<string>('');
  const [formRegencyId, setFormRegencyId] = useState<string>('');
  const [formRegencyName, setFormRegencyName] = useState<string>('');
  const [formDistrictId, setFormDistrictId] = useState<string>('');
  const [formDistrictName, setFormDistrictName] = useState<string>('');
  const [formVillageId, setFormVillageId] = useState<string>('');
  const [formVillageName, setFormVillageName] = useState<string>('');
  const [formPostalCode, setFormPostalCode] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formNpwp, setFormNpwp] = useState<string>('');
  const [formWebsite, setFormWebsite] = useState<string>('');

  // Regional cascade lists
  const [provinces, setProvinces] = useState<EmsifaV2Province[]>([]);
  const [regencies, setRegencies] = useState<EmsifaV2Regency[]>([]);
  const [districts, setDistricts] = useState<EmsifaV2District[]>([]);
  const [villages, setVillages] = useState<EmsifaV2Village[]>([]);
  const [loadingRegions, setLoadingRegions] = useState<boolean>(false);

  // Fetch provinces on mount
  useEffect(() => {
    IndonesiaRegionService.fetchV2Provinces().then((res) => {
      if (res.ok && Array.isArray(res.data)) {
        setProvinces(res.data);
      }
    });
  }, []);

  // When province changes, load regencies
  const handleProvinceChange = async (provId: string) => {
    setFormProvinceId(provId);
    const found = provinces.find((p) => p.id === provId);
    setFormProvinceName(found ? found.name : '');
    setFormRegencyId('');
    setFormRegencyName('');
    setFormDistrictId('');
    setFormDistrictName('');
    setFormVillageId('');
    setFormVillageName('');
    setRegencies([]);
    setDistricts([]);
    setVillages([]);

    if (provId) {
      setLoadingRegions(true);
      const res = await IndonesiaRegionService.fetchV2Regencies(provId);
      if (res.ok && Array.isArray(res.data)) {
        setRegencies(res.data);
      }
      setLoadingRegions(false);
    }
  };

  // When regency changes, load districts
  const handleRegencyChange = async (regId: string) => {
    setFormRegencyId(regId);
    const found = regencies.find((r) => r.id === regId);
    setFormRegencyName(found ? found.name : '');
    setFormDistrictId('');
    setFormDistrictName('');
    setFormVillageId('');
    setFormVillageName('');
    setDistricts([]);
    setVillages([]);

    if (regId) {
      setLoadingRegions(true);
      const res = await IndonesiaRegionService.fetchV2Districts(regId);
      if (res.ok && Array.isArray(res.data)) {
        setDistricts(res.data);
      }
      setLoadingRegions(false);
    }
  };

  // When district changes, load villages
  const handleDistrictChange = async (distId: string) => {
    setFormDistrictId(distId);
    const found = districts.find((d) => d.id === distId);
    setFormDistrictName(found ? found.name : '');
    setFormVillageId('');
    setFormVillageName('');
    setVillages([]);

    if (distId) {
      setLoadingRegions(true);
      const res = await IndonesiaRegionService.fetchV2Villages(distId);
      if (res.ok && Array.isArray(res.data)) {
        setVillages(res.data);
      }
      setLoadingRegions(false);
    }
  };

  // When village changes, extract postal code
  const handleVillageChange = (vilId: string) => {
    setFormVillageId(vilId);
    const found = villages.find((v) => v.id === vilId);
    setFormVillageName(found ? found.name : '');
    const suggested = IndonesiaRegionService.suggestPostalCode(vilId, found?.name, formDistrictId, formDistrictName);
    if (suggested && !formPostalCode) {
      setFormPostalCode(suggested);
    } else if (found?.name && !formPostalCode) {
      IndonesiaRegionService.fetchPostalCodeOnline(found.name, formDistrictName, formRegencyName).then((code) => {
        if (code) setFormPostalCode(code);
      });
    } else if (found?.postal_code && !formPostalCode) {
      setFormPostalCode(found.postal_code);
    }
  };

  // Next automatic 3-digit tenant number
  const nextTenantNumber = useMemo(() => {
    let max = 0;
    for (const t of allTenants || []) {
      if (t.tenantNumber) {
        const parsed = parseInt(t.tenantNumber, 10);
        if (!isNaN(parsed) && parsed > max) max = parsed;
      }
    }
    return String(max + 1).padStart(3, '0');
  }, [allTenants]);

  // Open Edit Modal with preloaded data
  const handleOpenEditModal = async (t: Tenant) => {
    setSelectedTenantForEdit(t);
    setFormName(t.name || '');
    setFormCode(t.code || '');
    setFormSlug(t.slug || '');
    setFormTenantNumber(t.tenantNumber || '');
    setFormPlan(t.plan || 'growth');
    setFormStatus(t.status || 'active');
    setFormDescription(t.description || '');

    setFormAddress(t.address || '');
    setFormProvinceId(t.provinceId || '');
    setFormProvinceName(t.provinceName || '');
    setFormRegencyId(t.regencyId || '');
    setFormRegencyName(t.regencyName || '');
    setFormDistrictId(t.districtId || '');
    setFormDistrictName(t.districtName || '');
    setFormVillageId(t.villageId || '');
    setFormVillageName(t.villageName || '');
    setFormPostalCode(t.postalCode || '');
    setFormPhone(t.phone || '');
    setFormEmail(t.email || '');
    setFormNpwp(t.npwp || '');
    setFormWebsite(t.website || '');

    setActiveFormTab('general');
    setModalErrorMessage(null);
    setIsEditModalOpen(true);

    // Cascade load regions if IDs exist
    if (t.provinceId) {
      const regRes = await IndonesiaRegionService.fetchV2Regencies(t.provinceId);
      if (regRes.ok && Array.isArray(regRes.data)) setRegencies(regRes.data);
    }
    if (t.regencyId) {
      const distRes = await IndonesiaRegionService.fetchV2Districts(t.regencyId);
      if (distRes.ok && Array.isArray(distRes.data)) setDistricts(distRes.data);
    }
    if (t.districtId) {
      const vilRes = await IndonesiaRegionService.fetchV2Villages(t.districtId);
      if (vilRes.ok && Array.isArray(vilRes.data)) setVillages(vilRes.data);
    }
  };

  // Open Add Modal with clean state
  const handleOpenAddModal = () => {
    setFormName('');
    setFormCode('');
    setFormSlug('');
    setFormTenantNumber(nextTenantNumber);
    setFormPlan('growth');
    setFormStatus('active');
    setFormDescription('');

    setFormAddress('');
    setFormProvinceId('');
    setFormProvinceName('');
    setFormRegencyId('');
    setFormRegencyName('');
    setFormDistrictId('');
    setFormDistrictName('');
    setFormVillageId('');
    setFormVillageName('');
    setFormPostalCode('');
    setFormPhone('');
    setFormEmail('');
    setFormNpwp('');
    setFormWebsite('');

    setActiveFormTab('general');
    setModalErrorMessage(null);
    setIsAddModalOpen(true);
  };

  // Submit Edit Tenant
  const handleSaveEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForEdit) return;
    setModalErrorMessage(null);

    if (!formName.trim()) {
      setModalErrorMessage('Nama Perusahaan / Legal Entity Name wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Tenant> = {
        name: formName.trim(),
        code: formCode.trim() || selectedTenantForEdit.code,
        slug: formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        plan: formPlan,
        status: formStatus,
        description: formDescription.trim(),
        address: formAddress.trim(),
        provinceId: formProvinceId,
        provinceName: formProvinceName,
        regencyId: formRegencyId,
        regencyName: formRegencyName,
        districtId: formDistrictId,
        districtName: formDistrictName,
        villageId: formVillageId,
        villageName: formVillageName,
        postalCode: formPostalCode.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        npwp: formNpwp.trim(),
        website: formWebsite.trim()
      };

      const ok = await updateTenant(selectedTenantForEdit.id, payload);
      if (ok) {
        setIsEditModalOpen(false);
      }
    } catch (err: any) {
      setModalErrorMessage(err.message || 'Gagal menyimpan perubahan tenant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit New Tenant
  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    setModalErrorMessage(null);

    if (!formName.trim()) {
      setModalErrorMessage('Nama Perusahaan / Legal Entity Name wajib diisi.');
      return;
    }

    addNewTenant({
      name: formName.trim(),
      code: formCode.trim() || undefined,
      plan: formPlan,
      tenantNumber: formTenantNumber || nextTenantNumber,
      description: formDescription.trim(),
      address: formAddress.trim(),
      provinceId: formProvinceId,
      provinceName: formProvinceName,
      regencyId: formRegencyId,
      regencyName: formRegencyName,
      districtId: formDistrictId,
      districtName: formDistrictName,
      villageId: formVillageId,
      villageName: formVillageName,
      postalCode: formPostalCode.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      npwp: formNpwp.trim(),
      website: formWebsite.trim()
    });

    setIsAddModalOpen(false);
  };

  // Filtered tenants
  const filteredTenants = useMemo(() => {
    return (allTenants || []).filter((t) => {
      if (filterPlan !== 'all' && t.plan !== filterPlan) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (t.name || '').toLowerCase().includes(q);
        const matchesCode = (t.code || '').toLowerCase().includes(q);
        const matchesNum = (t.tenantNumber || '').toLowerCase().includes(q);
        const matchesAddr = (t.address || '').toLowerCase().includes(q);
        const matchesCity = (t.regencyName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesNum && !matchesAddr && !matchesCity) return false;
      }
      return true;
    });
  }, [allTenants, filterPlan, filterStatus, searchQuery]);

  return (
    <div className="space-y-4 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Main Table Container with Top-Right Action Toolbar */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-2xs space-y-4">
        {/* Sub-Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#CBD5E1] gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">Total Tenants:</span>
            <span className="font-mono text-xs font-bold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded-full">
              {filteredTenants.length}
            </span>
          </div>

          {/* Top-Right Action Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Tenant Baru</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama tenant, kode tenant (001, 002), kota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
              />
            </div>

            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#086288]"
            >
              <option value="all">Semua Paket (Plan)</option>
              <option value="enterprise">Enterprise</option>
              <option value="growth">Growth</option>
              <option value="starter">Starter</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#475569] focus:outline-none focus:ring-1 focus:ring-[#086288]"
            >
              <option value="all">Semua Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Tenants Data Table */}
        <div className="overflow-x-auto rounded-lg border border-[#DCE5EC] bg-white">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] border-b border-[#DCE5EC] text-[#475569] font-semibold text-[11px] uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28">Kode Tenant</th>
                <th className="py-3 px-4">Nama Perusahaan & Alamat</th>
                <th className="py-3 px-4">Pratinjau Format Dokumen</th>
                <th className="py-3 px-4">Paket Plan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center w-48">Aksi Tenant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    <Building2 className="w-8 h-8 stroke-[1.5] text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-sm font-medium text-[#475569]">Tidak ada data tenant yang cocok</p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t, idx) => {
                  const tNum = t.tenantNumber || String(idx + 1).padStart(3, '0');
                  const isCurrent = t.id === activeTenant.id;
                  const currentYearMonth = new Date().toISOString().replace(/-/g, '').slice(0, 6);

                  const previewHQ = `SO${tNum}${currentYearMonth}00001`;
                  const previewBranchA = `SO${tNum}A${currentYearMonth}00001`;
                  const previewCE = `CE${tNum}${currentYearMonth}00001`;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        isCurrent ? 'bg-[#EFF7FA]/40 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-[#64748B]">{idx + 1}</td>

                      {/* Kode Tenant (3 Digit) */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#086288] text-xs px-2.5 py-1 rounded bg-[#EFF7FA] border border-[#B7DDEA]">
                          {tNum}
                        </span>
                      </td>

                      {/* Nama Tenant & Alamat */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A] flex items-center gap-2">
                          <span>{t.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#086288] text-white">
                              Aktif Dikelola
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                          Code: {t.code} • Slug: {t.slug}
                        </div>
                        {t.address && (
                          <div className="text-[11px] text-[#475569] flex items-center gap-1 mt-1 truncate max-w-sm">
                            <MapPin className="w-3 h-3 text-[#086288] shrink-0" />
                            <span className="truncate">
                              {t.address}
                              {t.regencyName ? `, ${t.regencyName}` : ''}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Pratinjau Format Dokumen */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="text-[#086288] flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-[#64748B] w-12">Pusat:</span>
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{previewHQ}</span>
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{previewCE}</span>
                          </div>
                          <div className="text-[#086288] flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-[#64748B] w-12">Cabang A:</span>
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{previewBranchA}</span>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4 capitalize">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          t.plan === 'enterprise'
                            ? 'bg-[#EFF7FA] text-[#086288] border-[#B7DDEA]'
                            : t.plan === 'growth'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {t.plan}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {t.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedTenantForDetail(t)}
                            className="p-1.5 text-[#475569] hover:text-[#086288] hover:bg-[#EFF7FA] rounded border border-[#DCE5EC] transition-colors cursor-pointer"
                            title="Lihat Detail Profil & Alamat Tenant"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button for Super Admin */}
                          {isCurrentUserSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(t)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors cursor-pointer"
                              title="Edit Data & Alamat Tenant (Super Admin)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Switch Button */}
                          {isCurrent ? (
                            <span className="text-[11px] text-emerald-700 font-semibold px-2 py-1 bg-emerald-50 rounded border border-emerald-200">
                              Ruang Aktif
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => switchTenant(t.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#EFF7FA] text-[#086288] hover:bg-[#DCEEF5] border border-[#B7DDEA] transition-colors cursor-pointer"
                              title="Masuk dan kelola data tenant ini"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Beralih</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: EDIT TENANT (SUPER ADMIN) */}
      {/* ==================================================================== */}
      {isEditModalOpen && selectedTenantForEdit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#DCE5EC] max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC] bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Edit Data Tenant: {selectedTenantForEdit.name}
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Perbarui profil legalitas, alamat wilayah, dan status langganan tenant
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Tabs */}
            <div className="flex border-b border-[#DCE5EC] bg-[#F8FAFC] px-6 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveFormTab('general')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFormTab === 'general'
                    ? 'border-[#086288] text-[#086288] bg-white'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Identitas Perusahaan</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('address')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFormTab === 'address'
                    ? 'border-[#086288] text-[#086288] bg-white'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Alamat & Legalitas</span>
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveEditTenant} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {modalErrorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalErrorMessage}</span>
                </div>
              )}

              {/* TAB 1: IDENTITAS */}
              {activeFormTab === 'general' && (
                <div className="space-y-4">
                  {/* Automatic Tenant Number Display */}
                  <div className="p-3 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-[#086288]">Kode Dokumen Tenant:</div>
                      <div className="text-base font-bold font-mono text-[#086288]">
                        {formTenantNumber || selectedTenantForEdit.tenantNumber}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-[#64748B] font-mono">
                      ID: {selectedTenantForEdit.id}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Legal Name */}
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        Nama Perusahaan / Legal Entity Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                        required
                      />
                    </div>

                    {/* Tenant Code */}
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        Kode Singkat Tenant (Slug Code)
                      </label>
                      <input
                        type="text"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 text-xs font-mono uppercase rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>

                    {/* Slug */}
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value.toLowerCase())}
                        className="w-full px-3 py-2 text-xs font-mono rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>

                    {/* Plan */}
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        Paket Langganan (Plan)
                      </label>
                      <select
                        value={formPlan}
                        onChange={(e) => setFormPlan(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      >
                        <option value="enterprise">Enterprise (Multi-branch & Full Entitlement)</option>
                        <option value="growth">Growth (Standard Operations)</option>
                        <option value="starter">Starter (Single Entity)</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        Status Operasional
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      >
                        <option value="active">Active (Operasional Normal)</option>
                        <option value="suspended">Suspended (Akses Ditangguhkan)</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        Deskripsi Bisnis / Catatan Entitas
                      </label>
                      <textarea
                        rows={3}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Deskripsi singkat lini bisnis atau profil umum tenant..."
                        className="w-full px-3 py-2 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ALAMAT & KONTAK */}
              {activeFormTab === 'address' && (
                <div className="space-y-4">
                  {/* Alamat Fisik Lengkap */}
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1.5">
                      Alamat Kantor Pusat / Domisili Hukum
                    </label>
                    <textarea
                      rows={2}
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Nama gedung, jalan, nomor kavling..."
                      className="w-full px-3 py-2 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                    />
                  </div>

                  {/* Hierarki Wilayah Indonesia */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="md:col-span-2 font-semibold text-[11px] text-[#086288] flex items-center gap-1.5 pb-1 border-b border-[#E2E8F0]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Wilayah Administratif (Data Resmi Indonesia)</span>
                    </div>

                    {/* Provinsi */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Provinsi
                      </label>
                      <select
                        value={formProvinceId}
                        onChange={(e) => handleProvinceChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      >
                        <option value="">-- Pilih Provinsi --</option>
                        {provinces.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Kota / Kabupaten */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Kota / Kabupaten
                      </label>
                      <select
                        value={formRegencyId}
                        onChange={(e) => handleRegencyChange(e.target.value)}
                        disabled={!formProvinceId || regencies.length === 0}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100"
                      >
                        <option value="">-- Pilih Kota / Kabupaten --</option>
                        {regencies.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Kecamatan */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Kecamatan
                      </label>
                      <select
                        value={formDistrictId}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        disabled={!formRegencyId || districts.length === 0}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100"
                      >
                        <option value="">-- Pilih Kecamatan --</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Kelurahan / Desa */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Kelurahan / Desa
                      </label>
                      <select
                        value={formVillageId}
                        onChange={(e) => handleVillageChange(e.target.value)}
                        disabled={!formDistrictId || villages.length === 0}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100"
                      >
                        <option value="">-- Pilih Kelurahan --</option>
                        {villages.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Kode Pos */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Kode Pos
                      </label>
                      <input
                        type="text"
                        value={formPostalCode}
                        onChange={(e) => setFormPostalCode(e.target.value)}
                        placeholder="Contoh: 12190"
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>

                    {/* NPWP */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Nomor Pokok Wajib Pajak (NPWP)
                      </label>
                      <input
                        type="text"
                        value={formNpwp}
                        onChange={(e) => setFormNpwp(e.target.value)}
                        placeholder="Contoh: 01.345.678.9-012.000"
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>
                  </div>

                  {/* Kontak & Legalitas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        No. Telepon Kantor
                      </label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+62 21 ..."
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        Email Resmi
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="corporate@domain.com"
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        Website Resmi
                      </label>
                      <input
                        type="url"
                        value={formWebsite}
                        onChange={(e) => setFormWebsite(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[#DCE5EC] flex items-center justify-between shrink-0">
                <div className="text-[11px] text-[#64748B]">
                  Perubahan langsung tersimpan ke Supabase Cloud
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3.5 py-2 rounded-md text-xs font-semibold text-[#475569] bg-white border border-[#DCE5EC] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: TAMBAH TENANT BARU */}
      {/* ==================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-[#DCE5EC] max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC] bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Tambah Tenant Baru
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Mendaftarkan entitas perusahaan baru ke dalam ekosistem Zyvora
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Tabs */}
            <div className="flex border-b border-[#DCE5EC] bg-[#F8FAFC] px-6 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveFormTab('general')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFormTab === 'general'
                    ? 'border-[#086288] text-[#086288] bg-white'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Identitas Perusahaan</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('address')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFormTab === 'address'
                    ? 'border-[#086288] text-[#086288] bg-white'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Alamat & Legalitas</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTenant} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {modalErrorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalErrorMessage}</span>
                </div>
              )}

              {activeFormTab === 'general' && (
                <div className="space-y-4">
                  {/* Automatic Tenant Number Display */}
                  <div className="p-3 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-[#086288]">Kode Tenant Otomatis:</div>
                      <div className="text-lg font-bold font-mono text-[#086288]">
                        {formTenantNumber || nextTenantNumber}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-[#64748B] font-mono">
                      Formula: SO{formTenantNumber || nextTenantNumber}20261000001
                    </div>
                  </div>

                  {/* Legal Name */}
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1.5">
                      Nama Perusahaan / Legal Entity Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: PT Medist Prima Sentosa"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      autoFocus
                      required
                    />
                  </div>

                  {/* Tenant Code */}
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1.5">
                      Kode Singkat Tenant (Slug Code)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: MDT-PRIMA"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs font-mono uppercase rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                    />
                  </div>

                  {/* Plan */}
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1.5">
                      Paket Langganan (Plan)
                    </label>
                    <select
                      value={formPlan}
                      onChange={(e) => setFormPlan(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                    >
                      <option value="enterprise">Enterprise (Multi-branch & Full Entitlement)</option>
                      <option value="growth">Growth (Standard Operations)</option>
                      <option value="starter">Starter (Single Entity)</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1.5">
                      Deskripsi Bisnis / Catatan Entitas
                    </label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Deskripsi singkat lini bisnis..."
                      className="w-full px-3 py-2 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                    />
                  </div>
                </div>
              )}

              {activeFormTab === 'address' && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1.5">
                      Alamat Kantor Pusat / Domisili Hukum
                    </label>
                    <textarea
                      rows={2}
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Nama gedung, jalan, nomor kavling..."
                      className="w-full px-3 py-2 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="md:col-span-2 font-semibold text-[11px] text-[#086288] flex items-center gap-1.5 pb-1 border-b border-[#E2E8F0]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Wilayah Administratif Indonesia</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Provinsi
                      </label>
                      <select
                        value={formProvinceId}
                        onChange={(e) => handleProvinceChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      >
                        <option value="">-- Pilih Provinsi --</option>
                        {provinces.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Kota / Kabupaten
                      </label>
                      <select
                        value={formRegencyId}
                        onChange={(e) => handleRegencyChange(e.target.value)}
                        disabled={!formProvinceId || regencies.length === 0}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100"
                      >
                        <option value="">-- Pilih Kota / Kabupaten --</option>
                        {regencies.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Kecamatan
                      </label>
                      <select
                        value={formDistrictId}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        disabled={!formRegencyId || districts.length === 0}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100"
                      >
                        <option value="">-- Pilih Kecamatan --</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Kelurahan / Desa
                      </label>
                      <select
                        value={formVillageId}
                        onChange={(e) => handleVillageChange(e.target.value)}
                        disabled={!formDistrictId || villages.length === 0}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100"
                      >
                        <option value="">-- Pilih Kelurahan --</option>
                        {villages.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Kode Pos
                      </label>
                      <input
                        type="text"
                        value={formPostalCode}
                        onChange={(e) => setFormPostalCode(e.target.value)}
                        placeholder="Contoh: 12190"
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        NPWP Perusahaan
                      </label>
                      <input
                        type="text"
                        value={formNpwp}
                        onChange={(e) => setFormNpwp(e.target.value)}
                        placeholder="01.345.678.9-012.000"
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        No. Telepon
                      </label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+62 21 ..."
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        Email Resmi
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="info@perusahaan.com"
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        value={formWebsite}
                        onChange={(e) => setFormWebsite(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 text-xs rounded-md border border-[#DCE5EC] bg-white text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#086288]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#DCE5EC] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-md text-xs font-semibold text-[#475569] bg-white border border-[#DCE5EC] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] shadow-xs transition-colors cursor-pointer"
                >
                  Daftarkan Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: DETAIL TENANT */}
      {/* ==================================================================== */}
      {selectedTenantForDetail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#DCE5EC] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC] bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    {selectedTenantForDetail.name}
                  </h3>
                  <p className="text-[11px] text-[#64748B] font-mono">
                    Kode: {selectedTenantForDetail.tenantNumber || '---'} • {selectedTenantForDetail.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTenantForDetail(null)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
              {/* Status & Plan Pill */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div>
                  <span className="text-[11px] text-[#64748B] block">Paket Langganan:</span>
                  <span className="font-semibold text-xs text-[#086288] uppercase tracking-wide">
                    {selectedTenantForDetail.plan} Plan
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] block text-right">Status Sistem:</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    selectedTenantForDetail.status === 'active'
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      : 'text-rose-700 bg-rose-50 border border-rose-200'
                  }`}>
                    {selectedTenantForDetail.status === 'active' ? 'Aktif' : 'Suspended'}
                  </span>
                </div>
              </div>

              {/* Alamat */}
              <div className="space-y-1.5">
                <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#086288]" />
                  <span>Alamat & Domisili Hukum</span>
                </span>
                <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] leading-relaxed">
                  {selectedTenantForDetail.address || 'Belum ada alamat kantor yang diisi.'}
                  {(selectedTenantForDetail.villageName || selectedTenantForDetail.districtName || selectedTenantForDetail.regencyName || selectedTenantForDetail.provinceName) && (
                    <div className="mt-1 pt-1 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
                      {[
                        selectedTenantForDetail.villageName,
                        selectedTenantForDetail.districtName,
                        selectedTenantForDetail.regencyName,
                        selectedTenantForDetail.provinceName,
                        selectedTenantForDetail.postalCode
                      ].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Kontak & NPWP */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold block">Telepon</span>
                  <span className="font-mono text-xs text-[#0F172A]">
                    {selectedTenantForDetail.phone || '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold block">Email Resmi</span>
                  <span className="text-xs text-[#0F172A] truncate block">
                    {selectedTenantForDetail.email || '-'}
                  </span>
                </div>
                <div className="p-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] col-span-2">
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold block">NPWP Perusahaan</span>
                  <span className="font-mono text-xs text-[#0F172A]">
                    {selectedTenantForDetail.npwp || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#DCE5EC] bg-[#F8FAFC] flex justify-between items-center">
              {isCurrentUserSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const t = selectedTenantForDetail;
                    setSelectedTenantForDetail(null);
                    handleOpenEditModal(t);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Tenant Ini</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTenantForDetail(null)}
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-[#475569] bg-white border border-[#DCE5EC] hover:bg-[#F1F5F9] transition-colors cursor-pointer ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
