import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useErp } from '../../context/ErpContext';
import { DashboardPage } from '../../pages/DashboardPage';
import { PenjualanPage } from '../../pages/PenjualanPage';
import { PembelianPage } from '../../pages/PembelianPage';
import { PersediaanPage } from '../../pages/PersediaanPage';
import { KeuanganPage } from '../../pages/KeuanganPage';
import { AkuntansiPage } from '../../pages/AkuntansiPage';
import { SdmPage } from '../../pages/SdmPage';
import { LaporanPage } from '../../pages/LaporanPage';
import { PengaturanPage } from '../../pages/PengaturanPage';
import { MasterTenantPage } from '../../pages/MasterTenantPage';
import { SuperAdminConnectionsPage } from '../../pages/SuperAdminConnectionsPage';
import { DynamicWorkspacePage } from '../../pages/DynamicWorkspacePage';
import { ApprovalPage } from '../../pages/ApprovalPage';
import { UserManagementView } from '../rbac/UserManagementView';
import { TenantManagementView } from '../superadmin/TenantManagementView';
import { MenuGovernanceView } from '../superadmin/MenuGovernanceView';
import { PageShell } from '../common/PageShell';
import { NotificationDrawer } from '../modals/NotificationDrawer';
import { ToastContainer } from '../common/ToastContainer';
import { AddDynamicMenuModal } from '../modals/AddDynamicMenuModal';

export const AppLayout: React.FC = () => {
  const { currentModule, activeFeatureId, isAddMenuModalOpen, setIsAddMenuModalOpen, navigationGroups } = useErp();

  const renderActiveWorkspace = () => {
    // Route Super Admin platform users and platform connections
    if (activeFeatureId === 'superadmin_tenants') {
      return (
        <PageShell breadcrumbs={[{ label: 'Super Admin' }, { label: 'Daftar Tenant' }]}>
          <TenantManagementView />
        </PageShell>
      );
    }

    if (activeFeatureId === 'superadmin_users') {
      return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <UserManagementView mode="platform" />
        </div>
      );
    }

    if (activeFeatureId === 'superadmin_menu_governance') {
      return (
        <PageShell breadcrumbs={[{ label: 'Super Admin' }, { label: 'Manajemen Menu & Fitur' }]}>
          <MenuGovernanceView />
        </PageShell>
      );
    }

    if (
      currentModule === 'super_admin' ||
      activeFeatureId === 'superadmin_connections' ||
      activeFeatureId.startsWith('superadmin_')
    ) {
      return <SuperAdminConnectionsPage />;
    }

    // Route master tenant features directly to MasterTenantPage
    if (
      currentModule === 'master_data' ||
      activeFeatureId.startsWith('master_') ||
      activeFeatureId === 'tenant'
    ) {
      return <MasterTenantPage />;
    }

    // Route inventory features directly to PersediaanPage
    if (activeFeatureId.startsWith('inv_')) {
      return <PersediaanPage />;
    }

    // Route sales features directly to PenjualanPage
    if (activeFeatureId.startsWith('sales_')) {
      return <PenjualanPage />;
    }

    // Route cash management & receivables directly to KeuanganPage
    if (
      activeFeatureId.startsWith('cash_') ||
      activeFeatureId.startsWith('ar_') ||
      activeFeatureId === 'cash_claim_expense'
    ) {
      return <KeuanganPage />;
    }

    // Route approval features directly to ApprovalPage
    if (
      currentModule === 'approval' ||
      activeFeatureId === 'approval_list' ||
      activeFeatureId.startsWith('approval_')
    ) {
      return <ApprovalPage />;
    }

    // Route Human Resources (Core HR & SDM) features directly to SdmPage
    if (
      currentModule === 'human_resources' ||
      currentModule === 'sdm' ||
      activeFeatureId.startsWith('hr_')
    ) {
      return <SdmPage />;
    }

    // Route Reporting features directly to LaporanPage
    if (
      currentModule === 'reporting' ||
      currentModule === 'laporan' ||
      activeFeatureId.startsWith('reporting_') ||
      activeFeatureId === 'reporting'
    ) {
      return <LaporanPage />;
    }

    // Route custom or dynamic database menus to DynamicWorkspacePage
    if (
      activeFeatureId.startsWith('custom_') ||
      (currentModule as string) === 'custom' ||
      navigationGroups.some((g) => g.items?.some((i) => i.id === activeFeatureId && i.id.startsWith('custom_')))
    ) {
      return <DynamicWorkspacePage />;
    }

    switch (currentModule) {
      case 'dashboard':
        return <DashboardPage />;
      case 'sales':
      case 'penjualan':
        return <PenjualanPage />;
      case 'pembelian':
        return <PembelianPage />;
      case 'inventory':
      case 'persediaan':
        return <PersediaanPage />;
      case 'account_receivable':
      case 'cash_management':
      case 'keuangan':
        return <KeuanganPage />;
      case 'akuntansi':
        return <AkuntansiPage />;
      case 'pengaturan':
        return <PengaturanPage />;
      default:
        // If active feature is a dynamic item not recognized in hardcoded switch, render DynamicWorkspacePage
        if (activeFeatureId !== 'dashboard') {
          return <DynamicWorkspacePage />;
        }
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row antialiased selection:bg-[#DCEEF5] selection:text-[#086288]">
      {/* Navigation Sidebar Accordion */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Universal Clean Topbar */}
        <Topbar />

        {/* Dynamic Workspace Viewport */}
        <main className="flex-1 pb-16">
          {renderActiveWorkspace()}
        </main>
      </div>

      {/* Verified Global Drawers & Feedback Containers */}
      <NotificationDrawer />
      <ToastContainer />

      {/* Dynamic Realtime Menu Creation Modal */}
      <AddDynamicMenuModal
        isOpen={isAddMenuModalOpen}
        onClose={() => setIsAddMenuModalOpen(false)}
      />
    </div>
  );
};
