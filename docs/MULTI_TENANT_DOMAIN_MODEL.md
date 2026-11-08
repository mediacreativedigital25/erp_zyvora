# ZYVORA ERP 1.0.0 — MULTI-TENANT DOMAIN MODEL & BUSINESS INVARIANTS

Tanggal: 2026-10-22  
Versi: 1.0.0-PROD-SPEC  
Target: Supabase PostgreSQL (`nfjucyabfiqlmrxnviuz`)

---

## 1. Hierarki Organisasi 5-Tingkat

Zyvora mengimplementasikan pemisahan data berlapis secara hierarkis:

```
[PLATFORM] (Ekosistem Zyvora Cloud Engine)
   │
   └──► [TENANTS / ORGANIZATIONS] (Entitas Perusahaan Induk / Holding)
           │
           ├──► [BUSINESS UNITS] (Unit Usaha / PT / Badan Hukum Anak Perusahaan)
           │       │
           │       └──► [BRANCHES] (Cabang Operasional Regional / Kantor Wilayah)
           │               │
           │               └──► [WAREHOUSES] (Lokasi Fisik / Gudang Stok Penyimpanan)
           │
           └──► [TENANT MEMBERSHIPS & PROFILES] (Identitas User, Roles & Permissions)
```

### Penjelasan Level Hierarki:
1. **Platform**: Tingkat global ekosistem perangkat lunak Zyvora. Bertanggung jawab atas provisioning instance, lisensi tenant, dan telemetry teknis non-bisnis.
2. **Tenant (Organization)**: Batas isolasi utama (*strict tenant isolation*). Setiap data operasional (pelanggan, pesanan, akun jurnal, mutasi stok) wajib terikat ke satu `tenant_id`. Data antar tenant terisolasi total melalui RLS.
3. **Business Unit**: Entitas legal atau divisi bisnis di bawah satu tenant (misal: *PT Zyvora Distribusi Nusantara* [FMCG] dan *PT Zyvora Retail Dinamika* [Ritel]). Memiliki mata uang operasional dan identitas pajak (NPWP) tersendiri.
4. **Branch**: Lokasi kantor cabang fisik yang menjalankan transaksi operasional di wilayah tertentu (misal: *Jakarta Pusat HQ*, *Surabaya Cabang Timur*, *Medan Cabang Deli*).
5. **Warehouse**: Fasilitas fisik penyimpanan persediaan barang (misal: *Gudang Pusat Cakung*, *Gudang Transit Marunda*). Setiap mutasi stok terikat ke gudang asal dan/atau gudang tujuan.

---

## 2. Struktur Entitas Inti Multi-Tenant & RBAC

### A. Tabel Identitas & Keanggotaan
- `tenants`:
  - `id` (UUID, Primary Key)
  - `name` (TEXT)
  - `code` (VARCHAR(16), UNIQUE)
  - `slug` (VARCHAR(64), UNIQUE)
  - `plan` (VARCHAR(32)) — `starter` | `growth` | `enterprise`
  - `status` (VARCHAR(24)) — `active` | `suspended`
  - `created_at` (TIMESTAMPTZ)
- `profiles`:
  - `id` (UUID, Primary Key, REFERENCES `auth.users(id)` ON DELETE CASCADE)
  - `full_name` (TEXT)
  - `email` (TEXT)
  - `avatar_url` (TEXT)
  - `created_at` (TIMESTAMPTZ)
- `tenant_memberships`:
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, REFERENCES `profiles(id)`)
  - `tenant_id` (UUID, REFERENCES `tenants(id)`)
  - `role_id` (UUID, REFERENCES `roles(id)`)
  - `default_business_unit_id` (UUID, REFERENCES `business_units(id)`)
  - `default_branch_id` (UUID, REFERENCES `branches(id)`)
  - `status` (VARCHAR(24)) — `active` | `invited` | `revoked`
  - `created_at` (TIMESTAMPTZ)
  - *Constraint*: `UNIQUE(user_id, tenant_id)`

### B. Role-Based Access Control (RBAC)
- `roles`:
  - `id` (UUID, Primary Key)
  - `tenant_id` (UUID, REFERENCES `tenants(id)`) — NULL jika role sistem bawaan
  - `name` (VARCHAR(64)) — `super_admin`, `tenant_admin`, `branch_manager`, `accountant`, `inventory_staff`, `sales_rep`
  - `description` (TEXT)
  - `is_system` (BOOLEAN DEFAULT FALSE)
- `permissions`:
  - `id` (VARCHAR(64), Primary Key) — misal: `sales:order:create`, `inventory:stock:transfer`, `accounting:journal:post`
  - `module` (VARCHAR(32))
  - `description` (TEXT)
