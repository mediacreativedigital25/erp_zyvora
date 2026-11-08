import React, { useState } from 'react';
import { CashTransactionListView } from './CashTransactionListView';
import { CashTransactionCreatePage } from './CashTransactionCreatePage';

export const CashTransactionView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  const handleAddNew = () => {
    setViewMode('create');
  };

  const handleBackToList = () => {
    setViewMode('list');
  };

  if (viewMode === 'create') {
    return (
      <CashTransactionCreatePage
        onBack={handleBackToList}
        onSuccess={handleBackToList}
      />
    );
  }

  return <CashTransactionListView onAddNew={handleAddNew} />;
};