import React, { useState, useMemo } from 'react';
import {
  Search,
  Package,
  Sparkles,
  Layers,
  Box,
  Check,
  X,
  Plus,
  Filter,
  ArrowRight,
  Tag
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { Product } from '../../types/erp';
import { BaseModal } from '../common/BaseModal';

export interface SelectedProductItem {
  id?: string;
  sku: string;
  name: string;
  description?: string;
  uom: string;
  unitPrice: number;
  businessLineId?: string;
  businessLineName?: string;
  costCenterCode?: string;
  quantity?: number;
}

interface ProductLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (item: SelectedProductItem) => void;
  title?: string;
  defaultCategory?: string;
  allowedType?: 'all' | 'service' | 'physical';
}

// Predefined multi-LOB service catalog
const ECOSYSTEM_SERVICES: SelectedProductItem[] = [
  {
    sku: 'SRV-HIZ-001',
    name: 'Full Day Wedding Planning, Rundown & Coordination',
    description: 'Comprehensive WO services with 8 field event coordinators and lead planner.',
    uom: 'Package',
    unitPrice: 35000000,
    businessLineId: 'HIZAKI',
    businessLineName: 'Hizaki Wedding Planner',
    costCenterCode: 'CC-LOB-HIZAKI'
  },
  {
    sku: 'SRV-HIZ-002',
    name: 'Half Day Holy Matrimony / Akad Coordination',
    description: 'Ceremony coordination with 5 field crew, rundown direction, and guest welcoming.',
    uom: 'Package',
    unitPrice: 18000000,
    businessLineId: 'HIZAKI',
    businessLineName: 'Hizaki Wedding Planner',
    costCenterCode: 'CC-LOB-HIZAKI'
  },
  {
    sku: 'SRV-AUR-001',
    name: 'Grand Floral Stage 14m & Foyer Photo Gallery',
    description: 'Premium fresh floral decoration, thematic lighting, photo booth and pathway pergola.',
    uom: 'Set',
    unitPrice: 45000000,
    businessLineId: 'AURUM',
    businessLineName: 'Aurum Deco',
    costCenterCode: 'CC-LOB-AURUM'
  },
  {
    sku: 'SRV-AUR-002',
    name: 'Rustic Garden Backdrop & Entrance Pergola',
    description: 'Botanical foliage, custom calligraphy board, and acoustic stage decoration.',
    uom: 'Set',
    unitPrice: 22000000,
    businessLineId: 'AURUM',
    businessLineName: 'Aurum Deco',
    costCenterCode: 'CC-LOB-AURUM'
  },
  {
    sku: 'SRV-QUE-001',
    name: 'Digital Web Invitation & RSVP Management Hub',
    description: 'Luxury responsive web invitation, WhatsApp blast gateway, and digital guestbook.',
    uom: 'Package',
    unitPrice: 2500000,
    businessLineId: 'QUEINVITE',
    businessLineName: 'Queinvite Wedding Digital',
    costCenterCode: 'CC-QUEINVITE'
  },
  {
    sku: 'SRV-QUE-002',
    name: 'QR Check-In Guest System with 4 Thermal Printers',
    description: 'Onsite digital registration, VIP barcode scanner, custom printed badge, and live projector dashboard.',
    uom: 'Set',
    unitPrice: 7500000,
    businessLineId: 'QUEINVITE',
    businessLineName: 'Queinvite Wedding Digital',
    costCenterCode: 'CC-QUEINVITE'
  },
  {
    sku: 'SRV-KIM-001',
    name: 'Ki Mi Ko Pager Ayu — 8 Penerima Tamu Adat & Gaun',
    description: '8 Professional ushers with coordinated modern traditional gowns, briefing, and protocol.',
    uom: 'Person',
    unitPrice: 12000000,
    businessLineId: 'KIMIKO',
    businessLineName: 'Ki Mi Ko Pager Ayu',
    costCenterCode: 'CC-LOB-KIMIKO'
  },
  {
    sku: 'SRV-KIM-002',
    name: 'Ki Mi Ko Protocol Officers & Family Butler Service',
    description: '4 Dedicated VIP protocol officers and 2 family liaisons throughout reception ceremony.',
    uom: 'Package',
    unitPrice: 8500000,
    businessLineId: 'KIMIKO',
    businessLineName: 'Ki Mi Ko Pager Ayu',
    costCenterCode: 'CC-LOB-KIMIKO'
  }
];

