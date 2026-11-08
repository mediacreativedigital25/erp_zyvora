import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Send,
  AlertCircle
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import {
  ExpenseClaim,
  ExpenseClaimItem,
  ExpenseClaimStatus,
  Employee
} from '../../types/erp';
import { ExpenseClaimService } from '../../services/expenseClaimService';
import { EmployeeService } from '../../services/employeeService';
import { AddDetailExpenseModal } from './AddDetailExpenseModal';
import { DocumentNumberingService } from '../../services/documentNumberingService';

interface ClaimExpenseCreatePageProps {
  existingClaim?: ExpenseClaim | null;
  onBack: () => void;
  onSaved: (savedClaim: ExpenseClaim) => void;
}

export const ClaimExpenseCreatePage: React.FC<ClaimExpenseCreatePageProps> = ({
  existingClaim,
  onBack,
  onSaved
}) => {
  const { tenant, marketProfile, branches, currentUser, addToast } = useErp();
  const businessLines = useMemo(() => marketProfile.businessLines || [], [marketProfile]);

  // Branch & Request By
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || 'br_jkt_hq');
  const [claimDate, setClaimDate] = useState<string>(
    existingClaim?.claimDate || new Date().toISOString().split('T')[0]
  );
  const [existingClaimsList, setExistingClaimsList] = useState<ExpenseClaim[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Load existing claims to accurately compute sequential document numbers
  useEffect(() => {
    ExpenseClaimService.getClaims(tenant?.id || 'ten_zyvora_corp').then((claims) => {
      setExistingClaimsList(claims);
    });
  }, [tenant?.id]);

  // Load employee directory for dynamic Request By selection
  useEffect(() => {
    EmployeeService.getEmployees(tenant?.id || 'ten_zyvora_corp').then((list) => {
      setEmployees(list);
      if (!existingClaim && list.length > 0) {
        const currentMatch = list.find((e) => e.email === currentUser.email || e.id === currentUser.id);
        if (currentMatch) {
          setRequestByUserId(currentMatch.id);
          setRequestByName(currentMatch.fullName);
        } else if (!requestByName || requestByName === 'Platform Administrator') {
          setRequestByUserId(list[0].id);
          setRequestByName(list[0].fullName);
        }
      }
    });
  }, [tenant?.id, currentUser, existingClaim]);

  // Document Number with Tenant & Branch Suffix Integration
  const [claimNumber, setClaimNumber] = useState<string>(() => {
    if (existingClaim?.claimNumber) return existingClaim.claimNumber;
    const branchSuffix = DocumentNumberingService.resolveBranchSuffix(
      branches[0]?.id || 'br_jkt_hq',
      branches
    );
    return ExpenseClaimService.generateNextClaimNumber([], claimDate, {
      tenantCode: tenant?.tenantNumber || '001',
      branchSuffix
    });
  });

  // Re-generate claim number prefix when user switches Branch, changes Date, or when claims list loads
  useEffect(() => {
    if (existingClaim?.claimNumber) {
      setClaimNumber(existingClaim.claimNumber);
      return;
    }
    const branchSuffix = DocumentNumberingService.resolveBranchSuffix(branchId, branches);
    const nextNum = ExpenseClaimService.generateNextClaimNumber(existingClaimsList, claimDate, {
      tenantCode: tenant?.tenantNumber || '001',
      branchSuffix
    });
    setClaimNumber(nextNum);
  }, [existingClaimsList, branchId, claimDate, tenant?.tenantNumber, branches, existingClaim]);

  // Form State: Request By (Defaults to logged in user)
  const [requestByUserId, setRequestByUserId] = useState<string>(
    existingClaim?.requestByUserId || currentUser?.id || 'emp_01'
  );
  const [requestByName, setRequestByName] = useState<string>(
    existingClaim?.requestByName || currentUser?.fullName || 'User Operasional'
  );
  const [claimRemark, setClaimRemark] = useState<string>(existingClaim?.notes || '');

  // Line items state
  const [items, setItems] = useState<ExpenseClaimItem[]>(existingClaim?.items || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [modalSessionId, setModalSessionId] = useState<number>(0);

  // Calculate live total sum of rows
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  }, [items]);

  // Calculate consolidated Cost Center breakdown
  const costCenterBreakdown = useMemo(() => {
    const breakdown: Record<string, { code: string; targetName: string; total: number }> = {};
    for (const item of items) {
      const code = item.costCenterCode || 'CC-GEN';
      if (!breakdown[code]) {
        breakdown[code] = {
          code,
          targetName: item.orderByTargetName,
          total: 0
        };
      }
      breakdown[code].total += Number(item.nominal) || 0;
    }
    return Object.values(breakdown);
  }, [items]);

  // Open modal for new item
  const handleOpenAddModal = () => {
    setEditingItemIndex(null);
    setModalSessionId((prev) => prev + 1);
    setIsModalOpen(true);
  };

  // Open modal for editing existing item
  const handleOpenEditModal = (index: number) => {
    setEditingItemIndex(index);
    setModalSessionId((prev) => prev + 1);
    setIsModalOpen(true);
  };

  // Save item from modal
  const handleSaveModalItem = (item: ExpenseClaimItem) => {
    setItems((prev) => {
      const next = [...prev];
      if (editingItemIndex !== null && editingItemIndex >= 0) {
        next[editingItemIndex] = { ...item, lineNumber: editingItemIndex + 1 };
      } else {
        next.push({ ...item, lineNumber: next.length + 1 });
      }
      return next;
    });
  };

  // Delete item row
  const handleDeleteItem = (index: number) => {
    setItems((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((item, i) => ({ ...item, lineNumber: i + 1 }));
    });
  };

  // Save Claim (Draft or Submit)
  const handleSaveClaim = async (status: ExpenseClaimStatus) => {
    setErrorMessage(null);

    if (!requestByName.trim()) {
      setErrorMessage('Please specify the person requesting the claim.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Please add at least one expense detail item by clicking "+ Add Detail Expense".');
      return;
    }

    setIsSubmitting(true);
    try {
      const claimPayload: ExpenseClaim = {
        id: existingClaim?.id || `claim_${Date.now()}`,
        tenantId: existingClaim?.tenantId || 'ten_zyvora_corp',
        claimNumber,
        claimDate,
        requestByUserId,
        requestByName,
        totalAmount,
        status,
        notes: claimRemark,
        disbursementMethod: items[0]?.disbursementMethod || 'petty_cash',
        items
      };

      const branchSuffix = DocumentNumberingService.resolveBranchSuffix(branchId, branches);
      const saved = await ExpenseClaimService.saveClaim(
        claimPayload,
        tenant?.id || existingClaim?.tenantId || 'ten_zyvora_corp',
        {
          tenantCode: tenant?.tenantNumber || '001',
          branchSuffix
        }
      );
      addToast(
        status === 'submitted' ? 'Claim Submitted' : 'Draft Saved',
        `Expense claim ${saved.claimNumber} has been successfully recorded.`,
        'success'
      );
      onSaved(saved);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save expense claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Page Header Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            type="button"
            className="p-1.5 text-slate-500 hover:text-[#086288] rounded-lg hover:bg-[#EFF7FA] transition-colors cursor-pointer"
            title="Back to List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-bold">
              {claimNumber}
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase">
              {existingClaim?.status || 'Draft'}
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. MASTER INFORMATION CARD: TWO COLUMNS (ZYVORA ERP STANDARD)          */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <h2 className="text-base font-bold text-[#0F172A] tracking-tight pb-2 border-b border-[#E2E8F0]">
          Claim Expense
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* SISI KIRI */}
          <div className="space-y-3">
            {/* Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Branch <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  {branches
                    .filter((br) => br.isActive || br.id === branchId)
                    .map((br) => (
                      <option key={br.id} value={br.id} disabled={!br.isActive && br.id !== branchId}>
                        {br.code} - {br.name} {!br.isActive ? ' (Nonaktif)' : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Claim Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Claim Date <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <input
                  type="date"
                  value={claimDate}
                  onChange={(e) => setClaimDate(e.target.value)}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
              </div>
            </div>

            {/* Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Currency</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  readOnly
                  value="IDR - Indonesian Rupiahs (Rp)"
                  className="w-full text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#64748B] font-medium cursor-not-allowed outline-none"
                />
              </div>
            </div>
          </div>

          {/* SISI KANAN */}
          <div className="space-y-3">
            {/* Request By */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">
                Request By <span className="text-rose-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <select
                  value={requestByUserId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setRequestByUserId(selId);
                    const found = employees.find((emp) => emp.id === selId);
                    if (found) {
                      setRequestByName(found.fullName);
                    }
                  }}
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="">-- Select Employee (Request By) --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.fullName} ({emp.businessLineName || 'Holding / Shared Services'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Remark / Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Remark / Purpose</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={claimRemark}
                  onChange={(e) => setClaimRemark(e.target.value)}
                  placeholder="Enter general remark / operational purpose"
                  className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. SUB-ACTION: + ADD DETAIL EXPENSE BUTTON                            */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 h-9 px-4 py-2 rounded-lg bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Detail Expense</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 4. EXPENSE DETAILS TABLE CONTAINER                                    */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#CBD5E1] select-none">
              <tr>
                <th className="py-2.5 px-3 w-20 text-center">Action</th>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-44">Order By</th>
                <th className="py-2.5 px-3 w-32">Cost Center</th>
                <th className="py-2.5 px-3 w-40">Expense Category</th>
                <th className="py-2.5 px-3 w-40">Activity</th>
                <th className="py-2.5 px-3 w-36">Vehicle (Armada)</th>
                <th className="py-2.5 px-3 w-36 text-right">Requested Amount</th>
                <th className="py-2.5 px-3">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD5E1]/60">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    No expense details added yet. Click &quot;Add Detail Expense&quot; above to insert an item.
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                    {/* Action buttons */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(index)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#EFF7FA] text-[#086288] hover:bg-[#DCEEF5] border border-[#B7DDEA] transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(index)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>

                    {/* Line Number */}
                    <td className="py-2 px-3 text-center font-bold text-slate-400">
                      {index + 1}
                    </td>

                    {/* Order By */}
                    <td className="py-2 px-3 font-medium text-[#0F172A]">
                      {row.orderByTargetName}
                    </td>

                    {/* Cost Center */}
                    <td className="py-2 px-3">
                      <span className="font-mono text-[10px] font-bold text-[#086288] bg-[#EFF7FA] px-2 py-0.5 rounded border border-[#B7DDEA]">
                        {row.costCenterCode}
                      </span>
                    </td>

                    {/* Expense Category */}
                    <td className="py-2 px-3 text-[#475569]">
                      {row.category}
                    </td>

                    {/* Activity */}
                    <td className="py-2 px-3 text-[#475569]">
                      {row.activity}
                    </td>

                    {/* Vehicle */}
                    <td className="py-2 px-3 font-mono text-[#475569]">
                      {row.licensePlate || '-'}
                    </td>

                    {/* Requested Amount */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#0F172A]">
                      Rp {(Number(row.nominal) || 0).toLocaleString('id-ID')}
                    </td>

                    {/* Remark */}
                    <td className="py-2 px-3 text-[#64748B] max-w-xs truncate">
                      {row.remark || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-[#F8FAFC] border-t border-[#CBD5E1] text-xs font-bold text-[#0F172A]">
              <tr>
                <td colSpan={7} className="py-2.5 px-3 text-right">
                  Total:
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#086288] text-sm">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. FORM FOOTER: COST CENTER ALLOCATION & FORM ACTIONS                 */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        {/* Cost Center Allocation Summary */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="font-semibold text-slate-500">Cost Center Allocation:</span>
          {costCenterBreakdown.length === 0 ? (
            <span className="text-slate-400">—</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {costCenterBreakdown.map((cc) => {
                const percentage = totalAmount > 0 ? ((cc.total / totalAmount) * 100).toFixed(0) : '0';
                return (
                  <span
                    key={cc.code}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-[#CBD5E1] text-[#0F172A]"
                  >
                    <span className="font-mono font-bold text-[#086288]">{cc.code}</span>
                    <span className="text-slate-500">({percentage}%)</span>
                    <span className="font-mono font-semibold">Rp {cc.total.toLocaleString('id-ID')}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveClaim('submitted')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-5 py-2 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Memproses...' : 'Submit Claim'}</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSaveClaim('draft')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] disabled:opacity-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#CBD5E1] disabled:opacity-50 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* POPUP MODAL: ADD / EDIT DETAIL EXPENSE */}
      {isModalOpen && (
        <AddDetailExpenseModal
          key={`claim-expense-modal-${modalSessionId}`}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveModalItem}
          initialData={editingItemIndex !== null ? items[editingItemIndex] : null}
          businessLines={businessLines}
          branches={branches}
          employees={employees}
        />
      )}
    </div>
  );
};
