import React, { useState } from 'react';
import {
  Users,
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Phone,
  MapPin,
  Sparkles,
  ExternalLink,
  CreditCard,
  Calendar,
  Trash2
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Customer, CustomerType } from '../../types/erp';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import { generateGoogleMapsUrl } from '../../utils/geoUtils';

export const CustomerDirectoryView: React.FC = () => {
  const {
    customers,
    setCustomers,
    updateCustomer,
    deleteCustomer,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast
  } = useErp();
  const { confirm } = useConfirm();

  const canEdit =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin', 'sales'].includes(currentUser.role);

  const [searchQuery, setSearchQuery] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | CustomerType>('all');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const openAddCustomerModal = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setIsCustomerModalOpen(true);
  };

  const toggleCustomerStatus = async (cust: Customer) => {
    const isActivating = cust.status !== 'active';

    const isConfirmed = await confirm({
      title: isActivating ? 'Aktifkan Kembali Pelanggan?' : 'Nonaktifkan Akun Pelanggan?',
      message: isActivating
        ? `Akun pelanggan "${cust.name}" akan diaktifkan kembali dan dapat dipilih dalam pesanan penjualan.`
        : `Akun pelanggan "${cust.name}" akan dinonaktifkan. Pelanggan nonaktif tidak dapat dipilih saat pembuatan transaksi baru.`,
      entityCode: cust.customerCode,
      entityName: cust.name,
      variant: isActivating ? 'info' : 'warning',
      confirmLabel: isActivating ? 'Ya, Aktifkan Kembali' : 'Ya, Nonaktifkan',
      cancelLabel: 'Batal',
      consequences: isActivating
        ? ['Akun kembali dapat melakukan transaksi pemesanan barang dan jasa.']
        : [
            'Akun disembunyikan dari dropdown pemilihan pelanggan pada Sales Order baru.',
            'Riwayat pesanan, piutang, dan invoice yang sudah ada tetap aman tersimpan.'
          ]
    });

    if (!isConfirmed) return;

    updateCustomer(cust.id, { status: isActivating ? 'active' : 'inactive' });
    addToast(
      'Status Diperbarui',
      `Status pelanggan '${cust.name}' berhasil diubah menjadi ${isActivating ? 'Aktif' : 'Nonaktif'}.`,
      'info'
    );
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    const isConfirmed = await confirm({
      title: 'Hapus Pelanggan Terdaftar?',
      message: `Apakah Anda yakin ingin menghapus data master pelanggan "${cust.name}"? Data yang sudah dihapus tidak dapat dipulihkan kembali.`,
      entityCode: cust.customerCode,
      entityName: cust.name,
      variant: 'danger',
      confirmLabel: 'Ya, Hapus Pelanggan',
      cancelLabel: 'Batal',
      consequences: [
        'Data master kontak, PIC, dan profil pelanggan akan dihapus dari direktori.',
        'Tindakan penghapusan ini akan dicatat ke dalam sistem Audit Trail ERP.'
      ]
    });

    if (!isConfirmed) return;

    deleteCustomer(cust.id);
    addToast('Pelanggan Dihapus', `Pelanggan '${cust.name}' telah berhasil dihapus.`, 'success');
  };

  // Filtered list
  const filteredCustomers = customers.filter((cust) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      cust.name.toLowerCase().includes(q) ||
      cust.customerCode.toLowerCase().includes(q) ||
      cust.companyName.toLowerCase().includes(q) ||
      (cust.eventTitle && cust.eventTitle.toLowerCase().includes(q)) ||
      (cust.city && cust.city.toLowerCase().includes(q)) ||
      (cust.regency && cust.regency.toLowerCase().includes(q));

    const cType = cust.customerType || 'general';
    const matchType = customerTypeFilter === 'all' || cType === customerTypeFilter;

    return matchSearch && matchType;
  });

  const totalCreditLimit = customers.reduce((acc, c) => acc + (c.creditLimit || 0), 0);
  const activeCount = customers.filter((c) => c.status === 'active').length;
  const bookingCount = customers.filter((c) => c.customerType === 'booking').length;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Total Accounts</p>
              <h3 className="text-xl font-bold text-[#0F172A] mt-1">{customers.length}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {activeCount} aktif di seluruh lini
              </p>
            </div>
            <div className="p-2.5 bg-[#DCEEF5] text-[#086288] rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Corporate (B2B)</p>
              <h3 className="text-xl font-bold text-[#0F172A] mt-1">
                {customers.filter((c) => c.customerType === 'corporate').length}
              </h3>
              <p className="text-[11px] text-[#475569] mt-0.5">Mitra institusi & wholesale</p>
            </div>
            <div className="p-2.5 bg-sky-50 text-sky-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Event Bookings</p>
              <h3 className="text-xl font-bold text-[#0F172A] mt-1">{bookingCount}</h3>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">Wedding & special event</p>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Total Credit Exposure</p>
              <h3 className="text-xl font-bold font-mono text-[#0F172A] mt-1">
                Rp {totalCreditLimit.toLocaleString('id-ID')}
              </h3>
              <p className="text-[11px] text-[#475569] mt-0.5">Plafon kredit korporat</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-xs overflow-hidden">
        {/* Header & Action Button */}
        <div className="p-4 border-b border-[#DCE5EC] bg-[#FAFDFE] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#086288]" />
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Customers Directory</h2>
              <p className="text-xs text-[#475569]">
                Direktori seluruh akun pelanggan, kontak personal, klasifikasi segmen, dan ketentuan komersial
              </p>
            </div>
          </div>

          {canEdit && (
            <button
              onClick={openAddCustomerModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-[#DCE5EC] bg-white flex flex-col md:flex-row gap-3 justify-between items-center text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search code, name, organization, event, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1 rounded-lg border border-[#DCE5EC] w-full md:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setCustomerTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                customerTypeFilter === 'all'
                  ? 'bg-[#086288] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              All Accounts ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setCustomerTypeFilter('general')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                customerTypeFilter === 'general'
                  ? 'bg-[#086288] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              General B2C ({customers.filter((c) => (c.customerType || 'general') === 'general').length})
            </button>
            <button
              type="button"
              onClick={() => setCustomerTypeFilter('corporate')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                customerTypeFilter === 'corporate'
                  ? 'bg-[#086288] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Corporate B2B ({customers.filter((c) => c.customerType === 'corporate').length})
            </button>
            <button
              type="button"
              onClick={() => setCustomerTypeFilter('booking')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                customerTypeFilter === 'booking'
                  ? 'bg-[#086288] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Event Booking ({bookingCount})</span>
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                <th className="py-3 px-4">Customer Code</th>
                <th className="py-3 px-4">Customer & Organization</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Administrative Region</th>
                <th className="py-3 px-4">Distance from HQ</th>
                <th className="py-3 px-4">PIC & Contact</th>
                <th className="py-3 px-4">Commercial Terms</th>
                <th className="py-3 px-4">Status</th>
                {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5EC]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#94A3B8]">
                    No customers found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const cType = cust.customerType || 'general';
                  const hasCoords = cust.latitude !== undefined && cust.longitude !== undefined;
                  return (
                    <tr key={cust.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Customer Code */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#086288] bg-[#EFF7FA] px-2 py-0.5 rounded border border-[#B7DDEA]">
                          {cust.customerCode}
                        </span>
                      </td>

                      {/* Customer & Organization / Event Title */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0F172A]">
                          {cust.eventTitle || cust.companyName}
                        </div>
                        {cust.eventTitle && cust.companyName && cust.eventTitle !== cust.companyName && (
                          <div className="text-[11px] text-[#086288] font-medium">
                            Org: {cust.companyName}
                          </div>
                        )}
                        <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5 truncate max-w-xs">
                          <MapPin className="w-3 h-3 text-[#94A3B8] shrink-0" />
                          <span className="truncate" title={cust.address || cust.city}>
                            {cust.address || cust.city}
                          </span>
                        </div>
                      </td>

                      {/* Classification Badge */}
                      <td className="py-3 px-4">
                        {cType === 'booking' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            <Sparkles className="w-3 h-3" />
                            <span>Event Booking</span>
                          </span>
                        ) : cType === 'corporate' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                            <Building2 className="w-3 h-3" />
                            <span>Corporate (B2B)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            <Users className="w-3 h-3" />
                            <span>General (B2C)</span>
                          </span>
                        )}
                      </td>

                      {/* Administrative Region */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A]">
                          {cust.regency || cust.city || '-'}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {cust.province || 'Indonesia'}
                        </div>
                      </td>

                      {/* Distance from HQ */}
                      <td className="py-3 px-4">
                        {cust.distanceFromHqKm !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                              📍 ±{cust.distanceFromHqKm.toLocaleString('id-ID')} km
                            </span>
                            {hasCoords && (
                              <a
                                href={generateGoogleMapsUrl(cust.latitude!, cust.longitude!)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#94A3B8] hover:text-[#086288] p-0.5 rounded"
                                title="View on Google Maps"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#94A3B8] italic">Unset</span>
                        )}
                      </td>

                      {/* PIC & Contact */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#0F172A]">{cust.name}</div>
                        <div className="text-[11px] text-[#475569] flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="w-3 h-3 text-[#94A3B8]" />
                          <span>{cust.phone}</span>
                        </div>
                      </td>

                      {/* Commercial / Event Target */}
                      <td className="py-3 px-4">
                        {cType === 'booking' ? (
                          <div>
                            <div className="font-semibold text-[#086288]">
                              {cust.targetEventDate || 'Target TBD'}
                            </div>
                            {cust.startTime && cust.endTime && (
                              <div className="text-[10px] text-[#086288] font-mono font-medium flex items-center gap-1 mt-0.5">
                                <span>🕒 {cust.startTime} - {cust.endTime}</span>
                                {cust.durationText && (
                                  <span className="bg-purple-50 text-purple-700 px-1 py-0.2 rounded font-sans text-[9px] font-bold border border-purple-200">
                                    {cust.durationText}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="text-[10px] text-[#64748B] mt-0.5">
                              {cust.estimatedGuestCount ? `${cust.estimatedGuestCount} Pax` : 'Service Booking'}
                            </div>
                          </div>
                        ) : cType === 'corporate' ? (
                          <div>
                            <div className="font-mono font-bold text-[#0F172A]">
                              Rp {(cust.creditLimit || 0).toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-[#64748B] uppercase">
                              {cust.paymentTerms || 'Net 30'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#64748B]">Retail Cash</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {cust.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {canEdit && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => openEditCustomerModal(cust)}
                              className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#DCEEF5]/50 rounded cursor-pointer"
                              title="Edit Customer Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleCustomerStatus(cust)}
                              className="text-[11px] font-medium text-slate-500 hover:text-[#086288] cursor-pointer"
                            >
                              {cust.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(cust)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                              title="Hapus Pelanggan"
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
      </div>

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        initialData={editingCustomer}
      />
    </div>
  );
};
