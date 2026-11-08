import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Star,
  RefreshCw,
  Save,
  ShieldAlert,
  AlertCircle,
  Briefcase,
  Store,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Lock
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  TenantMarketProfile,
  TenantBusinessLine,
  BusinessModelType
} from '../../types/erp';
import { TenantMasterService } from '../../services/tenantMasterService';
import { BaseModal } from '../common/BaseModal';
import { generateSmartEntityCode, getTenant2DigitCode } from '../../utils/entityCodeGenerator';

const INDUSTRY_CATEGORIES: { value: string; altValue: string; label: string }[] = [
  { value: 'Wholesale & Distribution', altValue: 'Perdagangan Besar & Distribusi', label: 'Wholesale & Distribution' },
  { value: 'Retail & Modern Trade', altValue: 'Retail & Toko Modern', label: 'Retail & Modern Trade' },
  { value: 'Manufacturing & Fabrication', altValue: 'Manufaktur & Pabrikasi', label: 'Manufacturing & Fabrication' },
  { value: 'Food & Beverage (F&B)', altValue: 'Makanan & Minuman (F&B)', label: 'Food & Beverage (F&B)' },
  { value: 'Professional Services & Consulting', altValue: 'Jasa Profesional & Konsultasi', label: 'Professional Services & Consulting' },
  { value: 'Construction & Real Estate', altValue: 'Konstruksi & Real Estate', label: 'Construction & Real Estate' },
  { value: 'Logistics, Freight & Supply Chain', altValue: 'Logistik, Ekspedisi & Rantai Pasok', label: 'Logistics, Freight & Supply Chain' },
  { value: 'Healthcare, Pharmaceuticals & Medical Devices', altValue: 'Kesehatan, Farmasi & Alkes', label: 'Healthcare, Pharmaceuticals & Medical Devices' },
  { value: 'Agriculture, Livestock & Agribusiness', altValue: 'Pertanian, Peternakan & Agribisnis', label: 'Agriculture, Livestock & Agribusiness' },
  { value: 'Information Technology & Digital Solutions', altValue: 'Teknologi Informasi & Solusi Digital', label: 'Information Technology & Digital Solutions' }
];

const BUSINESS_MODELS: { value: BusinessModelType; label: string; description: string }[] = [
  { value: 'B2B', label: 'B2B (Business to Business)', description: 'Sales to commercial enterprises, wholesalers, or partner distributors' },
  { value: 'B2C', label: 'B2C (Business to Consumer)', description: 'Direct sales to end consumers / individual customers' },
  { value: 'B2B2C', label: 'B2B2C (Hybrid Enterprise)', description: 'Hybrid combination of wholesale distribution and end-user fulfillment' },
  { value: 'D2C', label: 'D2C (Direct to Consumer)', description: 'Brand direct sales without intermediary distribution channels' },
  { value: 'B2G', label: 'B2G (Business to Government)', description: 'Procurement and contracts for government institutions and state enterprises' }
];

