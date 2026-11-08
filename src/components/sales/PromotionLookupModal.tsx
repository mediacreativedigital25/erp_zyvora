import React, { useState, useMemo } from 'react';
import { Tag, Search, Check, AlertCircle, Percent, Calendar } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';

export interface PromotionProgram {
  code: string;
  name: string;
  description: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number; // Flat IDR or percentage (e.g. 5 for 5%)
  maxDiscount?: number;
  minOrderValue: number;
  validUntil: string;
  category: string;
}

interface PromotionLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubtotal: number;
  onApplyPromotion: (promo: {
    code: string;
    name: string;
    discountAmount: number;
  }) => void;
}

// Master Program Promosi & Voucher Resmi Zyvora
const ACTIVE_PROMOTION_PROGRAMS: PromotionProgram[] = [
  {
    code: 'EXPO-JKT-2026',
    name: 'Promo Gebyar Wedding Expo 2026',
    description: 'Potongan langsung flat untuk pemesanan paket wedding selama pameran.',
    discountType: 'fixed',
    discountValue: 2500000,
    minOrderValue: 25000000,
    validUntil: '31 Des 2026',
    category: 'Wedding Expo'
  },
  {
    code: 'CORP-PART-5M',
    name: 'Cashback Kemitraan Korporat B2B',
    description: 'Voucher insentif kontrak kerja sama corporate event tahunan.',
    discountType: 'fixed',
    discountValue: 5000000,
    minOrderValue: 50000000,
    validUntil: '31 Des 2026',
    category: 'Corporate'
  },
  {
    code: 'EARLY-BIRD-5%',
    name: 'Early Bird Booking Promo (H-60)',
    description: 'Diskon 5% untuk klien yang mengonfirmasi booking minimal 60 hari sebelum acara.',
    discountType: 'percentage',
    discountValue: 5,
    maxDiscount: 2000000,
    minOrderValue: 15000000,
    validUntil: '31 Des 2026',
    category: 'Seasonal'
  },
  {
    code: 'CATER-DISC-1M',
    name: 'Voucher Paket Tambahan Catering & Food Stalls',
    description: 'Kupon subsidi logistik catering acara.',
    discountType: 'fixed',
    discountValue: 1000000,
    minOrderValue: 10000000,
    validUntil: '31 Des 2026',
    category: 'F&B Support'
  },
  {
    code: 'NEW-CLIENT-500K',
    name: 'Welcome Voucher Klien Baru',
    description: 'Voucher selamat datang untuk klien terdaftar pertama kali di Zyvora.',
    discountType: 'fixed',
    discountValue: 5000000 / 10,
    minOrderValue: 5000000,
    validUntil: '31 Des 2026',
    category: 'Acquisition'
  }
];

export const PromotionLookupModal: React.FC<PromotionLookupModalProps> = ({
  isOpen,
  onClose,
  currentSubtotal,
  onApplyPromotion
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPromotions = useMemo(() => {
    if (!searchQuery.trim()) return ACTIVE_PROMOTION_PROGRAMS;
    const q = searchQuery.toLowerCase();
    return ACTIVE_PROMOTION_PROGRAMS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const calculateDiscount = (promo: PromotionProgram): number => {
    if (promo.discountType === 'fixed') {
      return promo.discountValue;
    }
    const percentAmount = Math.round((currentSubtotal * promo.discountValue) / 100);
    return promo.maxDiscount ? Math.min(percentAmount, promo.maxDiscount) : percentAmount;
  };

  const handleApply = (promo: PromotionProgram) => {
    const amount = calculateDiscount(promo);
    onApplyPromotion({
      code: promo.code,
      name: promo.name,
      discountAmount: amount
    });
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Pilih Program Promosi & Voucher Resmi"
      description="Pilih kupon diskon resmi yang memenuhi syarat transaksi untuk dipasangkan ke order penjualan."
      icon={<Tag className="w-5 h-5 text-[#086288]" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-[#64748B]">
            Subtotal Order Saat Ini:{' '}
            <strong className="text-[#086288] font-mono">
              Rp {currentSubtotal.toLocaleString('id-ID')}
            </strong>
          </span>
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
            placeholder="Cari nama program promo, kode voucher, atau kategori..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288] transition-all"
          />
        </div>

        {/* Promotions List Cards */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredPromotions.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#64748B]">
              Tidak ada program promosi yang sesuai dengan pencarian.
            </div>
          ) : (
            filteredPromotions.map((promo) => {
              const isEligible = currentSubtotal >= promo.minOrderValue;
              const discAmount = calculateDiscount(promo);
              const deficit = promo.minOrderValue - currentSubtotal;

              return (
                <div
                  key={promo.code}
                  className={`p-3.5 rounded-xl border transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                    isEligible
                      ? 'bg-white border-[#B7DDEA] hover:border-[#086288]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] opacity-75'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                        {promo.code}
                      </span>
                      <span className="text-[10px] font-semibold text-[#64748B] px-1.5 py-0.5 bg-[#F1F5F9] rounded">
                        {promo.category}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> s/d {promo.validUntil}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-[#0F172A]">{promo.name}</h4>
                    <p className="text-[11px] text-[#64748B]">{promo.description}</p>

                    <div className="pt-1 flex items-center gap-3 text-[11px]">
                      <span className="text-[#475569]">
                        Syarat Min. Belanja:{' '}
                        <strong className="font-mono text-[#0F172A]">
                          Rp {promo.minOrderValue.toLocaleString('id-ID')}
                        </strong>
                      </span>
                      {isEligible ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3" /> Memenuhi Syarat
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertCircle className="w-3 h-3" /> Kurang Rp{' '}
                          {deficit.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E2E8F0]">
                    <div className="text-right">
                      <span className="text-[10px] text-[#64748B] block">Nilai Potongan:</span>
                      <span className="text-xs font-bold font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        - Rp {discAmount.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!isEligible}
                      onClick={() => handleApply(promo)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
                        isEligible
                          ? 'bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] text-white'
                          : 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed opacity-50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isEligible ? 'Terapkan Voucher' : 'Belum Memenuhi'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </BaseModal>
  );
};
