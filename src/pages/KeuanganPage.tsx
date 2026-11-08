import React from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, Clock, CreditCard } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { PageEmptyState } from '../components/common/PageEmptyState';
import { ClaimExpenseManagementView } from '../components/cash/ClaimExpenseManagementView';
import { CashTransactionView } from '../components/cash/CashTransactionView';
import { ReceivePaymentView } from '../components/ar/ReceivePaymentView';

export const KeuanganPage: React.FC = () => {
  const { activeFeatureId } = useErp();

  if (activeFeatureId === 'ar_receive_payment') {
    return (
      <PageShell breadcrumbs={[{ label: 'Account Receivable' }, { label: 'Receive Payment' }]}>
        <ReceivePaymentView />
      </PageShell>
    );
  }

  if (activeFeatureId === 'cash_claim_expense') {
    return (
      <PageShell breadcrumbs={[{ label: 'Cash Management' }, { label: 'Claim Expense' }]}>
        <ClaimExpenseManagementView />
      </PageShell>
    );
  }

  if (activeFeatureId === 'cash_transaction') {
    return (
      <PageShell breadcrumbs={[{ label: 'Cash Management' }, { label: 'Cash Transaction' }]}>
        <CashTransactionView />
      </PageShell>
    );
  }

  if (activeFeatureId === 'payments_in') {
    return (
      <PageShell breadcrumbs={[{ label: 'Keuangan' }, { label: 'Penerimaan Pembayaran' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<ArrowDownRight className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada transaksi penerimaan pembayaran yang tercatat. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'payments_out') {
    return (
      <PageShell breadcrumbs={[{ label: 'Keuangan' }, { label: 'Pengeluaran Kas/Bank' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<ArrowUpRight className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada pengeluaran kas atau bank yang tercatat. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'receivables') {
    return (
      <PageShell breadcrumbs={[{ label: 'Keuangan' }, { label: 'Piutang' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Clock className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada saldo piutang usaha aktif. Seluruh data demo telah dibersihkan sesuai instruksi Product Owner."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'payables') {
    return (
      <PageShell breadcrumbs={[{ label: 'Keuangan' }, { label: 'Utang' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<CreditCard className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada kewajiban utang usaha aktif. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  // Default: Kas & Bank (accounts)
  return (
    <PageShell breadcrumbs={[{ label: 'Keuangan' }, { label: 'Kas & Bank' }]}>
      <div className="mt-4">
        <PageEmptyState
          icon={<Wallet className="w-5 h-5 text-[#086288]" />}
          title="Belum Ada Akun Rekening"
          description="Belum ada akun kas atau rekening bank yang tercatat. Seluruh data demo telah dibersihkan sesuai instruksi Product Owner."
        />
      </div>
    </PageShell>
  );
};
