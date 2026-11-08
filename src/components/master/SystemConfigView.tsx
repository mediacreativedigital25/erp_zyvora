import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Coins,
  Clock,
  Languages,
  Calendar,
  Hash,
  Save,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import {
  TenantSystemConfig,
  BaseCurrencyType,
  SystemTimezoneType,
  SystemLanguageType,
  SystemDateFormatType
} from '../../types/erp';
import { TenantMasterService } from '../../services/tenantMasterService';

const CURRENCIES: { code: BaseCurrencyType; name: string; symbol: string }[] = [
  { code: 'IDR', name: 'Rupiah Indonesia', symbol: 'Rp' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' }
];

const TIMEZONES: { code: SystemTimezoneType; label: string; offset: string }[] = [
  { code: 'Asia/Jakarta', label: 'WIB — Western Indonesia Time', offset: 'UTC+07:00' },
  { code: 'Asia/Makassar', label: 'WITA — Central Indonesia Time', offset: 'UTC+08:00' },
  { code: 'Asia/Jayapura', label: 'WIT — Eastern Indonesia Time', offset: 'UTC+09:00' },
  { code: 'UTC', label: 'UTC — Coordinated Universal Time', offset: 'UTC+00:00' }
];

const LANGUAGES: { code: SystemLanguageType; label: string; flag: string }[] = [
  { code: 'id', label: 'Indonesian (Bahasa Indonesia)', flag: '🇮🇩' },
  { code: 'en', label: 'English (International Standard)', flag: '🇬🇧' }
];

const DATE_FORMATS: { code: SystemDateFormatType; sample: string }[] = [
  { code: 'DD/MM/YYYY', sample: '24/10/2026 (Day/Month/Year)' },
  { code: 'YYYY-MM-DD', sample: '2026-10-24 (ISO 8601 Standard)' },
  { code: 'DD-MM-YYYY', sample: '24-10-2026' },
  { code: 'MM/DD/YYYY', sample: '10/24/2026 (US Format)' }
];

const FISCAL_YEARS = [
  { month: 1, label: 'January — December (Standard Tax Calendar)' },
  { month: 4, label: 'April — March (Fiscal Year Q2)' },
  { month: 7, label: 'July — June (Mid-Year Fiscal Cycle)' }
];

export const SystemConfigView: React.FC = () => {
  const { tenant, currentUser, addToast, updateSystemConfigState } = useErp();
  const canEdit = TenantMasterService.canEditMaster(currentUser);

  const [config, setConfig] = useState<TenantSystemConfig>(() =>
    TenantMasterService.getDefaultSystemConfig(tenant.id)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const data = await TenantMasterService.getSystemConfig(tenant.id);
        if (mounted) {
          setConfig(data);
        }
      } catch (err) {
        console.warn('Failed to load system config:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchConfig();
    return () => {
      mounted = false;
    };
  }, [tenant.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      addToast('Restricted Access', 'Only Super Admin, Owner, or Admin can modify system configuration.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await TenantMasterService.saveSystemConfig(config, currentUser);
      setConfig(res.config);
      updateSystemConfigState(res.config);
      addToast('Configuration Saved', 'System configuration has been saved successfully.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save system configuration.';
      addToast('Failed to Save', msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#DCE5EC] rounded-lg p-12 text-center text-[#475569]">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#086288] mb-3" />
        <p className="text-xs font-medium">Loading system configuration...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* RBAC Notice if user is read-only */}
      {!canEdit && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-3.5 flex items-center gap-3 text-xs text-[#92400E]">
          <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>
            <strong>Read-Only Mode:</strong> Your role ({currentUser.roleTitle || currentUser.role}) has view-only permissions. Modifying system configurations requires Super Admin, Tenant Owner, or Admin privileges.
          </span>
        </div>
      )}

      {/* SECTION 1: LOCALIZATION, CURRENCY & FORMATS */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#DCE5EC]">
          <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">Regional & Localization Settings</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          {/* Base Accounting Currency */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[#086288]" />
              <span>Base Accounting Currency</span>
            </label>
            <select
              disabled={!canEdit}
              value={config.baseCurrency}
              onChange={(e) => setConfig({ ...config, baseCurrency: e.target.value as BaseCurrencyType })}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#475569] mt-1">Denomination currency for general ledgers and balance sheets.</p>
          </div>

          {/* System Transaction Timezone */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#086288]" />
              <span>System Transaction Timezone</span>
            </label>
            <select
              disabled={!canEdit}
              value={config.timezone}
              onChange={(e) => setConfig({ ...config, timezone: e.target.value as SystemTimezoneType })}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.code} value={tz.code}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#475569] mt-1">Reference timestamp standard for all transactional audit logs.</p>
          </div>

          {/* Interface Language */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-[#086288]" />
              <span>Interface Language</span>
            </label>
            <select
              disabled={!canEdit}
              value={config.language}
              onChange={(e) => setConfig({ ...config, language: e.target.value as SystemLanguageType })}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#475569] mt-1">Terminology standard for corporate documents and navigation.</p>
          </div>

          {/* Date Display Format */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#086288]" />
              <span>Date Display Format</span>
            </label>
            <select
              disabled={!canEdit}
              value={config.dateFormat}
              onChange={(e) => setConfig({ ...config, dateFormat: e.target.value as SystemDateFormatType })}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {DATE_FORMATS.map((df) => (
                <option key={df.code} value={df.code}>
                  {df.sample}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#475569] mt-1">Visual date display across table columns and printed invoices.</p>
          </div>

          {/* Tahun Buku */}
          <div className="md:col-span-2">
            <label className="block font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#086288]" />
              <span>Fiscal Year Cycle</span>
            </label>
            <select
              disabled={!canEdit}
              value={config.fiscalYearStartMonth}
              onChange={(e) => setConfig({ ...config, fiscalYearStartMonth: parseInt(e.target.value, 10) })}
              className="w-full bg-white border border-[#DCE5EC] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {FISCAL_YEARS.map((fy) => (
                <option key={fy.month} value={fy.month}>
                  {fy.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#475569] mt-1">Annual book-closing boundary and retained earnings calculation cycle.</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: STANDARD TRANSACTION NUMBERING (MASTER PLAN INVARIANT) */}
      <div className="bg-white border border-[#DCE5EC] rounded-xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-[#DCE5EC]">
          <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center text-[#086288]">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">Standard Transaction Numbering</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-3.5 space-y-1.5">
            <div className="text-[#475569] font-medium text-[11px]">Sales Order (SO)</div>
            <div className="font-mono font-bold text-[#086288] text-sm">SO/YYYYMM/000001</div>
            <p className="text-[10px] text-[#94A3B8]">Commercial sales order</p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-3.5 space-y-1.5">
            <div className="text-[#475569] font-medium text-[11px]">Purchase Order (PO)</div>
            <div className="font-mono font-bold text-[#086288] text-sm">PO/YYYYMM/000001</div>
            <p className="text-[10px] text-[#94A3B8]">Procurement purchase order</p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-3.5 space-y-1.5">
            <div className="text-[#475569] font-medium text-[11px]">Sales Invoice (INV)</div>
            <div className="font-mono font-bold text-[#086288] text-sm">INV/YYYY/000001</div>
            <p className="text-[10px] text-[#94A3B8]">Customer commercial billing</p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-3.5 space-y-1.5">
            <div className="text-[#475569] font-medium text-[11px]">Journal Voucher (JV)</div>
            <div className="font-mono font-bold text-[#086288] text-sm">JV/YYYYMM/000001</div>
            <p className="text-[10px] text-[#94A3B8]">Double-entry general ledger voucher</p>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-[#475569]">
          {config.updatedAt && (
            <span>Last updated: {new Date(config.updatedAt).toLocaleString('en-US')}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={!canEdit || isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving Configuration...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save System Configuration</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