export const MarketBusinessLineView: React.FC = () => {
  const { tenant, allTenants, currentUser, addToast, updateMarketProfileState } = useErp();
  const { confirm } = useConfirm();
  const canEdit = TenantMasterService.canEditMaster(currentUser);

  const [marketProfile, setMarketProfile] = useState<TenantMarketProfile>(() =>
    TenantMasterService.getDefaultMarketProfile(tenant.id)
  );
  const [activeTab, setActiveTab] = useState<'industry' | 'business_lines'>('industry');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Line modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<TenantBusinessLine | null>(null);
  const [lineForm, setLineForm] = useState({
    code: '',
    name: '',
    description: '',
    costCenterCode: '',
    allowSharedAllocation: true,
    isPrimary: false,
    isActive: true
  });
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    const fetchMarketProfile = async () => {
      setIsLoading(true);
      try {
        const data = await TenantMasterService.getMarketProfile(tenant.id);
        if (mounted) {
          setMarketProfile(data);
        }
      } catch (err) {
        console.warn('Failed to load market profile:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchMarketProfile();
    return () => {
      mounted = false;
    };
  }, [tenant.id]);

  const handleSaveMarketSettings = async () => {
    if (!canEdit) {
      addToast('Restricted Access', 'Only Super Admin, Owner, or Tenant Admin can modify this configuration.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await TenantMasterService.saveMarketProfile(marketProfile, currentUser);
      setMarketProfile(res.profile);
      updateMarketProfileState(res.profile);
      addToast('Configuration Saved', 'Market profile and business lines updated successfully.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save market configuration.';
      addToast('Save Failed', msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openAddLineModal = () => {
    const autoCode = generateSmartEntityCode('LOB', tenant, marketProfile.businessLines.map((l) => l.code), allTenants);
    const autoCc = generateSmartEntityCode('CC', tenant, marketProfile.businessLines.map((l) => l.costCenterCode), allTenants);
    setEditingLine(null);
    setLineForm({
      code: autoCode,
      name: '',
      description: '',
      costCenterCode: autoCc,
      allowSharedAllocation: true,
      isPrimary: marketProfile.businessLines.length === 0,
      isActive: true
    });
    setLineErrors({});
    setIsModalOpen(true);
  };

  const openEditLineModal = (line: TenantBusinessLine) => {
    setEditingLine(line);
    setLineForm({
      code: line.code,
      name: line.name,
      description: line.description,
      costCenterCode: line.costCenterCode || `CC-${line.code}`,
      allowSharedAllocation: line.allowSharedAllocation !== false,
      isPrimary: line.isPrimary,
      isActive: line.isActive
    });
    setLineErrors({});
    setIsModalOpen(true);
  };

  const handleSaveLine = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!lineForm.name.trim()) {
      errs.name = 'Business line name is required.';
    }

    if (Object.keys(errs).length > 0) {
      setLineErrors(errs);
      return;
    }

    let updatedLines: TenantBusinessLine[] = [];

    if (editingLine) {
      // Update existing — lock code so it cannot be edited
      updatedLines = marketProfile.businessLines.map((line) => {
        if (line.id === editingLine.id) {
          return {
            ...line,
            code: editingLine.code, // Code cannot be edited
            name: lineForm.name.trim(),
            description: lineForm.description.trim(),
            costCenterCode: lineForm.costCenterCode.trim().toUpperCase() || `CC-${editingLine.code}`,
            allowSharedAllocation: lineForm.allowSharedAllocation,
            isPrimary: lineForm.isPrimary,
            isActive: lineForm.isActive,
            updatedAt: new Date().toISOString()
          };
        }
        // If this line became primary, demote others
        if (lineForm.isPrimary) {
          return { ...line, isPrimary: false };
        }
        return line;
      });
    } else {
      // Add new — gunakan auto code yang digenerate sistem
      const autoCode = lineForm.code || generateSmartEntityCode('LOB', tenant, marketProfile.businessLines.map((l) => l.code), allTenants);
      const autoCc = generateSmartEntityCode('CC', tenant, marketProfile.businessLines.map((l) => l.costCenterCode), allTenants);
      const newLine: TenantBusinessLine = {
        id: `lob_${tenant.id}_${Date.now()}`,
        tenantId: tenant.id,
        code: autoCode.toUpperCase(),
        name: lineForm.name.trim(),
        description: lineForm.description.trim(),
        costCenterCode: lineForm.costCenterCode.trim().toUpperCase() || autoCc,
        allowSharedAllocation: lineForm.allowSharedAllocation,
        isPrimary: lineForm.isPrimary || marketProfile.businessLines.length === 0,
        isActive: lineForm.isActive,
        createdAt: new Date().toISOString()
      };

      if (newLine.isPrimary) {
        updatedLines = marketProfile.businessLines.map((l) => ({ ...l, isPrimary: false }));
        updatedLines.push(newLine);
      } else {
        updatedLines = [...marketProfile.businessLines, newLine];
      }
    }

    // Invariant check: Ensure at least one line is primary
    const hasPrimary = updatedLines.some((l) => l.isPrimary);
    if (!hasPrimary && updatedLines.length > 0) {
      updatedLines[0].isPrimary = true;
    }

    const updatedProfile: TenantMarketProfile = {
      ...marketProfile,
      businessLines: updatedLines
    };

    setMarketProfile(updatedProfile);
    updateMarketProfileState(updatedProfile);
    setIsModalOpen(false);

    // Auto-persist changes
    TenantMasterService.saveMarketProfile(updatedProfile, currentUser)
      .then(() => {
        addToast('Business Line Saved', `Business line '${lineForm.name}' updated successfully.`, 'success');
      })
      .catch((err) => {
        addToast('Save Warning', err.message, 'warning');
      });
  };

  const handleSetPrimary = (lineId: string) => {
    if (!canEdit) return;

    const updatedLines = marketProfile.businessLines.map((line) => ({
      ...line,
      isPrimary: line.id === lineId,
      // If promoted to primary, ensure it is active
      isActive: line.id === lineId ? true : line.isActive
    }));

    const updatedProfile = {
      ...marketProfile,
      businessLines: updatedLines
    };

    setMarketProfile(updatedProfile);
    updateMarketProfileState(updatedProfile);
    TenantMasterService.saveMarketProfile(updatedProfile, currentUser)
      .then(() => {
        addToast('Primary Business Line Set', 'Primary business line updated successfully.', 'success');
      })
      .catch((err) => {
        addToast('Update Failed', err.message, 'error');
      });
  };

  const handleToggleActive = async (lineId: string) => {
    if (!canEdit) return;

    const targetLine = marketProfile.businessLines.find((l) => l.id === lineId);
    if (!targetLine) return;
    if (targetLine.isPrimary && targetLine.isActive) {
      addToast('Cannot Deactivate', 'Primary business line must remain active. Designate another business line as primary first.', 'warning');
      return;
    }

    const newStatus = !targetLine.isActive;
    const isConfirmed = await confirm({
      title: newStatus ? 'Aktifkan Kembali Lini Bisnis?' : 'Nonaktifkan Lini Bisnis?',
      message: newStatus
        ? `Lini bisnis "${targetLine.name}" akan kembali diaktifkan untuk pencatatan transaksi.`
        : `Apakah Anda yakin ingin menonaktifkan lini bisnis "${targetLine.name}"? Produk dan transaksi baru tidak dapat memilih lini bisnis ini.`,
      entityCode: targetLine.code,
      entityName: targetLine.name,
      variant: newStatus ? 'info' : 'warning',
      confirmLabel: newStatus ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal'
    });

    if (!isConfirmed) return;

    const updatedLines = marketProfile.businessLines.map((line) => {
      if (line.id === lineId) {
        return { ...line, isActive: newStatus };
      }
      return line;
    });

    const updatedProfile = {
      ...marketProfile,
      businessLines: updatedLines
    };

    setMarketProfile(updatedProfile);
    updateMarketProfileState(updatedProfile);
    TenantMasterService.saveMarketProfile(updatedProfile, currentUser)
      .then(() => {
        addToast('Status Updated', 'Business line status updated successfully.', 'info');
      })
      .catch((err) => {
        addToast('Status Update Failed', err.message, 'error');
      });
  };

  const handleDeleteLine = async (line: TenantBusinessLine) => {
    if (line.isPrimary) {
      addToast('Deletion Rejected', 'Primary business line cannot be deleted. Designate another business line as primary first.', 'error');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Hapus Lini Bisnis?',
      message: `Apakah Anda yakin ingin menghapus lini bisnis "${line.name}"?`,
      entityCode: line.code,
      entityName: line.name,
      variant: 'danger',
      confirmLabel: 'Ya, Hapus Lini Bisnis',
      cancelLabel: 'Batal',
      consequences: [
        'Data master lini bisnis akan dihapus dari konfigurasi profil.',
        'Tindakan ini tidak dapat dibatalkan jika sudah ada transaksi terkait.'
      ]
    });

    if (!isConfirmed) return;

    const updatedLines = marketProfile.businessLines.filter((l) => l.id !== line.id);
    const updatedProfile = {
      ...marketProfile,
      businessLines: updatedLines
    };

    setMarketProfile(updatedProfile);
    updateMarketProfileState(updatedProfile);

    TenantMasterService.saveMarketProfile(updatedProfile, currentUser)
      .then(() => {
        addToast('Business Line Deleted', 'Business line deleted successfully.', 'info');
      })
      .catch((err) => {
        addToast('Failed to Save Changes', err.message, 'error');
      });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#DCE5EC] rounded-lg p-12 text-center text-[#475569]">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#086288] mb-3" />
        <p className="text-xs font-medium">Loading market profile & business lines...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* RBAC Notice if user is read-only */}
      {!canEdit && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-3.5 flex items-center gap-3 text-xs text-[#92400E]">
          <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>
            <strong>Read-Only Mode:</strong> Your role ({currentUser.roleTitle || currentUser.role}) has view-only permissions. Modifying business lines requires Super Admin, Tenant Owner, or Tenant Admin privileges.
          </span>
        </div>
      )}

      {/* Main Tabbed Container */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-2xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-[#DCE5EC] px-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFDFE]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('industry')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'industry'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Market & Industry Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('business_lines')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'business_lines'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Business Lines Directory</span>
              <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                {marketProfile.businessLines.length}
              </span>
            </button>
          </div>

          {/* Action Button */}
          {canEdit && (
            <div className="pb-3 self-end sm:self-auto">
              {activeTab === 'industry' ? (
                <button
                  type="button"
                  disabled={!canEdit || isSaving}
                  onClick={handleSaveMarketSettings}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Industry Settings</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={openAddLineModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Business Line</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* TAB 1: Market & Industry Profile */}
        {activeTab === 'industry' && (
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Primary Industry Category */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  Primary Industry Category <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={!canEdit}
                  value={
                    INDUSTRY_CATEGORIES.find(
                      (c) => c.value === marketProfile.industryCategory || c.altValue === marketProfile.industryCategory
                    )?.value || marketProfile.industryCategory
                  }
                  onChange={(e) => setMarketProfile({ ...marketProfile, industryCategory: e.target.value })}
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {INDUSTRY_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#475569] mt-1.5 leading-relaxed">
                  Industry category is used for holding analytical reports and statutory transaction compliance.
                </p>
              </div>

              {/* Business Model */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1.5">
                  Business Model <span className="text-red-500">*</span>
                </label>
                <select
                  disabled={!canEdit}
                  value={marketProfile.businessModel}
                  onChange={(e) => setMarketProfile({ ...marketProfile, businessModel: e.target.value as BusinessModelType })}
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {BUSINESS_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#475569] mt-1.5 leading-relaxed">
                  {BUSINESS_MODELS.find((m) => m.value === marketProfile.businessModel)?.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Business Lines Directory */}
        {activeTab === 'business_lines' && (
          <div className="p-5 sm:p-6">
            <div className="overflow-x-auto rounded-lg border border-[#DCE5EC] bg-white">
              <table className="w-full text-left text-xs text-[#0F172A]">
                <thead className="bg-[#F8FAFC] border-b border-[#DCE5EC] text-[#475569] font-semibold select-none">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-28">Line Code</th>
                    <th className="py-3 px-4">Business Line Name</th>
                    <th className="py-3 px-4 hidden md:table-cell">Description</th>
                    <th className="py-3 px-4 w-32 text-center">Role</th>
                    <th className="py-3 px-4 w-28 text-center">Status</th>
                    <th className="py-3 px-4 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF4F8]">
                  {marketProfile.businessLines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#94A3B8]">
                        No business lines registered yet. Click Add Business Line to create one.
                      </td>
                    </tr>
                  ) : (
                    marketProfile.businessLines.map((line, idx) => (
                      <tr
                        key={line.id}
                        className={`hover:bg-[#F8FAFC] transition-colors ${
                          line.isPrimary ? 'bg-[#EFF7FA]/30 font-medium' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center text-[#64748B] tabular-nums font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#086288]">
                          {line.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0F172A] flex items-center gap-2 flex-wrap">
                            <span>{line.name}</span>
                            {line.costCenterCode && (
                              <span className="font-mono text-[10px] font-bold text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-1.5 py-0.5 rounded">
                                {line.costCenterCode}
                              </span>
                            )}
                            {line.allowSharedAllocation === false && (
                              <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                Exclusive (No Shared Cost Allocation)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#475569] md:hidden line-clamp-1">{line.description}</div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-[#475569] max-w-xs truncate">
                          {line.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {line.isPrimary ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#086288] text-white shadow-2xs">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              <span>Primary</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => handleSetPrimary(line.id)}
                              className="text-[11px] font-medium text-[#64748B] hover:text-[#086288] hover:underline cursor-pointer disabled:opacity-50"
                              title="Click to designate as primary business line"
                            >
                              Set as Primary
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleToggleActive(line.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${
                              line.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {line.isActive ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active</span>
                              </>
                            ) : (
                              <span>Inactive</span>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => openEditLineModal(line)}
                              className="p-1.5 text-[#475569] hover:text-[#086288] hover:bg-[#EEF4F8] rounded transition-colors disabled:opacity-40 cursor-pointer"
                              title="Edit Business Line"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={!canEdit || line.isPrimary}
                              onClick={() => handleDeleteLine(line)}
                              className={`p-1.5 rounded transition-colors ${
                                line.isPrimary
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer'
                              }`}
                              title={line.isPrimary ? 'Primary business line cannot be deleted' : 'Delete Business Line'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ADD / EDIT BUSINESS LINE */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLine ? 'Edit Business Line' : 'Add New Business Line'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveLine} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Business Line Code</span>
                <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-[#086288] font-mono font-bold bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded">
                Automatic (System Generated)
              </span>
            </label>
            <input
              type="text"
              value={lineForm.code}
              readOnly
              disabled
              placeholder={`e.g. LOB${getTenant2DigitCode(tenant, allTenants)}001`}
              className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#086288] cursor-not-allowed select-all"
              title="Business line code is generated automatically by the system and cannot be edited"
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              Business line code is generated automatically with tenant prefix and locked to maintain cross-module data integrity.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Business Line Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lineForm.name}
              onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
              placeholder="e.g. Pharmaceutical & Medical Supplies Distribution"
              className={`w-full bg-white border ${
                lineErrors.name ? 'border-red-500' : 'border-[#DCE5EC]'
              } rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]`}
            />
            {lineErrors.name && <p className="text-[11px] text-red-600 mt-1">{lineErrors.name}</p>}
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Business Domain Description
            </label>
            <textarea
              rows={2}
              value={lineForm.description}
              onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
              placeholder="Product scope, market reach, or business operational model..."
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1 flex items-center justify-between">
              <span>Cost Center Code (Accounting)</span>
              <span className="text-[10px] text-[#64748B] font-normal">Optional</span>
            </label>
            <input
              type="text"
              value={lineForm.costCenterCode}
              onChange={(e) => setLineForm({ ...lineForm, costCenterCode: e.target.value.toUpperCase() })}
              placeholder={`e.g. CC${getTenant2DigitCode(tenant, allTenants)}001`}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              Unique Cost Center identifier for tracking cost allocations, payroll expenses, and operational claims in the general ledger.
            </p>
          </div>

          <div className="pt-2 border-t border-[#EEF4F8] space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lineForm.allowSharedAllocation}
                onChange={(e) => setLineForm({ ...lineForm, allowSharedAllocation: e.target.checked })}
                className="rounded border-[#DCE5EC] text-[#086288] focus:ring-[#086288]"
              />
              <span className="font-semibold text-[#0F172A]">Include in Shared Cost Allocation (Shared Services)</span>
            </label>
            <p className="text-[11px] text-[#475569] pl-6">
              If enabled, this business line will automatically bear proportional cost allocations for central/holding staff configured as 'Equal Split'.
            </p>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lineForm.isPrimary}
                onChange={(e) => setLineForm({ ...lineForm, isPrimary: e.target.checked })}
                className="rounded border-[#DCE5EC] text-[#086288] focus:ring-[#086288]"
              />
              <span className="font-semibold text-[#0F172A]">Designate as Primary Business Line</span>
            </label>
            <p className="text-[11px] text-[#475569] pl-6">
              If selected, this business line serves as the default reference for transactions and other lines automatically become secondary.
            </p>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lineForm.isActive}
                onChange={(e) => setLineForm({ ...lineForm, isActive: e.target.checked })}
                className="rounded border-[#DCE5EC] text-[#086288] focus:ring-[#086288]"
              />
              <span className="font-semibold text-[#0F172A]">Active Status</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#DCE5EC]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-[#DCE5EC] rounded-md text-xs font-medium text-[#475569] hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-md text-xs font-semibold shadow-2xs cursor-pointer"
            >
              {editingLine ? 'Save Changes' : 'Add Business Line'}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
};
