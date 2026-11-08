import React, { useState } from 'react';
import { X, Plus, Sparkles, ShieldCheck, Database, Layers } from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { NavigationService } from '../../services/navigationService';
import { OfficialRole } from '../../types/erp';

interface AddDynamicMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMenuAdded?: () => void;
}

const AVAILABLE_GROUPS = [
  { id: 'sales', label: 'Penjualan (Sales)' },
  { id: 'inventory', label: 'Persediaan (Inventory)' },
  { id: 'master_data', label: 'Master Data & Pengaturan' },
  { id: 'account_receivable', label: 'Piutang & Penagihan (AR)' },
  { id: 'cash_management', label: 'Kas & Bank (Cash Management)' },
  { id: 'human_resources', label: 'SDM & Karyawan (HR)' },
  { id: 'custom', label: 'Modul Kustom Baru' }
];

const AVAILABLE_ICONS = [
  'Boxes',
  'ShoppingBag',
  'Truck',
  'Receipt',
  'Wallet',
  'BookOpen',
  'Users',
  'BarChart3',
  'Settings',
  'Database',
  'ShieldCheck',
  'Network'
];

export const AddDynamicMenuModal: React.FC<AddDynamicMenuModalProps> = ({ isOpen, onClose, onMenuAdded }) => {
  const { currentUser, addToast, refreshNavigation } = useErp();

  const [label, setLabel] = useState('');
  const [groupId, setGroupId] = useState('sales');
  const [iconName, setIconName] = useState('Boxes');
  const [badge, setBadge] = useState('Baru');
  const [minRole, setMinRole] = useState<OfficialRole>('sales');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      addToast('Validasi Gagal', 'Nama menu wajib diisi.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await NavigationService.createMenuItem(
        {
          label: label.trim(),
          groupId,
          iconName,
          badge: badge.trim() || undefined,
          minRole,
          isReady: true,
          isActive: true,
          sortOrder: 25,
          customConfig: {
            description: `Modul live dinamis untuk ${label.trim()}`
          }
        },
        currentUser
      );

      if (res.success) {
        addToast('Menu Database Berhasil Ditambahkan', res.message, 'success');
        if (refreshNavigation) {
          await refreshNavigation();
        }
        onMenuAdded?.();
        onClose();
        setLabel('');
        setBadge('Baru');
      } else {
        addToast('Gagal Menambah Menu', res.message, 'error');
      }
    } catch (err: any) {
      addToast('Kesalahan Sistem', err.message || 'Gagal menyimpan menu ke basis data.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#086288] text-white flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Tambah Menu Live Database</h3>
              <p className="text-[11px] text-[#64748B]">
                Mendaftarkan menu baru langsung ke tabel <code className="font-mono text-[#086288]">app_navigation_items</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Nama Menu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: Manajemen Armada / Pelacakan Kurir"
              className="w-full px-3.5 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Kelompok Menu (Group)
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
              >
                {AVAILABLE_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Ikon Tampilan
              </label>
              <select
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
              >
                {AVAILABLE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Badge Label (Opsional)
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Contoh: Baru / Beta"
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Hak Akses Minimal (RBAC)
              </label>
              <select
                value={minRole}
                onChange={(e) => setMinRole(e.target.value as OfficialRole)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
              >
                <option value="sales">Sales (Staf Operasional)</option>
                <option value="admin">Admin (Administrator Tenant)</option>
                <option value="owner">Owner (Pemilik Tenant)</option>
                <option value="super_admin">Super Admin (Platform)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
            <Database className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-blue-800 leading-relaxed">
              <span className="font-semibold">Sinkronisasi Real-time:</span> Menu yang disimpan akan langsung terdaftar di sistem pusat dan otomatis tampil pada navigasi menu tanpa perlu muat ulang.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#086288] hover:bg-[#064e6d] rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Menu ke Database Live'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
