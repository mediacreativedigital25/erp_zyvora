import React, { useState, useMemo } from 'react';
import { Gift, Search, Sparkles, Check, Tag } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { SelectedProductItem } from './ProductLookupModal';

interface BonusLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBonus: (item: SelectedProductItem) => void;
}

// Master daftar program bonus & complimentary yang terdaftar di Inventory / Sistem
const INVENTORY_BONUS_PROGRAMS: Array<
  SelectedProductItem & {
    programName: string;
    terms: string;
    badge: string;
  }
> = [
  {
    sku: 'BONUS-QUE-01',
    name: 'Free Digital E-Invitation Basic Package (Queinvite)',
    description: 'Akses 1 tema undangan website digital premium, RSVP kuota 300 tamu, link WhatsApp blast.',
    uom: 'Package',
    unitPrice: 0,
    businessLineId: 'QUEINVITE',
    businessLineName: 'Queinvite Wedding Digital',
    costCenterCode: 'CC-QUEINVITE',
    programName: 'Program Bonus Wedding Digital 2026',
    terms: 'Khusus pesanan jasa Hizaki / Aurum min. transaksi Rp 20 Juta.',
    badge: 'Digital Gift'
  },
  {
    sku: 'BONUS-HIZ-01',
    name: 'Free Wedding Consultation & Master Rundown Booklet (Hizaki)',
    description: '3 Sesi konsultasi rundown pra-nikah, panduan vendor checklist, dan pencetakan buku panduan panitia.',
    uom: 'Package',
    unitPrice: 0,
    businessLineId: 'HIZAKI',
    businessLineName: 'Hizaki Wedding Planner',
    costCenterCode: 'CC-LOB-HIZAKI',
    programName: 'Program Loyalty Client Hizaki',
    terms: 'Complimentary standar untuk klien kontrak awal.',
    badge: 'Planner Bonus'
  },
  {
    sku: 'BONUS-AUR-01',
    name: 'Free Welcome Sign Acrylic & Custom Easel Stand (Aurum)',
    description: 'Papan sambutan akrilik transparan berlampu LED neon dengan standing easel kayu ukir.',
    uom: 'Set',
    unitPrice: 0,
    businessLineId: 'AURUM',
    businessLineName: 'Aurum Deco',
    costCenterCode: 'CC-LOB-AURUM',
    programName: 'Program Paket Dekorasi Lengkap Aurum',
    terms: 'Bonus dekorasi foyer masuk acara.',
    badge: 'Deco Props'
  },
  {
    sku: 'BONUS-KIM-01',
    name: 'Free 2 Additional Family Corsages & Protocol Briefing (Kimiko)',
    description: '2 Bunga korsase jas keluarga inti dan sesi briefing protokoler penerimaan tamu.',
    uom: 'Set',
    unitPrice: 0,
    businessLineId: 'KIMIKO',
    businessLineName: 'Ki Mi Ko Pager Ayu',
    costCenterCode: 'CC-LOB-KIMIKO',
    programName: 'Program Bonus Usher Kimiko',
    terms: 'Bonus tambahan untuk pemesanan tim usher min. 6 orang.',
    badge: 'Usher Extra'
  },
  {
    sku: 'BONUS-ZYV-01',
    name: 'Free Corporate Merchandise & Gift Box Set (Zyvora Merch)',
    description: 'Paket souvenir eksklusif buku catatan agenda kulit, tumbler stainless, dan pulpen signature.',
    uom: 'Set',
    unitPrice: 0,
    businessLineId: 'INVENTORY',
    businessLineName: 'Zyvora Inventory Pusat',
    costCenterCode: 'CC-INVENTORY-DEFAULT',
    programName: 'Program Apresiasi Mitra Korporat',
    terms: 'Complimentary merchandise resmi perusahaan.',
    badge: 'Official Merch'
  }
];

export const BonusLookupModal: React.FC<BonusLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectBonus
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBonuses = useMemo(() => {
    if (!searchQuery.trim()) return INVENTORY_BONUS_PROGRAMS;
    const q = searchQuery.toLowerCase();
    return INVENTORY_BONUS_PROGRAMS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.sku.toLowerCase().includes(q) ||
        b.programName.toLowerCase().includes(q) ||
        b.businessLineName?.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = (item: (typeof INVENTORY_BONUS_PROGRAMS)[0]) => {
    onSelectBonus({
      sku: item.sku,
      name: item.name,
      description: item.description,
      uom: item.uom,
      unitPrice: 0,
      businessLineId: item.businessLineId,
      businessLineName: item.businessLineName,
      costCenterCode: item.costCenterCode,
      quantity: 1
    });
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Pilih Program Bonus & Hadiah (Inventory)"
      description="Daftar item promosi resmi yang telah disetting sebagai bonus di Inventory. Item akan dimasukkan dengan harga Rp 0."
      icon={<Gift className="w-5 h-5 text-amber-600" />}
      footer={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#475569] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama bonus, program promosi, atau divisi LOB..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] transition-all"
          />
        </div>

        {/* Bonus List Cards */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredBonuses.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#64748B]">
              Tidak ada program bonus yang cocok dengan pencarian.
            </div>
          ) : (
            filteredBonuses.map((bonus) => (
              <div
                key={bonus.sku}
                className="p-3 bg-white border border-[#CBD5E1] hover:border-amber-400 rounded-xl transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                      ★ {bonus.badge}
                    </span>
                    <span className="text-[10px] font-mono text-[#64748B]">
                      {bonus.sku}
                    </span>
                    <span className="text-[10px] text-[#086288] font-semibold">
                      [{bonus.businessLineId}]
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#0F172A]">{bonus.name}</h4>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">
                    {bonus.description}
                  </p>
                  <p className="text-[10px] text-[#059669] font-medium pt-0.5">
                    Syarat: {bonus.terms}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E2E8F0]">
                  <div className="text-right">
                    <span className="text-[10px] text-[#64748B] block">Harga:</span>
                    <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      GRATIS (Rp 0)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelect(bonus)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Pasangkan Bonus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </BaseModal>
  );
};
