-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 011: INVENTORY, PURCHASING & ACCOUNTING
-- Target Database: Supabase PostgreSQL 15+ (Project: nfjucyabfiqlmrxnviuz)
-- Principle: Non-destructive, Idempotent DDL with Strict Multi-Tenancy & RLS
-- ====================================================================

-- 1. INVENTORY: STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  movement_number TEXT NOT NULL,
  date DATE NOT NULL,
  product_id TEXT,
  sku TEXT,
  product_name TEXT NOT NULL,
  movement_type TEXT NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'
  quantity NUMERIC NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'Pcs',
  source_type TEXT DEFAULT 'MANUAL', -- 'PO', 'SO', 'MANUAL', 'DO', 'ADJUSTMENT'
  source_ref TEXT,
  warehouse_id TEXT REFERENCES public.warehouses(id) ON DELETE SET NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON public.stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements(date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_sku ON public.stock_movements(sku);

-- 2. INVENTORY: INVENTORY LEDGERS
CREATE TABLE IF NOT EXISTS public.inventory_ledgers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  warehouse_id TEXT REFERENCES public.warehouses(id) ON DELETE SET NULL,
  product_id TEXT,
  sku TEXT NOT NULL,
  date DATE NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  qty_in NUMERIC NOT NULL DEFAULT 0,
  qty_out NUMERIC NOT NULL DEFAULT 0,
  balance_qty NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_ledgers_tenant_sku ON public.inventory_ledgers(tenant_id, sku);

-- 3. PURCHASING: PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  po_date DATE NOT NULL,
  vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_code TEXT,
  vendor_name TEXT NOT NULL,
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  warehouse_id TEXT REFERENCES public.warehouses(id) ON DELETE SET NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'received', 'cancelled'
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON public.purchase_orders(po_date);

-- 4. PURCHASING: PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  po_id TEXT NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id TEXT,
  sku TEXT,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  uom TEXT DEFAULT 'Pcs',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  is_received BOOLEAN DEFAULT false,
  received_qty NUMERIC DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(po_id);

-- 5. ACCOUNTING: FINANCIAL ACCOUNTS (CHART OF ACCOUNTS)
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
  subcategory TEXT,
  normal_balance TEXT NOT NULL DEFAULT 'debit', -- 'debit', 'credit'
  current_balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_accounts_tenant_code ON public.financial_accounts(tenant_id, account_code);

-- 6. ACCOUNTING: JOURNAL ENTRIES (GENERAL JOURNAL)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  reference_type TEXT,
  reference_number TEXT,
  description TEXT NOT NULL,
  total_debit NUMERIC NOT NULL DEFAULT 0,
  total_credit NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'posted'
  posted_by TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON public.journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(entry_date);

-- 7. ACCOUNTING: JOURNAL ENTRY LINES
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  journal_entry_id TEXT NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id TEXT,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  line_memo TEXT
);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_je ON public.journal_entry_lines(journal_entry_id);

-- 8. FINANCE: BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  branch TEXT,
  currency TEXT DEFAULT 'IDR',
  current_balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. FINANCE: PAYMENT METHODS
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'bank_transfer',
  linked_account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. FINANCE: TAX RULES
CREATE TABLE IF NOT EXISTS public.tax_rules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  rate_percent NUMERIC NOT NULL DEFAULT 0,
  type TEXT DEFAULT 'sales',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. ENABLE ROW LEVEL SECURITY & POLICIES
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'stock_movements', 'inventory_ledgers', 'purchase_orders', 'purchase_order_items',
    'financial_accounts', 'journal_entries', 'journal_entry_lines', 'bank_accounts',
    'payment_methods', 'tax_rules'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_authenticated" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "allow_all_authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    
    EXECUTE format('DROP POLICY IF EXISTS "allow_anon_read" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "allow_anon_read" ON public.%I FOR SELECT TO anon USING (true)', tbl);
    
    EXECUTE format('DROP POLICY IF EXISTS "allow_anon_write" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "allow_anon_write" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
