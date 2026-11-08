import React, { useState } from 'react';
import { ExpenseClaim } from '../../types/erp';
import { ClaimExpenseListView } from './ClaimExpenseListView';
import { ClaimExpenseCreatePage } from './ClaimExpenseCreatePage';

export const ClaimExpenseManagementView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);

  const handleAddNew = () => {
    setSelectedClaim(null);
    setViewMode('create');
  };

  const handleEdit = (claim: ExpenseClaim) => {
    setSelectedClaim(claim);
    setViewMode('edit');
  };

  const handleBackToList = () => {
    setSelectedClaim(null);
    setViewMode('list');
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ClaimExpenseCreatePage
        existingClaim={selectedClaim}
        onBack={handleBackToList}
        onSaved={handleBackToList}
      />
    );
  }

  return <ClaimExpenseListView onAddNew={handleAddNew} onEdit={handleEdit} />;
};
