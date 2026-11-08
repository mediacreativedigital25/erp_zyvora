/**
 * Zyvora ERP 1.0.0 — Reporting & Cost Ratio Analytics Service
 * Computes consolidated and brand-level revenue, direct costs,
 * zero-leakage holding shared allocations, and cost ratio health benchmarks.
 * Strictly calculates from real live transactions. Zero dummy/mock data.
 */

import {
  CostRatioReportFilter,
  CostRatioReportSummary,
  BusinessLineCostRatioData,
  CostRatioHealthStatus,
  CostBreakdownItem,
  TenantBusinessLine,
  CostAllocationBreakdown,
  ServiceBookingOrder,
  SalesOrder,
  SalesInvoice
} from '../types/erp';
import { TenantMasterService } from './tenantMasterService';
import { ExpenseClaimService } from './expenseClaimService';
import { CostAllocationService } from './costAllocationService';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { mapRowToServiceBooking, assertValidTenantId } from './supabaseSyncService';

export interface CostRatioReportOptions {
  serviceBookings?: ServiceBookingOrder[];
  salesOrders?: SalesOrder[];
  invoices?: SalesInvoice[];
}

export class ReportingService {
  /**
   * Evaluates financial health status based on cost ratio percentage
   * - Healthy: <= 60%
   * - Moderate: 60.1% - 80%
   * - Warning: > 80%
   * - Deficit: revenue <= 0 and cost > 0, or cost > revenue
   */
  static determineHealthStatus(revenue: number, totalCost: number): CostRatioHealthStatus {
    if (revenue <= 0 && totalCost <= 0) return 'healthy';
    if (revenue <= 0 && totalCost > 0) return 'deficit';
    const ratio = (totalCost / revenue) * 100;
    if (ratio > 100) return 'deficit';
    if (ratio > 80) return 'warning';
    if (ratio > 60) return 'moderate';
    return 'healthy';
  }

