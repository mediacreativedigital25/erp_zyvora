import React, { useState } from 'react';
import {
  Building2,
  Truck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Phone,
  Mail,
  MapPin,
  X,
  ShieldAlert,
  CreditCard,
  Calendar,
  Compass,
  Trash2
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Vendor } from '../../types/erp';
import { generateSmartEntityCode, getTenant2DigitCode } from '../../utils/entityCodeGenerator';

export const BusinessContactsView: React.FC = () => {
  const {
    tenant,
    allTenants,
    vendors,
    setVendors,
    createVendor,
    updateVendor,
    deleteVendor,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast
  } = useErp();
  const { confirm } = useConfirm();

  const canEdit =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'vendors' | 'logistics'>('vendors');
  const [searchQuery, setSearchQuery] = useState('');

  // Vendor Modal
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorFormData, setVendorFormData] = useState({
    vendorCode: '',
    name: '',
    companyName: '',
    category: 'Bahan Baku & Pangan',
    email: '',
    phone: '',
    npwp: '',
    paymentTermsDays: 30,
    address: '',
    status: 'active' as Vendor['status']
  });

  // Logistics Partners State
  const [logisticsPartners, setLogisticsPartners] = useState([
    { id: 'log_01', code: 'EXP-JNE', name: 'JNE Express', type: 'Reguler & Cargo', phone: '+62 21 2927 8888', isActive: true },
    { id: 'log_02', code: 'EXP-JNT', name: 'J&T Cargo', type: 'Trucking & Heavy Weight', phone: '+62 21 8066 1888', isActive: true },
    { id: 'log_03', code: 'EXP-SCP', name: 'SiCepat Ekspres', type: 'B2B & E-Commerce', phone: '+62 21 5020 0050', isActive: true },
    { id: 'log_04', code: 'ARM-INT', name: 'Armada Internal Zyvora (CDD Box)', type: 'Dedicated Fleet Holding', phone: '+62 21 5289 0012', isActive: true }
  ]);

  // Vendor Handlers
  const openAddVendorModal = () => {
    const nextCode = generateSmartEntityCode('VND', tenant, vendors.map((v) => v.vendorCode), allTenants);
    setEditingVendor(null);
    setVendorFormData({
      vendorCode: nextCode,
      name: '',
      companyName: '',
      category: 'Raw Materials & Food',
      email: '',
      phone: '',
      npwp: '',
      paymentTermsDays: 30,
      address: '',
      status: 'active'
    });
    setIsVendorModalOpen(true);
  };

  const openEditVendorModal = (vnd: Vendor) => {
    setEditingVendor(vnd);
    setVendorFormData({
      vendorCode: vnd.vendorCode,
      name: vnd.name,
      companyName: vnd.companyName,
      category: vnd.category,
      email: vnd.email,
      phone: vnd.phone,
      npwp: vnd.npwp || '',
      paymentTermsDays: vnd.paymentTermsDays || 30,
      address: vnd.address || '',
      status: vnd.status
    });
    setIsVendorModalOpen(true);
  };

  const toggleVendorStatus = async (vnd: Vendor) => {
    const isActivating = vnd.status !== 'active';

    const isConfirmed = await confirm({
      title: isActivating ? 'Aktifkan Kembali Vendor / Supplier?' : 'Nonaktifkan Vendor / Supplier?',
      message: isActivating
        ? `Vendor "${vnd.companyName}" akan diaktifkan kembali dan dapat dipilih dalam modul pengadaan / PO.`
        : `Vendor "${vnd.companyName}" akan dinonaktifkan. Vendor nonaktif tidak dapat dipilih saat pembuatan transaksi pengadaan baru.`,
      entityCode: vnd.vendorCode,
      entityName: vnd.companyName,
      variant: isActivating ? 'info' : 'warning',
      confirmLabel: isActivating ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal',
      consequences: isActivating
        ? ['Vendor kembali tersedia untuk transaksi purchase order dan pembayaran.']
        : [
            'Vendor tidak dapat dipilih pada modul pengadaan barang & jasa.',
            'Data tagihan dan riwayat transaksi sebelumnya tetap aman tersimpan.'
          ]
    });

    if (!isConfirmed) return;

    setVendors((prev) =>
      prev.map((v) => (v.id === vnd.id ? { ...v, status: isActivating ? 'active' : 'inactive' } : v))
    );
    addToast('Status Updated', `Status vendor '${vnd.companyName}' diubah menjadi ${isActivating ? 'Aktif' : 'Nonaktif'}.`, 'info');
  };

  const handleDeleteVendor = async (vnd: Vendor) => {
    const isConfirmed = await confirm({
      title: 'Hapus Vendor / Supplier?',
      message: `Apakah Anda yakin ingin menghapus data master vendor "${vnd.companyName}"? Data yang sudah dihapus tidak dapat dipulihkan kembali.`,
      entityCode: vnd.vendorCode,
      entityName: vnd.companyName,
      variant: 'danger',
      confirmLabel: 'Ya, Hapus Vendor',
      cancelLabel: 'Batal',
      consequences: [
        'Data rekanan vendor dihapus secara permanen dari sistem.',
        'Aktivitas penghapusan dicatat ke dalam sistem Audit Trail ERP.'
      ]
    });

    if (!isConfirmed) return;

    deleteVendor(vnd.id);
    addToast('Vendor Dihapus', `Vendor '${vnd.companyName}' berhasil dihapus.`, 'success');
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorFormData.companyName.trim() || !vendorFormData.vendorCode.trim()) {
      addToast('Validation Failed', 'Vendor code and company name are required.', 'warning');
      return;
    }

    if (editingVendor) {
      updateVendor(editingVendor.id, vendorFormData);
      addToast('Vendor Updated', `Vendor '${vendorFormData.companyName}' updated successfully.`, 'success');
    } else {
      const newVnd: Vendor = {
        id: `vnd_${Date.now()}`,
        tenantId: tenant.id,
        ...vendorFormData
      };
      createVendor(newVnd);
      addToast('Vendor Added', `New vendor '${newVnd.companyName}' [${newVnd.vendorCode}] registered successfully.`, 'success');
    }
    setIsVendorModalOpen(false);
  };

  const toggleLogisticsStatus = async (partner: { id: string; code: string; name: string; isActive: boolean }) => {
    const isActivating = !partner.isActive;

    const isConfirmed = await confirm({
      title: isActivating ? 'Aktifkan Ekspedisi Logistik?' : 'Nonaktifkan Ekspedisi Logistik?',
      message: isActivating
        ? `Mitra logistik "${partner.name}" akan diaktifkan kembali untuk pengiriman pesanan.`
        : `Mitra logistik "${partner.name}" akan dinonaktifkan dari pilihan armada pengiriman aktif.`,
      entityCode: partner.code,
      entityName: partner.name,
      variant: isActivating ? 'info' : 'warning',
      confirmLabel: isActivating ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal'
    });

    if (!isConfirmed) return;

    setLogisticsPartners((prev) =>
      prev.map((p) => (p.id === partner.id ? { ...p, isActive: isActivating } : p))
    );
    addToast('Status Updated', `Status partner logistik '${partner.name}' diperbarui.`, 'info');
  };

  const handleDeleteLogistics = async (partner: { id: string; code: string; name: string }) => {
    const isConfirmed = await confirm({
      title: 'Hapus Ekspedisi Logistik?',
      message: `Apakah Anda yakin ingin menghapus mitra ekspedisi "${partner.name}" dari direktori?`,
      entityCode: partner.code,
      entityName: partner.name,
      variant: 'danger',
      confirmLabel: 'Ya, Hapus Ekspedisi',
      cancelLabel: 'Batal'
    });

    if (!isConfirmed) return;

    setLogisticsPartners((prev) => prev.filter((p) => p.id !== partner.id));
    addToast('Ekspedisi Dihapus', `Ekspedisi '${partner.name}' telah dihapus.`, 'success');
  };

  const filteredVendors = vendors.filter(
    (v) =>
      v.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vendorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogistics = logisticsPartners.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeVendorsCount = vendors.filter((v) => v.status === 'active').length;
  const activeLogisticsCount = logisticsPartners.filter((l) => l.isActive).length;

  return (
    <div className="space-y-6">
      {/* RBAC Notice */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-xs shadow-2xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Read-Only Mode: Vendor records and payment terms can only be modified by Super Admin, Owner, or Admin.
          </span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Total Vendors & Suppliers</p>
              <h3 className="text-xl font-bold text-[#0F172A] mt-1">{vendors.length}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {activeVendorsCount} vendor aktif & terverifikasi
              </p>
            </div>
            <div className="p-2.5 bg-[#DCEEF5] text-[#086288] rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Logistics & Carriers</p>
              <h3 className="text-xl font-bold text-[#0F172A] mt-1">{logisticsPartners.length}</h3>
              <p className="text-[11px] text-[#475569] mt-0.5">
                {activeLogisticsCount} mitra ekspedisi aktif
              </p>
            </div>
            <div className="p-2.5 bg-sky-50 text-sky-700 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Standard TOP</p>
              <h3 className="text-xl font-bold font-mono text-[#0F172A] mt-1">30 Days</h3>
              <p className="text-[11px] text-[#475569] mt-0.5">Rata-rata termin tempo supplier</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabbed Container */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-2xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-[#DCE5EC] px-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFDFE]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('vendors')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'vendors'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Vendors & Suppliers</span>
              <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                {vendors.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('logistics')}
              className={`inline-flex items-center gap-2 pb-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'logistics'
                  ? 'border-[#086288] text-[#086288]'
                  : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Logistics & Carriers</span>
              <span className="bg-[#DCEEF5] text-[#086288] text-[10px] px-1.5 py-0.2 rounded-full">
                {logisticsPartners.length}
              </span>
            </button>
          </div>

          {/* Action Button */}
          {canEdit && activeTab === 'vendors' && (
            <div className="pb-3 self-end sm:self-auto">
              <button
                onClick={openAddVendorModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Vendor</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-[#DCE5EC] bg-white flex flex-col md:flex-row gap-3 justify-between items-center text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder={
                activeTab === 'vendors'
                  ? 'Search code (VND04001), vendor name, category...'
                  : 'Search carrier or fleet...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:bg-white"
            />
          </div>
        </div>

        {/* TAB 1: VENDORS */}
        {activeTab === 'vendors' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-3 px-4">Vendor Code</th>
                  <th className="py-3 px-4">Supplier Company Name</th>
                  <th className="py-3 px-4">Commodity Category</th>
                  <th className="py-3 px-4">Official Contact</th>
                  <th className="py-3 px-4">Tax ID (NPWP)</th>
                  <th className="py-3 px-4 text-center">Payment Terms (TOP)</th>
                  <th className="py-3 px-4">Status</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#94A3B8]">
                      No vendors found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vnd) => (
                    <tr key={vnd.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#086288]">{vnd.vendorCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A]">{vnd.companyName}</div>
                        <div className="text-[11px] text-[#475569] truncate max-w-xs">{vnd.address}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-[#F1F5F9] text-[#334155] px-2 py-0.5 rounded font-medium text-[11px]">
                          {vnd.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[#0F172A] font-medium">{vnd.name}</div>
                        <div className="text-[11px] text-[#475569] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#94A3B8]" />
                          <span>{vnd.phone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#475569]">{vnd.npwp || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                          Net {vnd.paymentTermsDays} Days
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {vnd.status === 'active' ? (
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
                              onClick={() => openEditVendorModal(vnd)}
                              className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#DCEEF5]/50 rounded cursor-pointer"
                              title="Edit Vendor"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleVendorStatus(vnd)}
                              className="text-[11px] font-medium text-slate-500 hover:text-[#086288] cursor-pointer"
                            >
                              {vnd.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteVendor(vnd)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                              title="Hapus Vendor"
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

        {/* TAB 2: LOGISTICS */}
        {activeTab === 'logistics' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                  <th className="py-3 px-4">Expedition Code</th>
                  <th className="py-3 px-4">Carrier / Freight Partner</th>
                  <th className="py-3 px-4">Service Category</th>
                  <th className="py-3 px-4">Operational Hotline</th>
                  <th className="py-3 px-4">Status</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EC]">
                {filteredLogistics.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#086288]">{log.code}</td>
                    <td className="py-3 px-4 font-bold text-[#0F172A]">{log.name}</td>
                    <td className="py-3 px-4">
                      <span className="bg-[#F1F5F9] text-[#334155] px-2 py-0.5 rounded font-medium text-[11px]">
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#475569]">{log.phone}</td>
                    <td className="py-3 px-4">
                      {log.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Active Partner
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          <XCircle className="w-3 h-3" /> Suspended
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => toggleLogisticsStatus(log)}
                            className="text-[11px] font-medium text-slate-500 hover:text-[#086288] cursor-pointer"
                          >
                            {log.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteLogistics(log)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                            title="Hapus Ekspedisi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD/EDIT VENDOR */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-[#DCE5EC] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5EC] bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingVendor ? 'Edit Vendor Supplier' : 'Register New Vendor / Supplier'}
                </h3>
              </div>
              <button
                onClick={() => setIsVendorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Vendor Code</label>
                  <input
                    type="text"
                    required
                    value={vendorFormData.vendorCode}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, vendorCode: e.target.value.toUpperCase() })}
                    placeholder={`e.g. VND${getTenant2DigitCode(tenant, allTenants)}001`}
                    className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Commodity / Supply Category</label>
                  <select
                    value={vendorFormData.category}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, category: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  >
                    <option value="Raw Materials & Food">Raw Materials & Food</option>
                    <option value="Packaging & Warehousing">Packaging & Warehousing</option>
                    <option value="Event Equipments & AV">Event Equipments & AV</option>
                    <option value="IT Hardware & Infrastructure">IT Hardware & Infrastructure</option>
                    <option value="Professional Services">Professional Services</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Supplier Legal Entity / Company Name</label>
                <input
                  type="text"
                  required
                  value={vendorFormData.companyName}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, companyName: e.target.value })}
                  placeholder="e.g. PT Sukses Pangan Mandiri"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Key Account Person (PIC)</label>
                  <input
                    type="text"
                    required
                    value={vendorFormData.name}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                    placeholder="e.g. Hendra Wijaya"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Payment Terms (Days TOP)</label>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={vendorFormData.paymentTermsDays}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, paymentTermsDays: parseInt(e.target.value) || 0 })}
                    placeholder="30"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Vendor Phone Contact</label>
                  <input
                    type="tel"
                    value={vendorFormData.phone}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                    placeholder="+62 21 5289 8000"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Corporate Tax ID (NPWP)</label>
                  <input
                    type="text"
                    value={vendorFormData.npwp}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, npwp: e.target.value })}
                    placeholder="01.002.345.6-051.000"
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Office / Plant Address</label>
                <textarea
                  rows={2}
                  value={vendorFormData.address}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
                  placeholder="Multivision Tower Lt. 12, Kuningan Mulia Kav. 9B, Jakarta Selatan"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="pt-3 border-t border-[#DCE5EC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE5EC] rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
