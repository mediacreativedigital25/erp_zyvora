import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Database,
  MessageSquare,
  HardDrive,
  Globe,
  CreditCard,
  Truck,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Key,
  Layers,
  Lock,
  Server,
  Info,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  ExternalLink,
  X
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { PageTable, Column } from '../components/common/PageTable';
import {
  PlatformConnectionService,
  PlatformIntegration,
  TestResultData,
  IntegrationCategory
} from '../services/platformConnectionService';

export const SuperAdminConnectionsPage: React.FC = () => {
  const { currentUser, isCurrentUserSuperAdmin, addToast } = useErp();

  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedIntegration, setSelectedIntegration] = useState<PlatformIntegration | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isBatchTesting, setIsBatchTesting] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const authCredentials = useMemo(() => ({
    userCode: currentUser.userCode,
    userRole: currentUser.role,
    isPlatformSuperAdmin: Boolean(currentUser.isPlatformSuperAdmin || currentUser.role === 'super_admin')
  }), [currentUser]);

  // Load integrations from backend API
  const loadIntegrations = async () => {
    setIsLoading(true);
    try {
      const data = await PlatformConnectionService.getIntegrations(authCredentials);
      setIntegrations(data);
    } catch (err: unknown) {
      addToast(
        'Gagal Memuat Integrasi',
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat daftar koneksi.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isCurrentUserSuperAdmin) {
      loadIntegrations();
    }
  }, [isCurrentUserSuperAdmin]);

  // Handle single test connection
  const handleTestConnection = async (item: PlatformIntegration, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTestingId(item.id);
    try {
      const res = await PlatformConnectionService.testIntegration(item.id, authCredentials);
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                connectionStatus: res.status,
                lastTestResult: res
              }
            : i
        )
      );

      // Also update currently selected integration if open in detail
      if (selectedIntegration?.id === item.id) {
        setSelectedIntegration((prev) =>
          prev
            ? {
                ...prev,
                connectionStatus: res.status,
                lastTestResult: res
              }
            : null
        );
      }

      if (res.isConnected) {
        addToast(
          `Koneksi ${item.name} Berhasil`,
          res.message,
          'success'
        );
      } else if (res.status === 'unconfigured') {
        addToast(
          `Status: Belum Dikonfigurasi`,
          res.message,
          'warning'
        );
      } else {
        addToast(
          `Koneksi ${item.name} Gagal`,
          res.message,
          'error'
        );
      }
    } catch (err: unknown) {
      addToast(
        'Gagal Menguji Koneksi',
        err instanceof Error ? err.message : 'Kesalahan jaringan',
        'error'
      );
    } finally {
      setTestingId(null);
    }
  };

  // Handle batch test all integrations
  const handleTestAll = async () => {
    setIsBatchTesting(true);
    addToast('Memulai Pengujian Koneksi', 'Menguji seluruh integrasi eksternal platform...', 'info');
    try {
      await PlatformConnectionService.testAllIntegrations(authCredentials, (id, result) => {
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  connectionStatus: result.status,
                  lastTestResult: result
                }
              : item
          )
        );
      });
      addToast('Pengujian Selesai', 'Seluruh status koneksi platform telah diperbarui.', 'success');
    } catch (err: unknown) {
      addToast('Uji Batch Gagal', err instanceof Error ? err.message : 'Error kueri server', 'error');
    } finally {
      setIsBatchTesting(false);
    }
  };

  const handleOpenDetail = (item: PlatformIntegration) => {
    setSelectedIntegration(item);
    setIsDetailOpen(true);
  };

  // Security Gate: Restrict to Super Admin (User Code 2A)
  if (!isCurrentUserSuperAdmin) {
    return (
      <PageShell breadcrumbs={[{ label: 'Akses Ditolak' }]}>
        <div className="max-w-xl mx-auto mt-16 p-8 bg-white border border-[#FEE2E2] rounded-xl shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#FEF2F2] border border-[#FCA5A5] flex items-center justify-center mx-auto text-[#DC2626]">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Akses Dibatasi — Khusus Super Admin</h2>
            <p className="text-xs text-[#475569] mt-2 leading-relaxed">
              Submenu <strong>Koneksi</strong> merupakan pusat manajemen integrasi eksternal tingkat platform. Halaman ini hanya dapat diakses oleh Platform Super Admin resmi (User Code: 2A).
            </p>
          </div>
          <div className="p-3 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-xs font-mono text-[#64748B] text-left">
            <div>Pengguna Aktif: {currentUser.fullName} ({currentUser.email})</div>
            <div>Role: {currentUser.roleTitle || currentUser.role}</div>
            <div>Kode User: {currentUser.userCode}</div>
          </div>
        </div>
      </PageShell>
    );
  }

  // Filtered Integrations
  const filteredIntegrations = integrations.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'connected' && item.connectionStatus === 'connected') ||
      (selectedStatus === 'unconfigured' && item.connectionStatus === 'unconfigured') ||
      (selectedStatus === 'error' && item.connectionStatus === 'error');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate summary counts
  const totalCount = integrations.length;
  const connectedCount = integrations.filter((i) => i.connectionStatus === 'connected').length;
  const unconfiguredCount = integrations.filter((i) => i.connectionStatus === 'unconfigured').length;
  const errorCount = integrations.filter((i) => i.connectionStatus === 'error').length;

  // Icon helper per category/id
  const getIntegrationIcon = (item: PlatformIntegration, className = 'w-5 h-5') => {
    switch (item.id) {
      case 'fonnte':
        return <MessageSquare className={`${className} text-[#16A34A]`} />;
      case 'cloudflare_r2':
        return <HardDrive className={`${className} text-[#D97706]`} />;
      case 'supabase':
        return <Database className={`${className} text-[#086288]`} />;
      case 'dns':
        return <Globe className={`${className} text-[#0284C7]`} />;
      case 'payment_gateway':
        return <CreditCard className={`${className} text-[#7C3AED]`} />;
      case 'shipping_api':
        return <Truck className={`${className} text-[#EA580C]`} />;
      case 'maps_distance':
        return <MapPin className={`${className} text-[#0D9488]`} />;
      default:
        return <Network className={`${className} text-[#086288]`} />;
    }
  };

  // Status renderer badge
  const renderConnectionBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Terhubung</span>
          </span>
        );
      case 'unconfigured':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Belum Dikonfigurasi</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Gagal Terhubung</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F1F5F9] text-[#64748B] border border-[#DCE5EC]">
            <Clock className="w-3.5 h-3.5" />
            <span>Belum Diuji</span>
          </span>
        );
    }
  };

  // Table columns definition
  const tableColumns: Column<PlatformIntegration>[] = [
    {
      key: 'service',
      header: 'Nama Layanan & Provider',
      width: '30%',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center shrink-0">
            {getIntegrationIcon(row, 'w-5 h-5')}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-xs text-[#0F172A] truncate flex items-center gap-1.5">
              <span>{row.name}</span>
            </div>
            <div className="text-[11px] text-[#475569] truncate">
              {row.provider}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      header: 'Kategori',
      width: '18%',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="inline-block text-[11px] font-medium text-[#086288] bg-[#EFF7FA] px-2 py-0.5 rounded border border-[#B7DDEA]">
            {row.category}
          </span>
          <div className="text-[10px] text-[#64748B]">{row.scope}</div>
        </div>
      )
    },
    {
      key: 'configStatus',
      header: 'Status Konfigurasi',
      width: '16%',
      render: (row) => (
        <div>
          {row.isConfigured ? (
            <span className="text-xs font-medium text-[#16A34A] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Terkonfigurasi</span>
            </span>
          ) : (
            <span className="text-xs font-medium text-[#64748B] flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Belum Lengkap</span>
            </span>
          )}
          <span className="text-[10px] text-[#94A3B8] font-mono">
            {row.envRequirements.length} env vars
          </span>
        </div>
      )
    },
    {
      key: 'connectionStatus',
      header: 'Status Koneksi Terakhir',
      width: '20%',
      render: (row) => {
        const isTesting = testingId === row.id || isBatchTesting;
        if (isTesting) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Menguji...</span>
            </span>
          );
        }

        return (
          <div className="space-y-1">
            {renderConnectionBadge(row.connectionStatus)}
            {row.lastTestResult?.latencyMs != null && (
              <div className="text-[10px] text-[#64748B] font-mono">
                Latensi: {row.lastTestResult.latencyMs}ms
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Tindakan',
      width: '16%',
      align: 'right',
      render: (row) => {
        const isTesting = testingId === row.id || isBatchTesting;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={(e) => handleTestConnection(row, e)}
              disabled={isTesting}
              className="px-2.5 py-1.5 text-xs font-medium text-[#086288] bg-[#EFF7FA] hover:bg-[#DCEEF5] border border-[#B7DDEA] rounded-md transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
              title="Uji koneksi secara nyata"
            >
              <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Uji</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenDetail(row)}
              className="px-2.5 py-1.5 text-xs font-medium text-white bg-[#086288] hover:bg-[#064B6A] rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <span>Detail</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Super Admin' },
        { label: 'Koneksi' }
      ]}
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleTestAll}
          disabled={isBatchTesting || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] rounded-md transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 ${isBatchTesting ? 'animate-spin' : ''}`} />
          <span>{isBatchTesting ? 'Menguji Semua...' : 'Uji Semua Koneksi'}</span>
        </button>
      </div>

      {/* Security Banner: Platform Level Notice */}
      <div className="mt-4 p-3.5 bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#086288] shrink-0 mt-0.5" />
        <div className="text-[#0F172A] leading-relaxed">
          <strong>Keamanan Tingkat Enterprise:</strong> Seluruh token API, secret key, dan kredensial eksternal disimpan pada server / secret manager platform dan diproteksi oleh otorisasi server-side Super Admin (<code className="bg-white px-1 py-0.5 rounded border border-[#B7DDEA] font-mono text-[#086288]">User Code: 2A</code>). Tidak ada token lengkap yang diekspos ke browser atau disimpan di local storage tenant.
        </div>
      </div>

      {/* Ringkasan Status / KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="bg-white border border-[#DCE5EC] rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B] text-xs">
            <span>Total Integrasi</span>
            <Layers className="w-4 h-4 text-[#086288]" />
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1 tabular-nums">
            {totalCount}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Layanan eksternal platform</div>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#15803D] text-xs">
            <span>Terhubung Aktif</span>
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-xl font-bold text-[#15803D] mt-1 tabular-nums">
            {connectedCount}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Terverifikasi responsif</div>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#B45309] text-xs">
            <span>Belum Dikonfigurasi</span>
            <AlertCircle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-xl font-bold text-[#B45309] mt-1 tabular-nums">
            {unconfiguredCount}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Perlu API Key / Token</div>
        </div>

        <div className="bg-white border border-[#DCE5EC] rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#B91C1C] text-xs">
            <span>Koneksi Gagal</span>
            <AlertCircle className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-xl font-bold text-[#B91C1C] mt-1 tabular-nums">
            {errorCount}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">Gagal verifikasi jaringan</div>
        </div>
      </div>

      {/* Toolbar Filter & View Switcher */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-[#DCE5EC] rounded-lg shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari layanan, provider, atau kategori..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DCE5EC] rounded-md text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-[#F8FAFC] border border-[#DCE5EC] rounded-md px-2.5 py-1.5 text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            <option value="Basis Data & Auth">Basis Data & Auth</option>
            <option value="Komunikasi">Komunikasi</option>
            <option value="Media & Storage">Media & Storage</option>
            <option value="Domain & Jaringan">Domain & Jaringan</option>
            <option value="Pembayaran">Pembayaran</option>
            <option value="Logistik & Pengiriman">Logistik & Pengiriman</option>
            <option value="Peta & Geospasial">Peta & Geospasial</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-[#F8FAFC] border border-[#DCE5EC] rounded-md px-2.5 py-1.5 text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="connected">Terhubung</option>
            <option value="unconfigured">Belum Dikonfigurasi</option>
            <option value="error">Gagal</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-[#DCE5EC] rounded-md bg-[#F8FAFC] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#086288] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Tampilan Tabel"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-[#086288] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area: Table View or Cards View */}
      <div className="mt-4">
        {viewMode === 'table' ? (
          <PageTable
            columns={tableColumns}
            data={filteredIntegrations}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            emptyTitle="Tidak Ada Integrasi Ditemukan"
            emptyDescription="Tidak ada integrasi yang sesuai dengan filter atau kata kunci pencarian Anda."
            onRowClick={(row) => handleOpenDetail(row)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map((item) => {
              const isTesting = testingId === item.id || isBatchTesting;
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item)}
                  className="bg-white border border-[#DCE5EC] hover:border-[#086288]/40 hover:shadow-xs rounded-xl p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-[#EFF7FA] border border-[#B7DDEA] flex items-center justify-center shrink-0">
                          {getIntegrationIcon(item, 'w-5 h-5')}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-[#0F172A] group-hover:text-[#086288] transition-colors leading-tight">
                            {item.name}
                          </h3>
                          <p className="text-[11px] text-[#64748B] truncate max-w-[180px]">
                            {item.provider}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-medium shrink-0">
                        {item.category}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#475569] mt-3 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Status & Actions Footer */}
                  <div className="pt-3 border-t border-[#EEF4F8] flex items-center justify-between gap-2">
                    <div>
                      {isTesting ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Menguji...</span>
                        </span>
                      ) : (
                        renderConnectionBadge(item.connectionStatus)
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleTestConnection(item, e)}
                        disabled={isTesting}
                        className="px-2 py-1 text-xs font-medium text-[#086288] bg-[#EFF7FA] hover:bg-[#DCEEF5] border border-[#B7DDEA] rounded-md transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        title="Uji koneksi"
                      >
                        <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>Uji</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(item)}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-[#086288] hover:bg-[#064B6A] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Detail</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {isDetailOpen && selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-[#DCE5EC] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#DCE5EC] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-[#DCE5EC] flex items-center justify-center shadow-2xs">
                  {getIntegrationIcon(selectedIntegration, 'w-6 h-6')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F172A]">
                      {selectedIntegration.name}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] font-medium">
                      {selectedIntegration.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {selectedIntegration.provider} • Scope: {selectedIntegration.scope}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="w-8 h-8 rounded-md text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#EEF4F8] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup Detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Deskripsi */}
              <div>
                <h4 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Deskripsi Layanan
                </h4>
                <p className="text-[#475569] leading-relaxed">
                  {selectedIntegration.description}
                </p>
              </div>

              {/* Status Koneksi Terkini & Hasil Tes */}
              <div className="bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#0F172A]">Status Koneksi:</span>
                    {renderConnectionBadge(selectedIntegration.connectionStatus)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestConnection(selectedIntegration)}
                    disabled={testingId === selectedIntegration.id}
                    className="px-3 py-1.5 text-xs font-semibold text-[#086288] bg-white hover:bg-[#EFF7FA] border border-[#B7DDEA] rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingId === selectedIntegration.id ? 'animate-spin' : ''}`} />
                    <span>{testingId === selectedIntegration.id ? 'Menguji...' : 'Uji Koneksi Sekarang'}</span>
                  </button>
                </div>

                {selectedIntegration.lastTestResult ? (
                  <div className="pt-2 border-t border-[#DCE5EC] space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-[#64748B]">
                      <span>Waktu Uji Terakhir:</span>
                      <span className="font-mono text-[#0F172A]">
                        {new Date(selectedIntegration.lastTestResult.checkedAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'medium'
                        })}
                      </span>
                    </div>
                    {selectedIntegration.lastTestResult.latencyMs != null && (
                      <div className="flex justify-between text-[#64748B]">
                        <span>Latensi Respons:</span>
                        <span className="font-mono text-[#0F172A] font-semibold">
                          {selectedIntegration.lastTestResult.latencyMs} ms
                        </span>
                      </div>
                    )}
                    <div className="mt-2 p-2.5 rounded bg-white border border-[#DCE5EC] text-[#0F172A] leading-relaxed">
                      <strong>Hasil Diagnostik:</strong> {selectedIntegration.lastTestResult.message}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-[#94A3B8] italic pt-1">
                    Layanan ini belum pernah diuji pada sesi ini. Klik "Uji Koneksi Sekarang" untuk menjalankan verifikasi real-time.
                  </div>
                )}
              </div>

              {/* Parameter Konfigurasi Masked (Aman) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#086288]" />
                    <span>Konfigurasi Server (Masked)</span>
                  </h4>
                  <span className="text-[10px] text-[#16A34A] font-semibold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#86EFAC]">
                    Zero Secret Leakage
                  </span>
                </div>

                <div className="border border-[#DCE5EC] rounded-lg overflow-hidden divide-y divide-[#EEF4F8]">
                  {Object.entries(selectedIntegration.maskedConfig).map(([key, val]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white hover:bg-[#F8FAFC]">
                      <span className="text-[#475569] font-medium">{key}</span>
                      <span className="font-mono text-[#0F172A] break-all font-semibold sm:text-right mt-0.5 sm:mt-0">
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Environment Variable Requirements */}
              <div>
                <h4 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#086288]" />
                  <span>Kebutuhan Environment Variable Platform</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIntegration.envRequirements.map((env) => (
                    <span
                      key={env}
                      className="px-2 py-1 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] font-mono text-[11px]"
                    >
                      {env}
                    </span>
                  ))}
                </div>
              </div>

              {/* Security Notice Footer */}
              <div className="p-3 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg text-[#64748B] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#086288] shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {selectedIntegration.notes ||
                    'Konfigurasi ini dikelola di tingkat infrastruktur platform dan tidak dibagikan antartenant.'}
                </p>
              </div>

              {/* Special Deployment Guidance for Cloudflare R2 */}
              {selectedIntegration.id === 'cloudflare_r2' && (
                <div className="p-3.5 bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-[#086288]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Panduan Deployment Aktual Cloudflare R2</span>
                  </div>
                  <p className="text-[11px] text-[#334155] leading-relaxed">
                    Untuk menghubungkan Cloudflare R2 pada server produksi atau staging, masukkan 6 variabel environment di atas ke dalam <strong>Secrets Manager / Environment Variables</strong> platform hosting Anda (seperti Google Cloud Run Secrets, Vercel Environment Variables, Railway, atau file <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#B7DDEA]">.env</code> di server aman). Berkas <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#B7DDEA]">.gitignore</code> telah mengunci file <code className="font-mono">.env</code> agar rahasia tidak bocor ke Git.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#DCE5EC] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-[11px] text-[#64748B]">
                ID: <code className="font-mono text-[#086288] font-bold">{selectedIntegration.id}</code>
              </span>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#EEF4F8] border border-[#DCE5EC] rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};
