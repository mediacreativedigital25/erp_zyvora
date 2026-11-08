import React, { useState } from 'react';
import {
  Building,
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Phone,
  MapPin,
  X,
  ShieldAlert,
  Coins,
  FileText
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { BusinessUnit, Branch } from '../../types/erp';
import { useConfirm } from '../../context/ConfirmContext';
import { getSupabaseClient, isSupabaseConfigured } from '../../services/supabaseClient';
import { generateSmartEntityCode, getTenant2DigitCode } from '../../utils/entityCodeGenerator';

export const BranchesBusinessUnitsView: React.FC = () => {
  const {
    tenant,
    allTenants,
    businessUnits,
    setBusinessUnits,
    branches,
    setBranches,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast
  } = useErp();
  const { confirm } = useConfirm();

  const canEdit =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'business_units' | 'branches'>('business_units');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuFilter, setSelectedBuFilter] = useState('ALL');

  // Modals
  const [isBuModalOpen, setIsBuModalOpen] = useState(false);
  const [editingBu, setEditingBu] = useState<BusinessUnit | null>(null);
  const [buFormData, setBuFormData] = useState({
    code: '',
    name: '',
    taxId: '',
    currency: 'IDR',
    isActive: true
  });

  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchFormData, setBranchFormData] = useState({
    businessUnitId: businessUnits[0]?.id || '',
    code: '',
    name: '',
    city: '',
    address: '',
    phone: '',
    isHeadquarters: false,
    isActive: true
  });

  // Delete State
  const [deletingBu, setDeletingBu] = useState<BusinessUnit | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Business Unit Handlers
  const openAddBuModal = () => {
    const nextCode = generateSmartEntityCode('BU', tenant, businessUnits.map((b) => b.code), allTenants);
    setEditingBu(null);
    setBuFormData({
      code: nextCode,
      name: '',
      taxId: '',
      currency: 'IDR',
      isActive: true
    });
    setIsBuModalOpen(true);
  };

  const openEditBuModal = (bu: BusinessUnit) => {
    setEditingBu(bu);
    setBuFormData({
      code: bu.code,
      name: bu.name,
      taxId: bu.taxId,
      currency: bu.currency,
      isActive: bu.isActive
    });
    setIsBuModalOpen(true);
  };

  const handleSaveBu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buFormData.name.trim() || !buFormData.code.trim()) {
      addToast('Validation Failed', 'Business unit code and name are required.', 'warning');
      return;
    }

    if (editingBu) {
      setBusinessUnits((prev) =>
        prev.map((b) => (b.id === editingBu.id ? { ...b, ...buFormData } : b))
      );
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        client
          .from('business_units')
          .update({
            code: buFormData.code,
            name: buFormData.name,
            tax_id: buFormData.taxId,
            currency: buFormData.currency,
            is_active: buFormData.isActive
          })
          .eq('id', editingBu.id)
          .then();
      }
      addToast('Business Unit Updated', `Business unit '${buFormData.name}' updated successfully.`, 'success');
    } else {
      const newBu: BusinessUnit = {
        id: `bu_${Date.now()}`,
        tenantId: currentUser.tenantId,
        ...buFormData
      };
      setBusinessUnits((prev) => [...prev, newBu]);
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        client
          .from('business_units')
          .insert({
            id: newBu.id,
            tenant_id: newBu.tenantId,
            code: newBu.code,
            name: newBu.name,
            tax_id: newBu.taxId,
            currency: newBu.currency,
            is_active: newBu.isActive
          })
          .then();
      }
      addToast('Business Unit Added', `Business unit '${newBu.name}' added successfully.`, 'success');
    }
    setIsBuModalOpen(false);
  };

  const toggleBuStatus = async (buId: string) => {
    const target = businessUnits.find((b) => b.id === buId);
    if (!target) return;
    const newStatus = !target.isActive;

    const isConfirmed = await confirm({
      title: newStatus ? 'Aktifkan Kembali Legal Business Unit?' : 'Nonaktifkan Legal Business Unit?',
      message: newStatus
        ? `Business Unit "${target.name}" akan diaktifkan kembali. Cabang di bawahnya akan dapat beroperasi normal.`
        : `Apakah Anda yakin ingin menonaktifkan Business Unit "${target.name}"? Cabang yang terhubung ke Business Unit ini tidak akan dapat membuat transaksi baru.`,
      entityCode: target.code,
      entityName: target.name,
      variant: newStatus ? 'info' : 'warning',
      confirmLabel: newStatus ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal',
      consequences: newStatus
        ? ['Business unit dan seluruh cabangnya kembali aktif.']
        : [
            'Cabang di bawah unit bisnis ini tidak dapat membuat transaksi baru.',
            'Data histori pembukuan dan perpajakan tetap aman tersimpan.'
          ]
    });

    if (!isConfirmed) return;

    setBusinessUnits((prev) =>
      prev.map((b) => (b.id === buId ? { ...b, isActive: newStatus } : b))
    );

    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      client
        .from('business_units')
        .update({ is_active: newStatus })
        .eq('id', buId)
        .then(({ error }) => {
          if (error) console.warn('Supabase toggle BU status warning:', error.message);
        });
    }

    addToast(
      'Status Updated',
      `Business unit '${target.name}' is now ${newStatus ? 'Active' : 'Inactive'}.`,
      'info'
    );
  };

  // Branch Handlers
  const openAddBranchModal = () => {
    const activeBu = businessUnits.find((b) => b.isActive);
    if (!activeBu) {
      addToast(
        'Tidak Dapat Menambah Cabang',
        'Semua Legal Business Unit sedang nonaktif. Aktifkan minimal satu Business Unit terlebih dahulu.',
        'warning'
      );
      return;
    }
    const nextCode = generateSmartEntityCode('BR', tenant, branches.map((b) => b.code), allTenants);
    setEditingBranch(null);
    setBranchFormData({
      businessUnitId: activeBu.id,
      code: nextCode,
      name: '',
      city: '',
      address: '',
      phone: '',
      isHeadquarters: branches.length === 0,
      isActive: true
    });
    setIsBranchModalOpen(true);
  };

  const openEditBranchModal = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchFormData({
      businessUnitId: branch.businessUnitId,
      code: branch.code,
      name: branch.name,
      city: branch.city,
      address: branch.address,
      phone: branch.phone,
      isHeadquarters: branch.isHeadquarters,
      isActive: branch.isActive
    });
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchFormData.name.trim() || !branchFormData.code.trim()) {
      addToast('Validation Failed', 'Branch code and name are required.', 'warning');
      return;
    }

    const parentBu = businessUnits.find((b) => b.id === branchFormData.businessUnitId);
    if (!parentBu) {
      addToast('Validasi Gagal', 'Silakan pilih Parent Business Unit.', 'warning');
      return;
    }
    if (!parentBu.isActive) {
      addToast(
        'Business Unit Nonaktif',
        `Business Unit "${parentBu.name}" sedang nonaktif. Cabang harus ditautkan ke Business Unit yang aktif.`,
        'warning'
      );
      return;
    }

    if (branchFormData.isHeadquarters) {
      // Ensure only one headquarters
      setBranches((prev) =>
        prev.map((b) => ({
          ...b,
          isHeadquarters: editingBranch ? (b.id === editingBranch.id ? true : false) : false
        }))
      );
    }

    if (editingBranch) {
      setBranches((prev) =>
        prev.map((b) => (b.id === editingBranch.id ? { ...b, ...branchFormData } : b))
      );
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        client
          .from('branches')
          .update({
            business_unit_id: branchFormData.businessUnitId,
            code: branchFormData.code,
            name: branchFormData.name,
            city: branchFormData.city,
            address: branchFormData.address,
            phone: branchFormData.phone,
            is_headquarters: branchFormData.isHeadquarters,
            is_active: branchFormData.isActive
          })
          .eq('id', editingBranch.id)
          .then();
      }
      addToast('Branch Office Updated', `Branch office '${branchFormData.name}' updated successfully.`, 'success');
    } else {
      const newBranch: Branch = {
        id: `br_${Date.now()}`,
        ...branchFormData
      };
      setBranches((prev) => [...prev, newBranch]);
      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        client
          .from('branches')
          .insert({
            id: newBranch.id,
            tenant_id: currentUser.tenantId,
            business_unit_id: newBranch.businessUnitId,
            code: newBranch.code,
            name: newBranch.name,
            city: newBranch.city,
            address: newBranch.address,
            phone: newBranch.phone,
            is_headquarters: newBranch.isHeadquarters,
            is_active: newBranch.isActive
          })
          .then();
      }
      addToast('Branch Office Added', `Branch office '${newBranch.name}' added successfully.`, 'success');
    }
    setIsBranchModalOpen(false);
  };

  const toggleBranchStatus = async (branchId: string) => {
    const target = branches.find((br) => br.id === branchId);
    if (!target) return;
    const newStatus = !target.isActive;

    const isConfirmed = await confirm({
      title: newStatus ? 'Aktifkan Kembali Kantor Cabang?' : 'Nonaktifkan Kantor Cabang?',
      message: newStatus
        ? `Kantor cabang "${target.name}" akan diaktifkan kembali untuk operasional.`
        : `Apakah Anda yakin ingin menonaktifkan kantor cabang "${target.name}"? Staf tidak akan dapat memilih cabang ini untuk transaksi baru.`,
      entityCode: target.code,
      entityName: target.name,
      variant: newStatus ? 'info' : 'warning',
      confirmLabel: newStatus ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal',
      consequences: newStatus
        ? ['Cabang kembali aktif menerima order dan pengiriman.']
        : [
            'Cabang disembunyikan dari pilihan transaksi operasional baru.',
            'Data transaksi historis cabang tetap tersimpan utuh.'
          ]
    });

    if (!isConfirmed) return;

    setBranches((prev) =>
      prev.map((br) => (br.id === branchId ? { ...br, isActive: newStatus } : br))
    );

    if (isSupabaseConfigured) {
      const client = getSupabaseClient();
      client
        .from('branches')
        .update({ is_active: newStatus })
        .eq('id', branchId)
        .then(({ error }) => {
          if (error) console.warn('Supabase toggle branch status warning:', error.message);
        });
    }

    addToast(
      'Status Updated',
      `Branch '${target.name}' is now ${newStatus ? 'Active' : 'Inactive'}.`,
      'info'
    );
  };

  const handleDeleteBu = async () => {
    if (!deletingBu) return;
    const linkedBranches = branches.filter((br) => br.businessUnitId === deletingBu.id);
    if (linkedBranches.length > 0) {
      addToast(
        'Tidak Dapat Menghapus Business Unit',
        `Business Unit '${deletingBu.name}' memiliki ${linkedBranches.length} kantor cabang terhubung. Pindahkan atau hapus kantor cabang terlebih dahulu.`,
        'error'
      );
      setDeletingBu(null);
      return;
    }

    setIsDeleting(true);
    try {
      setBusinessUnits((prev) => prev.filter((b) => b.id !== deletingBu.id));

      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        const { error } = await client.from('business_units').delete().eq('id', deletingBu.id);
        if (error) {
          console.error('Supabase delete BU error:', error);
          addToast('Peringatan Database', `Gagal menghapus dari server: ${error.message}`, 'warning');
        } else {
          addToast('Business Unit Dihapus', `Business Unit '${deletingBu.name}' berhasil dihapus.`, 'success');
        }
      } else {
        addToast('Business Unit Dihapus', `Business Unit '${deletingBu.name}' berhasil dihapus.`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem saat menghapus.', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingBu(null);
    }
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranch) return;

    if (branches.length <= 1) {
      addToast(
        'Tidak Dapat Menghapus Cabang',
        'Perusahaan harus memiliki minimal 1 kantor cabang operasional.',
        'warning'
      );
      setDeletingBranch(null);
      return;
    }

    if (deletingBranch.isHeadquarters) {
      addToast(
        'Tidak Dapat Menghapus Headquarters',
        'Cabang ini berstatus Kantor Pusat (Headquarters). Tetapkan kantor cabang lain sebagai Kantor Pusat terlebih dahulu.',
        'warning'
      );
      setDeletingBranch(null);
      return;
    }

    setIsDeleting(true);
    try {
      setBranches((prev) => prev.filter((br) => br.id !== deletingBranch.id));

      if (isSupabaseConfigured) {
        const client = getSupabaseClient();
        const { error } = await client.from('branches').delete().eq('id', deletingBranch.id);
        if (error) {
          console.error('Supabase delete branch error:', error);
          addToast('Peringatan Database', `Gagal menghapus dari server: ${error.message}`, 'warning');
        } else {
          addToast('Kantor Cabang Dihapus', `Kantor cabang '${deletingBranch.name}' berhasil dihapus.`, 'success');
        }
      } else {
        addToast('Kantor Cabang Dihapus', `Kantor cabang '${deletingBranch.name}' berhasil dihapus.`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem saat menghapus.', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingBranch(null);
    }
  };

  // Filtered lists
  const filteredBUs = businessUnits.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.taxId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBranches = branches.filter((br) => {
    const matchBu = selectedBuFilter === 'ALL' || br.businessUnitId === selectedBuFilter;
    const matchSearch =
      br.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      br.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      br.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      br.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBu && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* RBAC Notice for Read-Only Members */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-xs shadow-2xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Read-Only Mode: Legal entity settings and branch offices can only be modified by Super Admin, Owner, or Tenant Admin.
          </span>
        </div>
      )}


      {/* Main Tabbed Container */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-2xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-[#DCE5EC] px-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFDFE]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('business_units')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'business_units'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Legal Business Units</span>
              <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                {businessUnits.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('branches')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'branches'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Branch Offices</span>
              <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                {branches.length}
              </span>
            </button>
          </div>

          {/* Action Button */}
          {canEdit && (
            <div className="pb-3 self-end sm:self-auto">
              {activeTab === 'business_units' ? (
                <button
                  onClick={openAddBuModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Business Unit</span>
                </button>
              ) : (
                <button
                  onClick={openAddBranchModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Branch Office</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-[#DCE5EC] bg-white flex flex-col sm:flex-row gap-3 justify-between items-center text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder={
                activeTab === 'business_units'
                  ? 'Search entity name, BU code, tax ID...'
                  : 'Search branch name, code, city, address...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:bg-white"
            />
          </div>

          {activeTab === 'branches' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[#475569] font-medium shrink-0">Filter Business Unit:</span>
              <select
                value={selectedBuFilter}
                onChange={(e) => setSelectedBuFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              >
                <option value="ALL">All Business Units</option>
                {businessUnits.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name} {!b.isActive ? ' (Nonaktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* TAB CONTENT: BUSINESS UNITS */}
        {activeTab === 'business_units' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-3 px-4">BU Code</th>
                  <th className="py-3 px-4">Legal Entity Name</th>
                  <th className="py-3 px-4">Tax ID (NPWP)</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4">Branches</th>
                  <th className="py-3 px-4">Status</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {filteredBUs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                      No business units found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBUs.map((bu) => {
                    const branchCount = branches.filter((br) => br.businessUnitId === bu.id).length;
                    return (
                      <tr key={bu.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#086288]">{bu.code}</td>
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">{bu.name}</td>
                        <td className="py-3 px-4 font-mono text-[#475569]">{bu.taxId || '-'}</td>
                        <td className="py-3 px-4">{bu.currency}</td>
                        <td className="py-3 px-4">
                          <span className="bg-[#DCEEF5] text-[#086288] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            {branchCount} Branches
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {bu.isActive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => openEditBuModal(bu)}
                                className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#DCEEF5]/50 rounded cursor-pointer"
                                title="Edit Business Unit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleBuStatus(bu.id)}
                                className="text-[11px] font-medium text-slate-500 hover:text-[#086288] cursor-pointer"
                              >
                                {bu.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => setDeletingBu(bu)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                title="Hapus Business Unit"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB CONTENT: BRANCHES */}
        {activeTab === 'branches' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-3 px-4">Branch Code</th>
                  <th className="py-3 px-4">Branch Office Name</th>
                  <th className="py-3 px-4">Parent Business Unit</th>
                  <th className="py-3 px-4">City / Region</th>
                  <th className="py-3 px-4">Branch Type</th>
                  <th className="py-3 px-4">Phone Contact</th>
                  <th className="py-3 px-4">Status</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#94A3B8]">
                      No branch offices found matching search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((branch) => {
                    const parentBu = businessUnits.find((b) => b.id === branch.businessUnitId);
                    return (
                      <tr key={branch.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#086288]">{branch.code}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0F172A]">{branch.name}</div>
                          <div className="text-[11px] text-[#475569] truncate max-w-xs flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#94A3B8] shrink-0" />
                            <span>{branch.address}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#475569]">
                          {parentBu ? `${parentBu.code} - ${parentBu.name}` : '-'}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A]">{branch.city}</td>
                        <td className="py-3 px-4">
                          {branch.isHeadquarters ? (
                            <span className="bg-[#086288] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                              Headquarters (HQ)
                            </span>
                          ) : (
                            <span className="bg-[#F1F5F9] text-[#475569] text-[10px] font-medium px-2 py-0.5 rounded-full">
                              Regional Branch
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#475569]">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#94A3B8]" />
                            {branch.phone || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {branch.isActive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => openEditBranchModal(branch)}
                                className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#DCEEF5]/50 rounded cursor-pointer"
                                title="Edit Branch Office"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleBranchStatus(branch.id)}
                                className="text-[11px] font-medium text-slate-500 hover:text-[#086288] cursor-pointer"
                              >
                                {branch.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => setDeletingBranch(branch)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                title="Hapus Kantor Cabang"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD/EDIT BUSINESS UNIT */}
      {isBuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-[#DCE5EC] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5EC] bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingBu ? 'Edit Business Unit' : 'Add New Business Unit'}
                </h3>
              </div>
              <button
                onClick={() => setIsBuModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBu} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Business Unit Code</label>
                <input
                  type="text"
                  required
                  value={buFormData.code}
                  onChange={(e) => setBuFormData({ ...buFormData, code: e.target.value.toUpperCase() })}
                  placeholder={`e.g. BU${getTenant2DigitCode(tenant, allTenants)}001`}
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Legal Entity Name</label>
                <input
                  type="text"
                  required
                  value={buFormData.name}
                  onChange={(e) => setBuFormData({ ...buFormData, name: e.target.value })}
                  placeholder="e.g. PT Zyvora Logistik Prima"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Tax ID (NPWP)</label>
                <input
                  type="text"
                  value={buFormData.taxId}
                  onChange={(e) => setBuFormData({ ...buFormData, taxId: e.target.value })}
                  placeholder="01.234.567.8-012.000"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Accounting Currency</label>
                  <select
                    value={buFormData.currency}
                    onChange={(e) => setBuFormData({ ...buFormData, currency: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  >
                    <option value="IDR">IDR - Rupiah</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Operational Status</label>
                  <select
                    value={buFormData.isActive ? 'true' : 'false'}
                    onChange={(e) => setBuFormData({ ...buFormData, isActive: e.target.value === 'true' })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-[#DCE5EC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBuModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE5EC] rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Save Business Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT BRANCH */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-[#DCE5EC] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5EC] bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingBranch ? 'Edit Branch Office' : 'Add New Branch Office'}
                </h3>
              </div>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Parent Business Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={branchFormData.businessUnitId}
                    onChange={(e) => setBranchFormData({ ...branchFormData, businessUnitId: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                    required
                  >
                    <option value="">-- Pilih Business Unit Aktif --</option>
                    {businessUnits
                      .filter((b) => b.isActive || b.id === branchFormData.businessUnitId)
                      .map((b) => (
                        <option key={b.id} value={b.id} disabled={!b.isActive && b.id !== branchFormData.businessUnitId}>
                          {b.code} - {b.name} {!b.isActive ? ' (Nonaktif)' : ''}
                        </option>
                      ))}
                  </select>
                  {businessUnits.find((b) => b.id === branchFormData.businessUnitId && !b.isActive) && (
                    <p className="text-[11px] text-amber-600 mt-1 font-medium">
                      ⚠️ Business Unit ini berstatus nonaktif. Pindahkan cabang ke Business Unit yang aktif.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Branch Code</label>
                  <input
                    type="text"
                    required
                    value={branchFormData.code}
                    onChange={(e) => setBranchFormData({ ...branchFormData, code: e.target.value.toUpperCase() })}
                    placeholder={`e.g. BR${getTenant2DigitCode(tenant, allTenants)}001`}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Branch Office Name</label>
                <input
                  type="text"
                  required
                  value={branchFormData.name}
                  onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                  placeholder="e.g. Semarang Branch Office"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">City / Jurisdiction</label>
                  <input
                    type="text"
                    required
                    value={branchFormData.city}
                    onChange={(e) => setBranchFormData({ ...branchFormData, city: e.target.value })}
                    placeholder="Semarang"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Branch Phone Contact</label>
                  <input
                    type="tel"
                    value={branchFormData.phone}
                    onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value })}
                    placeholder="+62 24 8812 0000"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Full Operational Address</label>
                <textarea
                  rows={2}
                  value={branchFormData.address}
                  onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                  placeholder="Jl. Pemuda No. 120, Sekayu, Semarang Tengah"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="p-3 bg-[#FAFDFE] border border-[#DCE5EC] rounded-lg space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={branchFormData.isHeadquarters}
                    onChange={(e) => setBranchFormData({ ...branchFormData, isHeadquarters: e.target.checked })}
                    className="rounded text-[#086288] focus:ring-[#086288]"
                  />
                  <span className="font-semibold text-[#0F172A]">Designate as Headquarters (HQ)</span>
                </label>
                <p className="text-[11px] text-[#475569] pl-6">
                  Only one branch office per tenant can be designated as the primary Headquarters.
                </p>
              </div>

              <div className="pt-3 border-t border-[#DCE5EC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE5EC] rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Save Branch Office
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE BUSINESS UNIT CONFIRMATION */}
      {deletingBu && (() => {
        const linkedBranches = branches.filter((br) => br.businessUnitId === deletingBu.id);
        const hasLinkedBranches = linkedBranches.length > 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-start gap-3 bg-slate-50/50">
                <div className={`p-2.5 rounded-full ${hasLinkedBranches ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'} shrink-0`}>
                  {hasLinkedBranches ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    {hasLinkedBranches ? 'Tidak Dapat Menghapus Unit Bisnis' : 'Hapus Legal Business Unit?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {hasLinkedBranches
                      ? 'Terdapat kantor cabang yang masih terikat'
                      : 'Konfirmasi penghapusan data unit bisnis'}
                  </p>
                </div>
                <button
                  onClick={() => setDeletingBu(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs text-slate-600">
                {hasLinkedBranches ? (
                  <div className="space-y-3">
                    <p>
                      Business Unit <span className="font-semibold text-slate-900">{deletingBu.name}</span> ({deletingBu.code}) masih memiliki <span className="font-bold text-amber-700">{linkedBranches.length} kantor cabang</span> aktif terhubung:
                    </p>
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 space-y-1.5 max-h-36 overflow-y-auto">
                      {linkedBranches.map((br) => (
                        <div key={br.id} className="flex items-center justify-between text-[11px] font-medium text-amber-900">
                          <span>{br.name}</span>
                          <span className="font-mono text-amber-700">{br.code}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Silakan hapus atau pindahkan semua kantor cabang di atas ke Business Unit lain terlebih dahulu sebelum menghapus unit bisnis ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>
                      Apakah Anda yakin ingin menghapus Business Unit:
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-900 text-sm">{deletingBu.name}</div>
                      <div className="text-slate-500 font-mono text-[11px] mt-0.5">Kode: {deletingBu.code} • NPWP: {deletingBu.taxId || '-'}</div>
                    </div>
                    <p className="text-rose-600 text-[11px] font-medium pt-1">
                      ⚠️ Tindakan ini tidak dapat dibatalkan. Data business unit akan dihapus secara permanen.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                {hasLinkedBranches ? (
                  <button
                    type="button"
                    onClick={() => setDeletingBu(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs cursor-pointer"
                  >
                    Tutup
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setDeletingBu(null)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDeleteBu}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Menghapus...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Sekarang
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: DELETE BRANCH CONFIRMATION */}
      {deletingBranch && (() => {
        const isSoleBranch = branches.length <= 1;
        const isHq = deletingBranch.isHeadquarters;
        const cannotDelete = isSoleBranch || isHq;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-start gap-3 bg-slate-50/50">
                <div className={`p-2.5 rounded-full ${cannotDelete ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'} shrink-0`}>
                  {cannotDelete ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    {cannotDelete ? 'Tidak Dapat Menghapus Cabang' : 'Hapus Kantor Cabang?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cannotDelete ? 'Ketentuan integritas organisasi' : 'Konfirmasi penghapusan data kantor cabang'}
                  </p>
                </div>
                <button
                  onClick={() => setDeletingBranch(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs text-slate-600">
                {isSoleBranch ? (
                  <div className="space-y-2">
                    <p>
                      Kantor cabang <span className="font-semibold text-slate-900">{deletingBranch.name}</span> adalah satu-satunya kantor cabang yang terdaftar.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-[11px]">
                      Sistem ERP membutuhkan minimal satu kantor cabang aktif untuk operasional transaksi, inventory, dan penugasan karyawan.
                    </div>
                  </div>
                ) : isHq ? (
                  <div className="space-y-2">
                    <p>
                      Kantor cabang <span className="font-semibold text-slate-900">{deletingBranch.name}</span> saat ini berstatus sebagai <span className="font-bold text-[#086288]">Headquarters (Kantor Pusat)</span>.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-[11px]">
                      Tetapkan kantor cabang lain sebagai Kantor Pusat (HQ) terlebih dahulu sebelum menghapus cabang ini.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>
                      Apakah Anda yakin ingin menghapus kantor cabang berikut:
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-900 text-sm">{deletingBranch.name}</div>
                      <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                        Kode: {deletingBranch.code} • Kota: {deletingBranch.city || '-'}
                      </div>
                      {deletingBranch.address && (
                        <div className="text-slate-500 text-[11px] mt-1 line-clamp-2">
                          {deletingBranch.address}
                        </div>
                      )}
                    </div>
                    <p className="text-rose-600 text-[11px] font-medium pt-1">
                      ⚠️ Tindakan ini tidak dapat dibatalkan. Data kantor cabang akan dihapus secara permanen.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                {cannotDelete ? (
                  <button
                    type="button"
                    onClick={() => setDeletingBranch(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs cursor-pointer"
                  >
                    Tutup
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setDeletingBranch(null)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDeleteBranch}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Menghapus...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Sekarang
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
