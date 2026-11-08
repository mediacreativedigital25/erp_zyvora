# ZYVORA ERP 1.0.0 — DATABASE SCHEMA AUDIT & READ-ONLY INSPECTION MANUAL

**Tanggal Pembaruan:** 2026-10-24  
**Target Database:** Supabase PostgreSQL Cloud  
**Project Reference:** `nfjucyabfiqlmrxnviuz`  
**Status Akses AI Studio:** Read-Only / Zero Direct DB Connection  
**Status Otorisasi:** PENDING PRODUCT OWNER APPROVAL (DO NOT EXECUTE MIGRATION)  
**Prinsip Mutlak:** ZERO DATABASE EXECUTION — Seluruh kueri pada dokumen ini bersifat murni `SELECT` tanpa operasi DDL atau DML.

---

## 1. Pernyataan Batasan & Prinsip Keamanan

AI Studio beroperasi di dalam lingkungan *isolated sandbox container* lokal tanpa akses jaringan langsung, kredensial administratif, atau koneksi langsung ke Supabase Cloud instance `nfjucyabfiqlmrxnviuz`.

Sesuai tata kelola keamanan dan instruksi Product Owner:
1. **Zero Database Execution:** Kami tidak pernah dan tidak akan menjalankan SQL apa pun secara otomatis, tidak menjalankan migrasi, seed, rollback, `DROP`, `ALTER`, `CREATE`, atau `DELETE`.
2. **Prinsip Kejujuran Status:** Seluruh objek database di Supabase Cloud yang belum diinspeksi dengan hasil kueri aktual berstatus resmi `CLOUD STATUS UNKNOWN`. Kami tidak mengarang atau mengasumsikan kondisi cloud.
3. **Pemisahan Wewenang (Separation of Duties):** Seluruh kueri inspeksi dalam dokumen ini dirancang khusus untuk dijalankan secara mandiri oleh Product Owner atau DBA yang berwenang melalui **Supabase Dashboard → SQL Editor**.

---

## 2. Panduan Langkah demi Langkah Eksekusi Read-Only bagi Product Owner

Untuk memverifikasi kesiapan skema database sebelum mempertimbangkan otorisasi naskah migrasi `docs/migrations/001_user_access_and_rbac.sql`, ikuti langkah-langkah berikut:

