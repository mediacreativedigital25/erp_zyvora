import React from 'react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { CompanyProfileView } from '../components/master/CompanyProfileView';
import { MarketBusinessLineView } from '../components/master/MarketBusinessLineView';
import { SystemConfigView } from '../components/master/SystemConfigView';
import { UserManagementView } from '../components/rbac/UserManagementView';
import { BranchesBusinessUnitsView } from '../components/master/BranchesBusinessUnitsView';
import { BusinessContactsView } from '../components/master/BusinessContactsView';
import { TaxesView } from '../components/master/TaxesView';
import { FinanceView } from '../components/master/FinanceView';
import { VehiclesMasterView } from '../components/master/VehiclesMasterView';

export const MasterTenantPage: React.FC = () => {
  const { activeFeatureId } = useErp();

  // 1. Company Profile
  if (
    activeFeatureId === 'master_company_profile' ||
    activeFeatureId === 'tenant' ||
    activeFeatureId === 'master_data'
  ) {
    return (
      <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'Company Profile' }]}>
        <CompanyProfileView />
      </PageShell>
    );
  }

  // 2. Market & Business Lines
  if (activeFeatureId === 'master_market_business_line') {
    return (
      <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'Market & Business Lines' }]}>
        <MarketBusinessLineView />
      </PageShell>
    );
  }

  // 3. Branches & Business Units
  if (activeFeatureId === 'master_branches_business_units') {
    return (
      <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'Branches & Business Units' }]}>
        <BranchesBusinessUnitsView />
      </PageShell>
    );
  }

  // 4. Taxes & Duties
  if (activeFeatureId === 'master_taxes') {
    return (
      <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'Taxes & Duties' }]}>
        <TaxesView />
      </PageShell>
    );
  }

  // 5. Vendors & Partners
  if (activeFeatureId === 'master_business_contacts') {
    return (
      <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'Vendors & Partners' }]}>
        <BusinessContactsView />
      </PageShell>
    );
  }

  // 6. Finance & Accounts
  if (activeFeatureId === 'master_finance') {
    return (
      <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'Finance & Accounts' }]}>
        <FinanceView />
      </PageShell>
    );
  }

  // 7. Vehicles & Fleet
  if (activeFeatureId === 'master_vehicles') {
    return (
      <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'Vehicles & Fleet' }]}>
        <VehiclesMasterView />
      </PageShell>
    );
  }

  // 9. System Configuration
  if (activeFeatureId === 'master_system_config') {
    return (
      <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'System Configuration' }]}>
        <SystemConfigView />
      </PageShell>
    );
  }

  // 10. Tenant Members & RBAC
  if (activeFeatureId === 'rbac') {
    return (
      <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'Tenant Members & RBAC' }]}>
        <UserManagementView mode="tenant" />
      </PageShell>
    );
  }

  // Fallback: Company Profile
  return (
    <PageShell breadcrumbs={[{ label: 'Master' }, { label: 'Company Profile' }]}>
      <CompanyProfileView />
    </PageShell>
  );
};