export const ProductLookupModal: React.FC<ProductLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  title = 'Pilih Produk & Jasa Layanan',
  allowedType = 'all'
}) => {
  const { products } = useErp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'service' | 'physical'>('all');
  const [selectedLob, setSelectedLob] = useState<string>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Sync tab with allowedType
  React.useEffect(() => {
    if (allowedType === 'service') {
      setActiveTab('service');
    } else if (allowedType === 'physical') {
      setActiveTab('physical');
    } else {
      setActiveTab('all');
    }
  }, [allowedType, isOpen]);

  // Merge ERP products and Ecosystem Services
  const allAvailableItems = useMemo(() => {
    const list: Array<
      SelectedProductItem & {
        type: 'service' | 'physical' | 'digital';
        stock?: number;
        categoryName?: string;
      }
    > = [];

    // 1. Add Predefined Multi-LOB Services
    ECOSYSTEM_SERVICES.forEach((srv) => {
      list.push({
        ...srv,
        type: 'service',
        categoryName: srv.businessLineName || 'Layanan Acara'
      });
    });

    // 2. Add Products from Inventory Master
    products.forEach((p: Product) => {
      // Check if already in list by sku to prevent duplicate display
      if (list.some((l) => l.sku === p.sku)) return;

      const pType = p.type || 'physical';
      const lobId = p.businessLineId || (pType === 'service' ? 'QUEINVITE' : undefined);
      const lobName =
        lobId === 'HIZAKI'
          ? 'Hizaki Wedding Planner'
          : lobId === 'AURUM'
          ? 'Aurum Deco'
          : lobId === 'QUEINVITE'
          ? 'Queinvite Wedding Digital'
          : lobId === 'KIMIKO'
          ? 'Ki Mi Ko Pager Ayu'
          : p.category || 'Inventory Pusat';

      const costCenter =
        lobId === 'HIZAKI'
          ? 'CC-LOB-HIZAKI'
          : lobId === 'AURUM'
          ? 'CC-LOB-AURUM'
          : lobId === 'QUEINVITE'
          ? 'CC-QUEINVITE'
          : lobId === 'KIMIKO'
          ? 'CC-LOB-KIMIKO'
          : 'CC-INVENTORY-DEFAULT';

      list.push({
        id: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description || `${p.category} — Satuan ${p.uom}`,
        uom: p.uom,
        unitPrice: p.sellingPrice || 0,
        businessLineId: lobId,
        businessLineName: lobName,
        costCenterCode: costCenter,
        type: pType,
        stock: p.totalStock,
        categoryName: p.category
      });
    });

    return list;
  }, [products]);

  // Filtered Items based on Tab, LOB, and Search
  const filteredItems = useMemo(() => {
    return allAvailableItems.filter((item) => {
      // Type Tab Filter
      if (activeTab === 'service' && item.type !== 'service') return false;
      if (activeTab === 'physical' && item.type !== 'physical') return false;

      // LOB Filter
      if (selectedLob !== 'all' && item.businessLineId !== selectedLob) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchLob = item.businessLineName?.toLowerCase().includes(q);
        const matchCat = item.categoryName?.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchDesc && !matchLob && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [allAvailableItems, activeTab, selectedLob, searchQuery]);

  const handleQtyChange = (sku: string, val: number) => {
    const safeVal = Math.max(1, isNaN(val) ? 1 : val);
    setQuantities((prev) => ({ ...prev, [sku]: safeVal }));
  };

  const handleSelect = (item: (typeof allAvailableItems)[0]) => {
    const qty = quantities[item.sku] || 1;
    onSelectProduct({
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      uom: item.uom,
      unitPrice: item.unitPrice,
      businessLineId: item.businessLineId,
      businessLineName: item.businessLineName,
      costCenterCode: item.costCenterCode,
      quantity: qty
    });
    onClose();
  };

  const renderLobBadge = (lobId?: string, lobName?: string) => {
    switch (lobId) {
      case 'QUEINVITE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-[#086288] border border-cyan-200">
            <Sparkles className="w-2.5 h-2.5" /> Queinvite
          </span>
        );
      case 'HIZAKI':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0284C7] border border-sky-200">
            <Layers className="w-2.5 h-2.5" /> Hizaki WO
          </span>
        );
      case 'AURUM':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Sparkles className="w-2.5 h-2.5" /> Aurum Deco
          </span>
        );
      case 'KIMIKO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
            <Tag className="w-2.5 h-2.5" /> Ki Mi Ko
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <Box className="w-2.5 h-2.5" /> {lobName || 'Inventory'}
          </span>
        );
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EFF7FA] text-[#086288] flex items-center justify-center border border-[#B7DDEA]">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] leading-none">{title}</h2>
            <p className="text-[11px] text-[#64748B] mt-1 font-normal">
              Pilih item produk fisik dari Inventory atau katalog paket layanan multi-LOB
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full text-xs">
          <div className="text-[#64748B]">
            Menampilkan <strong className="text-[#086288]">{filteredItems.length}</strong> produk / jasa
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Top Controls: Search & Tabs */}
        <div className="space-y-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan SKU, nama barang / jasa, kategori, atau LOB..."
              className="w-full pl-9 pr-9 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#086288] focus:ring-1 focus:ring-[#086288]"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Tabs & LOB Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F1F5F9]">
            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1">
              {allowedType === 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#086288] text-white shadow-2xs'
                      : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] border border-[#CBD5E1]'
                  }`}
                >
                  Semua ({allAvailableItems.length})
                </button>
              )}
              {(allowedType === 'all' || allowedType === 'service') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('service')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    activeTab === 'service'
                      ? 'bg-[#086288] text-white shadow-2xs'
                      : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] border border-[#CBD5E1]'
                  }`}
                >
                  <Sparkles className="w-3 h-3" /> Jasa & Layanan
                </button>
              )}
              {(allowedType === 'all' || allowedType === 'physical') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('physical')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    activeTab === 'physical'
                      ? 'bg-[#086288] text-white shadow-2xs'
                      : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] border border-[#CBD5E1]'
                  }`}
                >
                  <Box className="w-3 h-3" /> Produk Fisik (Inventory)
                </button>
              )}
            </div>

            {/* LOB Dropdown Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#086288]" />
              <select
                value={selectedLob}
                onChange={(e) => setSelectedLob(e.target.value)}
                className="px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-md text-xs text-[#0F172A] focus:outline-hidden focus:border-[#086288] cursor-pointer"
              >
                <option value="all">Semua LOB / Lini Bisnis</option>
                <option value="HIZAKI">Hizaki Wedding Planner</option>
                <option value="AURUM">Aurum Deco</option>
                <option value="QUEINVITE">Queinvite Wedding Digital</option>
                <option value="KIMIKO">Ki Mi Ko Pager Ayu</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product / Service Items List */}
        <div className="border border-[#CBD5E1] rounded-xl overflow-hidden max-h-[52vh] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-[#475569]">
                Tidak ada produk atau jasa yang sesuai dengan pencarian.
              </p>
              <p className="text-[11px] text-[#94A3B8]">
                Coba gunakan kata kunci SKU, nama barang, atau ubah filter kategori.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#EFF7FA] text-[#086288] font-bold border-b border-[#CBD5E1] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-28">SKU / Kode</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Nama Produk / Jasa</th>
                  <th className="py-2.5 px-3 w-32">LOB / Kategori</th>
                  <th className="py-2.5 px-2 text-center w-20">Satuan</th>
                  <th className="py-2.5 px-2 text-center w-20">Stok</th>
                  <th className="py-2.5 px-3 text-right w-32">Harga Satuan</th>
                  <th className="py-2.5 px-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {filteredItems.map((item) => {
                  const qty = quantities[item.sku] || 1;
                  return (
                    <tr key={item.sku} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#086288]">
                        {item.sku}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#0F172A]">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {renderLobBadge(item.businessLineId, item.businessLineName)}
                      </td>
                      <td className="py-2.5 px-2 text-center text-[#475569] font-medium">
                        {item.uom}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {item.type === 'service' ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Tersedia
                          </span>
                        ) : typeof item.stock === 'number' ? (
                          <span
                            className={`font-mono text-xs font-semibold ${
                              item.stock > 0 ? 'text-[#0F172A]' : 'text-rose-600 font-bold'
                            }`}
                          >
                            {item.stock} {item.uom}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F172A]">
                        Rp {item.unitPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={qty}
                            onChange={(e) => handleQtyChange(item.sku, parseInt(e.target.value))}
                            className="w-12 px-1.5 py-1 text-center font-bold text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded focus:outline-hidden focus:border-[#086288]"
                            title="Kuantitas Order"
                          />
                          <button
                            type="button"
                            onClick={() => handleSelect(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#086288] hover:bg-[#064B6A] text-white rounded font-bold text-xs shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Plus className="w-3 h-3" /> Pilih
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
