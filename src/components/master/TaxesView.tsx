import React, { useState } from 'react';
import {
  Percent,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  X,
  ShieldAlert,
  FileText,
  HelpCircle,
  Scale
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { TaxRule } from '../../types/erp';

export const TaxesView: React.FC = () => {
  const {
    taxes,
    setTaxes,
    currentUser,
    isCurrentUserSuperAdmin,
    addToast
  } = useErp();

  const canEdit =
    isCurrentUserSuperAdmin || ['super_admin', 'owner', 'admin'].includes(currentUser.role);

  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRule | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    ratePercent: 11,
    taxType: 'ppn' as TaxRule['taxType'],
    isSalesTax: true,
    isPurchaseTax: true,
    glAccountCode: '2002',
    description: '',
    isActive: true
  });

  const openAddModal = () => {
    setEditingTax(null);
    setFormData({
      code: '',
      name: '',
      ratePercent: 11,
      taxType: 'ppn',
      isSalesTax: true,
      isPurchaseTax: true,
      glAccountCode: '2002',
      description: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tax: TaxRule) => {
    setEditingTax(tax);
    setFormData({
      code: tax.code,
      name: tax.name,
      ratePercent: tax.ratePercent,
      taxType: tax.taxType,
      isSalesTax: tax.isSalesTax,
      isPurchaseTax: tax.isPurchaseTax,
      glAccountCode: tax.glAccountCode || '2002',
      description: tax.description || '',
      isActive: tax.isActive
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      addToast('Validation Failed', 'Tax code and regulation name are required.', 'warning');
      return;
    }

    if (editingTax) {
      setTaxes((prev) =>
        prev.map((t) => (t.id === editingTax.id ? { ...t, ...formData } : t))
      );
      addToast('Tax Rule Updated', `Tax rule '${formData.code}' updated successfully.`, 'success');
    } else {
      const newTax: TaxRule = {
        id: `tax_${Date.now()}`,
        tenantId: currentUser.tenantId,
        ...formData
      };
      setTaxes((prev) => [...prev, newTax]);
      addToast('Tax Rule Added', `New tax rule '${newTax.code}' added successfully.`, 'success');
    }
    setIsModalOpen(false);
  };

  const toggleStatus = (id: string) => {
    setTaxes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
    addToast('Status Updated', 'Tax rule status updated successfully.', 'info');
  };

  const filteredTaxes = taxes.filter(
    (t) =>
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.taxType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* RBAC Notice */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-xs shadow-2xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Read-Only Mode: Tax rate configurations (VAT, Income Tax) and tax clearing account mappings can only be modified by Super Admin, Owner, or Tenant Admin.
          </span>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-2xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 border-b border-[#DCE5EC] bg-[#FAFDFE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Taxes & Duties Configuration</h3>
          </div>

          {canEdit && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#0B4D68] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-end sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tax Rule</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-[#DCE5EC] bg-white text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search tax code (PPN-11), regulation, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:bg-white"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAFDFE] text-[#475569] border-b border-[#DCE5EC] font-semibold">
                <th className="py-3 px-4">Tax Code</th>
                <th className="py-3 px-4">Tax Regulation Name</th>
                <th className="py-3 px-4 text-center">Rate (%)</th>
                <th className="py-3 px-4">Document Scope</th>
                <th className="py-3 px-4">GL / CoA Account</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Status</th>
                {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5EC]">
              {filteredTaxes.map((tax) => (
                <tr key={tax.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#086288]">{tax.code}</td>
                  <td className="py-3 px-4 font-semibold text-[#0F172A]">{tax.name}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#0F172A]">
                    {tax.ratePercent}%
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      {tax.isSalesTax && (
                        <span className="bg-sky-50 text-[#086288] border border-sky-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Sales Invoices
                        </span>
                      )}
                      {tax.isPurchaseTax && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Purchase Orders (PO)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#475569]">
                    {tax.glAccountCode ? `Account #${tax.glAccountCode}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-[#475569] max-w-xs truncate">{tax.description || '-'}</td>
                  <td className="py-3 px-4">
                    {tax.isActive ? (
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
                          onClick={() => openEditModal(tax)}
                          className="p-1 text-slate-500 hover:text-[#086288] hover:bg-[#DCEEF5]/50 rounded cursor-pointer"
                          title="Edit Tax Rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleStatus(tax.id)}
                          className="text-[11px] font-medium text-slate-500 hover:text-[#086288] cursor-pointer"
                        >
                          {tax.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT TAX RULE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-[#DCE5EC] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5EC] bg-[#FAFDFE]">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#086288]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {editingTax ? 'Edit Tax Rule' : 'Add New Tax Rule'}
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
                  <label className="block font-semibold text-[#0F172A] mb-1">Tax Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. PPN-11"
                    className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase text-[#086288] focus:outline-none focus:border-[#086288]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.ratePercent}
                    onChange={(e) => setFormData({ ...formData, ratePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#086288]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Tax Regulation Name / Official Title</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Value Added Tax (PPN 11%)"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Tax Type</label>
                <select
                  value={formData.taxType}
                  onChange={(e) => setFormData({ ...formData, taxType: e.target.value as TaxRule['taxType'] })}
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#086288]"
                >
                  <option value="ppn">PPN (Value Added Tax / VAT)</option>
                  <option value="pph23">PPh 23 (Services & Rental Withholding)</option>
                  <option value="pph21">PPh 21 (Professional Withholding)</option>
                  <option value="pph_final">PPh Final (MSME / Gross Revenue)</option>
                  <option value="exempt">Tax Exempt (Non-Taxable / 0%)</option>
                </select>
              </div>

              <div className="p-3 bg-[#FAFDFE] border border-[#DCE5EC] rounded-lg space-y-2">
                <span className="font-semibold text-[#0F172A] block mb-1">Transaction Document Scope</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSalesTax}
                      onChange={(e) => setFormData({ ...formData, isSalesTax: e.target.checked })}
                      className="rounded text-[#086288] focus:ring-[#086288]"
                    />
                    <span>Sales Invoices</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPurchaseTax}
                      onChange={(e) => setFormData({ ...formData, isPurchaseTax: e.target.checked })}
                      className="rounded text-[#086288] focus:ring-[#086288]"
                    />
                    <span>Purchase Orders (PO)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">GL / CoA Clearing Account Code</label>
                <input
                  type="text"
                  value={formData.glAccountCode}
                  onChange={(e) => setFormData({ ...formData, glAccountCode: e.target.value })}
                  placeholder="2002"
                  className="w-full bg-white border border-[#DCE5EC] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#086288]"
                />
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
                  Save Tax Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
