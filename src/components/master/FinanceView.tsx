import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Landmark,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  X,
  ShieldAlert,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  Receipt,
  Activity as ActivityIcon,
  Fuel,
  Car,
  Layers,
  FileText
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  FinancialAccount,
  BankAccount,
  PaymentMethod,
  ClaimExpenseCategory,
  ClaimExpenseActivity
} from '../../types/erp';
import { ClaimSettingsService } from '../../services/claimSettingsService';

export const FinanceView: React.FC = () => {
  const {
    accounts,
    setAccounts,
    bankAccounts,
    setBankAccounts,
    paymentMethods,
    setPaymentMethods,
    businessUnits,
    marketProfile,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast
  } = useErp();
  const { confirm: systemConfirm } = useConfirm();

  const businessLines = useMemo(() => marketProfile?.businessLines || [], [marketProfile]);

  const canEdit =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'coa' | 'banks' | 'methods' | 'claim_settings'>('coa');
  const [claimSubTab, setClaimSubTab] = useState<'categories' | 'activities'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Claim Settings states
  const [claimCategories, setClaimCategories] = useState<ClaimExpenseCategory[]>([]);
  const [claimActivities, setClaimActivities] = useState<ClaimExpenseActivity[]>([]);
  const [isClaimSettingsLoading, setIsClaimSettingsLoading] = useState(false);

  // Modals for Claim Settings
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClaimExpenseCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    code: '',
    name: '',
    isVehicleActivity: false,
    maxLimit: 1000000,
    isReceiptRequired: true,
    isActive: true
  });

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ClaimExpenseActivity | null>(null);
  const [activityFormData, setActivityFormData] = useState({
    code: '',
    name: '',
    businessLineId: '' as string | undefined,
    description: '',
    isActive: true
  });

  const loadClaimSettings = async () => {
    setIsClaimSettingsLoading(true);
    try {
      const [cats, acts] = await Promise.all([
        ClaimSettingsService.getCategories(currentUser.tenantId),
        ClaimSettingsService.getActivities(currentUser.tenantId)
      ]);
      setClaimCategories(cats);
      setClaimActivities(acts);
    } catch (err) {
      console.warn('Failed to load claim settings:', err);
    } finally {
      setIsClaimSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadClaimSettings();
  }, [currentUser.tenantId]);

  // Modals
  const [isCoaModalOpen, setIsCoaModalOpen] = useState(false);
  const [editingCoa, setEditingCoa] = useState<FinancialAccount | null>(null);
  const [coaFormData, setCoaFormData] = useState({
    code: '',
    name: '',
    category: 'Kas & Bank' as FinancialAccount['category'],
    balance: 0,
    currency: 'IDR'
  });

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankFormData, setBankFormData] = useState({
    businessUnitId: businessUnits[0]?.id || '',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    currency: 'IDR',
    glAccountCode: '1002',
    balance: 0,
    isActive: true
  });

  // CoA Handlers
  const openAddCoaModal = () => {
    setEditingCoa(null);
    setCoaFormData({
      code: '',
      name: '',
      category: 'Kas & Bank',
      balance: 0,
      currency: 'IDR'
    });
    setIsCoaModalOpen(true);
  };

  const openEditCoaModal = (acc: FinancialAccount) => {
    setEditingCoa(acc);
    setCoaFormData({
      code: acc.code,
      name: acc.name,
      category: acc.category,
      balance: acc.balance,
      currency: acc.currency
    });
    setIsCoaModalOpen(true);
  };

  const handleSaveCoa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coaFormData.code.trim() || !coaFormData.name.trim()) {
      addToast('Validation Failed', 'Account code and name are required.', 'warning');
      return;
    }

    if (editingCoa) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === editingCoa.id ? { ...a, ...coaFormData } : a))
      );
      addToast('Account Updated', `Chart of account '${coaFormData.name}' updated successfully.`, 'success');
    } else {
      const newAcc: FinancialAccount = {
        id: `acc_${Date.now()}`,
        tenantId: currentUser.tenantId,
        ...coaFormData
      };
      setAccounts((prev) => [...prev, newAcc]);
      addToast('Account Added', `New account #${newAcc.code} [${newAcc.name}] added successfully.`, 'success');
    }
    setIsCoaModalOpen(false);
  };

  // Bank Account Handlers
  const openAddBankModal = () => {
    setEditingBank(null);
    setBankFormData({
      businessUnitId: businessUnits[0]?.id || '',
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      currency: 'IDR',
      glAccountCode: '1002',
      balance: 0,
      isActive: true
    });
    setIsBankModalOpen(true);
  };

  const openEditBankModal = (bank: BankAccount) => {
    setEditingBank(bank);
    setBankFormData({
      businessUnitId: bank.businessUnitId,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountHolderName: bank.accountHolderName,
      currency: bank.currency,
      glAccountCode: bank.glAccountCode,
      balance: bank.balance,
      isActive: bank.isActive
    });
    setIsBankModalOpen(true);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormData.bankName.trim() || !bankFormData.accountNumber.trim()) {
      addToast('Validation Failed', 'Bank name and account number are required.', 'warning');
      return;
    }

    if (editingBank) {
      setBankAccounts((prev) =>
        prev.map((b) => (b.id === editingBank.id ? { ...b, ...bankFormData } : b))
      );
      addToast('Account Updated', `Bank account '${bankFormData.bankName}' updated successfully.`, 'success');
    } else {
      const newBank: BankAccount = {
        id: `bank_${Date.now()}`,
        tenantId: currentUser.tenantId,
        ...bankFormData
      };
      setBankAccounts((prev) => [...prev, newBank]);
      addToast('Account Added', `Bank account '${newBank.bankName}' registered successfully.`, 'success');
    }
    setIsBankModalOpen(false);
  };

  const toggleBankStatus = async (bank: BankAccount) => {
    const isActivating = !bank.isActive;
    const isConfirmed = await systemConfirm({
      title: isActivating ? 'Aktifkan Rekening Bank?' : 'Nonaktifkan Rekening Bank?',
      message: isActivating
        ? `Rekening "${bank.bankName} - ${bank.accountNumber}" akan kembali aktif untuk transaksi kas & bank.`
        : `Apakah Anda yakin ingin menonaktifkan rekening "${bank.bankName} - ${bank.accountNumber}"? Rekening tidak dapat dipilih pada transaksi baru.`,
      entityCode: bank.accountNumber,
      entityName: bank.bankName,
      variant: isActivating ? 'info' : 'warning',
      confirmLabel: isActivating ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal'
    });

    if (!isConfirmed) return;

    setBankAccounts((prev) =>
      prev.map((b) => (b.id === bank.id ? { ...b, isActive: isActivating } : b))
    );
    addToast('Status Updated', `Status rekening bank ${bank.bankName} diperbarui.`, 'info');
  };

  const togglePaymentMethodStatus = async (pm: PaymentMethod) => {
    const isActivating = !pm.isActive;
    const isConfirmed = await systemConfirm({
      title: isActivating ? 'Aktifkan Metode Pembayaran?' : 'Nonaktifkan Metode Pembayaran?',
      message: isActivating
        ? `Metode pembayaran "${pm.name}" akan kembali tersedia untuk pembayaran pelanggan.`
        : `Apakah Anda yakin ingin menonaktifkan metode pembayaran "${pm.name}"?`,
      entityCode: pm.code,
      entityName: pm.name,
      variant: isActivating ? 'info' : 'warning',
      confirmLabel: isActivating ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal'
    });

    if (!isConfirmed) return;

    setPaymentMethods((prev) =>
      prev.map((item) => (item.id === pm.id ? { ...item, isActive: isActivating } : item))
    );
    addToast('Status Updated', `Status metode pembayaran ${pm.name} diperbarui.`, 'info');
  };

  // Claim Category Handlers
  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCategoryFormData({
      code: '',
      name: '',
      isVehicleActivity: false,
      maxLimit: 1000000,
      isReceiptRequired: true,
      isActive: true
    });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: ClaimExpenseCategory) => {
    setEditingCategory(cat);
    setCategoryFormData({
      code: cat.code,
      name: cat.name,
      isVehicleActivity: cat.isVehicleActivity,
      maxLimit: cat.maxLimit,
      isReceiptRequired: cat.isReceiptRequired,
      isActive: cat.isActive
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.code.trim() || !categoryFormData.name.trim()) {
      addToast('Validation Failed', 'Expense category code and name are required.', 'warning');
      return;
    }
    try {
      await ClaimSettingsService.saveCategory(
        {
          ...(editingCategory ? { id: editingCategory.id } : {}),
          code: categoryFormData.code.toUpperCase().trim(),
          name: categoryFormData.name.trim(),
          isVehicleActivity: categoryFormData.isVehicleActivity,
          maxLimit: Number(categoryFormData.maxLimit) || 0,
          isReceiptRequired: categoryFormData.isReceiptRequired,
          isActive: categoryFormData.isActive
        },
        currentUser.tenantId
      );

      addToast(
        editingCategory ? 'Category Updated' : 'Category Added',
        `Expense category '${categoryFormData.name}' saved successfully.`,
        'success'
      );
      setIsCategoryModalOpen(false);
      loadClaimSettings();
    } catch {
      addToast('Save Failed', 'Error occurred while saving category.', 'error');
    }
  };

  const toggleCategoryStatus = async (cat: ClaimExpenseCategory) => {
    const isActivating = !cat.isActive;
    const isConfirmed = await systemConfirm({
      title: isActivating ? 'Aktifkan Kategori Klaim?' : 'Nonaktifkan Kategori Klaim?',
      message: isActivating
        ? `Kategori pengeluaran "${cat.name}" akan kembali tersedia untuk pengajuan kasbon/klaim.`
        : `Apakah Anda yakin ingin menonaktifkan kategori pengeluaran "${cat.name}"?`,
      entityCode: cat.code,
      entityName: cat.name,
      variant: isActivating ? 'info' : 'warning',
      confirmLabel: isActivating ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal'
    });

    if (!isConfirmed) return;

    try {
      await ClaimSettingsService.saveCategory(
        {
          ...cat,
          isActive: isActivating
        },
        currentUser.tenantId
      );
      addToast('Status Updated', `Status kategori ${cat.name} diperbarui.`, 'info');
      loadClaimSettings();
    } catch {
      addToast('Update Failed', 'Failed to update category status.', 'error');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    const isConfirmed = await systemConfirm({
      title: 'Hapus Kategori Klaim Pengeluaran?',
      message: `Apakah Anda yakin ingin menghapus kategori "${name}"? Kategori yang sudah dihapus tidak dapat dipulihkan.`,
      entityName: name,
      variant: 'danger',
      confirmLabel: 'Ya, Hapus Kategori',
      cancelLabel: 'Batal',
      consequences: [
        'Kategori akan dihapus dari konfigurasi master klaim.',
        'Pengajuan baru tidak dapat memilih kategori ini.'
      ]
    });

    if (!isConfirmed) return;

    try {
      await ClaimSettingsService.deleteCategory(id, currentUser.tenantId);
      addToast('Category Deleted', `Kategori '${name}' berhasil dihapus.`, 'info');
      loadClaimSettings();
    } catch {
      addToast('Delete Failed', 'Failed to delete expense category.', 'error');
    }
  };

  // Claim Activity Handlers
  const openAddActivityModal = () => {
    setEditingActivity(null);
    setActivityFormData({
      code: '',
      name: '',
      businessLineId: businessLines[0]?.id || undefined,
      description: '',
      isActive: true
    });
    setIsActivityModalOpen(true);
  };

  const openEditActivityModal = (act: ClaimExpenseActivity) => {
    setEditingActivity(act);
    setActivityFormData({
      code: act.code,
      name: act.name,
      businessLineId: act.businessLineId,
      description: act.description || '',
      isActive: act.isActive
    });
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityFormData.code.trim() || !activityFormData.name.trim()) {
      addToast('Validation Failed', 'Activity code and operational activity name are required.', 'warning');
      return;
    }
    try {
      await ClaimSettingsService.saveActivity(
        {
          ...(editingActivity ? { id: editingActivity.id } : {}),
          code: activityFormData.code.toUpperCase().trim(),
          name: activityFormData.name.trim(),
          businessLineId: activityFormData.businessLineId || undefined,
          description: activityFormData.description.trim() || undefined,
          isActive: activityFormData.isActive
        },
        currentUser.tenantId
      );

      addToast(
        editingActivity ? 'Activity Updated' : 'Activity Added',
        `Operational activity '${activityFormData.name}' saved successfully.`,
        'success'
      );
      setIsActivityModalOpen(false);
      loadClaimSettings();
    } catch {
      addToast('Save Failed', 'Error occurred while saving activity.', 'error');
    }
  };

  const toggleActivityStatus = async (act: ClaimExpenseActivity) => {
    const isActivating = !act.isActive;
    const isConfirmed = await systemConfirm({
      title: isActivating ? 'Aktifkan Aktivitas Operasional?' : 'Nonaktifkan Aktivitas Operasional?',
      message: isActivating
        ? `Aktivitas operasional "${act.name}" akan kembali tersedia untuk pengajuan pengeluaran.`
        : `Apakah Anda yakin ingin menonaktifkan aktivitas operasional "${act.name}"?`,
      entityCode: act.code,
      entityName: act.name,
      variant: isActivating ? 'info' : 'warning',
      confirmLabel: isActivating ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal'
    });

    if (!isConfirmed) return;

    try {
      await ClaimSettingsService.saveActivity(
        {
          ...act,
          isActive: isActivating
        },
        currentUser.tenantId
      );
      addToast('Status Updated', `Status aktivitas ${act.name} diperbarui.`, 'info');
      loadClaimSettings();
    } catch {
      addToast('Update Failed', 'Failed to update activity status.', 'error');
    }
  };

  const handleDeleteActivity = async (id: string, name: string) => {
    const isConfirmed = await systemConfirm({
      title: 'Hapus Aktivitas Operasional?',
      message: `Apakah Anda yakin ingin menghapus aktivitas operasional "${name}"?`,
      entityName: name,
      variant: 'danger',
      confirmLabel: 'Ya, Hapus Aktivitas',
      cancelLabel: 'Batal',
      consequences: [
        'Aktivitas operasional akan dihapus dari daftar opsi klaim lapangan.',
        'Data histori klaim sebelumnya tetap tersimpan.'
      ]
    });

    if (!isConfirmed) return;

    try {
      await ClaimSettingsService.deleteActivity(id, currentUser.tenantId);
      addToast('Activity Deleted', `Aktivitas '${name}' berhasil dihapus.`, 'info');
      loadClaimSettings();
    } catch {
      addToast('Delete Failed', 'Failed to delete operational activity.', 'error');
    }
  };

  // Filtered lists
  const filteredAccounts = accounts.filter((a) => {
    const matchCategory = selectedCategoryFilter === 'ALL' || a.category === selectedCategoryFilter;
    const matchSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const filteredClaimCategories = claimCategories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredClaimActivities = claimActivities.filter((a) => {
    const bLine = businessLines.find((b) => b.id === a.businessLineId);
    const bLineName = bLine?.name || '';
    return (
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      bLineName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalBankBalance = bankAccounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);
  const totalArBalance = accounts
    .filter((a) => a.category === 'Piutang Usaha')
    .reduce((acc, curr) => acc + (curr.balance || 0), 0);
  const totalApBalance = accounts
    .filter((a) => a.category === 'Utang Usaha')
    .reduce((acc, curr) => acc + (curr.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* RBAC Notice */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-xs shadow-2xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Read-Only Mode: Chart of Accounts (CoA), holding bank accounts, and payment methods can only be modified by Super Admin, Owner, or Tenant Admin.
          </span>
        </div>
      )}


      {/* Main Tabbed Container */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-2xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-[#DCE5EC] px-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFDFE]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('coa')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'coa'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Chart of Accounts (CoA)</span>
              <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                {accounts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('banks')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'banks'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>Bank & Cash Accounts</span>
              <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                {bankAccounts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('methods')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'methods'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Payment Methods</span>
              <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                {paymentMethods.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('claim_settings')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'claim_settings'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Claim Expense Settings</span>
              <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                {claimCategories.length + claimActivities.length}
              </span>
            </button>
          </div>

          {/* Action Button */}
          {canEdit && (
            <div className="pb-3 self-end sm:self-auto">
              {activeTab === 'coa' && (
                <button
                  onClick={openAddCoaModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add CoA Account</span>
                </button>
              )}

              {activeTab === 'banks' && (
                <button
                  onClick={openAddBankModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bank Account</span>
                </button>
              )}

              {activeTab === 'claim_settings' && (
                <div>
                  {claimSubTab === 'categories' ? (
                    <button
                      onClick={openAddCategoryModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Expense Category</span>
                    </button>
                  ) : (
                    <button
                      onClick={openAddActivityModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Operational Activity</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        {activeTab === 'coa' && (
          <div className="p-4 border-b border-[#DCE5EC] bg-white flex flex-col sm:flex-row gap-3 justify-between items-center text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search account code, name, classification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[#475569] font-medium shrink-0">Account Group:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              >
                <option value="ALL">All Classifications</option>
                <option value="Kas & Bank">Kas & Bank</option>
                <option value="Piutang Usaha">Piutang Usaha</option>
                <option value="Persediaan">Persediaan</option>
                <option value="Utang Usaha">Utang Usaha</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 1: COA */}
        {activeTab === 'coa' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#086288]">{acc.code}</td>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{acc.name}</td>
                    <td className="py-3 px-4">
                      <span className="bg-[#F1F5F9] text-[#475569] font-medium px-2 py-0.5 rounded-full text-[11px]">
                        {acc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#0F172A]">{acc.currency}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                      Rp {acc.balance.toLocaleString('id-ID')}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditCoaModal(acc)}
                          className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#DCEEF5]/50 rounded cursor-pointer"
                          title="Edit Account"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: BANK ACCOUNTS */}
        {activeTab === 'banks' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {bankAccounts.map((bank) => {
              const bu = businessUnits.find((b) => b.id === bank.businessUnitId);
              return (
                <div
                  key={bank.id}
                  className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-2xs hover:border-[#086288] transition-all relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] text-[#086288] flex items-center justify-center font-bold">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0F172A] leading-tight">{bank.bankName}</h4>
                        <span className="text-[10px] text-[#475569]">{bu ? bu.name : 'Holding'}</span>
                      </div>
                    </div>
                    {bank.isActive ? (
                      <span className="text-emerald-700 bg-emerald-50 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-slate-500 bg-slate-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="bg-[#FAFDFE] p-3 rounded-lg border border-[#DCE5EC] space-y-1 mb-3">
                    <div className="text-[10px] text-[#475569]">Checking / Savings Account Number</div>
                    <div className="font-mono font-bold text-sm text-[#086288] tracking-wider">
                      {bank.accountNumber}
                    </div>
                    <div className="text-[11px] font-medium text-[#0F172A] truncate">
                      a.n. {bank.accountHolderName}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#475569]">Available Balance:</span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      Rp {bank.balance.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {canEdit && (
                    <div className="pt-3 mt-3 border-t border-[#DCE5EC] flex justify-between items-center text-[11px]">
                      <button
                        onClick={() => openEditBankModal(bank)}
                        className="text-[#086288] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Account
                      </button>
                      <button
                        onClick={() => toggleBankStatus(bank)}
                        className="text-slate-500 hover:text-[#086288] cursor-pointer"
                      >
                        {bank.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: PAYMENT METHODS */}
        {activeTab === 'methods' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-3 px-4">Method Code</th>
                  <th className="py-3 px-4">Payment Channel Name</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4">Designated Bank Account</th>
                  <th className="py-3 px-4">Status</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {paymentMethods.map((pm) => {
                  const linkedBank = bankAccounts.find((b) => b.id === pm.bankAccountId);
                  return (
                    <tr key={pm.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#086288]">{pm.code}</td>
                      <td className="py-3 px-4 font-semibold text-[#0F172A]">{pm.name}</td>
                      <td className="py-3 px-4">
                        <span className="bg-[#F1F5F9] text-[#475569] font-medium px-2 py-0.5 rounded-full text-[11px] capitalize">
                          {pm.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#475569]">
                        {linkedBank ? `${linkedBank.bankName} - ${linkedBank.accountNumber}` : 'Cash Drawer / Cashier'}
                      </td>
                      <td className="py-3 px-4">
                        {pm.isActive ? (
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
                          <button
                            onClick={() => togglePaymentMethodStatus(pm)}
                            className="text-[11px] font-medium text-[#086288] hover:underline cursor-pointer"
                          >
                            {pm.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: SETTING CLAIM EXPENSE */}
        {activeTab === 'claim_settings' && (
          <div>
            {/* Sub-tab Pill Navigation + Search Bar */}
            <div className="p-4 border-b border-[#DCE5EC] bg-white flex flex-col sm:flex-row gap-3 justify-between items-center text-xs">
              {/* Sub-tab pills */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-lg w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setClaimSubTab('categories')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    claimSubTab === 'categories'
                      ? 'bg-white text-[#086288] shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Expense Categories</span>
                  <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                    {claimCategories.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setClaimSubTab('activities')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    claimSubTab === 'activities'
                      ? 'bg-white text-[#086288] shadow-xs'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <ActivityIcon className="w-3.5 h-3.5" />
                  <span>Operational Activities</span>
                  <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                    {claimActivities.length}
                  </span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder={
                    claimSubTab === 'categories'
                      ? 'Search code, category name...'
                      : 'Search code, activity, business line...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:bg-white"
                />
              </div>
            </div>

            {/* Sub-tab 1: Categories Table */}
            {claimSubTab === 'categories' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                      <th className="py-3 px-4">Category Code</th>
                      <th className="py-3 px-4">Expense Category Name</th>
                      <th className="py-3 px-4">Fleet Activity Type</th>
                      <th className="py-3 px-4 text-right">Maximum Claim Limit</th>
                      <th className="py-3 px-4">Receipt Required</th>
                      <th className="py-3 px-4">Status</th>
                      {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE5EC]">
                    {isClaimSettingsLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[#94A3B8]">
                          Loading expense categories...
                        </td>
                      </tr>
                    ) : filteredClaimCategories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[#94A3B8]">
                          No expense categories registered yet.
                        </td>
                      </tr>
                    ) : (
                      filteredClaimCategories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#086288]">{cat.code}</td>
                          <td className="py-3 px-4 font-semibold text-[#0F172A]">{cat.name}</td>
                          <td className="py-3 px-4">
                            {cat.isVehicleActivity ? (
                              <span className="inline-flex items-center gap-1 text-[#086288] bg-[#EFF7FA] border border-[#B7DDEA] px-2 py-0.5 rounded-md font-semibold text-[11px]">
                                <Fuel className="w-3 h-3 text-[#086288]" /> Fleet & Fuel
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded-md text-[11px]">
                                Non-Fleet
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                            {cat.maxLimit > 0 ? `Rp ${cat.maxLimit.toLocaleString('id-ID')}` : 'No Limit'}
                          </td>
                          <td className="py-3 px-4">
                            {cat.isReceiptRequired ? (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                                Receipt Required
                              </span>
                            ) : (
                              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                Optional
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {cat.isActive ? (
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
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditCategoryModal(cat)}
                                  className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#DCEEF5]/50 rounded cursor-pointer"
                                  title="Edit Category"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleCategoryStatus(cat)}
                                  className="text-[11px] font-medium text-[#086288] hover:underline px-1 cursor-pointer"
                                >
                                  {cat.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer ml-1"
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sub-tab 2: Activities Table */}
            {claimSubTab === 'activities' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                      <th className="py-3 px-4">Activity Code</th>
                      <th className="py-3 px-4">Operational Activity Name</th>
                      <th className="py-3 px-4">Associated Business Line</th>
                      <th className="py-3 px-4">Description & Purpose</th>
                      <th className="py-3 px-4">Status</th>
                      {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE5EC]">
                    {isClaimSettingsLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-[#94A3B8]">
                          Loading operational activities...
                        </td>
                      </tr>
                    ) : filteredClaimActivities.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-[#94A3B8]">
                          No operational activities registered yet.
                        </td>
                      </tr>
                    ) : (
                      filteredClaimActivities.map((act) => {
                        const linkedLob = businessLines.find((b) => b.id === act.businessLineId);
                        return (
                          <tr key={act.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-[#086288]">{act.code}</td>
                            <td className="py-3 px-4 font-semibold text-[#0F172A]">{act.name}</td>
                            <td className="py-3 px-4">
                              {linkedLob ? (
                                <span className="bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-medium px-2 py-0.5 rounded-md text-[11px]">
                                  {linkedLob.name}
                                </span>
                              ) : (
                                <span className="bg-[#F1F5F9] text-[#475569] font-medium px-2 py-0.5 rounded-md text-[11px]">
                                  All Business Lines (Holding)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[#475569] max-w-xs truncate">
                              {act.description || '-'}
                            </td>
                            <td className="py-3 px-4">
                              {act.isActive ? (
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
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditActivityModal(act)}
                                    className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#DCEEF5]/50 rounded cursor-pointer"
                                    title="Edit Activity"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleActivityStatus(act)}
                                    className="text-[11px] font-medium text-[#086288] hover:underline px-1 cursor-pointer"
                                  >
                                    {act.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteActivity(act.id, act.name)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer ml-1"
                                    title="Delete Activity"
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
        )}
      </div>

      {/* MODAL: ADD / EDIT COA */}
      {isCoaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-[#DCE5EC] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5EC] bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingCoa ? 'Edit Chart of Account' : 'Add New CoA Account'}
                </h3>
              </div>
              <button
                onClick={() => setIsCoaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoa} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Account Code (CoA)</label>
                  <input
                    type="text"
                    required
                    value={coaFormData.code}
                    onChange={(e) => setCoaFormData({ ...coaFormData, code: e.target.value })}
                    placeholder="e.g. 1004"
                    className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Account Classification</label>
                  <select
                    value={coaFormData.category}
                    onChange={(e) => setCoaFormData({ ...coaFormData, category: e.target.value as FinancialAccount['category'] })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  >
                    <option value="Kas & Bank">Cash & Bank (Kas & Bank)</option>
                    <option value="Piutang Usaha">Accounts Receivable (Piutang Usaha)</option>
                    <option value="Persediaan">Inventory (Persediaan)</option>
                    <option value="Aset Tetap">Fixed Assets (Aset Tetap)</option>
                    <option value="Utang Usaha">Accounts Payable (Utang Usaha)</option>
                    <option value="Modal">Equity / Capital (Modal)</option>
                    <option value="Pendapatan">Revenue (Pendapatan)</option>
                    <option value="Beban Operasional">Operating Expense (Beban Operasional)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={coaFormData.name}
                  onChange={(e) => setCoaFormData({ ...coaFormData, name: e.target.value })}
                  placeholder="e.g. Operating Checking Account"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Initial Book Balance (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={coaFormData.balance}
                    onChange={(e) => setCoaFormData({ ...coaFormData, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Currency</label>
                  <input
                    type="text"
                    disabled
                    value={coaFormData.currency}
                    className="w-full bg-slate-100 border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#DCE5EC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCoaModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE5EC] rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BANK ACCOUNT */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-[#DCE5EC] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5EC] bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingBank ? 'Edit Bank Account' : 'Add New Bank Account'}
                </h3>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBank} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Owning Business Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bankFormData.businessUnitId}
                    onChange={(e) => setBankFormData({ ...bankFormData, businessUnitId: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                    required
                  >
                    <option value="">-- Pilih Business Unit Aktif --</option>
                    {businessUnits
                      .filter((bu) => bu.isActive || bu.id === bankFormData.businessUnitId)
                      .map((bu) => (
                        <option key={bu.id} value={bu.id} disabled={!bu.isActive && bu.id !== bankFormData.businessUnitId}>
                          {bu.code} - {bu.name} {!bu.isActive ? ' (Nonaktif)' : ''}
                        </option>
                      ))}
                  </select>
                  {businessUnits.find((bu) => bu.id === bankFormData.businessUnitId && !bu.isActive) && (
                    <p className="text-[11px] text-amber-600 mt-1 font-medium">
                      ⚠️ Business Unit ini berstatus nonaktif.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Official Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankFormData.bankName}
                    onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                    placeholder="e.g. PT Bank Central Asia Tbk"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={bankFormData.accountNumber}
                    onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                    placeholder="802-991-3401"
                    className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={bankFormData.accountHolderName}
                    onChange={(e) => setBankFormData({ ...bankFormData, accountHolderName: e.target.value })}
                    placeholder="PT Zyvora Distribusi Nusantara"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Initial Book Balance (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={bankFormData.balance}
                    onChange={(e) => setBankFormData({ ...bankFormData, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">GL / CoA Account Code</label>
                  <input
                    type="text"
                    value={bankFormData.glAccountCode}
                    onChange={(e) => setBankFormData({ ...bankFormData, glAccountCode: e.target.value })}
                    placeholder="1002"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#DCE5EC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE5EC] rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CLAIM CATEGORY */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-[#DCE5EC] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5EC] bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingCategory ? 'Edit Expense Category' : 'Add New Expense Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Category Code</label>
                  <input
                    type="text"
                    required
                    value={categoryFormData.code}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value })}
                    placeholder="e.g. EXP-FUEL"
                    className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Maximum Claim Limit (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={categoryFormData.maxLimit}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, maxLimit: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 750000"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                  <span className="text-[10px] text-[#475569]">Enter 0 for no claim limit</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Expense Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="e.g. Vehicle Fuel & Fleet Operations"
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="p-3.5 bg-[#FAFDFE] rounded-lg border border-[#DCE5EC] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryFormData.isVehicleActivity}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, isVehicleActivity: e.target.checked })}
                    className="rounded border-[#DCE5EC] text-[#086288] focus:ring-[#086288]"
                  />
                  <div>
                    <span className="font-semibold text-[#0F172A]">Fleet & Fuel Operation Related</span>
                    <p className="text-[10px] text-[#475569]">
                      If checked, claim submission will require license plate, odometer reading, and fuel volume.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-[#EEF4F8]">
                  <input
                    type="checkbox"
                    checked={categoryFormData.isReceiptRequired}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, isReceiptRequired: e.target.checked })}
                    className="rounded border-[#DCE5EC] text-[#086288] focus:ring-[#086288]"
                  />
                  <div>
                    <span className="font-semibold text-[#0F172A]">Physical Receipt / Invoice Required</span>
                    <p className="text-[10px] text-[#475569]">
                      Employees cannot submit claims without attaching an image/scan of the receipt or invoice.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-[#DCE5EC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE5EC] rounded-md text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-md font-semibold shadow-xs cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CLAIM ACTIVITY */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-[#DCE5EC] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5EC] bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingActivity ? 'Edit Operational Activity' : 'Add New Operational Activity'}
                </h3>
              </div>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Activity Code</label>
                  <input
                    type="text"
                    required
                    value={activityFormData.code}
                    onChange={(e) => setActivityFormData({ ...activityFormData, code: e.target.value })}
                    placeholder="e.g. ACT-DELIV"
                    className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Associated Business Line</label>
                  <select
                    value={activityFormData.businessLineId || ''}
                    onChange={(e) => setActivityFormData({ ...activityFormData, businessLineId: e.target.value || undefined })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  >
                    <option value="">All Business Lines (Holding)</option>
                    {businessLines.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Operational Activity Name</label>
                <input
                  type="text"
                  required
                  value={activityFormData.name}
                  onChange={(e) => setActivityFormData({ ...activityFormData, name: e.target.value })}
                  placeholder="e.g. Client VIP Gift Delivery"
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Description & Purpose</label>
                <textarea
                  rows={3}
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData({ ...activityFormData, description: e.target.value })}
                  placeholder="Details of operational activities, delivery objectives, or assignment scope..."
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="pt-3 border-t border-[#DCE5EC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE5EC] rounded-md text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-md font-semibold shadow-xs cursor-pointer"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
