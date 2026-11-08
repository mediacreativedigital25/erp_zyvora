-- ====================================================================
-- ZYVORA ERP 1.0.0 — MIGRATION 003: GLOBAL ADDRESS STANDARD
-- Target Database: Supabase Cloud (PostgreSQL 15+)
-- Status: PENDING OPERATOR REVIEW (DO NOT EXECUTE AUTOMATICALLY)
-- Mode Operasi: STANDALONE SCHEMA MIGRATION
-- Deskripsi:
--   Standarisasi kolom alamat Indonesia dan kode wilayah internasional
--   lintas modul ERP: customers, branches, warehouses, vendors.
--   Mendukung backward-compatibility penuh tanpa menghapus kolom lama.
-- ====================================================================

BEGIN;

-- 1. Standardisasi tabel customers
ALTER TABLE IF EXISTS public.customers
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(8) DEFAULT 'ID',
    ADD COLUMN IF NOT EXISTS country VARCHAR(64) DEFAULT 'Indonesia',
    ADD COLUMN IF NOT EXISTS province_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS province_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS regency_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS regency_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS district_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS district_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS village_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS village_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(16),
    ADD COLUMN IF NOT EXISTS address_line TEXT,
    ADD COLUMN IF NOT EXISTS rt VARCHAR(8),
    ADD COLUMN IF NOT EXISTS rw VARCHAR(8);

CREATE INDEX IF NOT EXISTS idx_customers_province_id ON public.customers(province_id);
CREATE INDEX IF NOT EXISTS idx_customers_regency_id ON public.customers(regency_id);

-- 2. Standardisasi tabel branches (Cabang & Unit Usaha)
ALTER TABLE IF EXISTS public.branches
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(8) DEFAULT 'ID',
    ADD COLUMN IF NOT EXISTS country VARCHAR(64) DEFAULT 'Indonesia',
    ADD COLUMN IF NOT EXISTS province_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS province_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS regency_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS regency_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS district_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS district_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS village_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS village_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(16);

-- 3. Standardisasi tabel warehouses (Gudang & Lokasi)
ALTER TABLE IF EXISTS public.warehouses
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(8) DEFAULT 'ID',
    ADD COLUMN IF NOT EXISTS country VARCHAR(64) DEFAULT 'Indonesia',
    ADD COLUMN IF NOT EXISTS province_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS province_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS regency_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS regency_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS district_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS district_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS village_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS village_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(16);

-- 4. Standardisasi tabel vendors (Pemasok)
ALTER TABLE IF EXISTS public.vendors
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(8) DEFAULT 'ID',
    ADD COLUMN IF NOT EXISTS country VARCHAR(64) DEFAULT 'Indonesia',
    ADD COLUMN IF NOT EXISTS province_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS province_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS regency_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS regency_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS district_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS district_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS village_id VARCHAR(16),
    ADD COLUMN IF NOT EXISTS village_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(16);

COMMIT;
