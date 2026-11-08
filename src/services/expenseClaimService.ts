/**
 * Zyvora ERP 1.0.0 — Expense Claim Service
 * Manages Multi-Line Claim Expense Transactions & Cost Center Resolution
 * Numbering Pattern: CE + YYYYMM + 5-digit sequence (e.g. CE20261000001)
 */

import {
  ExpenseClaim,
  ExpenseClaimItem,
  ExpenseClaimStatus,
  ExpenseClaimOrderByType,
  TenantBusinessLine,
  Employee,
  Branch
} from '../types/erp';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { VehicleMasterService } from './vehicleMasterService';
import { DocumentNumberingService } from './documentNumberingService';

export const INITIAL_EXPENSE_CLAIMS: ExpenseClaim[] = [];

const LOCAL_STORAGE_KEY = 'ZYVORA_EXPENSE_CLAIMS_CACHE';

export class ExpenseClaimService {
  /**
   * Menghasilkan nomor dokumen klaim berikutnya.
   * Mendukung format standar modular: CE + [TENANT:3] + [BRANCH] + [YYYYMM] + [SEQUENCE:5]
   * Contoh: CE00120261000001 (Pusat) atau CE001A20261000001 (Cabang A)
   * Juga mendukung backward-compatibility fallback jika tenantCode tidak dispesifikasikan: CE20261000001
   */
  static generateNextClaimNumber(
    existingClaims: ExpenseClaim[],
    targetDate?: string,
    options?: { tenantCode?: string; branchSuffix?: string }
  ): string {
    if (options?.tenantCode) {
      return DocumentNumberingService.generateNextNumber(
        'CE',
        (existingClaims || []).map((c) => c.claimNumber),
        {
          tenantCode: options.tenantCode,
          branchSuffix: options.branchSuffix || '',
          targetDate
        }
      );
    }

    const d = targetDate ? new Date(targetDate) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const periodPrefix = `CE${year}${month}`; // e.g. 'CE202610'

    // Filter dokumen pada periode YYYYMM yang sama
    const matching = (existingClaims || []).filter(
      (c) => c.claimNumber && c.claimNumber.startsWith(periodPrefix)
    );

    let maxSeq = 0;
    for (const c of matching) {
      const seqStr = c.claimNumber.slice(periodPrefix.length);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }

    const nextSeq = maxSeq + 1;
    return `${periodPrefix}${String(nextSeq).padStart(5, '0')}`;
  }

  /**
   * Membaca daftar klaim biaya dari cloud server atau fallback lokal
   */
  static async getClaims(tenantId = 'ten_zyvora_corp'): Promise<ExpenseClaim[]> {
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data: claimsData, error: claimsError } = await client
          .from('expense_claims')
          .select('*, expense_claim_items(*)')
          .eq('tenant_id', tenantId)
          .order('claim_date', { ascending: false });

