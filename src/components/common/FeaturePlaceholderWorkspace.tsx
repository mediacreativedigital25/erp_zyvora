import React from 'react';
import { Clock, ArrowRight, Shield, Layers, FileCode2 } from 'lucide-react';
import { PageShell } from './PageShell';
import { PageHeader } from './PageHeader';
import { useErp } from '../../context/ErpContext';

interface FeaturePlaceholderProps {
  moduleLabel: string;
  featureTitle: string;
  description: string;
  plannedMilestone?: string;
  plannedTables?: string[];
  keyCapabilities?: string[];
  recommendedAction?: {
    label: string;
    targetFeatureId: string;
  };
}

export const FeaturePlaceholderWorkspace: React.FC<FeaturePlaceholderProps> = ({
  moduleLabel,
  featureTitle,
  description,
  plannedMilestone = 'Fase 2 — Transaksi Lanjutan & Otomasi',
  plannedTables = [],
  keyCapabilities = [],
  recommendedAction
}) => {
  const { navigateToFeature, setIsArchitectureModalOpen } = useErp();

  return (
    <PageShell
      breadcrumbs={[
        { label: moduleLabel },
        { label: featureTitle }
      ]}
    >
      <PageHeader
        title={featureTitle}
        description={description}
        badge={plannedMilestone}
      />

      <div className="max-w-4xl space-y-6">
        {/* Status Banner */}
        <div className="bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg p-5 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-md bg-[#DCEEF5] text-[#086288] flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#0F172A]">
              Workspace Dalam Antrean Pengembangan Terarah
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Fitur <strong>{featureTitle}</strong> telah terdaftar dalam spesifikasi arsitektur Zyvora ERP 1.0.0. Sesuai prinsip isolasi bertahap, modul ini dijadwalkan aktif pada pembaruan rilis sistem berikutnya.
            </p>
          </div>
        </div>

        {/* Feature Scope & Technical Invariants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#DCE5EC] rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#086288]">
              <Layers className="w-4 h-4" />
              <span>Kemampuan yang Dirancang</span>
            </div>
            {keyCapabilities.length > 0 ? (
              <ul className="space-y-2 text-xs text-[#475569]">
                {keyCapabilities.map((cap, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#086288] mt-1.5 shrink-0" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#475569]">
                Validasi alur dokumen, integrasi pencatatan jurnal berpasangan otomatis, dan jejak audit per cabang.
              </p>
            )}
          </div>

          <div className="bg-white border border-[#DCE5EC] rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#086288]">
              <Shield className="w-4 h-4" />
              <span>Integritas Skema & Keamanan</span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Setiap data dilindungi oleh arsitektur enkripsi dan sistem isolasi keamanan multi-tenant tingkat enterprise.
            </p>
            {plannedTables.length > 0 && (
              <div className="pt-2 border-t border-[#EEF4F8]">
                <span className="text-[11px] text-[#94A3B8] block mb-1">Entitas Modul Terkait:</span>
                <div className="flex flex-wrap gap-1.5">
                  {plannedTables.map((tbl, i) => (
                    <code key={i} className="text-[11px] font-mono bg-[#EEF4F8] text-[#086288] px-2 py-0.5 rounded border border-[#DCE5EC]">
                      {tbl}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Footers */}
        <div className="p-4 bg-white border border-[#DCE5EC] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => setIsArchitectureModalOpen(true)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#086288] hover:text-[#064B6A] cursor-pointer"
          >
            <FileCode2 className="w-4 h-4" />
            <span>Lihat DDL & Roadmap di Master Plan Blueprint</span>
          </button>

          {recommendedAction && (
            <button
              onClick={() => navigateToFeature(recommendedAction.targetFeatureId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] rounded-md transition-colors cursor-pointer"
            >
              <span>{recommendedAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </PageShell>
  );
};
