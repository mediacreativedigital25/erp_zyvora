import React from 'react';
import { BookOpen, FileSpreadsheet, Scale, FileText, CheckCircle2 } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { PageEmptyState } from '../components/common/PageEmptyState';

export const AkuntansiPage: React.FC = () => {
  const { activeFeatureId } = useErp();

  if (activeFeatureId === 'journal') {
    return (
      <PageShell breadcrumbs={[{ label: 'Akuntansi' }, { label: 'Jurnal Umum' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<FileSpreadsheet className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada entri jurnal yang diposting. Seluruh data demo telah dibersihkan sesuai instruksi Product Owner."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'ledger') {
    return (
      <PageShell breadcrumbs={[{ label: 'Akuntansi' }, { label: 'Buku Besar' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<BookOpen className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada transaksi mutasi buku besar. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'trial_balance') {
    return (
      <PageShell breadcrumbs={[{ label: 'Akuntansi' }, { label: 'Neraca Saldo' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<Scale className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Belum ada saldo akun untuk neraca percobaan. Seluruh data demo telah dibersihkan."
          />
        </div>
      </PageShell>
    );
  }

  if (activeFeatureId === 'rules') {
    return (
      <PageShell breadcrumbs={[{ label: 'Akuntansi' }, { label: 'Laporan Keuangan' }]}>
        <div className="mt-4">
          <PageEmptyState
            icon={<FileText className="w-5 h-5 text-[#086288]" />}
            title="Workspace Siap"
            description="Laporan keuangan periodik akan digenerate setelah transaksi buku besar dibukukan."
          />
        </div>
      </PageShell>
    );
  }

  // Default: Bagan Akun (coa)
  return (
    <PageShell breadcrumbs={[{ label: 'Akuntansi' }, { label: 'Bagan Akun' }]}>
      <div className="mt-4">
        <PageEmptyState
          icon={<CheckCircle2 className="w-5 h-5 text-[#086288]" />}
          title="Belum Ada Akun Terdaftar"
          description="Bagan akun akan dikonfigurasi atau disinkronkan dari database Supabase relasional."
        />
      </div>
    </PageShell>
  );
};