- `role_permissions`:
  - `role_id` (UUID, REFERENCES `roles(id)`)
  - `permission_id` (VARCHAR(64), REFERENCES `permissions(id)`)
  - Primary Key: `(role_id, permission_id)`

### C. Struktur Organisasi
- `business_units`:
  - `id` (UUID, Primary Key)
  - `tenant_id` (UUID, REFERENCES `tenants(id)`)
  - `code` (VARCHAR(16))
  - `name` (TEXT)
  - `tax_id` (VARCHAR(32))
  - `currency` (CHAR(3) DEFAULT 'IDR')
  - `is_active` (BOOLEAN DEFAULT TRUE)
- `branches`:
  - `id` (UUID, Primary Key)
  - `business_unit_id` (UUID, REFERENCES `business_units(id)`)
  - `code` (VARCHAR(16))
  - `name` (TEXT)
  - `city` (TEXT)
  - `address` (TEXT)
  - `is_headquarters` (BOOLEAN DEFAULT FALSE)
  - `is_active` (BOOLEAN DEFAULT TRUE)
- `warehouses`:
  - `id` (UUID, Primary Key)
  - `branch_id` (UUID, REFERENCES `branches(id)`)
  - `code` (VARCHAR(16))
  - `name` (TEXT)
  - `type` (VARCHAR(24)) — `central` | `retail` | `transit` | `returns`
  - `capacity_m2` (NUMERIC)
  - `is_active` (BOOLEAN DEFAULT TRUE)

### D. Audit Log
- `audit_logs`:
  - `id` (UUID, Primary Key DEFAULT gen_random_uuid())
  - `tenant_id` (UUID, REFERENCES `tenants(id)`)
  - `actor_id` (UUID, REFERENCES `profiles(id)`)
  - `actor_name` (TEXT)
  - `actor_role` (TEXT)
  - `action` (VARCHAR(32)) — `CREATE` | `UPDATE` | `DELETE` | `POST` | `VOID` | `EXPORT` | `LOGIN`
  - `entity` (VARCHAR(48)) — `SalesOrder`, `Customer`, `JournalEntry`, `StockMovement`, dll.
  - `entity_id` (TEXT)
  - `description` (TEXT)
  - `ip_address` (TEXT)
  - `created_at` (TIMESTAMPTZ DEFAULT now())

---

## 3. Aturan Bisnis Wajib (Invariants)

### A. Aturan Kode Pelanggan (Customer Code)
1. **Panjang Tepat 5 Karakter:** Tidak boleh kurang atau lebih dari 5 karakter.
2. **Karakter Terbatas:** Hanya huruf kapital `A–Z` dan digit angka `0–9` (disarankan mengecualikan glif ambigu seperti `0/O` dan `1/I` pada generator untuk mempermudah operasional lisan).
3. **Otomatis & Unik:** Dibuat secara otomatis oleh sistem dengan jaminan keunikan di level tenant (`UNIQUE(tenant_id, customer_code)`).
4. **Immutable:** Sekali diterbitkan, kode pelanggan **dilarang diubah** untuk menjaga kontinuitas audit data.
5. **Independensi Status:** Customer Code adalah identifier murni entitas pelanggan. Kode ini **tidak menyatakan status keaktifan, kelas diskon, atau keharusan pelanggan melakukan repeat order**.
6. **Pemisahan Identifier:**
   - `Customer Code` (5 karakter alfanumerik uppercase) ≠ `Sales Code` (kode staf penjualan)
   - `Customer Code` ≠ `NIK` (Nomor Induk Karyawan / Kependudukan)
   - `Customer Code` ≠ `ID internal` (UUID database)

### B. Aturan Penomoran Dokumen Transaksi
Mengikuti pola standar kanonikal master plan:
$$\text{[PREFIX]} - \text{[YYYYMM]} - \text{[6-DIGIT SEQUENCE]}$$
Contoh:
- Pesanan Penjualan: `SO-202610-000104`
- Pesanan Pembelian: `PO-202610-000042`
- Mutasi Stok: `MUT-202610-000088`
- Jurnal Voucher: `JV-202610-000215`

### C. Aturan Double-Entry Bookkeeping
1. Setiap transaksi jurnal wajib memiliki baris debit dan kredit yang **seimbang secara matematis**:
   $$\sum \text{Debit} = \sum \text{Kredit}$$
2. Jurnal yang telah berstatus `posted` menjadi **read-only / immutable**.
3. Pembatalan atau koreksi transaksi yang sudah terposting dilakukan melalui **Voucher Pembalik (Reversal Entry)** dengan referensi eksplisit ke voucher asli dan pencatatan pada `audit_logs`.
