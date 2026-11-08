/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Zyvora ERP 1.0.0 — Menu & Feature Governance View
 * Allows Platform Super Admin to dynamically activate/deactivate menus per module,
 * perform live maintenance mode toggles, and test features in sandbox.
 */

import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Search,
  Filter,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ExternalLink,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { useConfirm } from '../../context/ConfirmContext';
import { NAVIGATION_CONFIG } from '../../config/navigation';
import { NavigationService } from '../../services/navigationService';

interface FlatMenuItem {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  isReady: boolean;
  moduleId: string;
  moduleLabel: string;
  minRole: string;
}

export const MenuGovernanceView: React.FC = () => {
  const {
    navigationGroups,
    toggleMenuStatus,
    navigateToFeature,
    addToast,
    refreshNavigation,
    currentUser
  } = useErp();
  const { confirm } = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ready' | 'pending'>('all');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Extract all flat menu items from baseline + dynamic overrides
  const allMenuItems: FlatMenuItem[] = useMemo(() => {
    const overrides = NavigationService.getMenuOverrides();
    const items: FlatMenuItem[] = [];

    // Baseline configuration
    NAVIGATION_CONFIG.forEach((group) => {
      if (group.isDirectLink) {
        const isReady = typeof overrides[group.id] === 'boolean' ? overrides[group.id] : true;
        items.push({
          id: group.id,
          label: group.label,
          description: 'Dashboard analitik eksekutif & ringkasan operasional real-time',
          isReady,
          moduleId: group.id,
          moduleLabel: group.label,
          minRole: 'Semua Role Terdaftar'
        });
      } else if (group.items) {
        group.items.forEach((sub) => {
          const isReady = typeof overrides[sub.id] === 'boolean' ? overrides[sub.id] : sub.isReady;
          items.push({
            id: sub.id,
            label: sub.label,
            description: sub.description,
            badge: sub.badge,
            isReady,
            moduleId: group.id,
            moduleLabel: group.label,
            minRole: getMinRoleDisplay(group.id, sub.id)
          });
        });
      }
    });

    return items;
  }, [navigationGroups]);

  // Statistics
  const totalCount = allMenuItems.length;
  const readyCount = allMenuItems.filter((i) => i.isReady).length;
  const pendingCount = allMenuItems.filter((i) => !i.isReady).length;

  // Filtered Items
  const filteredItems = useMemo(() => {
    return allMenuItems.filter((item) => {
      if (selectedModule !== 'all' && item.moduleId !== selectedModule) {
        return false;
      }
      if (selectedStatus === 'ready' && !item.isReady) {
        return false;
      }
      if (selectedStatus === 'pending' && item.isReady) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesLabel = item.label.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesModule = item.moduleLabel.toLowerCase().includes(q);
        if (!matchesId && !matchesLabel && !matchesDesc && !matchesModule) {
          return false;
        }
      }
      return true;
    });
  }, [allMenuItems, selectedModule, selectedStatus, searchQuery]);

  const handleToggle = async (itemId: string, currentReady: boolean) => {
    setIsUpdating(itemId);
    try {
      const nextReady = !currentReady;
      await toggleMenuStatus(itemId, nextReady);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleBatchToggle = async (targetReady: boolean) => {
    if (filteredItems.length === 0) return;
    const count = filteredItems.length;

    const isConfirmed = await confirm({
      title: targetReady ? `Aktifkan ${count} Menu Sekaligus?` : `Nonaktifkan ${count} Menu Sekaligus?`,
      message: targetReady
        ? `Apakah Anda yakin ingin mengaktifkan ${count} menu yang sedang difilter? Seluruh staf operasional akan langsung dapat mengakses menu ini.`
        : `Apakah Anda yakin ingin menonaktifkan ${count} menu yang sedang difilter ke mode maintenance? Menu akan disembunyikan dari staf operasional.`,
      variant: targetReady ? 'info' : 'warning',
      confirmLabel: targetReady ? 'Ya, Aktifkan Semua' : 'Ya, Nonaktifkan Semua',
      cancelLabel: 'Batal',
      consequences: targetReady
        ? ['Menu operasional live diakses oleh seluruh pengguna sesuai hak akses.']
        : ['Menu disembunyikan dari sidebar navigasi dan masuk mode pemeliharaan.']
    });

    if (!isConfirmed) return;

    for (const item of filteredItems) {
      await NavigationService.setMenuReadyStatus(item.id, targetReady, currentUser);
    }
    addToast(
      'Batch Update Berhasil',
      `${count} menu berhasil di-${targetReady ? 'aktifkan' : 'nonaktifkan'}.`,
      'success'
    );
    await refreshNavigation();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedModule('all');
    setSelectedStatus('all');
  };

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* 1. TOP FILTER BOX: TWO COLUMNS (STANDAR SALES ORDER BLUEPRINT)        */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3.5">
          {/* ---------------------------------------------------- */}
          {/* LEFT COLUMN FILTERS                                  */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Search Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Cari Menu</label>
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode ID, nama menu, deskripsi..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                />
              </div>
            </div>

            {/* Module Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Modul ERP</label>
              <div className="sm:col-span-2">
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="all">Semua Modul ERP ({NAVIGATION_CONFIG.length})</option>
                  {NAVIGATION_CONFIG.map((g) => (
                    <option key={g.id} value={g.id}>
                      Modul: {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons: Filter & Reset */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pt-1">
              <div className="hidden sm:block"></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {}}
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

          {/* ---------------------------------------------------- */}
          {/* RIGHT COLUMN FILTERS                                 */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-3">
            {/* Status Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#0F172A]">Status Kesiapan</label>
              <div className="sm:col-span-2">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full h-9 px-3 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
                >
                  <option value="all">Semua Status Kesiapan</option>
                  <option value="ready">🟢 Siap Operasional (Aktif)</option>
                  <option value="pending">⚪ Maintenance / Segera (Nonaktif)</option>
                </select>
              </div>
            </div>

            {/* Live Readiness Metric (Side Display) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <label className="text-xs font-semibold text-[#64748B]">Kesiapan Sistem</label>
              <div className="sm:col-span-2">
                <div className="w-full h-9 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs flex items-center justify-between text-[#0F172A]">
                  <span className="font-medium text-[#475569]">
                    Aktif: <strong className="text-emerald-700 font-mono">{readyCount}</strong> / {totalCount} Menu
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {pendingCount} Maintenance
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SUB-ACTION TOOLBAR & TABLE CONTROLS                                */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        {/* Left Batch Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleBatchToggle(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
            title="Aktifkan semua menu yang tampil pada filter saat ini"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Buka Semua yang Tampil</span>
          </button>

          <button
            type="button"
            onClick={() => handleBatchToggle(false)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
            title="Tutup semua menu yang tampil ke mode maintenance"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Tutup Semua ke Maintenance</span>
          </button>
        </div>

        {/* Right Info */}
        <div className="text-xs text-[#64748B]">
          Menampilkan <strong className="text-[#0F172A]">{filteredItems.length}</strong> dari{' '}
          <strong className="text-[#0F172A]">{totalCount}</strong> total menu terdaftar
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. DATA TABLE CARD                                                    */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-[#0F172A] font-bold border-b border-[#CBD5E1] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3 w-36">Modul</th>
                <th className="py-3 px-3 w-44">Kode Menu (ID)</th>
                <th className="py-3 px-3">Nama Menu & Deskripsi</th>
                <th className="py-3 px-3 w-36">Role Minimum</th>
                <th className="py-3 px-3 w-36 text-center">Status Visibilitas</th>
                <th className="py-3 px-3 w-32 text-center">Kontrol Toggle</th>
                <th className="py-3 px-3 w-28 text-center">Aksi Sandbox</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ditemukan menu yang sesuai dengan kriteria filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isBusy = isUpdating === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8FAFC]/80 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* Module */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700">
                          {item.moduleLabel}
                        </span>
                      </td>

                      {/* Code / ID */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] font-bold bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] px-2 py-0.5 rounded">
                          {item.id}
                        </span>
                      </td>

                      {/* Label & Description */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {!item.isReady && (
                            <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-[#64748B] mt-0.5 max-w-md line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </td>

                      {/* Minimum Role */}
                      <td className="py-3 px-3 text-slate-600">
                        {item.minRole}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {item.isReady ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Maintenance</span>
                          </span>
                        )}
                      </td>

                      {/* Interactive Toggle Switch (Deep Teal vs Slate) */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggle(item.id, item.isReady)}
                          className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#086288] focus:ring-offset-2 disabled:opacity-50 ${
                            item.isReady ? 'bg-[#086288]' : 'bg-slate-300'
                          }`}
                          title={
                            item.isReady
                              ? 'Klik untuk menutup ke mode Maintenance'
                              : 'Klik untuk mengaktifkan ke publik'
                          }
                        >
                          <span className="sr-only">Toggle Status</span>
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              item.isReady ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Super Admin Sandbox Link */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => navigateToFeature(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#086288] bg-[#EFF7FA] hover:bg-[#DCEEF5] border border-[#B7DDEA] rounded-md transition-colors cursor-pointer"
                          title="Buka dan uji halaman ini langsung di mode Super Admin"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function getMinRoleDisplay(moduleId: string, itemId: string): string {
  if (moduleId === 'dashboard') return 'Semua Role';
  if (moduleId === 'sales') return 'Sales / Kasir / Admin';
  if (moduleId === 'inventory') return 'Gudang / Admin';
  if (moduleId === 'account_receivable') return 'Kasir / Finance / Admin';
  if (moduleId === 'cash_management') return 'Kasir / Finance / Admin';
  if (moduleId === 'approval') return 'Manager / Admin / Owner';
  if (moduleId === 'human_resources') return 'Staff HR / Manager / Admin';
  if (moduleId === 'master_data') return 'Administrator / Owner';
  if (moduleId === 'reporting') return 'Manager / Direksi / Owner';
  return 'Admin';
}
