/**
 * Zyvora ERP 1.0.0 — Cost Ratio Report View
 * 100% Card-Free, Pure Diagram-First Executive Report
 * Wrapped within standard PageShell for consistent breadcrumb & layout width.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Building2,
  Download,
  Printer,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  PieChart,
  GitFork,
  Gauge
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import {
  CostRatioReportSummary,
  CostRatioReportFilter,
  BusinessLineCostRatioData
} from '../../types/erp';
import { ReportingService } from '../../services/reportingService';

export const CostRatioReportView: React.FC = () => {
  const { tenant, branches, serviceBookings, salesOrders, invoices, addToast } = useErp();

  // Filter States
  const [period, setPeriod] = useState<CostRatioReportFilter['period']>('this_month');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [reportData, setReportData] = useState<CostRatioReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load report data
  const loadReport = async () => {
    setIsLoading(true);
    try {
      const summary = await ReportingService.getCostRatioReport(
        tenant.id,
        { period, branchId: selectedBranchId },
        { serviceBookings, salesOrders, invoices }
      );
      setReportData(summary);
    } catch (err) {
      console.error('Failed to load Cost Ratio report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [tenant.id, period, selectedBranchId, serviceBookings, salesOrders, invoices]);

  // Format currency helper
  const formatRupiah = (val: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const commercialLines = useMemo(() => {
    if (!reportData) return [];
    return reportData.lines.filter((l) => l.businessLineCode !== 'HOLDING');
  }, [reportData]);

  // Max value for side-by-side bar scaling
  const maxBarValue = useMemo(() => {
    if (!commercialLines.length) return 100000000;
    const maxVal = Math.max(
      ...commercialLines.map((l) => Math.max(l.revenue, l.totalCost))
    );
    return Math.ceil(maxVal / 20000000) * 20000000; // Round up to nearest 20M
  }, [commercialLines]);

  const hasTransactions = Boolean(reportData && (reportData.totalRevenue > 0 || reportData.totalCost > 0));

  // Resolve clean brand display name
  const resolveBrandDisplayName = (line: BusinessLineCostRatioData): string => {
    if (line.businessLineCode === 'HIZAKI') return 'Hizaki Wedding';
    if (line.businessLineCode === 'KIMIKO') return 'Ki Mi Ko Pager Ayu';
    if (line.businessLineCode === 'AURUM') return 'Aurum Deco';
    if (line.businessLineCode === 'HOLDING') return 'Holding / Shared';
    return line.businessLineName;
  };

  const handleExportCsv = () => {
    if (!reportData) return;
    const headers = [
      'Business Line',
      'Cost Center',
      'Revenue (Omzet)',
      'Direct Cost',
      'Holding Cost Share',
      'Total Real Cost',
      'Cost Ratio (%)',
      'Net Margin (Rp)',
      'Margin (%)',
      'Status'
    ];
    const rows = reportData.lines.map((l) => [
      `"${l.businessLineName}"`,
      l.costCenterCode,
      l.revenue,
      l.directCost,
      l.sharedHoldingCost,
      l.totalCost,
      `${l.costRatioPercent}%`,
      l.netOperatingMargin,
      `${l.marginPercent}%`,
      l.status.toUpperCase()
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Zyvora_Cost_Ratio_Report_${tenant.code}_${period}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Report Exported', 'Cost Ratio matrix exported to CSV file.', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* 1. TOP HEADER & FILTER PANEL (Zyvora Standard Container) */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE5EC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                Cost Ratio & Omzet Analytics
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Visual financial comparison of brand revenues, operating costs, and holding cost-shares
              </p>
            </div>
          </div>

          {/* Action Buttons: Export CSV & Print */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DCE5EC] hover:bg-[#F8FAFC] text-[#475569] rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#064B6A] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Period Range</label>
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as CostRatioReportFilter['period'])}
                className="w-full bg-white border border-[#DCE5EC] rounded-md pl-8 pr-3 py-2 text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              >
                <option value="this_month">Current Month (October 2026)</option>
                <option value="this_quarter">Current Quarter (Q4 2026)</option>
                <option value="this_year">Fiscal Year 2026</option>
                <option value="all_time">All Time Consolidation</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-[#086288] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Branch Placement</label>
            <div className="relative">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full bg-white border border-[#DCE5EC] rounded-md pl-8 pr-3 py-2 text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              >
                <option value="all">All Branches (Pusat & Cabang)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Building2 className="w-3.5 h-3.5 text-[#086288] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Accounting Entity</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={`${tenant.code} — ${tenant.name}`}
                className="w-full bg-[#F8FAFC] border border-[#DCE5EC] rounded-md pl-8 pr-3 py-2 text-xs text-[#475569] font-medium cursor-not-allowed outline-none"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-[#086288] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {isLoading || !reportData ? (
        <div className="py-20 text-center text-[#94A3B8] text-sm">
          Loading Cost Ratio analytics and compiling diagram metrics...
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION A: DIAGRAM 1 & DIAGRAM 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DIAGRAM 1: SIDE-BY-SIDE REVENUE VS COST (BAR CHART) */}
            <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#DCE5EC] gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                        Diagram 1: Omzet vs Real Operating Cost
                      </h3>
                      <p className="text-[11px] text-[#64748B]">
                        Side-by-side revenue and total cost per business line
                      </p>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 text-xs font-medium shrink-0">
                    <span className="flex items-center gap-1.5 text-[#0F172A]">
                      <span className="w-3 h-3 rounded-xs bg-[#086288] inline-block" />
                      <span>Omzet</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[#0F172A]">
                      <span className="w-3 h-3 rounded-xs bg-[#E11D48] inline-block" />
                      <span>Total Cost</span>
                    </span>
                  </div>
                </div>

                {/* SVG Side-by-Side Bar Chart */}
                <div className="w-full pt-2">
                  {!hasTransactions ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-b border-[#DCE5EC] bg-[#F8FAFC]/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] mb-2.5">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-[#0F172A]">Belum Ada Transaksi Omzet & Biaya</h4>
                      <p className="text-[11px] text-[#64748B] mt-1 max-w-xs leading-relaxed">
                        Seluruh data dummy telah dibersihkan. Grafik komparasi akan terisi otomatis setelah ada transaksi penjualan atau pencatatan beban operasional.
                      </p>
                    </div>
                  ) : (
                    <div className="relative h-64 flex items-end justify-around gap-2 px-4 pb-6 pt-4 border-b border-[#DCE5EC] bg-[#F8FAFC]/50 rounded-lg">
                    {/* Background grid lines */}
                    <div className="absolute inset-x-0 top-6 border-b border-dashed border-[#E2E8F0]" />
                    <div className="absolute inset-x-0 top-24 border-b border-dashed border-[#E2E8F0]" />
                    <div className="absolute inset-x-0 top-42 border-b border-dashed border-[#E2E8F0]" />

                    {commercialLines.map((line) => {
                      const revHeightPct = Math.min(
                        100,
                        Math.max(12, (line.revenue / maxBarValue) * 100)
                      );
                      const costHeightPct = Math.min(
                        100,
                        Math.max(12, (line.totalCost / maxBarValue) * 100)
                      );
                      const isSurplus = line.netOperatingMargin >= 0;
                      const brandName = resolveBrandDisplayName(line);

                      return (
                        <div
                          key={line.businessLineId}
                          className="flex flex-col items-center flex-1 max-w-[130px] h-full justify-end z-10 group"
                        >
                          {/* Delta indicator tag */}
                          <div className="mb-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white shadow-2xs border border-[#DCE5EC] text-[#0F172A] opacity-90 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {isSurplus ? '+' : ''}
                            {formatRupiah(line.netOperatingMargin)}
                          </div>

                          {/* Bars container */}
                          <div className="w-full flex items-end justify-center gap-2 h-44">
                            {/* Revenue Bar */}
                            <div className="flex-1 flex flex-col items-center justify-end h-full">
                              <span className="text-[9px] font-mono font-bold text-[#086288] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(line.revenue / 1000000).toFixed(0)} Jt
                              </span>
                              <div
                                style={{ height: `${revHeightPct}%` }}
                                className="w-full bg-[#086288] hover:bg-[#064B6A] rounded-t-md transition-all duration-500 shadow-2xs relative cursor-pointer"
                                title={`Revenue: ${formatRupiah(line.revenue)}`}
                              />
                            </div>

                            {/* Cost Bar */}
                            <div className="flex-1 flex flex-col items-center justify-end h-full">
                              <span className="text-[9px] font-mono font-bold text-[#E11D48] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(line.totalCost / 1000000).toFixed(0)} Jt
                              </span>
                              <div
                                style={{ height: `${costHeightPct}%` }}
                                className="w-full bg-[#E11D48] hover:bg-[#BE123C] rounded-t-md transition-all duration-500 shadow-2xs relative cursor-pointer"
                                title={`Total Cost: ${formatRupiah(line.totalCost)}`}
                              />
                            </div>
                          </div>

                          {/* Business Line Label (Fixed: Shows full friendly brand name) */}
                          <div className="mt-2.5 text-center">
                            <span className="text-xs font-bold text-[#0F172A] block truncate max-w-[125px]" title={line.businessLineName}>
                              {brandName}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-[#086288]">
                              {line.costCenterCode}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              </div>

              {/* Bottom Insight Footer */}
              <div className="mt-4 pt-3 border-t border-[#DCE5EC] flex items-center justify-between text-xs text-[#475569]">
                <span>Total Omzet Grup: <strong className="text-[#086288]">{formatRupiah(reportData.totalRevenue)}</strong></span>
                <span>Total Biaya Riil: <strong className="text-[#E11D48]">{formatRupiah(reportData.totalCost)}</strong></span>
              </div>
            </div>

            {/* DIAGRAM 2: HORIZONTAL EFFICIENCY GAUGE (COST RATIO THRESHOLDS) */}
            <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#DCE5EC] gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] shrink-0">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                        Diagram 2: Cost Ratio Efficiency Thresholds
                      </h3>
                      <p className="text-[11px] text-[#64748B]">
                        Health gauge against standard ratio tolerance bands
                      </p>
                    </div>
                  </div>

                  {/* Threshold Legend */}
                  <div className="flex items-center gap-2 text-[11px] shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      ≤60% Healthy
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      61-80% Moderate
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                      &gt;80% Alert
                    </span>
                  </div>
                </div>

                {/* Horizontal Progress Threshold Bars */}
                <div className="space-y-4 pt-1">
                  {!hasTransactions ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[#F8FAFC]/50 rounded-lg border border-[#DCE5EC]">
                      <div className="w-10 h-10 rounded-full bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] mb-2.5">
                        <Gauge className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-[#0F172A]">Belum Ada Rasio Efisiensi</h4>
                      <p className="text-[11px] text-[#64748B] mt-1 max-w-xs leading-relaxed">
                        Ambang batas efisiensi biaya (≤60% Healthy) akan dievaluasi secara otomatis saat terdapat realisasi pendapatan & biaya pada unit bisnis.
                      </p>
                    </div>
                  ) : (
                    commercialLines.map((line) => {
                    const ratio = line.costRatioPercent;
                    const barFillColor =
                      line.status === 'healthy'
                        ? 'bg-emerald-600'
                        : line.status === 'moderate'
                        ? 'bg-amber-500'
                        : 'bg-rose-600';

                    const badgeColor =
                      line.status === 'healthy'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : line.status === 'moderate'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200';

                    const brandName = resolveBrandDisplayName(line);

                    return (
                      <div key={line.businessLineId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0F172A]">
                              {brandName}
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                              {line.costCenterCode}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                              {ratio}%
                            </span>
                            <span className="text-[11px] text-[#64748B]">
                              Margin: {line.marginPercent}%
                            </span>
                          </div>
                        </div>

                        {/* Tri-Zone Gauge Bar */}
                        <div className="relative w-full h-4 rounded-full bg-[#F1F5F9] overflow-hidden flex shadow-inner">
                          {/* Green Zone (0-60%) */}
                          <div className="w-[60%] h-full bg-emerald-50/80 border-r border-dashed border-emerald-300" />
                          {/* Amber Zone (60-80%) */}
                          <div className="w-[20%] h-full bg-amber-50/80 border-r border-dashed border-amber-300" />
                          {/* Red Zone (80-100%) */}
                          <div className="w-[20%] h-full bg-rose-50/80" />

                          {/* Actual Ratio Fill Indicator */}
                          <div
                            style={{ width: `${Math.min(100, ratio)}%` }}
                            className={`absolute top-0 left-0 bottom-0 ${barFillColor} rounded-full transition-all duration-700 opacity-90 shadow-2xs`}
                          />
                        </div>
                      </div>
                    );
                  }))}
                </div>
              </div>

              {/* Group Average Insight Footer */}
              <div className="mt-4 pt-3 border-t border-[#DCE5EC] flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Rata-rata Cost Ratio Seluruh Bisnis:</span>
                <span className="font-mono font-bold text-sm text-[#086288]">
                  {reportData.averageCostRatio}%
                  <span className="text-xs font-normal text-[#64748B] ml-1.5">
                    ({reportData.overallStatus.toUpperCase()})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* SECTION B: DIAGRAM 3 & DIAGRAM 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DIAGRAM 3: COST STRUCTURE COMPOSITION (DONUT RING CHART) */}
            <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between min-w-0">
              <div className="min-w-0">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DCE5EC]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] shrink-0">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#0F172A] tracking-tight truncate">
                        Diagram 3: Cost Structure Composition
                      </h3>
                      <p className="text-[11px] text-[#64748B] truncate">
                        Proportional distribution across primary operational cost categories
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] shrink-0">
                    100% Accounted
                  </span>
                </div>

                {/* Donut SVG & Legend Layout */}
                {reportData.costBreakdown.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-[#F8FAFC]/50 rounded-lg border border-[#DCE5EC] my-2 min-h-[180px]">
                    <div className="w-10 h-10 rounded-full bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] mb-2.5">
                      <PieChart className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#0F172A]">Belum Ada Komposisi Beban Biaya</h4>
                    <p className="text-[11px] text-[#64748B] mt-1 max-w-xs leading-relaxed">
                      Struktur biaya operasional saat ini Rp 0. Tidak ada klaim beban untuk diklasifikasikan.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-5 pt-1 pb-2 min-w-0">
                  {/* SVG Donut Ring */}
                  <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Base circle track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#F1F5F9"
                        strokeWidth="13"
                      />
                      {/* Dynamic Segments */}
                      {(() => {
                        const circumference = 2 * Math.PI * 38; // ~238.761
                        let accumulatedOffset = 0;
                        return reportData.costBreakdown.map((item) => {
                          const strokeLength = (item.percentage / 100) * circumference;
                          const currentOffset = accumulatedOffset;
                          accumulatedOffset += strokeLength;
                          return (
                            <circle
                              key={item.category}
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="13"
                              strokeDasharray={`${strokeLength.toFixed(2)} ${circumference.toFixed(2)}`}
                              strokeDashoffset={-currentOffset}
                              className="transition-all duration-500 hover:opacity-85"
                            />
                          );
                        });
                      })()}
                    </svg>
                    {/* Donut Inner Center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                      <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">
                        Total Beban
                      </span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-[#0F172A] mt-0.5">
                        Rp {(reportData.totalCost / 1000000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Jt
                      </span>
                    </div>
                  </div>

                  {/* Structured Legend Cards (Stacked Layout — Guaranteed Zero Overflow & Zero Clipping) */}
                  <div className="flex-1 min-w-0 w-full space-y-2">
                    {reportData.costBreakdown.map((item) => (
                      <div
                        key={item.category}
                        className="p-2 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] hover:border-[#DCE5EC] hover:bg-white transition-all min-w-0"
                      >
                        {/* Line 1: Indicator Dot + Category Title + Percentage Badge */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: item.color }}
                            />
                            <span
                              className="text-[#0F172A] font-semibold text-xs truncate"
                              title={`${item.label} (${item.brandName || ''})`}
                            >
                              {item.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-[#DCE5EC] text-[#086288] shrink-0">
                            {item.percentage}%
                          </span>
                        </div>

                        {/* Line 2: Brand Tag + Full Rupiah Nominal (shrink-0 ensures no amount is clipped) */}
                        <div className="flex items-center justify-between text-[11px] mt-1 pl-[18px]">
                          <span className="font-mono text-[10px] text-[#64748B] truncate pr-2">
                            {item.brandName || 'Operasional'}
                          </span>
                          <span className="font-mono font-bold text-[#0F172A] text-xs shrink-0">
                            {formatRupiah(item.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>

              {/* Bottom Insight Footer */}
              <div className="mt-4 pt-3 border-t border-[#DCE5EC] text-xs text-[#64748B] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#086288]" />
                <span>Seluruh transaksi klaim BBM & personil terpetakan otomatis ke pos masing-masing.</span>
              </div>
            </div>

            {/* DIAGRAM 4: HOLDING COST SHARE DISTRIBUTION FLOW (SANKEY-STYLE FLOW) */}
            <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DCE5EC]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] shrink-0">
                      <GitFork className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                        Diagram 4: Holding Cost Share Distribution Flow
                      </h3>
                      <p className="text-[11px] text-[#64748B]">
                        Zero-leakage flow allocation from CC-SHARED-HOLDING to commercial brands
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    Zero Leakage
                  </span>
                </div>

                {/* Flow Diagram (Left to Right) */}
                {reportData.holdingDistribution.totalHoldingPool === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-[#F8FAFC]/50 rounded-lg border border-[#DCE5EC] my-2 min-h-[180px]">
                    <div className="w-10 h-10 rounded-full bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] mb-2.5">
                      <GitFork className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#0F172A]">Zero Shared Cost (Beban Holding Rp 0)</h4>
                    <p className="text-[11px] text-[#64748B] mt-1 max-w-xs leading-relaxed">
                      Beban kantor pusat CC-SHARED-HOLDING bernilai Rp 0. Tidak ada biaya bersama yang perlu didistribusikan ke unit bisnis komersial.
                    </p>
                  </div>
                ) : (
                  <div className="py-2 flex flex-col sm:flex-row items-center gap-4">
                  {/* Left: Source Holding Pool */}
                  <div className="p-4 rounded-xl bg-[#EFF7FA] border-2 border-[#B7DDEA] text-center w-full sm:w-48 shrink-0 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-[#086288] tracking-wider block">
                      Source Cost Pool
                    </span>
                    <h4 className="text-xs font-bold text-[#0F172A] mt-1">
                      Holding / Shared Services
                    </h4>
                    <span className="font-mono text-[10px] text-[#086288] font-bold block mt-0.5">
                      CC-SHARED-HOLDING
                    </span>
                    <div className="mt-2 text-sm font-mono font-bold text-[#086288]">
                      {formatRupiah(reportData.holdingDistribution.totalHoldingPool)}
                    </div>
                    <span className="text-[10px] text-[#64748B] block mt-1">
                      Beban Kantor Pusat & Shared Admin
                    </span>
                  </div>

                  {/* Center: Distribution Connectors */}
                  <div className="hidden sm:flex flex-col items-center justify-around h-36 px-2 text-[#94A3B8]">
                    <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#086288]">
                      <span>Allocated</span>
                      <ArrowRight className="w-4 h-4 text-[#086288]" />
                    </div>
                  </div>

                  {/* Right: Recipient Commercial Lines */}
                  <div className="flex-1 w-full space-y-2.5">
                    {reportData.holdingDistribution.distributions.map((dist) => (
                      <div
                        key={dist.targetLineId}
                        className="p-3 rounded-lg border border-[#DCE5EC] bg-[#F8FAFC] flex items-center justify-between text-xs hover:border-[#086288] transition-colors"
                      >
                        <div>
                          <div className="font-bold text-[#0F172A]">
                            {dist.targetLineName}
                          </div>
                          <span className="font-mono text-[10px] text-[#64748B]">
                            {dist.costCenterCode} • Beban {dist.percentage}%
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-[#086288] text-xs">
                            +{formatRupiah(dist.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>

              {/* Bottom Insight Footer */}
              <div className="mt-4 pt-3 border-t border-[#DCE5EC] text-xs text-[#64748B] flex items-center justify-between">
                <span>Alokasi bersama dibagi rata secara adil tanpa sisa 1 Rupiah pun.</span>
                <span className="font-mono font-bold text-emerald-700">Balance: 100%</span>
              </div>
            </div>
          </div>

          {/* SECTION C: DETAILED MATRIX DATA TABLE */}
          <div className="bg-white border border-[#DCE5EC] rounded-xl shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#DCE5EC] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288] shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Cost Ratio Matrix & Profitability Table
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Detailed breakdown by business line, direct cost, holding cost-share, and net margin
                  </p>
                </div>
              </div>
              <div className="text-xs font-medium text-[#64748B]">
                Period: <span className="text-[#0F172A] font-bold">{reportData.periodLabel}</span>
              </div>
            </div>

            {!hasTransactions && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center gap-2.5 text-xs text-[#086288]">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#086288]" />
                <span>Workspace bersih dari seluruh data dummy. Nilai omzet dan biaya akan langsung terhitung secara otomatis saat Anda mencatat transaksi penjualan atau beban operasional.</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DCE5EC] bg-[#F8FAFC] text-[#475569] font-bold">
                    <th className="py-3 px-4">Business Line</th>
                    <th className="py-3 px-4">Cost Center</th>
                    <th className="py-3 px-4 text-right">Omzet (Revenue)</th>
                    <th className="py-3 px-4 text-right">Direct Cost</th>
                    <th className="py-3 px-4 text-right">Cost Share Holding</th>
                    <th className="py-3 px-4 text-right font-bold text-[#0F172A]">Total Real Cost</th>
                    <th className="py-3 px-4 text-center font-bold text-[#086288]">Cost Ratio (%)</th>
                    <th className="py-3 px-4 text-right font-bold text-emerald-700">Net Margin</th>
                    <th className="py-3 px-4 text-center">Health Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE5EC]">
                  {reportData.lines.map((line) => {
                    const isHolding = line.businessLineCode === 'HOLDING';

                    return (
                      <tr
                        key={line.businessLineId}
                        className={`hover:bg-[#F8FAFC] transition-colors ${
                          isHolding ? 'bg-[#F8FAFC]/60 italic text-[#64748B]' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">
                          {line.businessLineName}
                          {isHolding && (
                            <span className="not-italic text-[10px] text-[#086288] ml-1.5 font-bold">
                              (Shared Services Pool)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#086288]">
                          {line.costCenterCode}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F172A]">
                          {formatRupiah(line.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#475569]">
                          {formatRupiah(line.directCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#6366F1]">
                          {isHolding
                            ? `(${formatRupiah(Math.abs(line.sharedHoldingCost))})`
                            : `+${formatRupiah(line.sharedHoldingCost)}`}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#E11D48]">
                          {formatRupiah(line.totalCost)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-xs">
                          {isHolding ? (
                            <span className="text-[#94A3B8]">—</span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded ${
                                line.status === 'healthy'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : line.status === 'moderate'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {line.costRatioPercent}%
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {isHolding ? (
                            <span className="text-[#94A3B8]">—</span>
                          ) : (
                            formatRupiah(line.netOperatingMargin)
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isHolding ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                              Distributed
                            </span>
                          ) : line.status === 'healthy' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Healthy</span>
                            </span>
                          ) : line.status === 'moderate' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Moderate</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              <span>Attention</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#DCE5EC] bg-[#EFF7FA]/50 font-bold text-xs text-[#0F172A]">
                    <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider">
                      Konsolidasi Grup Zyvora
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#086288] text-sm">
                      {formatRupiah(reportData.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#475569]">
                      {formatRupiah(reportData.totalDirectCost)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#6366F1]">
                      {formatRupiah(0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#E11D48] text-sm">
                      {formatRupiah(reportData.totalCost)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-sm text-[#086288]">
                      {reportData.averageCostRatio}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 text-sm">
                      {formatRupiah(reportData.netMargin)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        {reportData.overallStatus.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
