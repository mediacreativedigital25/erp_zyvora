import React, { useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  MapPin,
  X,
  ShieldAlert,
  Building,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { Warehouse } from '../../types/erp';
import { generateSmartEntityCode, getTenant2DigitCode } from '../../utils/entityCodeGenerator';

export const WarehousesLocationsView: React.FC = () => {
  const {
    tenant,
    allTenants,
    warehouses,
    setWarehouses,
    branches,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast
  } = useErp();

  const canEdit =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin'].includes(currentUser.role);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    branchId: branches[0]?.id || '',
    code: '',
    name: '',
    type: 'central' as Warehouse['type'],
    address: '',
    capacityM2: 2500,
    isActive: true
  });

  const openAddModal = () => {
    const nextCode = generateSmartEntityCode('WH', tenant, warehouses.map((w) => w.code), allTenants);
    setEditingWarehouse(null);
    setFormData({
      branchId: branches[0]?.id || '',
      code: nextCode,
      name: '',
      type: 'central',
      address: '',
      capacityM2: 2500,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setFormData({
      branchId: wh.branchId,
      code: wh.code,
      name: wh.name,
      type: wh.type,
      address: wh.address,
      capacityM2: wh.capacityM2,
      isActive: wh.isActive
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      addToast('Validasi Gagal', 'Kode dan nama fasilitas gudang wajib diisi.', 'warning');
      return;
    }

    if (editingWarehouse) {
      setWarehouses((prev) =>
        prev.map((w) => (w.id === editingWarehouse.id ? { ...w, ...formData } : w))
      );
      addToast('Warehouse Updated', `Warehouse facility '${formData.name}' updated successfully.`, 'success');
    } else {
      const newWh: Warehouse = {
        id: `wh_${Date.now()}`,
        ...formData
      };
      setWarehouses((prev) => [...prev, newWh]);
      addToast('Warehouse Added', `Warehouse facility '${newWh.name}' registered successfully.`, 'success');
    }
    setIsModalOpen(false);
  };

  const toggleStatus = (id: string) => {
    setWarehouses((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w))
    );
    addToast('Status Updated', 'Warehouse facility status updated successfully.', 'info');
  };

  // Type Badges Helper
  const renderTypeBadge = (type: Warehouse['type']) => {
    switch (type) {
      case 'central':
        return (
          <span className="bg-[#086288] text-white font-semibold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
            Central DC
          </span>
        );
      case 'retail':
        return (
          <span className="bg-emerald-100 text-emerald-800 font-semibold text-[10px] px-2 py-0.5 rounded-full">
            Store / Retail
          </span>
        );
      case 'transit':
        return (
          <span className="bg-sky-100 text-sky-800 font-semibold text-[10px] px-2 py-0.5 rounded-full">
            Transit Hub
          </span>
        );
      case 'returns':
        return (
          <span className="bg-amber-100 text-amber-800 font-semibold text-[10px] px-2 py-0.5 rounded-full">
            Returns / Quarantine
          </span>
        );
      default:
        return null;
    }
  };

  // Filter logic
  const filteredWarehouses = warehouses.filter((wh) => {
    const matchBranch = selectedBranchFilter === 'ALL' || wh.branchId === selectedBranchFilter;
    const matchType = selectedTypeFilter === 'ALL' || wh.type === selectedTypeFilter;
    const matchSearch =
      wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wh.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBranch && matchType && matchSearch;
  });

  const totalCapacity = warehouses.reduce((acc, curr) => acc + (curr.capacityM2 || 0), 0);
  const centralCount = warehouses.filter((w) => w.type === 'central').length;
  const activeCount = warehouses.filter((w) => w.isActive).length;

  return (
    <div className="space-y-6">
      {/* RBAC Notice */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-xs shadow-2xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Read-Only Mode: Warehouse master facilities can only be modified by Super Admin, Owner, or Tenant Admin.
          </span>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-2xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 border-b border-[#DCE5EC] bg-[#FAFDFE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Warehouse & Storage Facilities Directory</h3>
          </div>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-end sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Warehouse Facility</span>
            </button>
          )}
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-[#DCE5EC] bg-white flex flex-col md:flex-row gap-3 justify-between items-center text-xs">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search warehouse code, facility name, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
            >
              <option value="ALL">All Responsible Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
            >
              <option value="ALL">All Facility Types</option>
              <option value="central">Central Distribution (DC)</option>
              <option value="retail">Store / Retail Warehouse</option>
              <option value="transit">Transit Hub</option>
              <option value="returns">Returns / Quarantine</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                <th className="py-3 px-4">Warehouse Code</th>
                <th className="py-3 px-4">Facility Name & Location</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4">Facility Type</th>
                <th className="py-3 px-4 text-right">Capacity (m²)</th>
                <th className="py-3 px-4">Status</th>
                {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5EC]">
              {filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                    No warehouse facilities match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredWarehouses.map((wh) => {
                  const branch = branches.find((b) => b.id === wh.branchId);
                  return (
                    <tr key={wh.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#086288]">{wh.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A]">{wh.name}</div>
                        <div className="text-[11px] text-[#475569] flex items-center gap-1 mt-0.5 truncate max-w-sm">
                          <MapPin className="w-3 h-3 text-[#94A3B8] shrink-0" />
                          <span>{wh.address}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-[#0F172A]">
                          <Building className="w-3 h-3 text-[#94A3B8]" />
                          {branch ? `${branch.code} - ${branch.name}` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{renderTypeBadge(wh.type)}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F172A]">
                        {wh.capacityM2?.toLocaleString('en-US')} m²
                      </td>
                      <td className="py-3 px-4">
                        {wh.isActive ? (
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
                              onClick={() => openEditModal(wh)}
                              className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#DCEEF5]/50 rounded cursor-pointer"
                              title="Edit Warehouse Facility"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleStatus(wh.id)}
                              className="text-[11px] font-medium text-slate-500 hover:text-[#086288] cursor-pointer"
                            >
                              {wh.isActive ? 'Deactivate' : 'Activate'}
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

      {/* MODAL: ADD / EDIT WAREHOUSE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-[#DCE5EC] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5EC] bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingWarehouse ? 'Edit Warehouse Facility' : 'Add New Warehouse Facility'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Responsible Branch Office</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Warehouse Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder={`e.g. WH${getTenant2DigitCode(tenant, allTenants)}001`}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Warehouse Facility Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cakung East Regional Distribution Center"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Facility Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Warehouse['type'] })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                  >
                    <option value="central">Central Distribution (DC)</option>
                    <option value="retail">Store / Retail Warehouse</option>
                    <option value="transit">Transit Hub</option>
                    <option value="returns">Returns / Quarantine</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Floor Capacity (m²)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.capacityM2}
                    onChange={(e) => setFormData({ ...formData, capacityM2: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Physical Facility Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Cakung Industrial Estate Block B No. 18, East Jakarta"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Facility Status</label>
                <select
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                >
                  <option value="true">Active (Operational for Inbound & Outbound Movements)</option>
                  <option value="false">Inactive (Under Maintenance / Temporarily Closed)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#DCE5EC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-[#DCE5EC] rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
