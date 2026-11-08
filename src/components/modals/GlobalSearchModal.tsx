import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  ShoppingBag,
  Truck,
  Boxes,
  Users,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    navigateToFeature,
    salesOrders,
    purchaseOrders,
    products,
    customers,
    accounts
  } = useErp();

  const [searchQuery, setSearchQuery] = useState('');

  // Lock body scroll when search modal is open
  useEffect(() => {
    if (!isSearchOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isSearchOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  const filteredResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      category: 'Pesanan Penjualan' | 'Pesanan Pembelian' | 'Produk' | 'Pelanggan' | 'Akun Keuangan';
      featureId: string;
      icon: React.ReactNode;
    }> = [];

    // Search Sales Orders
    salesOrders.forEach((so) => {
      if (
        so.orderNumber.toLowerCase().includes(q) ||
        so.customerName.toLowerCase().includes(q) ||
        so.customerCode.toLowerCase().includes(q)
      ) {
        results.push({
          id: so.id,
          title: `${so.orderNumber} — ${so.customerName}`,
          subtitle: `Kode: ${so.customerCode} · Total: Rp ${so.totalAmount.toLocaleString('id-ID')} · Status: ${so.status}`,
          category: 'Pesanan Penjualan',
          featureId: 'so',
          icon: <ShoppingBag className="w-4 h-4 text-[#086288]" />
        });
      }
    });

    // Search Customers
    customers.forEach((c) => {
      if (
        c.customerCode.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      ) {
        results.push({
          id: c.id,
          title: `[${c.customerCode}] ${c.companyName}`,
          subtitle: `PIC: ${c.name} · ${c.city} · Limit: Rp ${c.creditLimit.toLocaleString('id-ID')}`,
          category: 'Pelanggan',
          featureId: 'customers',
          icon: <Users className="w-4 h-4 text-[#086288]" />
        });
      }
    });

    // Search Products
    products.forEach((p) => {
      if (
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      ) {
        results.push({
          id: p.id,
          title: `${p.sku} — ${p.name}`,
          subtitle: `Stok: ${p.totalStock} ${p.uom} · Harga: Rp ${p.sellingPrice.toLocaleString('id-ID')} · ${p.category}`,
          category: 'Produk',
          featureId: 'products',
          icon: <Boxes className="w-4 h-4 text-[#086288]" />
        });
      }
    });

    // Search Purchase Orders
    purchaseOrders.forEach((po) => {
      if (
        po.orderNumber.toLowerCase().includes(q) ||
        po.vendorName.toLowerCase().includes(q) ||
        po.vendorCode.toLowerCase().includes(q)
      ) {
        results.push({
          id: po.id,
          title: `${po.orderNumber} — ${po.vendorName}`,
          subtitle: `Vendor: ${po.vendorCode} · Total: Rp ${po.totalAmount.toLocaleString('id-ID')} · Status: ${po.status}`,
          category: 'Pesanan Pembelian',
          featureId: 'po',
          icon: <Truck className="w-4 h-4 text-[#086288]" />
        });
      }
    });

    // Search Financial Accounts
    accounts.forEach((acc) => {
      if (
        acc.code.toLowerCase().includes(q) ||
        acc.name.toLowerCase().includes(q) ||
        acc.category.toLowerCase().includes(q)
      ) {
        results.push({
          id: acc.id,
          title: `${acc.code} — ${acc.name}`,
          subtitle: `Kategori: ${acc.category} · Saldo: Rp ${acc.balance.toLocaleString('id-ID')}`,
          category: 'Akun Keuangan',
          featureId: 'accounts',
          icon: <Wallet className="w-4 h-4 text-[#086288]" />
        });
      }
    });

    return results;
  }, [searchQuery, salesOrders, customers, products, purchaseOrders, accounts]);

  if (!isSearchOpen) return null;

  const handleSelectResult = (featureId: string) => {
    navigateToFeature(featureId);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 md:p-16 transition-opacity animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian Global ERP"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsSearchOpen(false);
          setSearchQuery('');
        }
      }}
    >
      <div
        className="bg-white rounded-lg border border-[#DCE5EC] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 mt-4 sm:mt-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#DCE5EC] flex items-center gap-3 bg-[#F8FAFC]">
          <Search className="w-5 h-5 text-[#94A3B8] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ketik nomor SO, PO, kode pelanggan 5-karakter, SKU, akun..."
            autoFocus
            className="w-full text-sm bg-transparent border-none text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
            className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer"
            title="Tutup Pencarian (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] sm:max-h-[420px] overflow-y-auto p-2 custom-scrollbar">
          {searchQuery.trim() === '' ? (
            <div className="py-8 px-4 text-center">
              <p className="text-xs text-[#475569]">
                Coba cari contoh data: <code className="text-[#086288] font-semibold bg-[#EFF7FA] px-1 rounded">SO-202610</code>,{' '}
                <code className="text-[#086288] font-semibold bg-[#EFF7FA] px-1 rounded">K9X2B</code>,{' '}
                <code className="text-[#086288] font-semibold bg-[#EFF7FA] px-1 rounded">Minyak Goreng</code>, atau{' '}
                <code className="text-[#086288] font-semibold bg-[#EFF7FA] px-1 rounded">BCA</code>
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-[#475569]">
              Tidak ada hasil yang sesuai dengan kata kunci &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                {filteredResults.length} Hasil Ditemukan
              </div>
              {filteredResults.map((item) => (
                <button
                  type="button"
                  key={`${item.category}_${item.id}`}
                  onClick={() => handleSelectResult(item.featureId)}
                  className="w-full p-2.5 rounded-lg hover:bg-[#EEF4F8] text-left flex items-center justify-between gap-3 group transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-1.5 rounded bg-[#EFF7FA] border border-[#B7DDEA] mt-0.5 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0F172A] truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#475569] bg-[#EEF4F8] border border-[#DCE5EC] px-1.5 py-0.2 rounded shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#475569] truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#086288] shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#DCE5EC] flex items-center justify-between text-[11px] text-[#94A3B8]">
          <span>Gunakan mouse atau keyboard untuk memilih item</span>
          <span className="font-mono text-[#086288]">ESC untuk tutup</span>
        </div>
      </div>
    </div>
  );
};
