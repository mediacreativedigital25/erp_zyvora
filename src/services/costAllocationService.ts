/**
 * Zyvora ERP 1.0.0 — Cost Allocation Engine Service
 *
 * Mengelola alokasi biaya / Cost Center berbasis Lini Bisnis:
 * 1. Mode 'single': 100% beban dialokasikan ke satu Lini Bisnis spesifik.
 * 2. Mode 'shared_equal': Beban dibagi rata secara proporsional ke seluruh Lini Bisnis aktif,
 *    dengan presisi pembulatan Rupiah (Zero Penny Leakage).
 */

import {
  TenantBusinessLine,
  CostAllocationMode,
  CostAllocationBreakdown,
  CostAllocationResult,
  Employee
} from '../types/erp';

export class CostAllocationService {
  /**
   * Menghasilkan kode Cost Center terstandarisasi untuk Lini Bisnis
   * Contoh: 'LOB-01' -> 'CC-LOB-01'
   */
  static generateCostCenterCode(lobCode: string): string {
    const cleanCode = (lobCode || '').trim().toUpperCase();
    if (cleanCode.startsWith('CC-')) return cleanCode;
    return `CC-${cleanCode || 'GEN'}`;
  }

  /**
   * Menghitung rincian pembagian biaya berdasarkan mode ('single' vs 'shared_equal')
   */
  static calculateAllocation(
    totalAmount: number,
    mode: CostAllocationMode,
    businessLines: TenantBusinessLine[],
    targetBusinessLineId?: string
  ): CostAllocationResult {
    const safeTotal = Math.max(0, Math.round(totalAmount));

    if (!businessLines || businessLines.length === 0) {
      return {
        mode,
        totalAmount: safeTotal,
        allocations: [],
        isBalanced: safeTotal === 0
      };
    }

    // 1. Mode: Single Lini Bisnis (100% Beban ke Lini Terpilih)
    if (mode === 'single') {
      let target = businessLines.find((b) => b.id === targetBusinessLineId);
      if (!target) {
        // Fallback ke Lini Bisnis Utama (Primary), atau elemen pertama
        target = businessLines.find((b) => b.isPrimary) || businessLines[0];
      }

      const costCenterCode = target.costCenterCode || this.generateCostCenterCode(target.code);

      const allocation: CostAllocationBreakdown = {
        businessLineId: target.id,
        businessLineCode: target.code,
        businessLineName: target.name,
        costCenterCode,
        percentage: 100,
        allocatedAmount: safeTotal
      };

      return {
        mode: 'single',
        totalAmount: safeTotal,
        allocations: [allocation],
        isBalanced: true
      };
    }

    // 2. Mode: Shared Equal (Dibagi Rata ke Seluruh Lini Bisnis Aktif)
    // Filter lini bisnis aktif yang mengizinkan pembagian beban bersama (allowSharedAllocation !== false)
    let eligibleLines = businessLines.filter(
      (b) => b.isActive && b.allowSharedAllocation !== false
    );

    // Fallback jika tidak ada lini yang memenuhi kriteria, gunakan lini aktif apapun
    if (eligibleLines.length === 0) {
      eligibleLines = businessLines.filter((b) => b.isActive);
    }
    // Fallback kedua jika semua nonaktif, gunakan semua lini
    if (eligibleLines.length === 0) {
      eligibleLines = businessLines;
    }

    const n = eligibleLines.length;
    if (n === 0) {
      return {
        mode: 'shared_equal',
        totalAmount: safeTotal,
        allocations: [],
        isBalanced: safeTotal === 0
      };
    }

    // Pembagian proporsional dengan alokasi sisa pembagian (Banker's Exact Remainder Allocation)
    const baseShare = Math.floor(safeTotal / n);
    const remainder = safeTotal - baseShare * n;

    const allocations: CostAllocationBreakdown[] = eligibleLines.map((line, idx) => {
      // Distribusikan sisa rupiah ke entitas-entitas awal (1 rupiah per entitas)
      const allocatedAmount = baseShare + (idx < remainder ? 1 : 0);
      const percentage = safeTotal > 0 ? Number(((allocatedAmount / safeTotal) * 100).toFixed(2)) : 0;
      const costCenterCode = line.costCenterCode || this.generateCostCenterCode(line.code);

      return {
        businessLineId: line.id,
        businessLineCode: line.code,
        businessLineName: line.name,
        costCenterCode,
        percentage,
        allocatedAmount
      };
    });

    const sumAllocated = allocations.reduce((acc, curr) => acc + curr.allocatedAmount, 0);

    return {
      mode: 'shared_equal',
      totalAmount: safeTotal,
      allocations,
      isBalanced: sumAllocated === safeTotal
    };
  }

  /**
   * Menyelesaikan alokasi beban untuk personil / karyawan (Claim Expense atau Gaji)
   */
  static resolvePersonilAllocation(
    employee: Employee,
    businessLines: TenantBusinessLine[],
    amount: number
  ): CostAllocationResult {
    const policy = employee.costAllocation;

    if (policy && policy.mode === 'shared_equal') {
      return this.calculateAllocation(amount, 'shared_equal', businessLines);
    }

    // Mode single: gunakan targetBusinessLineId dari policy atau shortcut employee.businessLineId
    const targetId = policy?.businessLineId || employee.businessLineId;
    return this.calculateAllocation(amount, 'single', businessLines, targetId);
  }
}