        if (!claimsError && claimsData) {
          const mapped = claimsData.map((row: any) => ({
            id: row.id,
            tenantId: row.tenant_id,
            claimNumber: row.claim_number,
            claimDate: row.claim_date,
            requestByUserId: row.request_by_user_id,
            requestByName: row.request_by_name,
            totalAmount: Number(row.total_amount) || 0,
            status: row.status as ExpenseClaimStatus,
            notes: row.notes,
            disbursementMethod: row.disbursement_method || 'petty_cash',
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
            paidAt: row.paid_at,
            rejectionReason: row.rejection_reason,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            items: (row.expense_claim_items || []).map((itemRow: any) => ({
              id: itemRow.id,
              claimId: itemRow.claim_id,
              lineNumber: itemRow.line_number,
              orderByType: itemRow.order_by_type,
              orderByTargetId: itemRow.order_by_target_id,
              orderByTargetName: itemRow.order_by_target_name,
              costCenterCode: itemRow.cost_center_code,
              category: itemRow.category,
              activity: itemRow.activity,
              isVehicleActivity: itemRow.is_vehicle_activity,
              vehicleId: itemRow.vehicle_id,
              licensePlate: itemRow.license_plate,
              odometerKm: itemRow.odometer_km ? Number(itemRow.odometer_km) : undefined,
              fuelLiters: itemRow.fuel_liters ? Number(itemRow.fuel_liters) : undefined,
              fuelPurchaseDate: itemRow.fuel_purchase_date,
              nominal: Number(itemRow.nominal) || 0,
              disbursementMethod: itemRow.disbursement_method || 'petty_cash',
              remark: itemRow.remark,
              receiptUrl: itemRow.receipt_url
            }))
          }));
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
          }
          return mapped;
        }
      } catch (err) {
        console.warn('Fallback to local storage for claims:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        let rawList: ExpenseClaim[] = cached ? JSON.parse(cached) : INITIAL_EXPENSE_CLAIMS;
        let list: ExpenseClaim[] = (rawList || []).filter((c) => !c.id.startsWith('claim_demo_'));
        if (cached && list.length !== (rawList || []).length) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
        }

        // Auto-heal duplicate claim numbers if any exist in cache
        let hasFixedDuplicates = false;
        const seenClaimNumbers = new Set<string>();

        // Sort ascending by createdAt/claimDate so earliest claims keep their sequence
        const ordered = [...list].sort((a, b) => {
          const tA = new Date(a.createdAt || a.claimDate).getTime() || 0;
          const tB = new Date(b.createdAt || b.claimDate).getTime() || 0;
          return tA - tB;
        });

        for (const item of ordered) {
          if (!item.claimNumber) continue;

          if (seenClaimNumbers.has(item.claimNumber)) {
            // Duplicate detected! Assign next sequential number for this prefix
            const prefix = item.claimNumber.slice(0, -5);
            let maxSeq = 0;
            for (const existingNum of seenClaimNumbers) {
              if (existingNum.startsWith(prefix)) {
                const seq = parseInt(existingNum.slice(prefix.length), 10);
                if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
              }
            }
            const nextSeq = maxSeq + 1;
            item.claimNumber = `${prefix}${String(nextSeq).padStart(5, '0')}`;
            hasFixedDuplicates = true;
          }
          seenClaimNumbers.add(item.claimNumber);
        }

        if (hasFixedDuplicates) {
          // Re-sort descending by claimDate/createdAt for standard list display
          list = ordered.sort((a, b) => {
            const tA = new Date(a.createdAt || a.claimDate).getTime() || 0;
            const tB = new Date(b.createdAt || b.claimDate).getTime() || 0;
            return tB - tA;
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
        }

        return list;
      } catch {}
    }

    return INITIAL_EXPENSE_CLAIMS;
  }

  /**
   * Menyimpan atau memperbarui dokumen klaim beserta baris-baris rinciannya
   */
  static async saveClaim(
    claim: ExpenseClaim,
    tenantId = 'ten_zyvora_corp',
    options?: { tenantCode?: string; branchSuffix?: string }
  ): Promise<ExpenseClaim> {
    const list = await this.getClaims(tenantId);
    let finalClaim: ExpenseClaim;

    // Hitung total nominal persis dari akumulasi baris
    const computedTotal = (claim.items || []).reduce((acc, item) => acc + (Number(item.nominal) || 0), 0);
    const safeTotal = Math.max(0, Math.round(computedTotal));

    // Cek apakah nomor klaim belum diisi atau nomor klaim ini SUDAH digunakan oleh dokumen lain
    const isNewClaim = !list.some((c) => c.id === claim.id);
    const isDuplicateNumber = list.some(
      (c) => c.id !== claim.id && c.claimNumber === claim.claimNumber
    );

    if (!claim.claimNumber || (isNewClaim && isDuplicateNumber)) {
      claim.claimNumber = this.generateNextClaimNumber(list, claim.claimDate, {
        tenantCode: options?.tenantCode || '001',
        branchSuffix: options?.branchSuffix || ''
      });
    }

    const idx = list.findIndex((c) => c.id === claim.id);
    if (idx >= 0) {
      finalClaim = {
        ...list[idx],
        ...claim,
        totalAmount: safeTotal,
        updatedAt: new Date().toISOString()
      };
      list[idx] = finalClaim;
    } else {
      finalClaim = {
        ...claim,
        id: claim.id || `claim_${Date.now()}`,
        tenantId,
        totalAmount: safeTotal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.unshift(finalClaim);
    }

    // Update meter KM armada jika ada item aktivitas kendaraan
    for (const item of finalClaim.items || []) {
      if (item.isVehicleActivity && item.vehicleId && item.odometerKm) {
        await VehicleMasterService.updateOdometer(item.vehicleId, item.odometerKm, tenantId);
      }
    }

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        // 1. Upsert Header
        await client.from('expense_claims').upsert({
          id: finalClaim.id,
          tenant_id: tenantId,
          claim_number: finalClaim.claimNumber,
          claim_date: finalClaim.claimDate,
          request_by_user_id: finalClaim.requestByUserId,
          request_by_name: finalClaim.requestByName,
          total_amount: finalClaim.totalAmount,
          status: finalClaim.status,
          notes: finalClaim.notes,
          disbursement_method: finalClaim.disbursementMethod,
          approved_by: finalClaim.approvedBy,
          approved_at: finalClaim.approvedAt,
          paid_at: finalClaim.paidAt,
          rejection_reason: finalClaim.rejectionReason,
          updated_at: new Date().toISOString()
        });

        // 2. Refresh items (Delete & Insert lines)
        await client.from('expense_claim_items').delete().eq('claim_id', finalClaim.id);
        if (finalClaim.items && finalClaim.items.length > 0) {
          const insertPayload = finalClaim.items.map((it, lIdx) => ({
            id: it.id || `item_${finalClaim.id}_${lIdx + 1}`,
            claim_id: finalClaim.id,
            line_number: lIdx + 1,
            order_by_type: it.orderByType,
            order_by_target_id: it.orderByTargetId,
            order_by_target_name: it.orderByTargetName,
            cost_center_code: it.costCenterCode,
            category: it.category,
            activity: it.activity,
            is_vehicle_activity: Boolean(it.isVehicleActivity),
            vehicle_id: it.vehicleId || null,
            license_plate: it.licensePlate || null,
            odometer_km: it.odometerKm || null,
            fuel_liters: it.fuelLiters || null,
            fuel_purchase_date: it.fuelPurchaseDate || null,
            nominal: it.nominal,
            disbursement_method: it.disbursementMethod,
            remark: it.remark || null,
            receipt_url: it.receiptUrl || null
          }));
          await client.from('expense_claim_items').insert(insertPayload);
        }
      } catch (err) {
        console.warn('Failed to upsert claim to cloud server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }

    return finalClaim;
  }

  /**
   * Mengubah status klaim (Submit, Approve, Disburse/Pay, Reject)
   */
  static async updateStatus(
    claimId: string,
    newStatus: ExpenseClaimStatus,
    options?: {
      actorName?: string;
      rejectionReason?: string;
      transactionId?: string;
      transactionNumber?: string;
    },
    tenantId = 'ten_zyvora_corp'
  ): Promise<ExpenseClaim | null> {
    const list = await this.getClaims(tenantId);
    const target = list.find((c) => c.id === claimId);
    if (!target) return null;

    target.status = newStatus;
    target.updatedAt = new Date().toISOString();

    if (newStatus === 'approved') {
      target.approvedBy = options?.actorName || 'Finance Approver';
      target.approvedAt = new Date().toISOString();
    } else if (newStatus === 'paid') {
      target.paidAt = new Date().toISOString();
      if (options?.transactionId) {
        target.disbursedCashTransactionId = options.transactionId;
      }
      if (options?.transactionNumber) {
        target.disbursedCashTransactionNumber = options.transactionNumber;
      }
    } else if (newStatus === 'rejected') {
      target.rejectionReason = options?.rejectionReason || 'Rejected by finance authority';
    }

    return await this.saveClaim(target, tenantId);
  }

  /**
   * Menghapus klaim (hanya diizinkan jika status draft atau rejected)
   */
  static async deleteClaim(claimId: string, tenantId = 'ten_zyvora_corp'): Promise<boolean> {
    const list = await this.getClaims(tenantId);
    const filtered = list.filter((c) => c.id !== claimId);

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('expense_claims').delete().eq('id', claimId).eq('tenant_id', tenantId);
      } catch (err) {
        console.warn('Failed to delete claim from server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      } catch {}
    }

    return true;
  }

  /**
   * Resolusi Otomatis Cost Center berdasarkan Order By Type & Target ID
   */
  static resolveCostCenter(
    orderByType: ExpenseClaimOrderByType,
    targetId: string,
    businessLines: TenantBusinessLine[],
    employees: Employee[],
    branches: Branch[]
  ): { costCenterCode: string; targetName: string } {
    if (orderByType === 'business_line') {
      const lob = businessLines.find((b) => b.id === targetId) || businessLines[0];
      if (lob) {
        const code = lob.costCenterCode || (lob.code === 'HOLDING' ? 'CC-SHARED-HOLDING' : `CC-LOB-${lob.code.toUpperCase()}`);
        return { costCenterCode: code, targetName: lob.name };
      }
      return { costCenterCode: 'CC-SHARED-HOLDING', targetName: 'Holding / Shared Services' };
    }

    if (orderByType === 'personnel') {
      const emp = (employees && employees.length > 0)
        ? (employees.find((e) => e.id === targetId) || employees[0])
        : undefined;

      if (emp) {
        // Priority 1: Direct cost center bound to employee record
        let code = emp.costCenterCode;

        // Priority 2: Direct business line assignment
        if (!code || code === 'CC-GEN' || code === 'CC-SHARED-STAFF') {
          if (emp.businessLineId) {
            const lob = businessLines.find((b) => b.id === emp.businessLineId);
            if (lob?.costCenterCode) {
              code = lob.costCenterCode;
            }
          }
        }

        // Priority 3: Fallback to Holding / Shared Services
        if (!code) {
          code = 'CC-SHARED-HOLDING';
        }

        const lineName =
          emp.businessLineName ||
          (emp.businessLineId ? businessLines.find((b) => b.id === emp.businessLineId)?.name : 'Holding / Shared Services');

        return {
          costCenterCode: code,
          targetName: `${emp.fullName}${lineName ? ` (${lineName})` : ''}`
        };
      }
      return { costCenterCode: 'CC-SHARED-HOLDING', targetName: 'Holding Personnel' };
    }

    if (orderByType === 'branch') {
      const br = branches.find((b) => b.id === targetId) || branches[0];
      if (br) {
        const code = `CC-BR-${br.code.toUpperCase()}`;
        return { costCenterCode: code, targetName: br.name };
      }
      return { costCenterCode: 'CC-BR-HQ', targetName: 'Headquarters' };
    }

    return { costCenterCode: 'CC-GEN', targetName: 'General Operational' };
  }
}
