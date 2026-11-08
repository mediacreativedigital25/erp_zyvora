import React from 'react';
import { PageShell } from '../components/common/PageShell';
import { ApprovalListView } from '../components/approval/ApprovalListView';

export const ApprovalPage: React.FC = () => {
  return (
    <PageShell breadcrumbs={[{ label: 'Approval' }, { label: 'Approval List' }]}>
      <ApprovalListView />
    </PageShell>
  );
};