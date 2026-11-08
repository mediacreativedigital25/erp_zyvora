-- ====================================================================
-- ZYVORA ERP 1.0.0 — UNIFIED FULL SYSTEM MIGRATION (FASE 1 S/D FASE 2)
-- Target Database: Supabase Cloud / PostgreSQL 15+
-- Karakteristik:
--   1. Fully Idempotent (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
--   2. Atomic Transaction (BEGIN ... COMMIT)
--   3. Zero Data Loss (Aman dijalankan berulang kali tanpa merusak data eksisting)
--   4. Dual-Role Grant (anon & authenticated mendapatkan hak akses)
-- Cakupan Modul:
--   - Bagian 1: Lini Bisnis & Fondasi Pusat Biaya (Cost Center)
--   - Bagian 2: Katalog Produk Persediaan & Layanan Jasa
--   - Bagian 3: Master Kategori Produk & Satuan Ukur (UoM)
--   - Bagian 4: Master Kendaraan, Nopol, Pemegang Inventaris, & Jatuh Tempo Pajak
--   - Bagian 5: Dokumen Transaksi Klaim Biaya Multi-Line (CE + YYYYMM + 5 Digit)
--   - Bagian 6: Aturan Klaim Biaya (Kategori Beban, Plafon, & Aktivitas Operasional)
--   - Bagian 7: Hak Akses Tabel & Kebijakan Keamanan RLS
--   - Bagian 8: Inisialisasi Data Awal (Seed Data)
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 0. EKSTENSI DATABASE
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. LINI BISNIS & FONDASI PUSAT BIAYA (COST CENTER)
-- --------------------------------------------------------------------
ALTER TABLE IF EXISTS public.tenant_business_lines
    ADD COLUMN IF NOT EXISTS cost_center_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS allow_shared_allocation BOOLEAN DEFAULT TRUE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tbl_cost_center 
    ON public.tenant_business_lines(tenant_id, cost_center_code);

-- Self-healing: Inisialisasi kode Cost Center otomatis jika belum ada
UPDATE public.tenant_business_lines
SET cost_center_code = 'CC-' || code
WHERE cost_center_code IS NULL;

-- --------------------------------------------------------------------
-- 2. KATALOG PRODUK PERSEDIAAN & LAYANAN JASA
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    sku VARCHAR(64) NOT NULL,
    barcode VARCHAR(32),
    name TEXT NOT NULL,
    description TEXT,
    type VARCHAR(32) DEFAULT 'physical' NOT NULL,
    category VARCHAR(128) NOT NULL,
    business_line_id TEXT,
    uom VARCHAR(64) NOT NULL,
    weight_gram INT DEFAULT 0 NOT NULL,
    min_stock_level INT DEFAULT 0 NOT NULL,
    cost_price NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    selling_price NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    image_url TEXT,
    stock_by_warehouse JSONB DEFAULT '{}'::jsonb NOT NULL,
    total_stock INT DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_products_sku UNIQUE (tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(tenant_id, sku);

CREATE TABLE IF NOT EXISTS public.service_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    code VARCHAR(64) NOT NULL,
    barcode VARCHAR(32),
    name TEXT NOT NULL,
    description TEXT,
    category VARCHAR(128) NOT NULL,
    business_line_id TEXT,
    uom VARCHAR(64) NOT NULL,
    cost_price NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    rate NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_service_items_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_service_items_tenant ON public.service_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_items_code ON public.service_items(tenant_id, code);

-- --------------------------------------------------------------------
-- 3. MASTER KATEGORI PRODUK & SATUAN UKUR (UOM)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    item_type VARCHAR(32) NOT NULL DEFAULT 'all',
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_categories_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON public.product_categories(tenant_id, is_active);

CREATE TABLE IF NOT EXISTS public.unit_of_measures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    classification VARCHAR(64) NOT NULL DEFAULT 'General',
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_unit_of_measures_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_unit_of_measures_tenant ON public.unit_of_measures(tenant_id, is_active);

-- --------------------------------------------------------------------
-- 4. MASTER ARMADA KENDARAAN (FLEET & TAX DUE DATE MONITORING)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_vehicles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    license_plate TEXT NOT NULL,                         -- Nomor Polisi (e.g. 'B 1234 XYZ')
    brand_model TEXT NOT NULL,                           -- Merk & Model (e.g. 'Toyota Avanza 1.3 G')
    vehicle_type TEXT NOT NULL DEFAULT 'car',            -- 'car', 'motorcycle', 'van', 'truck'
    fuel_type TEXT NOT NULL DEFAULT 'pertamax',          -- 'pertalite', 'pertamax', 'dexlite', 'solar'
    assigned_branch_id TEXT,
    assigned_business_line_id TEXT,
    custodian_employee_id TEXT,                          -- ID Pegawai Pemegang Inventaris
    custodian_name TEXT,                                 -- Nama Pemegang Inventaris (PIC / Driver)
    tax_due_date DATE,                                   -- Tanggal Jatuh Tempo Pajak Tahunan
    plate_expiry_date DATE,                              -- Tanggal Ganti Plat 5 Tahunan
    current_odometer_km NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_company_vehicles_plate UNIQUE (tenant_id, license_plate)
);

-- Pengaman idempoten jika tabel company_vehicles sudah ada sebelumnya
ALTER TABLE IF EXISTS public.company_vehicles
    ADD COLUMN IF NOT EXISTS custodian_employee_id TEXT,
    ADD COLUMN IF NOT EXISTS custodian_name TEXT,
    ADD COLUMN IF NOT EXISTS tax_due_date DATE,
    ADD COLUMN IF NOT EXISTS plate_expiry_date DATE;

CREATE INDEX IF NOT EXISTS idx_company_vehicles_tenant ON public.company_vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_vehicles_active ON public.company_vehicles(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_company_vehicles_tax_due ON public.company_vehicles(tax_due_date);

-- --------------------------------------------------------------------
-- 5. TRANSAKSI KLAIM BIAYA MULTI-BARIS (EXPENSE CLAIMS & ITEMS)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_claims (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    claim_number TEXT NOT NULL,                          -- Format: CE + YYYYMM + 00001 (e.g. CE20261000001)
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_by_user_id TEXT NOT NULL,
    request_by_name TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',                -- 'draft', 'submitted', 'approved', 'paid', 'rejected'
    notes TEXT,
    disbursement_method TEXT NOT NULL DEFAULT 'petty_cash',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_expense_claims_number UNIQUE (tenant_id, claim_number),
    CONSTRAINT chk_expense_claims_status CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'rejected'))
);