1. **Masuk ke Supabase Dashboard:**
   - Buka browser dan arahkan ke [https://supabase.com/dashboard](https://supabase.com/dashboard).
   - Pilih proyek `nfjucyabfiqlmrxnviuz` (Zyvora ERP).
2. **Buka SQL Editor:**
   - Pada panel navigasi kiri, klik ikon **SQL Editor**.
   - Klik **New query** (Kueri Baru).
3. **Jalankan Kueri Secara Bertahap (Kueri 1 sampai Kueri 6):**
   - Salin satu blok kueri dari bagian 3 di bawah ini.
   - Tempel ke dalam editor dan klik tombol **Run** (atau tekan `Ctrl+Enter` / `Cmd+Enter`).
   - Catat hasil yang muncul dan cocokkan dengan kriteria keberhasilan pada **Bagian 4: Checklist Evaluasi Keputusan PO**.
4. **Catatan Hak Akses (Privilege Context):**
   - Di Supabase Dashboard SQL Editor, sesi dijalankan di bawah peran default `postgres` (superuser / administrative role). Kueri katalog (`information_schema`, `pg_catalog`, `pg_policies`) serta skema internal `auth.users` dapat dibaca secara sah dengan peran ini.
   - Jika SQL Editor dibatasi oleh kebijakan organisasi, gunakan rute UI visual pada **Authentication → Users** dan **Table Editor** sebagaimana dijelaskan pada catatan masing-masing kueri.

---

## 3. Kumpulan Kueri Verifikasi Read-Only Pra-Migrasi 001

Seluruh query di bawah ini **100% READ-ONLY** (hanya pernyataan `SELECT` murni, pembacaan view katalog standar ANSI SQL `information_schema` dan view katalog PostgreSQL `pg_catalog`).

---

### Kueri 1: Pemeriksaan Keberadaan Akun Supabase Auth Kandidat Super Admin
*Tujuan:* Memastikan akun email Super Admin pertama (`admin@yulovi.com`) telah terdaftar di Supabase Auth sebelum migrasi dieksekusi, guna mencegah *Bootstrap Deadlock* dan penolakan otomatis migrasi.

```sql
SELECT 
    id AS candidate_uuid, 
    email, 
    confirmed_at, 
    created_at, 
    last_sign_in_at
FROM auth.users 
WHERE email = 'admin@yulovi.com';
```

- **Objek yang Diperiksa:** View/tabel internal `auth.users` pada skema `auth` untuk email `admin@yulovi.com`.
- **Konteks Privilege:** Memerlukan akses ke skema `auth` (tersedia secara default pada Supabase Dashboard SQL Editor di bawah peran `postgres`).
- **Alternatif Visual Tanpa SQL:** Buka menu **Supabase Dashboard → Authentication → Users**, lalu ketik `admin@yulovi.com` pada bilah pencarian (Search Users).
- **Hasil yang Diharapkan:** Tepat **1 baris** yang menampilkan UUID valid, tanggal pembuatan, dan status konfirmasi email.
- **Interpretasi & Tindak Lanjut:**
  - *Jika 1 baris ditemukan:* Prasyarat bootstrap Section 9 migrasi 001 terpenuhi. Catat UUID kandidat untuk verifikasi integritas audit.
  - *Jika 0 baris (kosong):* **BLOCKER KRITIS (CLOUD BLOCKER #1)**. Naskah migrasi 001 dilengkapi proteksi invariant *anti-lockout* yang akan melempar exception `ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND` dan melakukan **ROLLBACK 100%** jika akun ini belum ada. PO wajib mendaftarkan email `admin@yulovi.com` via **Authentication → Users → Invite / Add User** sebelum migrasi diajukan untuk dieksekusi.

---

### Kueri 2: Pemeriksaan Dependensi Struktur Skema Dasar (Struktur, Kolom, PK, dan FK)
*Tujuan:* Memverifikasi keberadaan 4 tabel inti prasyarat migrasi 001 (`tenants`, `profiles`, `tenant_memberships`, `audit_logs`) beserta tipe kolom wajib, primary key, dan foreign key pendukung.

#### 2A. Verifikasi Keberadaan Tabel dan Tipe Kolom Wajib
```sql
SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public' 
  AND c.table_name IN ('tenants', 'profiles', 'tenant_memberships', 'audit_logs')
ORDER BY c.table_name, c.ordinal_position;
```

#### 2B. Verifikasi Primary Key & Unique Constraints
```sql
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name 
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('tenants', 'profiles', 'tenant_memberships', 'audit_logs')
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
```

#### 2C. Verifikasi Foreign Key Relationships (Relational Integrity)
```sql
SELECT 
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,
    rc.update_rule,
    rc.delete_rule,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name 
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name 
 AND tc.table_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu 
  ON rc.unique_constraint_name = ccu.constraint_name 
 AND rc.unique_constraint_schema = ccu.constraint_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('tenants', 'profiles', 'tenant_memberships', 'audit_logs')
ORDER BY tc.table_name, kcu.column_name;
```

- **Objek yang Diperiksa:** `information_schema.columns`, `information_schema.table_constraints`, `information_schema.key_column_usage`, dan `information_schema.referential_constraints`.
- **Hasil yang Diharapkan:**
  - 4 tabel inti ditemukan pada skema `public`.
  - `tenants.id` (UUID PK), `profiles.id` (UUID PK references `auth.users`), `tenant_memberships.id` (UUID PK), `audit_logs.id` (UUID PK).
  - FK `tenant_memberships.tenant_id -> tenants.id` dan `tenant_memberships.user_id -> profiles.id`.
  - FK `audit_logs.tenant_id -> tenants.id`.
- **Interpretasi & Tindak Lanjut:**
  - *Jika 4 tabel lengkap:* Dependensi skema dasar migrasi 001 telah terpenuhi.
  - *Jika tabel belum ada atau skema belum lengkap:* **BLOCKER SKEMA (CLOUD BLOCKER #2)**. Jalankan DDL inisial non-destruktif dari `docs/SUPABASE_INTEGRATION_PLAN.md` Bagian 2 terlebih dahulu sebelum migrasi 001.

---

### Kueri 3: Pemeriksaan Integritas Kolom `user_code` pada `public.profiles` (Privasi Terjaga)
*Tujuan:* Memeriksa apakah kolom `user_code` sudah ada pada `public.profiles` dan menguji agregat validitas data existing terhadap regex resmi 2–3 karakter (`^[2-9A-HJ-NP-Z]{2,3}$`) tanpa mengekspos PII (nama atau email).

#### 3A. Pemeriksaan Definisi Kolom `user_code`
```sql
SELECT 
    column_name, 
    data_type, 
    character_maximum_length, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'user_code';
```

#### 3B. Pemeriksaan Agregat Validitas Kode Pengguna (Zero PII Exposure)
```sql
SELECT 
    COUNT(*) AS total_profiles_with_code,
    COUNT(CASE WHEN user_code ~ '^[2-9A-HJ-NP-Z]{2,3}$' THEN 1 END) AS compliant_code_count,
    COUNT(CASE WHEN user_code !~ '^[2-9A-HJ-NP-Z]{2,3}$' THEN 1 END) AS violating_code_count
FROM public.profiles 
WHERE user_code IS NOT NULL;
```

#### 3C. Kueri Diagnostik Khusus (Jalankan HANYA JIKA violating_code_count > 0)
```sql
-- CATATAN: Kueri ini HANYA boleh dijalankan jika kueri 3B mendeteksi violating_code_count > 0.
-- Kueri ini membatasi eksposur data sensitif hanya pada ID teknis dan nilai kode pelanggar.
SELECT 
    id AS profile_id, 
    user_code, 
    char_length(user_code) AS code_length
FROM public.profiles 
WHERE user_code IS NOT NULL 
  AND user_code !~ '^[2-9A-HJ-NP-Z]{2,3}$';
```

- **Objek yang Diperiksa:** Kolom `public.profiles.user_code` dan validasi regex format aman.
- **Hasil yang Diharapkan:**
  - Kueri 3A: Mengembalikan 1 baris (`VARCHAR(3)`) jika kolom sudah pernah dibuat, atau 0 baris jika baru akan ditambahkan oleh migrasi 001 (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). Keduanya valid.
  - Kueri 3B: Nilai `violating_code_count` **Wajib bernilai 0**.
- **Interpretasi & Tindak Lanjut:**
  - *Jika violating_code_count = 0:* Penambahan CHECK constraint `profiles_user_code_safe_alphabet_chk` oleh migrasi 001 dijamin aman tanpa risiko gagal validasi data existing.
  - *Jika violating_code_count > 0:* **BLOCKER DATA INTEGRITY**. Terdapat data dengan karakter terlarang (`0`, `1`, `O`, `I`) atau panjang kode di luar 2–3 karakter. Gunakan Kueri 3C untuk mendeteksi ID baris pelanggar dan lakukan remediasi manual sebelum migrasi dijalankan.

---

### Kueri 4: Pemeriksaan Distribusi & Kepatuhan Nilai Role pada `public.tenant_memberships`
*Tujuan:* Memeriksa nilai unik kolom `role` pada seluruh keanggotaan tenant yang ada di database cloud untuk memastikan kepatuhan tata kelola role PO.

```sql
SELECT 
    role,
    COUNT(*) AS total_users,
    CASE 
        WHEN role IN ('super_admin', 'owner', 'admin', 'sales', 'customer') THEN 'OFFICIAL ROLE (Disetujui PO)'
        WHEN role IN ('inventory_staff', 'accountant') THEN 'STATUS: HOLD (Karantina - Pertahankan, Jangan Normalisasi)'
        WHEN role = 'branch_manager' THEN 'STATUS: REVIEW (Karantina - Pertahankan, Jangan Normalisasi)'
        WHEN role = 'sales_rep' THEN 'LEGACY ROLE (Perlu review manual individual)'
        ELSE 'UNRECOGNIZED ROLE (Konflik - Perlu Investigasi)'
    END AS policy_compliance_status
FROM public.tenant_memberships
GROUP BY role
ORDER BY total_users DESC;
```

- **Objek yang Diperiksa:** Seluruh nilai unik kolom `role` pada `public.tenant_memberships`.
- **Hasil yang Diharapkan:** 
  - Jika tabel baru dibuat, query mengembalikan 0 baris (tabel kosong, siap untuk diisi).
  - Jika sudah ada data pengguna, seluruh role berada pada kategori OFFICIAL atau kategori karantina (HOLD / REVIEW).
- **Interpretasi & Tindak Lanjut:**
  - *Role `sales_rep`:* Data legacy dari arsitektur lama. Sesuai mandat PO, migrasi 001 **tidak melakukan normalisasi massal**. Data dipertahankan sebagaimana adanya.
  - *Role HOLD (`inventory_staff`, `accountant`) & REVIEW (`branch_manager`):* Sesuai mandat PO, **jangan dimapping paksa** ke `admin` atau `sales`.
  - *Role `UNRECOGNIZED ROLE`:* Investigasi manual diperlukan sebelum otorisasi migrasi.

---

### Kueri 5: Pemeriksaan Status Objek Migrasi 001 (Pemisahan Objek Secara Akurat)
*Tujuan:* Memeriksa apakah tabel keamanan, fungsi RPC/trigger, indeks, constraint, dan kebijakan RLS migrasi 001 sudah pernah dibuat sebagian atau belum pernah dijalankan sama sekali.

#### 5A. Keberadaan Tabel Keamanan Migrasi 001
```sql
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('platform_super_admins', 'burned_user_codes')
ORDER BY table_name;
```

#### 5B. Keberadaan Fungsi RPC & Trigger Functions Migrasi 001
```sql
SELECT 
    routine_name, 
    routine_type, 
    data_type AS return_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
      'is_platform_super_admin', 
      'generate_concurrency_safe_user_code', 
      'is_user_code_available', 
      'assign_user_role', 
      'toggle_user_status',
      'trg_burn_user_code_on_profile_delete',
      'trg_enforce_profiles_user_code_immutable'
  )
ORDER BY routine_name;
```

#### 5C. Keberadaan Indeks B-Tree Migrasi 001
```sql
SELECT 
    tablename, 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN ('idx_profiles_user_code', 'idx_platform_super_admins_active')
ORDER BY tablename, indexname;
```

#### 5D. Keberadaan Check & Unique Constraints Migrasi 001
```sql
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' 
  AND tc.constraint_name IN (
      'profiles_user_code_unique',
      'profiles_user_code_safe_alphabet_chk',
      'burned_user_code_format_chk'
  )
ORDER BY tc.table_name, tc.constraint_name;
```

#### 5E. Keberadaan Kebijakan Row Level Security (RLS) Migrasi 001
```sql
SELECT 
    tablename, 
    policyname, 
    roles, 
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
      'platform_super_admins', 
      'burned_user_codes', 
      'tenants', 
      'profiles', 
      'tenant_memberships', 
      'audit_logs'
  )
ORDER BY tablename, policyname;
```

- **Objek yang Diperiksa:** Katalog PostgreSQL (`information_schema.tables`, `information_schema.routines`, `pg_indexes`, `information_schema.table_constraints`, `pg_policies`).
- **Hasil yang Diharapkan:**
  - *Kondisi Bersih (Clean State Pra-Migrasi):* 5A, 5B, 5C, 5D mengembalikan 0 baris. 5E hanya menampilkan kebijakan RLS dasar jika ada.
  - *Kondisi Pasca-Migrasi:* Seluruh objek keamanan (2 tabel, 6 fungsi, 2 indeks, 3 constraint, dan 9 RLS policy) terdaftar lengkap.
- **Interpretasi & Tindak Lanjut:**
  - Naskah migrasi 001 bersifat **idempoten** (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`). Jika sebagian objek sudah ada, naskah tidak akan mengalami error duplikasi saat dieksekusi.

---

### Kueri 6: Pemeriksaan Spesifik Trigger & Fungsi Trigger pada `public.profiles`
*Tujuan:* Mencocokkan nama trigger dan nama fungsi trigger pada tabel `profiles` secara tepat sesuai dengan spesifikasi migrasi 001.

#### 6A. Keberadaan Trigger pada `public.profiles`
```sql
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table = 'profiles'
  AND trigger_name IN ('trg_profiles_burn_code_on_delete', 'trg_profiles_user_code_immutable')
ORDER BY trigger_name;
```

#### 6B. Keberadaan Fungsi Eksekutor Trigger pada `pg_proc`
```sql
SELECT 
    p.proname AS function_name,
    n.nspname AS schema_name,
    pg_get_functiondef(p.oid) AS definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('trg_burn_user_code_on_profile_delete', 'trg_enforce_profiles_user_code_immutable')
ORDER BY p.proname;
```

- **Objek yang Diperiksa:** 
  - Trigger names: `trg_profiles_burn_code_on_delete` (Event: `DELETE`, Timing: `BEFORE`, Target: `public.profiles`) dan `trg_profiles_user_code_immutable` (Event: `UPDATE`, Timing: `BEFORE`, Target: `public.profiles`).
  - Trigger function names: `public.trg_burn_user_code_on_profile_delete()` dan `public.trg_enforce_profiles_user_code_immutable()`.
- **Hasil yang Diharapkan:**
  - Pra-migrasi: 0 baris (belum terpasang).
  - Pasca-migrasi: Kueri 6A mengembalikan 2 baris trigger dan Kueri 6B mengembalikan 2 baris fungsi trigger.
- **Interpretasi & Tindak Lanjut:**
  - Naskah migrasi memuat perintah `DROP TRIGGER IF EXISTS ...` sebelum merekonstruksinya, memastikan eksekusi aman dan bebas konflik duplikasi.

---

## 4. Checklist Evaluasi Keputusan Product Owner

Product Owner dapat menggunakan tabel evaluasi berikut untuk mengambil keputusan otorisasi setelah mengeksekusi kueri di atas:

| No | Komponen Pemeriksaan | Hasil Kueri yang Wajib Terpenuhi | Status Jika Tidak Terpenuhi | Tindakan Pemulihan Sebelum Migrasi |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Akun Super Admin (Kueri 1)** | Tepat 1 baris untuk `admin@yulovi.com` | **BLOCKER KRITIS** | Tambahkan pengguna `admin@yulovi.com` di menu **Authentication → Users** Supabase Dashboard. |
| **2** | **Tabel Dasar (Kueri 2A–2C)** | 4 tabel dasar lengkap (`tenants`, `profiles`, `tenant_memberships`, `audit_logs`) beserta PK dan FK | **BLOCKER SKEMA** | Eksekusi DDL inisial non-destruktif dari `docs/SUPABASE_INTEGRATION_PLAN.md` Bagian 2. |
| **3** | **Integritas user_code (Kueri 3B)** | `violating_code_count = 0` | **BLOCKER DATA INTEGRITY** | Jalankan Kueri 3C untuk mendeteksi profil pelanggar dan perbaiki kode secara manual. |
| **4** | **Distribusi Role (Kueri 4)** | Tidak ada error pembacaan data; role non-resmi diidentifikasi | **WARNING / REVIEW** | Pastikan role HOLD/REVIEW tidak disentuh dan tidak dinormalisasi secara massal. |
| **5** | **Status Bersih / Idempoten (Kueri 5 & 6)** | Terbaca tanpa kegagalan izin | **INFORMASIONAL** | Memvalidasi apakah instance bersih (clean) atau pernah dijalankan sebagian. |

> **SYARAT KELAYAKAN OTORISASI:**  
> Otorisasi eksekusi migrasi `docs/migrations/001_user_access_and_rbac.sql` **HANYA DAPAT DIPERTIMBANGKAN** oleh Product Owner apabila **Pemeriksaan 1, 2, dan 3 berstatus HIJAU (Terpenuhi 100%)**.

---

## 5. Ringkasan Kepatuhan Kebijakan

1. **Role Resmi Disetujui:** `super_admin`, `owner`, `admin`, `sales`, `customer`.
2. **Role Karantina:** `inventory_staff` (HOLD), `accountant` (HOLD), `branch_manager` (REVIEW).
3. **Modul Karantina:** Cost Center (HOLD — tidak disentuh).
4. **Format Kode Pengguna:** 2–3 Karakter berbasis Alfabet 32-Simbol Aman (`^[2-9A-HJ-NP-Z]{2,3}$`), kapasitas 33.792 kombinasi unik, invarian *never-recycle*.
5. **Prinsip Operasi:** **ZERO DATABASE EXECUTION — tidak ada SQL, migrasi, seed, rollback, atau perubahan Supabase Cloud yang dijalankan.**
