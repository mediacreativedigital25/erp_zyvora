# ZYVORA ERP 1.0.0 — SUPABASE INTEGRATION PLAN

Tanggal: 2026-10-22  
Target: Supabase Cloud (`nfjucyabfiqlmrxnviuz`)  
Prinsip: **Zero-Downtime, Non-Destructive, Repository Abstraction, Strict RLS**

---

## 1. Rencana Fase Integrasi Bertahap

Integrasi tidak boleh dilakukan secara serentak (*big-bang*). Modul-modul akan dihubungkan secara sekuensial setelah setiap langkah teruji:

```
[Tahap 1: Fondasi Klien & Env] ──► [Tahap 2: Auth & Profil] ──► [Tahap 3: Tenant & Cabang] ──► [Tahap 4: Master Pelanggan] ──► [Tahap 5: Transaksi & Jurnal]
```

### Tahap 1: Fondasi Klien & Validasi Environment (Selesai pada turn ini)
- Pasang package `@supabase/supabase-js`.
- Buat modul `src/services/supabaseClient.ts` dengan penanganan graceful jika env var belum terpasang.
- Tetapkan arsitektur **Repository Pattern**:
  - `src/services/repositories/types.ts`: Kontrak interface data-access.
  - `src/services/repositories/mockRepository.ts`: Menjaga ketersediaan data preview saat offline / belum terkoneksi.
  - `src/services/repositories/supabaseRepository.ts`: Implementasi query Supabase riil dengan RLS.
- Sediakan indikator status koneksi Supabase di UI (tab Pengaturan).

### Tahap 2: Autentikasi & Profil Pengguna (Next Milestone)
- Integrasikan `supabase.auth.onAuthStateChange`.
- Sinkronisasi tabel `profiles` dari `auth.users`.
- Pengalihan sesi dan manajemen login.

### Tahap 3: Keanggotaan Tenant & Pemilihan Cabang (Next Milestone)
- Query tabel `tenant_memberships` untuk memuat daftar tenant dan unit bisnis yang sah bagi user yang sedang login.
- Penegakan filter tenant di level context.

### Tahap 4: Master Pelanggan & Validasi 5-Karakter
- Hubungkan `customers` ke Supabase.
- Penegakan keunikan `customer_code` di level basis data:
  ```sql
  ALTER TABLE customers ADD CONSTRAINT unique_tenant_customer_code UNIQUE(tenant_id, customer_code);
  ```

### Tahap 5: Transaksi Operasional & Double-Entry Bookkeeping
- `sales_orders`, `purchase_orders`, `stock_movements`.
- `journal_entries` & `journal_lines` dengan pemeriksaan debit = kredit di level trigger / stored procedure.

---

## 2. DDL Skema Bersih (Non-Destruktif) untuk Supabase SQL Editor

Jika hasil audit skema (`docs/DATABASE_SCHEMA_AUDIT.md`) menunjukkan tabel belum ada, kueri berikut aman dieksekusi karena menggunakan `IF NOT EXISTS` dan mengaktifkan RLS:

```sql
-- ====================================================================
-- DDL INISIAL ZYVORA ERP 1.0.0 (NON-DESTRUCTIVE)
-- ====================================================================

-- 1. Tabel Organisasi & Tenant
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code VARCHAR(16) NOT NULL UNIQUE,
    slug VARCHAR(64) NOT NULL UNIQUE,
    plan VARCHAR(32) DEFAULT 'enterprise',
    status VARCHAR(24) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profil Pengguna (Terikat ke auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Unit Bisnis & Cabang
CREATE TABLE IF NOT EXISTS public.business_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code VARCHAR(16) NOT NULL,
    name TEXT NOT NULL,
    tax_id VARCHAR(32),
    currency CHAR(3) DEFAULT 'IDR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    code VARCHAR(16) NOT NULL,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    phone VARCHAR(32),
    is_headquarters BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    code VARCHAR(16) NOT NULL,
    name TEXT NOT NULL,
    type VARCHAR(24) DEFAULT 'central',
    address TEXT,
    capacity_m2 NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Keanggotaan Tenant (Isolasi & RBAC)
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'sales',
    status VARCHAR(24) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

-- 5. Master Pelanggan (Customer Code 5 Karakter Huruf Kapital & Angka)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_code CHAR(5) NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    credit_limit NUMERIC DEFAULT 0,
    outstanding_balance NUMERIC DEFAULT 0,
    status VARCHAR(24) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_customer_code_len CHECK (char_length(customer_code) = 5),
    CONSTRAINT unique_tenant_customer_code UNIQUE (tenant_id, customer_code)
);

-- 6. Log Audit Transaksi
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id),
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action VARCHAR(32) NOT NULL,
    entity VARCHAR(48) NOT NULL,
    entity_id TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS) WAJIB
-- ====================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper policy function: Cek apakah user adalah anggota sah dari tenant
CREATE OR REPLACE FUNCTION public.check_user_tenant_membership(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.tenant_memberships
        WHERE user_id = auth.uid()
          AND tenant_id = p_tenant_id
          AND status = 'active'
    );
$$;

-- RLS Policy: Tenants hanya dapat dilihat Super Admin Platform atau anggota aktif tenant
DROP POLICY IF EXISTS "tenants_select_scoped" ON public.tenants;
CREATE POLICY "tenants_select_scoped" ON public.tenants
    FOR SELECT
    TO authenticated
    USING (
        public.is_platform_super_admin()
        OR EXISTS (
            SELECT 1 
            FROM public.tenant_memberships tm
            WHERE tm.user_id = auth.uid()
              AND tm.tenant_id = public.tenants.id
              AND tm.status = 'active'
        )
    );

-- RLS Policy: Customers hanya dapat diakses anggota tenant yang sah
DROP POLICY IF EXISTS "tenant_isolation_customers" ON public.customers;
CREATE POLICY "tenant_isolation_customers" ON public.customers
    FOR ALL
    USING (public.check_user_tenant_membership(tenant_id))
    WITH CHECK (public.check_user_tenant_membership(tenant_id));
```