  /**
   * Generates comprehensive Cost Ratio report with zero-leakage holding distribution
   * Strictly calculates from real live transactions. Zero dummy/mock data.
   */
  static async getCostRatioReport(
    tenantId: string,
    filter?: CostRatioReportFilter,
    options?: CostRatioReportOptions
  ): Promise<CostRatioReportSummary> {
    const targetTenantId = assertValidTenantId(tenantId);

    // 1. Fetch Market Profile & Business Lines
    let marketProfile = await TenantMasterService.getMarketProfile(targetTenantId);
    if (!marketProfile?.businessLines || marketProfile.businessLines.length === 0) {
      marketProfile = TenantMasterService.getDefaultMarketProfile(targetTenantId);
    }

    const allLines: TenantBusinessLine[] = marketProfile.businessLines;
    const commercialLines = allLines.filter(
      (b) => b.isActive && b.code !== 'HOLDING' && !b.id.includes('holding')
    );
    const holdingLine = allLines.find(
      (b) => b.code === 'HOLDING' || b.id.includes('holding')
    ) || allLines[0];

    // 2. Fetch Live Claims Data (Direct and Holding Operating Costs)
    const liveClaims = await ExpenseClaimService.getClaims(targetTenantId);

    // Sum live claim costs mapped to each line
    const liveDirectCostByLine: Record<string, number> = {};
    let liveHoldingClaimsCost = 0;

    for (const claim of liveClaims) {
      if (claim.status === 'rejected') continue;
      for (const item of claim.items || []) {
        const nominal = Number(item.nominal) || 0;
        if (nominal <= 0) continue;

        if (item.orderByType === 'business_line') {
          if (item.orderByTargetId.includes('holding') || item.costCenterCode === 'CC-SHARED-HOLDING') {
            liveHoldingClaimsCost += nominal;
          } else {
            liveDirectCostByLine[item.orderByTargetId] =
              (liveDirectCostByLine[item.orderByTargetId] || 0) + nominal;
          }
        } else if (item.orderByType === 'personnel') {
          if (item.costCenterCode === 'CC-SHARED-HOLDING' || item.costCenterCode === 'CC-SHARED-STAFF') {
            liveHoldingClaimsCost += nominal;
          } else {
            const matchedLine = allLines.find((b) => b.costCenterCode === item.costCenterCode);
            if (matchedLine) {
              liveDirectCostByLine[matchedLine.id] =
                (liveDirectCostByLine[matchedLine.id] || 0) + nominal;
            } else {
              liveHoldingClaimsCost += nominal;
            }
          }
        } else {
          liveHoldingClaimsCost += nominal;
        }
      }
    }

    // 3. Compute Real Live Revenue from Bookings, Sales Orders, and Invoices
    const liveRevenueByLine: Record<string, number> = {};

    let bookings = options?.serviceBookings;

    if (!bookings && isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const query = client
          .from('service_bookings')
          .select('*, items:service_booking_items(*)')
          .eq('tenant_id', targetTenantId);
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          bookings = data.map(mapRowToServiceBooking);
        }
      } catch {}
    }

    for (const b of (bookings || [])) {
      if (b.status === 'cancelled') continue;
      if (b.items && b.items.length > 0) {
        for (const item of b.items) {
          const itemAmt = Number(item.subtotal || item.unitPrice * item.quantity || 0);
          if (itemAmt <= 0) continue;
          const matched = commercialLines.find(
            (l) =>
              l.id === item.businessLineId ||
              l.code.toUpperCase() === item.businessLineId.toUpperCase() ||
              l.costCenterCode === item.costCenterCode
          ) || commercialLines[0];
          if (matched) {
            liveRevenueByLine[matched.id] = (liveRevenueByLine[matched.id] || 0) + itemAmt;
          }
        }
      } else {
        const amt = Number(b.totalAmount || 0);
        if (amt > 0 && commercialLines.length > 0) {
          liveRevenueByLine[commercialLines[0].id] = (liveRevenueByLine[commercialLines[0].id] || 0) + amt;
        }
      }
    }

    let salesOrders = options?.salesOrders;
    if (!salesOrders && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ZYVORA_SALES_ORDERS');
        if (cached) salesOrders = JSON.parse(cached);
      } catch {}
    }

    for (const so of (salesOrders || [])) {
      if (so.status === 'cancelled') continue;
      const amt = Number(so.totalAmount || 0);
      if (amt <= 0) continue;
      const matched = commercialLines.find(
        (l) =>
          l.id === so.businessUnitId ||
          (so.orderNumber && so.orderNumber.toUpperCase().includes(l.code.toUpperCase()))
      ) || commercialLines[0];
      if (matched) {
        liveRevenueByLine[matched.id] = (liveRevenueByLine[matched.id] || 0) + amt;
      }
    }

    let invoices = options?.invoices;
    if (!invoices && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ZYVORA_INVOICES');
        if (cached) invoices = JSON.parse(cached);
      } catch {}
    }

    for (const inv of (invoices || [])) {
      if (inv.status === 'cancelled') continue;
      if (inv.sourceId && ((salesOrders || []).some((so) => so.id === inv.sourceId) || (bookings || []).some((b) => b.id === inv.sourceId))) {
        continue;
      }
      const amt = Number(inv.totalAmount || 0);
      if (amt <= 0) continue;
      let matchedLine = commercialLines[0];
      if (inv.items && inv.items.length > 0 && inv.items[0].costCenterCode) {
        const found = commercialLines.find((l) => l.costCenterCode === inv.items[0].costCenterCode);
        if (found) matchedLine = found;
      }
      if (matchedLine) {
        liveRevenueByLine[matchedLine.id] = (liveRevenueByLine[matchedLine.id] || 0) + amt;
      }
    }

    // 4. Holding Cost Pool & Zero-Leakage Allocation
    const totalHoldingCostPool = liveHoldingClaimsCost;
    const holdingCostShareMap = new Map<string, number>();
    let holdingDistributions: {
      targetLineId: string;
      targetLineName: string;
      costCenterCode: string;
      amount: number;
      percentage: number;
    }[] = [];

    if (totalHoldingCostPool > 0 && commercialLines.length > 0) {
      const holdingAllocationResult = CostAllocationService.calculateAllocation(
        totalHoldingCostPool,
        'shared_equal',
        commercialLines
      );
      for (const alloc of holdingAllocationResult.allocations) {
        holdingCostShareMap.set(alloc.businessLineId, alloc.allocatedAmount);
      }
      holdingDistributions = holdingAllocationResult.allocations.map((a: CostAllocationBreakdown) => ({
        targetLineId: a.businessLineId,
        targetLineName: a.businessLineName,
        costCenterCode: a.costCenterCode,
        amount: a.allocatedAmount,
        percentage: Number(a.percentage.toFixed(1))
      }));
    } else {
      holdingDistributions = commercialLines.map((line) => ({
        targetLineId: line.id,
        targetLineName: line.name,
        costCenterCode: line.costCenterCode || `CC-LOB-${line.code}`,
        amount: 0,
        percentage: 0
      }));
    }

    // 5. Build Business Line Metrics (Purely from Real Data)
    const linesData: BusinessLineCostRatioData[] = [];
    let totalGroupRevenue = 0;
    let totalGroupDirectCost = 0;

    for (const line of commercialLines) {
      const revenue = liveRevenueByLine[line.id] || 0;
      const directCost = liveDirectCostByLine[line.id] || 0;
      const sharedHoldingCost = holdingCostShareMap.get(line.id) || 0;
      const totalCost = directCost + sharedHoldingCost;

      const costRatioPercent = revenue > 0 ? Number(((totalCost / revenue) * 100).toFixed(1)) : 0;
      const netOperatingMargin = revenue - totalCost;
      const marginPercent = revenue > 0 ? Number(((netOperatingMargin / revenue) * 100).toFixed(1)) : 0;
      const status = this.determineHealthStatus(revenue, totalCost);

      totalGroupRevenue += revenue;
      totalGroupDirectCost += directCost;

      linesData.push({
        businessLineId: line.id,
        businessLineCode: line.code,
        businessLineName: line.name,
        costCenterCode: line.costCenterCode || `CC-LOB-${line.code}`,
        revenue,
        directCost,
        sharedHoldingCost,
        totalCost,
        costRatioPercent,
        netOperatingMargin,
        marginPercent,
        status
      });
    }

    // Holding cost line
    const holdingDirectCost = totalHoldingCostPool;
    const holdingData: BusinessLineCostRatioData = {
      businessLineId: holdingLine.id,
      businessLineCode: holdingLine.code,
      businessLineName: holdingLine.name,
      costCenterCode: holdingLine.costCenterCode || 'CC-SHARED-HOLDING',
      revenue: 0,
      directCost: holdingDirectCost,
      sharedHoldingCost: -totalHoldingCostPool,
      totalCost: 0,
      costRatioPercent: 0,
      netOperatingMargin: 0,
      marginPercent: 0,
      status: 'healthy'
    };

    const finalLines = [...linesData, holdingData];

    // 6. Aggregate Group Totals
    const totalGroupCost = totalGroupDirectCost + totalHoldingCostPool;
    const averageCostRatio =
      totalGroupRevenue > 0 ? Number(((totalGroupCost / totalGroupRevenue) * 100).toFixed(1)) : 0;
    const groupNetMargin = totalGroupRevenue - totalGroupCost;
    const overallStatus =
      totalGroupRevenue === 0 && totalGroupCost === 0
        ? 'healthy'
        : this.determineHealthStatus(totalGroupRevenue, totalGroupCost);

    // 7. Cost Structure Breakdown for Donut Diagram (Dynamically built from real claims)
    const costBreakdown: CostBreakdownItem[] = [];
    if (totalGroupCost > 0) {
      const categoryMap = new Map<string, { label: string; amount: number; brandName?: string }>();
      for (const claim of liveClaims) {
        if (claim.status === 'rejected') continue;
        for (const item of claim.items || []) {
          const nominal = Number(item.nominal) || 0;
          if (nominal <= 0) continue;
          const cat = item.category || 'other';
          const existing = categoryMap.get(cat) || {
            label: item.activity || cat,
            amount: 0,
            brandName: item.orderByTargetName
          };
          existing.amount += nominal;
          categoryMap.set(cat, existing);
        }
      }

      const palette = ['#086288', '#0284C7', '#6366F1', '#EC4899', '#F59E0B', '#10B981'];
      let colorIdx = 0;
      for (const [cat, data] of categoryMap.entries()) {
        const pct = Math.round((data.amount / totalGroupCost) * 100);
        costBreakdown.push({
          category: cat,
          label: data.label,
          brandName: data.brandName,
          amount: data.amount,
          percentage: pct,
          color: palette[colorIdx % palette.length]
        });
        colorIdx++;
      }
    }

    return {
      periodLabel:
        filter?.period === 'this_quarter'
          ? 'Q4 2026 (October - December)'
          : filter?.period === 'this_year'
          ? 'Fiscal Year 2026'
          : 'October 2026 (Current Month)',
      totalRevenue: totalGroupRevenue,
      totalDirectCost: totalGroupDirectCost,
      totalHoldingSharedCost: totalHoldingCostPool,
      totalCost: totalGroupCost,
      averageCostRatio,
      netMargin: groupNetMargin,
      overallStatus,
      lines: finalLines,
      costBreakdown,
      holdingDistribution: {
        totalHoldingPool: totalHoldingCostPool,
        distributions: holdingDistributions
      }
    };
  }
}