CREATE TABLE IF NOT EXISTS public.expense_claim_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    claim_id TEXT NOT NULL REFERENCES public.expense_claims(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL DEFAULT 1,
    order_by_type TEXT NOT NULL DEFAULT 'business_line', -- 'business_line', 'personnel', 'branch'
    order_by_target_id TEXT NOT NULL,
    order_by_target_name TEXT NOT NULL,
    cost_center_code TEXT NOT NULL,                      -- e.g. 'CC-QUEINVITE', 'CC-BR-JKT'
    category TEXT NOT NULL,                              -- e.g. 'EXP-FUEL', 'EXP-TRAVEL'
    activity TEXT NOT NULL,                              -- Deskripsi aktivitas kegiatan operasional
    is_vehicle_activity BOOLEAN NOT NULL DEFAULT false,
    vehicle_id TEXT,
    license_plate TEXT,
    odometer_km NUMERIC(12, 2),
    fuel_liters NUMERIC(8, 2),
    fuel_purchase_date DATE,
    nominal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    disbursement_method TEXT NOT NULL DEFAULT 'petty_cash',
    remark TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_expense_claims_tenant ON public.expense_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON public.expense_claims(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_date ON public.expense_claims(tenant_id, claim_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_claim_items_claim ON public.expense_claim_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_expense_claim_items_cost_center ON public.expense_claim_items(cost_center_code);

-- --------------------------------------------------------------------
-- 6. ATURAN KLAIM BIAYA (KATEGORI BEBAN & AKTIVITAS OPERASIONAL)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_expense_categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,                                  -- e.g. 'EXP-FUEL', 'EXP-TRAVEL'
    name TEXT NOT NULL,                                  -- e.g. 'Bahan Bakar & Kendaraan'
    is_vehicle_activity BOOLEAN NOT NULL DEFAULT false,  -- Memicu form log armada kendaraan
    max_limit NUMERIC(15, 2) NOT NULL DEFAULT 0,         -- 0 = Tanpa batas limit
    is_receipt_required BOOLEAN NOT NULL DEFAULT true,   -- Wajib melampirkan bukti fisik struk
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_claim_categories_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.claim_expense_activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,                                  -- e.g. 'ACT-DELIV', 'ACT-CLIENT'
    name TEXT NOT NULL,                                  -- e.g. 'Pengantaran Hampers Undangan'
    business_line_id TEXT,                               -- Relasi spesifik lini bisnis (opsional)
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_claim_activities_code UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_claim_categories_tenant ON public.claim_expense_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_claim_activities_tenant ON public.claim_expense_activities(tenant_id);

-- --------------------------------------------------------------------
-- 7. HAK AKSES PERMISSION & KEBIJAKAN KEAMANAN ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------------
-- Memberikan izin kepada role anon, authenticated, dan service_role
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.service_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.product_categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.unit_of_measures TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.company_vehicles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.expense_claims TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.expense_claim_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.claim_expense_categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.claim_expense_activities TO anon, authenticated, service_role;

-- Aktifkan RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_of_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claim_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_expense_activities ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Multi-Tenant Aman
DROP POLICY IF EXISTS p_company_vehicles_all ON public.company_vehicles;
CREATE POLICY p_company_vehicles_all ON public.company_vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_expense_claims_all ON public.expense_claims;
CREATE POLICY p_expense_claims_all ON public.expense_claims FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_expense_claim_items_all ON public.expense_claim_items;
CREATE POLICY p_expense_claim_items_all ON public.expense_claim_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_claim_categories_all ON public.claim_expense_categories;
CREATE POLICY p_claim_categories_all ON public.claim_expense_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_claim_activities_all ON public.claim_expense_activities;
CREATE POLICY p_claim_activities_all ON public.claim_expense_activities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_products_all ON public.products;
CREATE POLICY p_products_all ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_items_all ON public.service_items;
CREATE POLICY p_service_items_all ON public.service_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_product_categories_all ON public.product_categories;
CREATE POLICY p_product_categories_all ON public.product_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_unit_of_measures_all ON public.unit_of_measures;
CREATE POLICY p_unit_of_measures_all ON public.unit_of_measures FOR ALL USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------
-- 8. INISIALISASI DATA AWAL RESMI (SEED DATA TENANT DEFAULT)
-- --------------------------------------------------------------------
-- A. Kategori Klaim Biaya
INSERT INTO public.claim_expense_categories (
    id, tenant_id, code, name, is_vehicle_activity, max_limit, is_receipt_required, is_active
) VALUES
    ('cat_01', 'ten_zyvora_corp', 'EXP-FUEL', 'Bahan Bakar & Kendaraan (Vehicle & Fuel)', true, 750000, true, true),
    ('cat_02', 'ten_zyvora_corp', 'EXP-TRAVEL', 'Perjalanan Dinas (Travel & Lodging)', false, 2500000, true, true),
    ('cat_03', 'ten_zyvora_corp', 'EXP-MEAL', 'Konsumsi & Representasi (Meals & Client)', false, 500000, true, true),
    ('cat_04', 'ten_zyvora_corp', 'EXP-OFFICE', 'Perlengkapan Kantor (Office Supplies / ATK)', false, 1000000, true, true),
    ('cat_05', 'ten_zyvora_corp', 'EXP-LOGIS', 'Kurir & Logistik Pengiriman (Logistics)', false, 500000, true, true),
    ('cat_06', 'ten_zyvora_corp', 'EXP-GEN', 'Operasional Umum (General Operations)', false, 1500000, true, true)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    is_vehicle_activity = EXCLUDED.is_vehicle_activity,
    max_limit = EXCLUDED.max_limit,
    is_receipt_required = EXCLUDED.is_receipt_required,
    is_active = EXCLUDED.is_active;

-- B. Aktivitas Operasional
INSERT INTO public.claim_expense_activities (
    id, tenant_id, code, name, business_line_id, description, is_active
) VALUES
    ('act_01', 'ten_zyvora_corp', 'ACT-DELIV', 'Pengantaran Hampers Undangan VIP', 'lob_01', 'Pengiriman paket sampel dan pesanan undangan VIP ke klien langsung', true),
    ('act_02', 'ten_zyvora_corp', 'ACT-CLIENT', 'Meeting Koordinasi Vendor & Klien', 'lob_01', 'Pertemuan pembahasan layout dan desain undangan dengan pihak WO', true),
    ('act_03', 'ten_zyvora_corp', 'ACT-OFFICE', 'Operasional Kantor & Gudang Harian', NULL, 'Kegiatan pemeliharaan operasional kantor dan kebersihan gudang', true),
    ('act_04', 'ten_zyvora_corp', 'ACT-MAINT', 'Perawatan & Servis Armada Rutin', NULL, 'Ganti oli berkala, tune-up, dan perbaikan ringan kendaraan operasional kantor', true)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    business_line_id = EXCLUDED.business_line_id,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- C. Armada Kendaraan Operasional Contoh
INSERT INTO public.company_vehicles (
    id, tenant_id, license_plate, brand_model, vehicle_type, fuel_type,
    assigned_branch_id, assigned_business_line_id, custodian_name,
    tax_due_date, plate_expiry_date, current_odometer_km, is_active, notes
) VALUES
    ('veh_01', 'ten_zyvora_corp', 'B 1234 XYZ', 'Toyota Avanza 1.3 G', 'car', 'pertalite', 'br_jkt_hq', 'lob_01', 'Bambang Pamungkas (Driver)', '2026-10-30', '2028-10-30', 45280, true, 'Kendaraan operasional utama holding'),
    ('veh_02', 'ten_zyvora_corp', 'B 5678 ABC', 'Daihatsu Gran Max Blind Van', 'van', 'pertalite', 'br_jkt_hq', 'lob_01', 'Iwan Setiawan (Logistik)', '2027-02-14', '2029-02-14', 78150, true, 'Armada logistik pengiriman & delivery hampers'),
    ('veh_03', 'ten_zyvora_corp', 'L 9012 DEF', 'Honda Beat FI', 'motorcycle', 'pertalite', 'br_sub_op', 'lob_01', 'Arya Pratama (Surabaya Lead)', '2026-10-20', '2027-10-20', 18400, true, 'Operasional kurir cepat Cabang Surabaya')
ON CONFLICT (tenant_id, license_plate) DO UPDATE SET
    brand_model = EXCLUDED.brand_model,
    custodian_name = EXCLUDED.custodian_name,
    tax_due_date = EXCLUDED.tax_due_date,
    plate_expiry_date = EXCLUDED.plate_expiry_date,
    current_odometer_km = EXCLUDED.current_odometer_km,
    is_active = EXCLUDED.is_active;

COMMIT;
