import React, { useState, useEffect, useMemo } from 'react';
import {
  Car,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Gauge,
  Calendar,
  Building2,
  UserCheck,
  Fuel,
  ShieldCheck,
  Layers,
  RotateCcw,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { useConfirm } from '../../context/ConfirmContext';
import { CompanyVehicle } from '../../types/erp';
import { VehicleMasterService, VehicleTaxAlert } from '../../services/vehicleMasterService';

export const VehiclesMasterView: React.FC = () => {
  const { branches, marketProfile, currentUser, addToast, tenant } = useErp();
  const { confirm: systemConfirm } = useConfirm();
  const businessLines = useMemo(() => marketProfile.businessLines || [], [marketProfile]);

  const [vehicles, setVehicles] = useState<CompanyVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranchId, setFilterBranchId] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<CompanyVehicle | null>(null);

  // Form States
  const [licensePlate, setLicensePlate] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [vehicleType, setVehicleType] = useState<CompanyVehicle['vehicleType']>('car');
  const [fuelType, setFuelType] = useState<CompanyVehicle['fuelType']>('pertamax');
  const [assignedBranchId, setAssignedBranchId] = useState('');
  const [assignedBusinessLineId, setAssignedBusinessLineId] = useState('');
  const [custodianName, setCustodianName] = useState('');
  const [currentOdometerKm, setCurrentOdometerKm] = useState('');
  const [taxDueDate, setTaxDueDate] = useState('');
  const [plateExpiryDate, setPlateExpiryDate] = useState('');
  const [status, setStatus] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = Boolean(
    currentUser.role === 'super_admin' ||
    currentUser.role === 'tenant_admin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'owner' ||
    currentUser.isPlatformSuperAdmin
  );

  const loadVehicles = async () => {
    setIsLoading(true);
    try {
      const list = await VehicleMasterService.getVehicles(tenant.id);
      setVehicles(list);
    } catch (err) {
      console.warn('Failed to load vehicles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [tenant.id]);

  const openAddModal = () => {
    setEditingVehicle(null);
    setLicensePlate('');
    setBrandModel('');
    setVehicleType('car');
    setFuelType('pertamax');
    setAssignedBranchId(branches[0]?.id || 'br_jkt_hq');
    setAssignedBusinessLineId(businessLines[0]?.id || 'lob_01');
    setCustodianName('');
    setCurrentOdometerKm('0');
    setTaxDueDate(new Date().toISOString().split('T')[0]);
    setPlateExpiryDate('');
    setStatus(true);
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (v: CompanyVehicle) => {
    setEditingVehicle(v);
    setLicensePlate(v.licensePlate);
    setBrandModel(v.brandModel);
    setVehicleType(v.vehicleType);
    setFuelType(v.fuelType);
    setAssignedBranchId(v.assignedBranchId || branches[0]?.id || 'br_jkt_hq');
    setAssignedBusinessLineId(v.assignedBusinessLineId || businessLines[0]?.id || 'lob_01');
    setCustodianName(v.custodianName || '');
    setCurrentOdometerKm(String(v.currentOdometerKm || 0));
    setTaxDueDate(v.taxDueDate || '');
    setPlateExpiryDate(v.plateExpiryDate || '');
    setStatus(v.isActive);
    setNotes(v.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPlate = licensePlate.trim().toUpperCase();
    if (!cleanPlate) {
      setFormError('Nomor Polisi (Nopol) wajib diisi.');
      return;
    }

    if (!brandModel.trim()) {
      setFormError('Merk & Model kendaraan wajib diisi.');
      return;
    }

    if (!taxDueDate) {
      setFormError('Tanggal Pajak Tahunan wajib diatur untuk mencegah keterlambatan pajak.');
      return;
    }

    try {
      await VehicleMasterService.saveVehicle({
        id: editingVehicle?.id,
        tenantId: tenant.id,
        licensePlate: cleanPlate,
        brandModel: brandModel.trim(),
        vehicleType,
        fuelType,
        assignedBranchId,
        assignedBusinessLineId,
        custodianName: custodianName.trim() || undefined,
        currentOdometerKm: Number(currentOdometerKm) || 0,
        taxDueDate: taxDueDate || undefined,
        plateExpiryDate: plateExpiryDate || undefined,
        isActive: status,
        notes: notes.trim() || undefined
      }, tenant.id);

      addToast(
        'Vehicle Saved',
        `Vehicle ${cleanPlate} registered successfully to fleet directory.`,
        'success'
      );
      setIsModalOpen(false);
      loadVehicles();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save vehicle.');
    }
  };

  const handleDelete = async (v: CompanyVehicle) => {
    const isConfirmed = await systemConfirm({
      title: 'Hapus Kendaraan Operasional?',
      message: `Apakah Anda yakin ingin menghapus armada "${v.licensePlate}" (${v.brandModel}) dari master armada operasional?`,
      entityCode: v.licensePlate,
      entityName: v.brandModel,
      variant: 'danger',
      confirmLabel: 'Ya, Hapus Kendaraan',
      cancelLabel: 'Batal',
      consequences: [
        'Data unit armada dihapus permanen dari sistem.',
        'Kendaraan ini tidak dapat dialokasikan untuk penugasan SPK lapangan baru.'
      ]
    });

    if (!isConfirmed) return;

    await VehicleMasterService.deleteVehicle(v.id, tenant.id);
    addToast('Vehicle Deleted', `Kendaraan ${v.licensePlate} berhasil dihapus.`, 'info');
    loadVehicles();
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        (v.licensePlate || '').toLowerCase().includes(q) ||
        (v.brandModel || '').toLowerCase().includes(q) ||
        (v.custodianName || '').toLowerCase().includes(q);

      const matchesBranch = filterBranchId === 'all' || v.assignedBranchId === filterBranchId;
      const matchesType = filterType === 'all' || v.vehicleType === filterType;

      return matchesSearch && matchesBranch && matchesType;
    });
  }, [vehicles, searchQuery, filterBranchId, filterType]);

  // Pagination
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const totalPages = Math.ceil(filteredVehicles.length / entriesPerPage) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredVehicles.slice(start, start + entriesPerPage);
  }, [filteredVehicles, currentPage, entriesPerPage]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterBranchId('all');
    setFilterType('all');
    setCurrentPage(1);
  };

  const renderTaxBadge = (taxDueDate?: string) => {
    const alert = VehicleMasterService.getTaxStatus(taxDueDate);
    switch (alert.status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            <span>{alert.label}</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>{alert.label}</span>
          </span>
        );
      case 'safe':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{alert.label}</span>
          </span>
        );
      default:
        return <span className="text-[#94A3B8] text-[11px]">Not configured</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (STANDARD BLUEPRINT)                   */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* LEFT COLUMN FILTERS */}
          <div className="space-y-3">
            {/* Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Branch</label>
              <div className="sm:col-span-2">
                <select
                  value={filterBranchId}
                  onChange={(e) => {
                    setFilterBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Assigned Branches ---</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vehicle Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Vehicle Type</label>
              <div className="sm:col-span-2">
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] focus:ring-1 focus:ring-[#086288] cursor-pointer"
                >
                  <option value="all">--- All Vehicle Types ---</option>
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="van">Van / Blind Van</option>
                  <option value="truck">Truck</option>
                </select>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pt-1">
              <div className="hidden sm:block"></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN FILTERS */}
          <div className="space-y-3">
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#64748B]">
              <div className="font-semibold text-[#0F172A] mb-1">Fleet Directory Overview</div>
              <div>Monitor registered operational vehicles, custodian assignment, and road tax validity status in real-time.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUB-ACTION TOOLBAR & TABLE CONTROLS                                */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {canEdit && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Vehicle</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print List</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 bg-white border border-[#CBD5E1] rounded-md text-xs text-[#0F172A] focus:outline-hidden cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="relative">
            <span className="text-xs text-[#64748B] mr-1.5">Search:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter in table..."
              className="h-8 w-44 sm:w-56 px-2.5 bg-white border border-[#CBD5E1] rounded-md text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288]"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. DATA TABLE (DIRECT CONTENT)                                        */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] font-semibold select-none">
              <tr>
                <th className="py-3 px-3 w-16 text-center">Actions</th>
                <th className="py-3 px-4 w-32">License Plate</th>
                <th className="py-3 px-4">Brand & Model</th>
                <th className="py-3 px-4">Custodian / PIC</th>
                <th className="py-3 px-4">Branch & Business Line</th>
                <th className="py-3 px-4 text-right">Current Odometer (KM)</th>
                <th className="py-3 px-4">Annual Tax Due</th>
                <th className="py-3 px-4 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF4F8]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#94A3B8]">
                    Loading fleet directory...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[#94A3B8]">
                    No vehicles found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedVehicles.map((v) => {
                  const branchObj = branches.find((b) => b.id === v.assignedBranchId);
                  const lobObj = businessLines.find((l) => l.id === v.assignedBusinessLineId);

                  return (
                    <tr key={v.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Action */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(v)}
                            className="p-1 text-[#475569] hover:text-[#086288] hover:bg-[#EFF7FA] rounded-md transition-colors cursor-pointer"
                            title="Edit vehicle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(v)}
                            className="p-1 text-[#94A3B8] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete vehicle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Nopol */}
                      <td className="py-3 px-4 font-mono font-bold text-[#086288]">
                        <span className="bg-[#EFF7FA] px-2 py-0.5 rounded border border-[#B7DDEA]">
                          {v.licensePlate}
                        </span>
                      </td>

                      {/* Brand & Model */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0F172A]">{v.brandModel}</div>
                        <div className="text-[11px] text-[#475569] capitalize">
                          {v.vehicleType} • Fuel: {v.fuelType}
                        </div>
                      </td>

                      {/* Pemegang Inventaris */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A]">
                          {v.custodianName || 'Unassigned'}
                        </div>
                        {v.notes && (
                          <div className="text-[11px] text-[#64748B] line-clamp-1">{v.notes}</div>
                        )}
                      </td>

                      {/* Cabang & LOB */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#0F172A]">{branchObj?.name || 'Headquarters'}</div>
                        <div className="text-[11px] text-[#086288] font-mono">{lobObj?.name || 'Shared'}</div>
                      </td>

                      {/* KM Terkini */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {v.currentOdometerKm.toLocaleString()} KM
                      </td>

                      {/* Pajak Tahunan & Smart Alert */}
                      <td className="py-3 px-4 space-y-1">
                        <div className="text-xs font-medium text-[#0F172A] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{v.taxDueDate || '—'}</span>
                        </div>
                        <div>{renderTaxBadge(v.taxDueDate)}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {v.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===================================================================== */}
        {/* 4. PAGINATION FOOTER                                                  */}
        {/* ===================================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-[#E2E8F0] gap-3 text-xs text-[#64748B]">
          <div>
            Showing <strong className="text-[#0F172A]">{filteredVehicles.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</strong> to{' '}
            <strong className="text-[#0F172A]">{Math.min(currentPage * entriesPerPage, filteredVehicles.length)}</strong> of{' '}
            <strong className="text-[#0F172A]">{filteredVehicles.length}</strong> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`min-w-7 h-7 px-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#086288] border-[#086288] text-white'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded border border-[#CBD5E1] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL REGISTRASI / EDIT ARMADA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full overflow-hidden border border-[#DCE5EC] my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE5EC] bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    {editingVehicle ? 'Edit Vehicle Details' : 'Add Fleet Vehicle'}
                  </h3>
                  <p className="text-[11px] text-[#475569]">
                    Register license plate, assigned custodian, and vehicle tax due date
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nopol */}
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    License Plate Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    placeholder="e.g. B 1234 XYZ"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  />
                </div>

                {/* Merk & Model */}
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Vehicle Brand & Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={brandModel}
                    onChange={(e) => setBrandModel(e.target.value)}
                    placeholder="e.g. Toyota Avanza 1.3 G"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  />
                </div>

                {/* Tipe Kendaraan */}
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as CompanyVehicle['vehicleType'])}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  >
                    <option value="car">Passenger Car</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="van">Cargo Van / Logistics</option>
                    <option value="truck">Commercial Truck</option>
                  </select>
                </div>

                {/* Jenis Bahan Bakar */}
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Fuel Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as CompanyVehicle['fuelType'])}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  >
                    <option value="pertamax">Pertamax</option>
                    <option value="pertalite">Pertalite</option>
                    <option value="dexlite">Dexlite / Industrial Diesel</option>
                    <option value="solar">Bio Diesel</option>
                  </select>
                </div>
              </div>

              {/* Pemegang Inventaris (PIC / Driver) */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Assigned Custodian (PIC / Responsible Driver) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={custodianName}
                    onChange={(e) => setCustodianName(e.target.value)}
                    placeholder="e.g. John Doe (Logistics Driver HQ)"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] pr-8"
                  />
                  <UserCheck className="w-4 h-4 text-[#94A3B8] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
                <p className="text-[11px] text-[#475569] mt-1">
                  Staff member or driver responsible for vehicle keys and routine physical maintenance.
                </p>
              </div>

              {/* Cabang & Lini Bisnis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Assigned Branch Office <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignedBranchId}
                    onChange={(e) => setAssignedBranchId(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Associated Business Line
                  </label>
                  <select
                    value={assignedBusinessLineId}
                    onChange={(e) => setAssignedBusinessLineId(e.target.value)}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  >
                    {businessLines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pajak Kendaraan Section */}
              <div className="p-3.5 rounded-lg bg-[#EFF7FA]/40 border border-[#B7DDEA] space-y-3">
                <div className="text-xs font-bold text-[#086288] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Vehicle Tax Due Dates (Annual Compliance)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1">
                      Annual Road Tax Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={taxDueDate}
                      onChange={(e) => setTaxDueDate(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1">
                      5-Year Plate Renewal Date
                    </label>
                    <input
                      type="date"
                      value={plateExpiryDate}
                      onChange={(e) => setPlateExpiryDate(e.target.value)}
                      className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                    />
                  </div>
                </div>
              </div>

              {/* Odometer & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Initial / Current Odometer (KM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentOdometerKm}
                    onChange={(e) => setCurrentOdometerKm(e.target.value)}
                    placeholder="e.g. 45280"
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Fleet Status
                  </label>
                  <select
                    value={status ? 'active' : 'inactive'}
                    onChange={(e) => setStatus(e.target.value === 'active')}
                    className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                  >
                    <option value="active">Active (Operational)</option>
                    <option value="inactive">Inactive / Maintenance (Workshop)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Additional Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Vehicle physical condition, insurance policy number, etc."
                  className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DCE5EC]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 bg-white border border-[#DCE5EC] hover:bg-[#F8FAFC] text-[#475569] rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Save Vehicle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
