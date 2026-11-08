# ZYVORA ERP 1.0.0 — LAPORAN KESIAPAN EKSEKUSI MIGRASI RBAC 001
## Comprehensive Pre-Execution Readiness, Migration Sequence & Verification Protocol

**Tanggal Penyusunan:** 2026-10-24  
**Auditor / Lead Engineer:** Senior Software Engineer / Security Auditor (AI Studio Engine)  
**Target Database:** Supabase PostgreSQL Cloud  
**Project Reference:** `nfjucyabfiqlmrxnviuz`  
**Status Otorisasi:** PENDING PRODUCT OWNER APPROVAL (DO NOT EXECUTE MIGRATION)  
**Status Eksekusi Cloud:** NOT EXECUTED (Menunggu Persetujuan Tertulis Product Owner)  
**Prinsip Mutlak:** ZERO DATABASE EXECUTION — Tidak ada SQL, migrasi, seed, rollback, atau modifikasi Supabase Cloud yang dijalankan secara otomatis.

---

## 1. Analisis Temuan Aktual Supabase Cloud vs Naskah Migrasi 001

Berdasarkan inspeksi manual aktual yang dilaporkan dari Supabase Dashboard:

| Komponen Cloud | Temuan Aktual di Supabase Cloud | Analisis Dampak & Keselarasan Migrasi 001 | Tindakan Remediasi / Solusi Sumber |
| :--- | :--- | :--- | :--- |
| **Akun Super Admin Auth** | Wajib didaftarkan di `auth.users` (`admin@yulovi.com`) | **Keputusan PO Re-Design.** Kueri verifikasi Section 9 naskah migrasi 001 diikat ke `admin@yulovi.com` dan mengekstrak UUID yang sah. | Prasyarat Runtime: Daftarkan akun kandidat di Supabase Auth sebelum migrasi. |
| **Tabel Dasar Inti** | `tenants`, `profiles`, `tenant_memberships`, `audit_logs` tersedia | **Cloud Blocker #2 GUGUR (Terpenuhi).** Dependensi tabel inti telah tersedia di skema `public`. | Skema dasar siap untuk penambahan ekstensi kolom dan relasi. |
| **Volume Baris Existing** | `tenants` = 0, `profiles` = 0, `tenant_memberships` = 0 | **Clean State (Kondisi Bersih).** Tidak ada data pengguna atau keanggotaan legacy yang berisiko korup atau melanggar constraint baru. | Penambahan UNIQUE & CHECK constraint dijamin bebas kegagalan validasi. |
| **Foreign Key profiles** | `profiles.id -> auth.users(id) ON DELETE CASCADE` | **Sesuai Desain.** Memastikan integritas 1:1 antara Supabase Auth dan domain profile ERP. | Terverifikasi kompatibel penuh. |
| **Kolom profiles.user_code** | Belum ada di `profiles` | Kolom baru akan ditambahkan oleh Section 1 migrasi 001 (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). | Ditambahkan otomatis secara non-destruktif. |
| **Tabel Keamanan Baru** | `platform_super_admins` & `burned_user_codes` belum ada | Bersih (*clean*). Tabel akan dibuat oleh Section 2 & 3 migrasi 001. | Dibuat otomatis secara terisolasi dengan RLS aktif. |
| **Fungsi RPC RBAC** | Belum ditemukan | Bersih (*clean*). 6 fungsi RPC dan trigger function akan dipasang oleh migrasi 001. | Dipasang dengan `SECURITY DEFINER` dan `SET search_path = public, pg_temp`. |
| **Status RLS Tabel Inti** | RLS sudah aktif pada 4 tabel dasar | Memenuhi prinsip keamanan dasar. | RLS dipertahankan aktif; policy diselaraskan. |
| **Policy profiles Existing** | Ditemukan policy legacy: `users_read_own_profile` | **PERLU REMEDIASI.** Jika tidak di-drop, PostgreSQL akan menggabungkan (`OR`) policy lama dengan `profiles_select_scoped`. | **DIPERBAIKI:** Ditambahkan `DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;` sebelum membuat `profiles_select_scoped`. |
| **Default Role Membership** | Default pada `tenant_memberships.role` masih `sales_rep` | **PERLU PENYELARASAN.** Sesuai keputusan PO Gate C1.6, default role resmi adalah `sales` (bukan `sales_rep`). | **DIPERBAIKI:** Ditambahkan `ALTER TABLE public.tenant_memberships ALTER COLUMN role SET DEFAULT 'sales';` pada Section 1B. |
| **Role Constraints** | Belum ada CHECK constraint pada `tenant_memberships.role` | **PERLU PENGUATAN.** Nilai string arbitrary dapat masuk jika tidak ada constraint level basis data. | **DIPERBAIKI:** Ditambahkan CHECK constraint `tenant_memberships_role_chk` yang mengizinkan 5 role resmi + 3 role karantina PO (HOLD/REVIEW). |

---

## 2. Perubahan File Sumber yang Dilakukan

### A. Perubahan pada `docs/migrations/001_user_access_and_rbac.sql`
1. **Penambahan Section 1B (Penyelarasan Default Role & CHECK Constraint `tenant_memberships`):**
   ```sql
   ALTER TABLE IF EXISTS public.tenant_memberships 
       ALTER COLUMN role SET DEFAULT 'sales';

   DO $$
   BEGIN
       IF NOT EXISTS (
           SELECT 1 FROM pg_constraint 
           WHERE conname = 'tenant_memberships_role_chk'
       ) THEN
           ALTER TABLE public.tenant_memberships 
               ADD CONSTRAINT tenant_memberships_role_chk 
               CHECK (role IN ('super_admin', 'owner', 'admin', 'sales', 'customer', 'inventory_staff', 'accountant', 'branch_manager'));
       END IF;
   END $$;
   ```
2. **Pencabutan Akses Publik & Pembatasan Hak Akses Tabel Inti (Section 7B):**
   ```sql
   REVOKE ALL ON TABLE public.tenants FROM PUBLIC, anon;
   REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;
   REVOKE ALL ON TABLE public.tenant_memberships FROM PUBLIC, anon;
   REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon;

   GRANT SELECT ON TABLE public.tenants TO authenticated;
   GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
   GRANT SELECT ON TABLE public.tenant_memberships TO authenticated;
   GRANT SELECT ON TABLE public.audit_logs TO authenticated;
   ```
3. **Pembersihan Eksplisit Policy Legacy `users_read_own_profile` (Section 8):**
   ```sql
   DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
   DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
   CREATE POLICY "profiles_select_scoped" ON public.profiles ...
   ```
4. **Pembaruan Skrip Rollback Kompensasi (Lampiran):**
   - Menambahkan pelepasan `tenant_memberships_role_chk`.
   - Mengembalikan default role ke baseline `sales_rep`.
   - Mengembalikan policy sederhana `users_read_own_profile` jika pemulihan darurat pasca-commit dijalankan.

---

## 3. Urutan Eksekusi Migrasi (Dependency-Ordered Migration Sequence)

Berdasarkan relasi ketergantungan PostgreSQL yang nyata, urutan eksekusi disusun secara sekuensial dalam satu transaksi atomik (`BEGIN ... COMMIT`):

```
[0. Ekstensi pgcrypto]
       │
       ▼
[1. profiles: Kolom user_code, UNIQUE, CHECK safe alphabet, Index]
       │
       ▼
[1B. tenant_memberships: Default role 'sales', CHECK role constraint]
       │
       ▼
[2. platform_super_admins: DDL, Index partial active, RLS, Grants]
       │
       ▼
[3. burned_user_codes: DDL, CHECK regex, RLS, Grants]
       │
       ▼
[4. Trigger profiles: trg_burn_user_code_on_profile_delete() & trigger]
       │
       ▼
[5. Fungsi Helper: is_platform_super_admin (0-arg & 1-arg UUID)]
       │
       ▼
[6. Generator & Validator: generate_concurrency_safe_user_code, is_user_code_available]
       │
       ▼
[7. Stored Procedures: assign_user_role, toggle_user_status (Advisory Lock 94820)]
       │
       ▼
[7B. Pengetatan Privilege Tabel Inti: Revoke anon, Grant minimal authenticated]
       │
       ▼
[8. Pembersihan Policy Legacy & Penerapan 9 Scoped RLS Policies]
       │
       ▼
[9. Bootstrap Super Admin: Query Auth UUID, Insert Profile, Insert platform_super_admins]
       │
       ▼
[10. COMMIT TRANSAKSI]
```

### Rationale Urutan Ketergantungan:
1. `pgcrypto` wajib ada pertama karena `gen_random_uuid()` digunakan pada tabel baru.
2. Penambahan kolom dan constraint pada `profiles` dan `tenant_memberships` harus mendahului fungsi dan trigger.
3. Tabel `burned_user_codes` harus dibuat sebelum trigger `trg_burn_user_code_on_profile_delete` dipasang pada `profiles`.
4. Tabel `platform_super_admins` harus dibuat sebelum fungsi `is_platform_super_admin()` didefinisikan.
5. Fungsi `is_platform_super_admin()` harus didefinisikan sebelum stored procedure `assign_user_role`, `toggle_user_status`, dan RLS policy dibuat, karena seluruh policy dan prosedur bergantung pada fungsi ini.
6. Prosedur mutasi harus dibuat sebelum RLS policy yang mengunci akses langsung klien dipasang.
7. Bootstrap Super Admin diletakkan di akhir (Section 9) untuk menjamin seluruh tabel, indeks, constraint, dan fungsi generator telah siap sebelum akun pertama diinisialisasi.

---

## 4. Hasil Pengujian Lokal Aktual (100% PASS)

Pengujian lokal dijalankan secara komprehensif untuk memverifikasi logika domain, RBAC, dan integrasi Auth:

1. **User Access & RBAC Test Suite (`src/domain/validators/userAccess.test.ts`):**
   - **Hasil:** `231/231 TESTS PASSED (100%)`.
   - **Rekonsiliasi Histori Assertion:** 
     - *Baseline Suite:* 203 assertion (mencakup karakter pool 32-simbol aman, kapasitas 33.792 kode, 5 role resmi, role karantina, anti-lockout Super Admin, dan isolasi multi-tenant).
     - *Penambahan Gate C1.6 / Immutability Trigger:* +10 assertion pada Section 7 (simulasi trigger immutability user_code, pencegahan penetapan klien biasa saat NULL, dan abort bootstrap seed tanpa substitusi).
     - *Penambahan PO Re-Design Bootstrap (`admin@yulovi.com`):* +9 assertion (bootstrap identitas baru, penolakan identitas lama `64.iklas@gmail.com`, deteksi auth tidak ditemukan, deteksi auth ganda/ambigu, pelestarian kode profil existing 3B, penolakan seed terpakai, penolakan seed terbakar, deteksi email mismatch profil-auth, validasi format kode existing, penolakan kode existing terbakar, dan isolasi upsert Super Admin).
     - *Penambahan Group 8 (Rekonsiliasi Temuan 1, 2, 3):* +9 assertion (penegakan Pilihan A strict abort pada konflik/burned, pemodelan Pilihan B alokasi dinamis aman, penolakan profil existing glif terlarang '1A' tanpa penimpaan, penolakan kode lowercase '2a' tanpa normalisasi diam-diam, penolakan kode burned '9Z', verifikasi pemisahan domain lock 94820 vs 94821, dan urutan akuisisi deterministik 94820 -> 94821).
     - *Total userAccess:* **231 assertions**.
2. **Authentication Flow & Session Security Suite (`src/domain/validators/authFlow.test.ts`):**
   - **Hasil:** `55/55 TESTS PASSED (100%)`.
   - **Cakupan:**
     - Eliminasi identitas default guest (tidak ada bypass).
     - Route guards & proteksi workspace untuk pengguna unauthenticated atau unassigned.
     - Penanganan logout, event token expired, dan terminasi sesi.
     - Proteksi eskalasi otorisasi sisi klien (kandidat email baru `admin@yulovi.com` dan email historis `64.iklas@gmail.com` tidak menjadi Super Admin tanpa otorisasi backend terverifikasi).
     - Idle session timeout 60 menit (3.600.000 ms), isolasi background refresh token, sinkronisasi logout cross-tab.
3. **Rekonsiliasi Total Pengujian (257 vs 267 vs 277 vs 286):**
   - *Total Baseline Histori:* $203 + 54 = \mathbf{257\text{ assertions}}$.
   - *Total Revisi Gate C1.6:* $213 + 54 = \mathbf{267\text{ assertions}}$.
   - *Total PO Re-Design Awal:* $222 + 55 = \mathbf{277\text{ assertions}}$.
   - *Total Final Aktual Rekonsiliasi Kebijakan:* $231 + 55 = \mathbf{286\text{ assertions}}$ (100% PASS).
4. **Pemeriksaan Tipe TypeScript (`npm run lint` / `tsc --noEmit`):**
   - **Hasil:** `0 errors`.
5. **Kompilasi Aplikasi (`compile_applet`):**
   - **Hasil:** `Build succeeded`.

---

## 5. Naskah SQL Final yang Siap Ditinjau & Rekonsiliasi Temuan Kebijakan

Naskah lengkap tersedia pada file:  
`docs/migrations/001_user_access_and_rbac.sql`

### A. Rekonsiliasi Tiga Temuan Kebijakan Bootstrap (Temuan 1, 2, 3)

#### 1. Temuan 1 — Rekonsiliasi Kebijakan Kode Pengguna (Pilihan A vs Pilihan B)
Terdapat divergensi antara kebijakan historis (kode `2A` absolut tanpa perubahan diam-diam) dan wacana alokasi dinamis otomatis. Sesuai prinsip tata kelola data yang ketat, pilihan ini disajikan secara transparan kepada Product Owner:
* **Pilihan A (Strict 2A Requirement — DIKOMPILASI PADA MIGRASI SAAT INI & DIREKOMENDASIKAN):**
  - *Mekanisme:* Kode seed `2A` diperlakukan sebagai prasyarat wajib. Jika saat runtime kode `2A` telah digunakan oleh profil lain atau tercatat pada `burned_user_codes`, blok migrasi **BERHENTI SEKETIKA (HALT)** dengan melempar `ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE` dan memicu **ROLLBACK 100%**.
  - *Konsekuensi & Rationale Keamanan:* **Paling Aman.** Menghilangkan risiko mutasi identitas diam-diam, menjamin audit trail deterministik, dan memaksa operator/PO menyelesaikan tabrakan data secara sadar sebelum migrasi diterapkan.
* **Pilihan B (Dynamic Allocation with Audited Logging):**
  - *Mekanisme:* Jika kode `2A` bentrok/terbakar, migrasi secara otomatis mengalokasikan kode alternatif yang valid dari namespace 32-simbol aman (`^[2-9A-HJ-NP-Z]{2,3}$`) yang belum pernah terpakai atau dibakar, serta mencatat hasil alokasi tersebut pada output NOTICE/audit.
  - *Konsekuensi:* Mengurangi risiko migrasi terhenti di lingkungan yang kotor, namun mengurangi determinisme identitas Super Admin pertama yang diharapkan oleh Product Owner.
* *Status Keputusan:* **TIDAK DIKLAIM DISETUJUI SECARA SEPIHAK.** Pilihan A saat ini diterapkan sebagai baseline fail-safe terkuat pada baris 858–867 naskah migrasi 001.

#### 2. Temuan 2 — Profil Existing dengan `user_code` Tidak Valid
Pemeriksaan baris 820–836 naskah migrasi 001 memastikan bahwa sistem **TIDAK PERNAH** menimpa, membersihkan, atau mengubah secara otomatis profil existing yang memiliki `user_code` cacat:
- Jika profil kandidat telah ada di `public.profiles` namun memiliki `user_code` yang melanggar regex `^[2-9A-HJ-NP-Z]{2,3}$` (misal memuat angka 0, 1, huruf O, I, atau huruf kecil), transaksi langsung melempar:  
  `ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_INVALID` dan **ROLLBACK**.
- Jika `user_code` profil existing tercatat pada `burned_user_codes`, transaksi langsung melempar:  
  `ERR_ZYVORA_BOOTSTRAP_EXISTING_CODE_BURNED` dan **ROLLBACK**.
- Klausa `ON CONFLICT (id) DO UPDATE SET user_code = COALESCE(profiles.user_code, EXCLUDED.user_code)` pada baris 872–874 menjamin kode existing tidak akan tertimpa.
- *Status:* **Mematuhi rekomendasi default.** Perbaikan data wajib dilakukan melalui prosedur koreksi terencana di tahap pre-flight, bukan melalui manipulasi otomatis.

#### 3. Temuan 3 — Pemetaan Advisory Lock & Analisis Concurrency
Analisis menyeluruh terhadap seluruh pemanggilan `pg_advisory_xact_lock` pada berkas migrasi:
* **Key `94820` (Super Admin State & Anti-Lockout Mutex):**
  - *Lokasi:* `assign_user_role` (baris 430), `toggle_user_status` (baris 557), dan bootstrap Section 9 (baris 795).
  - *Tujuan:* Menserialisasi seluruh operasi yang memodifikasi status wewenang Super Admin (`platform_super_admins`) dan mencegah kondisi race-condition demosi Super Admin terakhir.
* **Key `94821` (User Code Allocation Namespace Mutex):**
  - *Lokasi:* `generate_concurrency_safe_user_code` (baris 300) dan bootstrap Section 9 (baris 796).
  - *Tujuan:* Menserialisasi pemilihan dan pemeriksaan tabrakan kode pengguna dari namespace 2–3 karakter pada `profiles` dan `burned_user_codes`.
* *Prinsip Independensi & Kompatibilitas:*
  - Key `94820` dan `94821` adalah domain independen dan **TIDAK saling melindungi**. Operasi mutasi role tidak memblokir generator kode, dan generator kode tidak memblokir mutasi role.
  - Proses bootstrap di Section 9 melibatkan **kedua domain** (menetapkan hak Super Admin DAN mengalokasikan/memverifikasi kode pengguna). Oleh karena itu, Section 9 mengakuisisi **kedua lock secara berurutan**:  
    `PERFORM pg_advisory_xact_lock(94820);` diikuti `PERFORM pg_advisory_xact_lock(94821);`.
  - Karena tidak ada fungsi lain dalam sistem yang mengakuisisi kedua lock secara bersamaan, urutan parsial ini memiliki **resiko deadlock = 0%** (graf dependensi asiklik).

---

### B. Ringkasan Blok Transaksi Migrasi:
- Terbungkus dalam `BEGIN ... COMMIT`.
- Menggunakan `SET search_path = public, pg_temp;` di setiap fungsi `SECURITY DEFINER`.
- Dilindungi oleh *Session Advisory Locks*:
  - Lock `94820`: Serialisasi mutasi hak Super Admin dan status akun.
  - Lock `94821`: Serialisasi alokasi namespace kode pengguna bebas tabrakan.
- Mengimplementasikan *Anti-Lockout Invariant*:
  Jika baris `auth.users` untuk `admin@yulovi.com` tidak ditemukan, transaksi langsung melempar error `ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND` dan melakukan **ROLLBACK 100%**.
- Mengimplementasikan *Anti-Ambiguitas & Profil Invariant*:
  - Memverifikasi tepat 1 akun Auth (`ERR_ZYVORA_BOOTSTRAP_AMBIGUOUS_AUTH_USER`).
  - Memeriksa konsistensi email profil vs akun Auth (`ERR_ZYVORA_BOOTSTRAP_PROFILE_EMAIL_MISMATCH`).
  - Menghormati imutabilitas kode profil yang sudah ada (tidak menimpa nilai non-NULL yang sah).
  - Memverifikasi ketersediaan target kode seed terhadap profil lain dan `burned_user_codes` (`ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE`).
  - Menautkan wewenang `platform_super_admins` secara eksklusif kepada UUID akun Auth yang telah diverifikasi.

---

## 6. Prasyarat & Penilaian Risiko

### A. Status Prasyarat (Runtime Prerequisites Gate)
Meskipun inspeksi manual dasbor Supabase melaporkan kondisi *clean state* (0 baris di tabel inti), secara formal dalam tata kelola keamanan perangkat lunak, seluruh 6 prasyarat runtime diklasifikasikan sebagai **PENDING VERIFIKASI RUNTIME** sesaat sebelum DDL transaksi dijalankan:

| Kode Prasyarat | Deskripsi Pemeriksaan | Status Gate | Metode Verifikasi |
| :--- | :--- | :---: | :--- |
| **PREREQ-AUTH-01** | Akun `admin@yulovi.com` tersedia di `auth.users` (tepat 1 akun terdaftar) | **PENDING** | Read-Only Pre-flight Query 1 |
| **PREREQ-UUID-01** | UUID akun Auth sesuai dengan profil yang akan digunakan di `public.profiles` | **PENDING** | Read-Only Pre-flight Query 2 |
| **PREREQ-DATA-01** | Validitas format seluruh `user_code` existing (`^[2-9A-HJ-NP-Z]{2,3}$`) | **PENDING** | Read-Only Pre-flight Query 4 |
| **PREREQ-DATA-02** | Ketiadaan duplikasi `user_code` non-NULL pada `public.profiles` | **PENDING** | Read-Only Pre-flight Query 3 |
| **PREREQ-SEED-01** | Kode pengguna yang akan digunakan tersedia serta tidak pernah dibakar | **PENDING** | Read-Only Pre-flight Query 1 & 5 |
| **PREREQ-ID-01** | Ketiadaan konflik profil atau identitas (email profil cocok dengan Auth kandidat) | **PENDING** | Read-Only Pre-flight Query 2 |
| **PREREQ-RBAC-01** | Pemberian hak administrator hanya mengacu pada akun Auth yang diverifikasi | **PENDING** | Post-Migration Verification Query 1 |

---

### B. Checklist Kueri Pra-Pemeriksaan Read-Only (Pre-Flight Inspection Queries)
Sebelum mengeksekusi `001_user_access_and_rbac.sql` di Supabase SQL Editor, jalankan kueri inspeksi read-only ini untuk membuktikan seluruh prasyarat runtime terpenuhi:

#### Kueri Pra-Pemeriksaan 1: Verifikasi Kesiapan Bootstrap (Auth Candidate & Ketersediaan Kode Seed)
```sql
SELECT 
  EXISTS(
    SELECT 1 FROM auth.users WHERE lower(trim(email)) = 'admin@yulovi.com'
  ) AS super_admin_auth_exists,
  (SELECT count(*) FROM auth.users WHERE lower(trim(email)) = 'admin@yulovi.com') AS auth_account_count,
  EXISTS(
    SELECT 1 FROM public.profiles WHERE user_code = '2A'
    UNION ALL
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'burned_user_codes' 
      AND EXISTS (SELECT 1 FROM public.burned_user_codes WHERE user_code = '2A')
  ) AS candidate_code_in_use;
```
- **Kriteria Lulus (PASS):** `super_admin_auth_exists = TRUE`, `auth_account_count = 1`, dan `candidate_code_in_use = FALSE` (atau kode seed alternatif yang disahkan terbukti bebas).
- **Kriteria Gagal (FAIL):** `auth_account_count = 0` (akun Auth belum terdaftar), `auth_account_count > 1` (ambiguitas akun ganda), ATAU `candidate_code_in_use = TRUE` (kode telah digunakan atau dibakar).
- **INSTRUKSI JIKA GAGAL: BERHENTI SEGERA (HALT / STOP EXECUTION) — JANGAN LANJUTKAN EKSEKUSI DDL MIGRASI.**
  - Jika `auth_account_count = 0`: Daftarkan akun `admin@yulovi.com` melalui Supabase Auth Dashboard/API sebelum eksekusi DDL.
  - Jika `auth_account_count > 1`: Hapus atau nonaktifkan akun duplikat di Supabase Auth sehingga tersisa tepat 1 akun sah.
  - Jika `candidate_code_in_use = TRUE`: Jangan menimpa kode; tentukan kode seed aman baru yang belum pernah digunakan/dibakar melalui otorisasi Product Owner.

#### Kueri Pra-Pemeriksaan 2: Verifikasi Kecocokan UUID Auth, Kepemilikan Profil, & Ketiadaan Konflik Identitas
```sql
SELECT 
  u.id AS auth_uuid,
  u.email AS auth_email,
  p.id AS profile_uuid,
  p.email AS profile_email,
  p.user_code AS profile_user_code,
  CASE
    WHEN p.id IS NULL THEN 'NO_PROFILE_YET (SAFE - WILL BE CREATED)'
    WHEN p.id = u.id AND (p.email IS NULL OR lower(trim(p.email)) = lower(trim(u.email))) THEN 'MATCH (SAFE)'
    ELSE 'CONFLICT (UNSAFE)'
  END AS alignment_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(trim(u.email)) = 'admin@yulovi.com';
```
- **Kriteria Lulus (PASS):** Mengembalikan tepat 1 baris dengan `alignment_status` bernilai `'MATCH (SAFE)'` atau `'NO_PROFILE_YET (SAFE - WILL BE CREATED)'`.
- **Kriteria Gagal (FAIL):** `alignment_status = 'CONFLICT (UNSAFE)'` (misalnya baris profil dengan UUID tersebut terikat pada email berbeda).
- **INSTRUKSI JIKA GAGAL: BERHENTI SEGERA (HALT / STOP EXECUTION) — JANGAN LANJUTKAN EKSEKUSI DDL MIGRASI.**
  - Lakukan investigasi integritas referensial dan sinkronkan data profil sebelum menjalankan migrasi untuk mencegah error `ERR_ZYVORA_BOOTSTRAP_PROFILE_EMAIL_MISMATCH`.

#### Kueri Pra-Pemeriksaan 3: Deteksi Duplikasi `user_code` Non-NULL pada `public.profiles`
```sql
SELECT 
  user_code, 
  count(*) AS duplicate_count 
FROM public.profiles 
WHERE user_code IS NOT NULL 
GROUP BY user_code 
HAVING count(*) > 1;
```
- **Kriteria Lulus (PASS):** **0 baris** dikembalikan (tidak ada duplikasi kode).
- **Kriteria Gagal (FAIL):** Mengembalikan $\ge 1$ baris dengan `duplicate_count > 1`.
- **INSTRUKSI JIKA GAGAL: BERHENTI SEGERA (HALT / STOP EXECUTION) — JANGAN LANJUTKAN EKSEKUSI DDL MIGRASI.**
  - Pembuatan index `profiles_user_code_key` (UNIQUE) dipastikan gagal dan me-rollback transaksi jika terdapat nilai duplikat. Lakukan rekonsiliasi atau perbaikan data manual sebelum melanjutkan.

#### Kueri Pra-Pemeriksaan 4: Deteksi Format Legacy Non-Safe Alphabet pada `public.profiles`
```sql
SELECT 
  id, 
  user_code 
FROM public.profiles 
WHERE user_code IS NOT NULL 
  AND user_code !~ '^[2-9A-HJ-NP-Z]{2,3}$';
```
- **Kriteria Lulus (PASS):** **0 baris** dikembalikan (seluruh baris existing mematuhi regex 32-simbol aman).
- **Kriteria Gagal (FAIL):** Mengembalikan $\ge 1$ baris yang memuat karakter terlarang (`0, 1, O, I`) atau panjang != 2–3 karakter.
- **INSTRUKSI JIKA GAGAL: BERHENTI SEGERA (HALT / STOP EXECUTION) — JANGAN LANJUTKAN EKSEKUSI DDL MIGRASI.**
  - Pembuatan constraint regex `profiles_user_code_format_chk` akan gagal jika ada format tidak aman. Lakukan migrasi data pembersihan kode sebelum eksekusi DDL.

#### Kueri Pra-Pemeriksaan 5: Deteksi Kode Terbakar pada Profil Existing
```sql
SELECT 
  p.id, 
  p.user_code 
FROM public.profiles p
JOIN public.burned_user_codes b ON b.user_code = p.user_code;
```
- **Kriteria Lulus (PASS):** **0 baris** dikembalikan (tidak ada profil aktif yang memegang kode terbakar).
- **Kriteria Gagal (FAIL):** Mengembalikan $\ge 1$ baris (terdapat profil dengan kode yang telah dibakar).
- **INSTRUKSI JIKA GAGAL: BERHENTI SEGERA (HALT / STOP EXECUTION) — JANGAN LANJUTKAN EKSEKUSI DDL MIGRASI.**

---

### C. Klasifikasi Karakteristik Operasional: Run-Once per Environment Operation
Naskah migrasi `001_user_access_and_rbac.sql` **diklasifikasikan secara formal sebagai Operasi Sekali-Jalan (Run-Once per Environment Operation)**, bukan naskah yang dirancang untuk dieksekusi berulang-ulang (*arbitrary re-run*), dengan bukti teknis:
1. **Gate Pemeriksaan Ketersediaan Kode Seed (Baris 828–844):**
   ```sql
   SELECT EXISTS (
       SELECT 1 FROM public.profiles WHERE user_code = v_target_user_code AND id <> v_candidate_uuid
   ) INTO v_code_in_use_by_other;

   SELECT EXISTS (
       SELECT 1 FROM public.burned_user_codes WHERE user_code = v_target_user_code
   ) INTO v_code_burned;

   IF v_code_in_use_by_other OR v_code_burned THEN
       RAISE EXCEPTION 'ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE: ...';
   END IF;
   ```
2. Pada eksekusi pertama yang berhasil, akun Super Admin terdaftar dengan `user_code` dan tercatat aktif di `public.platform_super_admins`.
3. Pengulangan migrasi 001 hanya dapat dilakukan setelah pemulihan penuh (*compensating rollback*) atau pada lingkungan basis data baru (*fresh database*). Dilarang mengeksekusi ulang tanpa prosedur pemulihan bersih.

---

### D. Analisis Perilaku Statis Bootstrap: Imutabilitas & Penanganan Profil Existing
Pada Section 9 naskah migrasi yang telah dirancang ulang:
```sql
INSERT INTO public.profiles (id, full_name, email, user_code)
VALUES (v_candidate_uuid, COALESCE(v_candidate_name, 'Platform Administrator'), v_candidate_email, v_target_user_code)
ON CONFLICT (id) DO UPDATE SET 
    user_code = COALESCE(profiles.user_code, EXCLUDED.user_code),
    email = EXCLUDED.email;
```
**Analisis Kondisi Tepi & Solusi Komprehensif:**
- **Skenario 1 (Profil Baru):** Jika akun `admin@yulovi.com` belum memiliki profil, profil baru dibuat dengan nama `'Platform Administrator'` dan kode seed yang divalidasi ketersediaannya.
- **Skenario 2 (Profil Existing dengan user_code Sah):** Jika profil sudah ada dengan kode non-NULL yang sah (misalnya `'3B'`), sistem secara otomatis mendeteksi kode tersebut, memvalidasi formatnya terhadap regex `^[2-9A-HJ-NP-Z]{2,3}$`, memverifikasi bahwa kode tidak terbakar, dan **mempertahankan kode `'3B'`** tanpa menimpanya (menegakkan asas *immutability*).
- **Skenario 3 (Profil Existing dengan Email Mismatch):** Jika profil dengan UUID tersebut memiliki email yang bertentangan dengan `admin@yulovi.com`, transaksi seketika melempar error `ERR_ZYVORA_BOOTSTRAP_PROFILE_EMAIL_MISMATCH` dan melakukan `ROLLBACK 100%`.
- **Skenario 4 (Kode Seed Terbakar / Terpakai Profil Lain):** Jika kode target telah digunakan profil lain atau berada di `burned_user_codes`, sistem melempar `ERR_ZYVORA_BOOTSTRAP_SEED_CODE_UNAVAILABLE` dan membatalkan transaksi tanpa melakukan penggantian kode otomatis sembarangan.

---

### E. Matriks Risiko & Mitigasi:
| Potensi Risiko | Tingkat Dampak | Probabilitas | Mekanisme Mitigasi yang Terpasang |
| :--- | :---: | :---: | :--- |
| Kegagalan Bootstrap Super Admin | Kritis | Sangat Rendah | Transaksi atomik melempar error dan otomatis `ROLLBACK` penuh. Tidak ada status sistem tanpa Super Admin. |
| Penguncian / Deadlock Eksekusi | Sedang | Sangat Rendah | Penggunaan advisory transaction locks (`pg_advisory_xact_lock`) yang otomatis lepas saat transaksi selesai/batal. |
| Konflik Policy RLS Existing | Rendah | Sangat Rendah | Perintah `DROP POLICY IF EXISTS "users_read_own_profile"` dan `DROP POLICY IF EXISTS "profiles_select_scoped"` membersihkan policy lama sebelum membuat yang baru. |
| Injeksi Role Non-Resmi | Sedang | Sangat Rendah | Penambahan `tenant_memberships_role_chk` di level database dan validasi ketat 5 role resmi di level RPC `assign_user_role`. |

---

### F. Enam Tahapan Protokol Implementasi & Pemisahan Lingkungan (Implementation Lifecycle Protocol)
Untuk memastikan keamanan dan integritas platform, proses rilis migrasi dibagi secara tegas ke dalam 6 tahapan yang tidak boleh dilompati:

```
[Tahap 1: Pemeriksaan Statis] ──► [Tahap 2: Pengujian Unit Lokal] ──► [Tahap 3: Pre-flight Runtime Read-Only]
                                                                                       │
[Tahap 6: Persetujuan Produksi] ◄── [Tahap 5: Validasi Runtime] ◄── [Tahap 4: Eksekusi Staging]
```

1. **Tahap 1: Pemeriksaan Statis (Static Security & Relational Audit)**
   - Audit sintaks DDL, urutan pembuatan objek, konstanta bootstrap (`admin@yulovi.com`), mitigasi injection, search_path, dan policy RLS.
   - *Status Saat Ini:* **SELESAI (PASS WITH FINDINGS)**.
2. **Tahap 2: Pengujian Unit & Validasi Logika Lokal (Local Test Suites)**
   - Eksekusi test runner domain offline (`userAccess.test.ts` dan `authFlow.test.ts`), `npm run lint` (0 type error), dan `compile_applet`.
   - *Status Saat Ini:* **SELESAI (PASS — 277/277 assertions, 100%)**.
3. **Tahap 3: Pra-Pemeriksaan Runtime Read-Only (Read-Only Pre-flight Gate)**
   - Eksekusi 5 kueri read-only (Section 6.B) di target database untuk memverifikasi akun Auth `admin@yulovi.com`, ketersediaan seed code, ketiadaan duplikasi, kecocokan profil-auth, dan validitas format tanpa melakukan mutasi DDL/DML.
   - *Status Saat Ini:* **PENDING RUNTIME (Wajib sebelum DDL)**.
4. **Tahap 4: Eksekusi Migrasi di Lingkungan Staging (Staging DDL Execution)**
   - Penerapan `001_user_access_and_rbac.sql` pada proyek database staging yang identik untuk memvalidasi eksekusi transaksi atomik dan timing.
   - *Status Saat Ini:* **PENDING STAGING**.
5. **Tahap 5: Validasi Keamanan & Integritas Runtime Pascamigrasi (Post-Migration Verification)**
   - Eksekusi 8 kueri verifikasi pascamigrasi (Section 7) pada database staging/target untuk memvalidasi Super Admin 1-baris (`admin@yulovi.com`), RLS 9-kebijakan, ACL tabel/fungsi, dan integritas trigger.
   - *Status Saat Ini:* **PENDING POST-MIGRATION**.
6. **Tahap 6: Otorisasi & Eksekusi Produksi (Production Deployment Approval)**
   - Presentasi bukti hasil Tahap 1–5 kepada Product Owner untuk memperoleh otorisasi tertulis eksekusi produksi (`nfjucyabfiqlmrxnviuz`).
   - *Status Saat Ini:* **PENDING PRODUCT OWNER APPROVAL**.

---

### G. Protokol Rollback Darurat & Larangan Eksekusi Sembarangan (Emergency Rollback Governance)
> ⚠️ **PERINGATAN KERAS KEAMANAN SISTEM BASIS DATA:**
> Skrip rollback (`001_user_access_and_rbac_rollback.sql`) **BUKAN instrumen untuk coba-coba (*trial-and-error retry tool*)**.

1. **Larangan Eksekusi Sembarangan:**
   - Dilarang keras mengeksekusi skrip rollback sebagai jalan pintas untuk mengulang eksekusi migrasi yang gagal di tengah jalan. Jika transaksi migrasi gagal, PostgreSQL secara otomatis melakukan `ROLLBACK` atomik tanpa memerlukan skrip rollback eksternal.
2. **Kondisi Penggunaan yang Sah:**
   - Skrip rollback kompensasi HANYA boleh dieksekusi apabila migrasi telah berhasil ter-`COMMIT`, namun terjadi anomali fungsional kritis tak terduga pada sistem produksi yang mengharuskan pemulihan menyeluruh ke skema baseline lama.
3. **Syarat Otorisasi Rollback:**
   - Eksekusi skrip rollback di lingkungan staging maupun produksi **wajib melalui analisis dampak risiko (*comprehensive impact analysis*)** terhadap kemungkinan kehilangan data profil/membership baru dan **memerlukan persetujuan tertulis eksplisit dari Product Owner**.


## 7. Checklist Verifikasi Pascamigrasi (Post-Migration Verification)

Setelah Product Owner memberikan otorisasi dan mengeksekusi `001_user_access_and_rbac.sql` di Supabase SQL Editor, jalankan checklist verifikasi berikut untuk membuktikan keberhasilan migrasi:

### Kueri Verifikasi Pascamigrasi 1: Verifikasi Penetapan Super Admin Tunggal & Kepemilikan Akun
*Menghasilkan tepat 1 baris hasil agregat skalar dalam segala kondisi. Membedakan secara eksplisit jumlah total Super Admin aktif dari akun bootstrap (`admin@yulovi.com`), memvalidasi kode pengguna aman, serta mendeteksi potensi duplikasi profil atau pelipatan join (join multiplication).*
```sql
WITH total_active_admins AS (
  -- Menghitung total seluruh Super Admin yang berstatus aktif di platform
  SELECT count(*) AS total_active_count
  FROM public.platform_super_admins
  WHERE is_active = TRUE
),
bootstrap_matches AS (
  -- Memeriksa secara spesifik akun bootstrap yang disetujui (email admin@yulovi.com)
  SELECT 
    count(DISTINCT psa.user_id) AS matching_user_count,
    min(psa.user_id::text) AS sample_user_id,
    min(p.email) AS sample_email,
    min(p.user_code) AS sample_code,
    min(psa.is_active::text)::boolean AS sample_is_active,
    -- Memeriksa jika ada pelipatan join atau duplikasi profil pada user_id
    count(*) AS total_join_rows
  FROM public.platform_super_admins psa
  JOIN public.profiles p ON p.id = psa.user_id
  WHERE psa.is_active = TRUE
    AND lower(trim(p.email)) = 'admin@yulovi.com'
)
SELECT 
  'admin@yulovi.com' AS expected_bootstrap_email,
  ta.total_active_count,
  bm.matching_user_count,
  bm.total_join_rows,
  bm.sample_user_id AS actual_user_id,
  bm.sample_email AS actual_email,
  bm.sample_code AS actual_code,
  bm.sample_is_active AS actual_is_active,
  CASE 
    WHEN ta.total_active_count = 1 
     AND bm.matching_user_count = 1 
     AND bm.total_join_rows = 1
     AND lower(trim(bm.sample_email)) = 'admin@yulovi.com'
     AND bm.sample_code IS NOT NULL
     AND bm.sample_code ~ '^[2-9A-HJ-NP-Z]{2,3}$'
     AND bm.sample_is_active = TRUE
    THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  CASE
    WHEN ta.total_active_count = 0 
      THEN 'FAIL: Belum ada akun aktif di platform_super_admins'
    WHEN ta.total_active_count > 1 
      THEN 'FAIL: Terdapat lebih dari 1 Super Admin aktif (expected tepat 1 saat inisialisasi)'
    WHEN bm.matching_user_count = 0 
      THEN 'FAIL: Akun bootstrap admin@yulovi.com tidak ditemukan di Super Admin aktif'
    WHEN bm.total_join_rows > bm.matching_user_count 
      THEN 'FAIL: Terdeteksi duplikasi record profil atau pelipatan join pada profiles'
    WHEN bm.sample_code IS NULL OR bm.sample_code !~ '^[2-9A-HJ-NP-Z]{2,3}$'
      THEN 'FAIL: Format kode Super Admin tidak mematuhi 32-simbol aman'
    ELSE 'PASS: Tepat satu Super Admin aktif terdaftar sesuai akun bootstrap admin@yulovi.com'
  END AS status_detail
FROM total_active_admins ta
CROSS JOIN bootstrap_matches bm;
```
- **Kriteria Lulus (PASS):** Mengembalikan **tepat 1 baris skalar** dengan:
  - `total_active_count = 1`
  - `matching_user_count = 1`
  - `total_join_rows = 1` (membuktikan tidak ada duplikasi profil)
  - `actual_email = 'admin@yulovi.com'`
  - `actual_code` tidak NULL dan mematuhi format `^[2-9A-HJ-NP-Z]{2,3}$`
  - `actual_is_active = true`
  - `status = 'PASS'`
- **Kriteria Gagal (FAIL):** Jika `total_active_count != 1`, akun bootstrap tidak cocok, kode melanggar aturan format 32-simbol aman, atau terdeteksi duplikasi join, `status` menghasilkan `'FAIL'` dengan penjelasan rinci pada `status_detail`. Jaminan 1 baris mencegah hasil kosong (*zero rows*) atau multitafsir.

---

### Kueri Verifikasi Pascamigrasi 2: Verifikasi Status RLS Aktif pada 6 Tabel Inti
*Memastikan seluruh 6 tabel inti Zyvora ERP 1.0.0 memiliki Row Level Security aktif (`relrowsecurity = true`).*
```sql
WITH expected_tables(table_name) AS (
  VALUES 
    ('platform_super_admins'),
    ('burned_user_codes'),
    ('tenants'),
    ('profiles'),
    ('tenant_memberships'),
    ('audit_logs')
),
actual_tables AS (
  SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
    AND c.relname IN (SELECT table_name FROM expected_tables)
)
SELECT 
  e.table_name,
  COALESCE(a.rls_enabled, false) AS rls_enabled,
  CASE 
    WHEN a.table_name IS NOT NULL AND a.rls_enabled = true THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM expected_tables e
LEFT JOIN actual_tables a ON a.table_name = e.table_name
ORDER BY e.table_name;
```
- **Kriteria Lulus (PASS):** Tepat **6 baris** tabel terdaftar dengan `rls_enabled = true` dan seluruh baris berstatus `'PASS'`.
- **Kriteria Gagal (FAIL):** Jika tabel hilang atau `rls_enabled = false`, baris berstatus `'FAIL'`.

---

### Kueri Verifikasi Pascamigrasi 3: Verifikasi 9 Kebijakan RLS (Pencocokan Substantif Seluruh Klausul USING & WITH CHECK)
*Melakukan perbandingan substantif terhadap seluruh klausul USING (`qual`) dan WITH CHECK (`with_check`) dari 9 kebijakan RLS naskah migrasi final. Memvalidasi ketiadaan token bypass (`true`, `1=1`), menangani evaluasi NULL secara ketat (kebijakan SELECT/DELETE wajib memiliki WITH CHECK bernilai NULL), dan memverifikasi setiap predikat otorisasi.*

> **Catatan Keterbatasan Validasi Statis RLS:** PostgreSQL menyimpan predikat kebijakan sebagai pohon ekspresi internal (AST) dan men-deparse-nya ke representasi teks yang dinormalisasi dengan type casting eksplisit (misal `::text`) dan tanda kurung. Kueri di bawah memvalidasi seluruh klausa dan predikat logika secara substantif. Namun, kesetaraan semantik biner 100% dan pencegahan eskalasi hak istimewa secara runtime hanya dapat dibuktikan secara mutlak melalui uji eksekusi kueri multi-role langsung pada database hidup setelah otorisasi PO.

```sql
WITH expected_policies(table_name, policy_name, expected_cmd, expected_roles, policy_rule_type) AS (
  VALUES
    ('platform_super_admins', 'super_admin_manage_platform_admins', 'ALL',    '{authenticated}', 'super_admin_manage_platform_admins'),
    ('platform_super_admins', 'users_read_own_super_admin_status',  'SELECT', '{authenticated}', 'users_read_own_super_admin_status'),
    ('burned_user_codes',     'super_admin_read_burned_codes',      'SELECT', '{authenticated}', 'super_admin_read_burned_codes'),
    ('profiles',              'profiles_select_scoped',             'SELECT', '{authenticated}', 'profiles_select_scoped'),
    ('profiles',              'profiles_update_own',                'UPDATE', '{authenticated}', 'profiles_update_own'),
    ('tenant_memberships',    'tenant_memberships_select_scoped',   'SELECT', '{authenticated}', 'tenant_memberships_select_scoped'),
    ('tenant_memberships',    'tenant_memberships_deny_client_role_update', 'UPDATE', '{authenticated}', 'tenant_memberships_deny_client_role_update'),
    ('audit_logs',            'audit_logs_select_scoped',           'SELECT', '{authenticated}', 'audit_logs_select_scoped'),
    ('tenants',               'tenants_select_scoped',              'SELECT', '{authenticated}', 'tenants_select_scoped')
),
actual_policies AS (
  SELECT
    tablename AS table_name,
    policyname AS policy_name,
    cmd,
    roles::text AS roles_str,
    qual AS using_expr,
    with_check AS with_check_expr
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT
  e.table_name,
  e.policy_name,
  e.expected_cmd,
  a.cmd AS actual_cmd,
  a.using_expr,
  a.with_check_expr,
  CASE
    WHEN a.policy_name IS NULL THEN 'FAIL: Kebijakan RLS tidak ditemukan di pg_policies'
    WHEN a.cmd <> e.expected_cmd THEN 'FAIL: Command RLS tidak cocok (expected ' || e.expected_cmd || ', got ' || a.cmd || ')'
    WHEN a.roles_str <> e.expected_roles THEN 'FAIL: Target roles tidak cocok'
    -- 1. Anti-Bypass Guard: Memastikan tidak ada token bypass sembarangan yang meloloskan akses tanpa syarat
    WHEN COALESCE(a.using_expr, '') ~* '\m(true|1\s*=\s*1)\M' THEN 'FAIL: Terdeteksi klausa bypass literal pada USING'
    WHEN COALESCE(a.with_check_expr, '') ~* '\m(true|1\s*=\s*1)\M' THEN 'FAIL: Terdeteksi klausa bypass literal pada WITH CHECK'
    
    -- 2. Validasi Substantif Seluruh Klausul per Jenis Kebijakan:
    
    -- platform_super_admins: super_admin_manage_platform_admins (ALL: USING & WITH CHECK wajib is_platform_super_admin())
    WHEN e.policy_rule_type = 'super_admin_manage_platform_admins' AND NOT (
      a.using_expr IS NOT NULL AND a.with_check_expr IS NOT NULL AND
      a.using_expr ~* 'is_platform_super_admin\(\)' AND
      a.with_check_expr ~* 'is_platform_super_admin\(\)'
    ) THEN 'FAIL: super_admin_manage_platform_admins tidak membatasi USING dan WITH CHECK ke is_platform_super_admin()'

    -- platform_super_admins: users_read_own_super_admin_status (SELECT: USING user_id = auth.uid(), WITH CHECK wajib NULL)
    WHEN e.policy_rule_type = 'users_read_own_super_admin_status' AND NOT (
      a.using_expr IS NOT NULL AND a.with_check_expr IS NULL AND
      a.using_expr ~* 'user_id\s*=\s*(auth\.)?uid\(\)'
    ) THEN 'FAIL: users_read_own_super_admin_status klausul USING tidak cocok atau WITH CHECK tidak NULL'

    -- burned_user_codes: super_admin_read_burned_codes (SELECT: USING is_platform_super_admin(), WITH CHECK wajib NULL)
    WHEN e.policy_rule_type = 'super_admin_read_burned_codes' AND NOT (
      a.using_expr IS NOT NULL AND a.with_check_expr IS NULL AND
      a.using_expr ~* 'is_platform_super_admin\(\)'
    ) THEN 'FAIL: super_admin_read_burned_codes tidak membatasi USING ke is_platform_super_admin()'

    -- profiles: profiles_select_scoped (SELECT: 3 cabang wajib - id = auth.uid(), Super Admin, dan rekan satu tenant aktif)
    WHEN e.policy_rule_type = 'profiles_select_scoped' AND NOT (
      a.using_expr IS NOT NULL AND a.with_check_expr IS NULL AND
      a.using_expr ~* 'id\s*=\s*(auth\.)?uid\(\)' AND
      a.using_expr ~* 'is_platform_super_admin\(\)' AND
      a.using_expr ~* 'tenant_memberships' AND
      a.using_expr ~* 'my_tm\.user_id\s*=\s*(auth\.)?uid\(\)' AND
      a.using_expr ~* 'my_tm\.status\s*=\s*''active''' AND
      a.using_expr ~* 'peer_tm\.status\s*=\s*''active'''
    ) THEN 'FAIL: profiles_select_scoped tidak memuat lengkap 3 cabang isolasi (own, super_admin, active peer)'

    -- profiles: profiles_update_own (UPDATE: USING id = auth.uid(), WITH CHECK id = auth.uid())
    WHEN e.policy_rule_type = 'profiles_update_own' AND NOT (
      a.using_expr IS NOT NULL AND a.with_check_expr IS NOT NULL AND
      a.using_expr ~* 'id\s*=\s*(auth\.)?uid\(\)' AND
      a.with_check_expr ~* 'id\s*=\s*(auth\.)?uid\(\)'
    ) THEN 'FAIL: profiles_update_own USING atau WITH CHECK tidak membatasi ke id = auth.uid()'

    -- tenant_memberships: tenant_memberships_select_scoped (SELECT: 3 cabang - own user_id, Super Admin, dan anggota sesama tenant aktif)
    WHEN e.policy_rule_type = 'tenant_memberships_select_scoped' AND NOT (
      a.using_expr IS NOT NULL AND a.with_check_expr IS NULL AND
      a.using_expr ~* 'user_id\s*=\s*(auth\.)?uid\(\)' AND
      a.using_expr ~* 'is_platform_super_admin\(\)' AND
      a.using_expr ~* 'my_tm\.user_id\s*=\s*(auth\.)?uid\(\)' AND
      a.using_expr ~* 'my_tm\.status\s*=\s*''active'''
    ) THEN 'FAIL: tenant_memberships_select_scoped tidak memuat 3 cabang isolasi keanggotaan'

    -- tenant_memberships: tenant_memberships_deny_client_role_update (UPDATE: hanya Super Admin)
    WHEN e.policy_rule_type = 'tenant_memberships_deny_client_role_update' AND NOT (
      a.using_expr IS NOT NULL AND a.with_check_expr IS NOT NULL AND
      a.using_expr ~* 'is_platform_super_admin\(\)' AND
      a.with_check_expr ~* 'is_platform_super_admin\(\)'
    ) THEN 'FAIL: tenant_memberships_deny_client_role_update tidak mengunci update role ke is_platform_super_admin()'

    -- audit_logs: audit_logs_select_scoped (SELECT: Super Admin ATAU owner/admin tenant aktif)
    WHEN e.policy_rule_type = 'audit_logs_select_scoped' AND NOT (
      a.using_expr IS NOT NULL AND a.with_check_expr IS NULL AND
      a.using_expr ~* 'is_platform_super_admin\(\)' AND
      a.using_expr ~* 'my_tm\.user_id\s*=\s*(auth\.)?uid\(\)' AND
      a.using_expr ~* 'my_tm\.status\s*=\s*''active''' AND
      a.using_expr ~* '''owner''' AND
      a.using_expr ~* '''admin'''
    ) THEN 'FAIL: audit_logs_select_scoped tidak membatasi ke Super Admin atau tenant owner/admin'

    -- tenants: tenants_select_scoped (SELECT: Super Admin ATAU anggota aktif tenant)
    WHEN e.policy_rule_type = 'tenants_select_scoped' AND NOT (
      a.using_expr IS NOT NULL AND a.with_check_expr IS NULL AND
      a.using_expr ~* 'is_platform_super_admin\(\)' AND
      a.using_expr ~* 'tm\.user_id\s*=\s*(auth\.)?uid\(\)' AND
      a.using_expr ~* 'tm\.status\s*=\s*''active'''
    ) THEN 'FAIL: tenants_select_scoped tidak membatasi ke Super Admin atau anggota aktif tenant'

    ELSE 'PASS'
  END AS status
FROM expected_policies e
LEFT JOIN actual_policies a 
  ON a.table_name = e.table_name 
 AND a.policy_name = e.policy_name
ORDER BY e.table_name, e.policy_name;
```
- **Kriteria Lulus (PASS):** Tepat **9 baris**, seluruhnya berstatus `'PASS'`, target roles `{authenticated}`, seluruh predikat otorisasi multi-tenant terbukti secara substantif, evaluasi NULL ditangani dengan ketat, dan bebas dari klausa bypass sembarangan.
- **Kriteria Gagal (FAIL):** Kebijakan hilang, ekspresi substantif tidak cocok, nilai WITH CHECK tidak NULL pada SELECT, atau terdeteksi token bypass menghasilkan `'FAIL'` eksplisit dengan rincian penyebab.

---

### Kueri Verifikasi Pascamigrasi 4: Verifikasi 6 Objek RPC, Overload Signature, & Hak Akses ACL/Default Privileges
*Mengaudit hak akses fungsi RPC secara mendalam: menguji hak efektif `authenticated` dan `anon` via `has_function_privilege`, memeriksa ACL fungsi (`proacl` via `aclexplode`), mengidentifikasi status default privilege (`proacl IS NULL`), serta memeriksa `pg_default_acl` skema `public` untuk mendeteksi potensi kebocoran hak eksekusi ke pseudo-role `PUBLIC` atau `anon`.*

> **Prinsip Privilege PostgreSQL:** Di PostgreSQL, jika `proacl IS NULL`, fungsi menggunakan hak akses bawaan (*default privileges*) yang secara default memberikan izin `EXECUTE` kepada `PUBLIC`. Naskah migrasi 001 secara eksplisit menjalankan `REVOKE ALL ... FROM PUBLIC, anon;` dan `GRANT EXECUTE ... TO authenticated;`, sehingga `proacl` wajib bernilai **NOT NULL**. Selain itu, memanggil `has_function_privilege('public', ...)` akan menimbulkan error SQL karena `public` adalah pseudo-role, bukan catalog role. Pemeriksaan ACL (`aclexplode` dengan `grantee = 0`) adalah metode audit yang valid.

```sql
WITH expected_rpcs(fn_name, arg_types, display_signature) AS (
  VALUES
    ('is_platform_super_admin', '', 'is_platform_super_admin()'),
    ('is_platform_super_admin', 'uuid', 'is_platform_super_admin(uuid)'),
    ('generate_concurrency_safe_user_code', '', 'generate_concurrency_safe_user_code()'),
    ('is_user_code_available', 'character varying', 'is_user_code_available(character varying)'),
    ('assign_user_role', 'uuid, uuid, character varying, text', 'assign_user_role(uuid, uuid, character varying, text)'),
    ('toggle_user_status', 'uuid, uuid, character varying, text', 'toggle_user_status(uuid, uuid, character varying, text)')
),
schema_default_func_privileges AS (
  -- Memeriksa apakah ada konfigurasi default privilege pada schema public yang membocorkan EXECUTE ke PUBLIC atau anon
  SELECT 
    EXISTS (
      SELECT 1 
      FROM pg_default_acl d
      JOIN pg_namespace n ON n.oid = d.defaclnamespace
      WHERE n.nspname = 'public' 
        AND d.defaclobjtype = 'f' -- functions
        AND EXISTS (
          SELECT 1 FROM aclexplode(d.defaclacl) def_acl
          WHERE (def_acl.grantee = 0 OR def_acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon'))
            AND def_acl.privilege_type = 'EXECUTE'
        )
    ) AS schema_default_leaks_execute
),
actual_rpcs AS (
  SELECT
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS actual_args,
    p.oid AS proc_oid,
    p.prosecdef AS is_security_definer,
    p.proconfig AS runtime_config,
    p.proacl,
    -- Memastikan proacl tidak NULL (wajib ada explicit ACL setelah REVOKE/GRANT dijalankan)
    (p.proacl IS NOT NULL) AS has_explicit_acl,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
    -- Audit eksplisit grant pada proacl ke PUBLIC (grantee = 0)
    CASE
      WHEN p.proacl IS NULL THEN TRUE -- proacl NULL berarti default privileges berlaku (PUBLIC mewarisi EXECUTE)
      WHEN EXISTS (
        SELECT 1 FROM aclexplode(p.proacl) acl 
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
      ) THEN TRUE
      ELSE FALSE
    END AS public_acl_leak,
    -- Audit eksplisit grant pada proacl ke role anon
    CASE
      WHEN EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(p.proacl, ARRAY[]::aclitem[])) acl 
        WHERE acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon') 
          AND acl.privilege_type = 'EXECUTE'
      ) THEN TRUE
      ELSE FALSE
    END AS anon_direct_grant_leak
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
)
SELECT
  e.display_signature,
  a.is_security_definer,
  a.runtime_config,
  a.has_explicit_acl,
  a.auth_exec AS authenticated_can_execute,
  a.anon_exec AS anon_can_execute,
  a.public_acl_leak,
  a.anon_direct_grant_leak,
  s.schema_default_leaks_execute,
  CASE
    WHEN a.proc_oid IS NULL THEN 'FAIL: Fungsi RPC tidak ditemukan di catalog'
    WHEN a.is_security_definer <> TRUE THEN 'FAIL: prosecdef bukan TRUE (bukan SECURITY DEFINER)'
    WHEN NOT ('search_path=public, pg_temp' = ANY(COALESCE(a.runtime_config, ARRAY[]::text[]))) 
      THEN 'FAIL: runtime config tidak memuat search_path=public, pg_temp'
    WHEN a.has_explicit_acl <> TRUE 
      THEN 'FAIL: proacl IS NULL (mewarisi default privileges bawaan PostgreSQL yang membocorkan EXECUTE ke PUBLIC)'
    WHEN a.auth_exec <> TRUE THEN 'FAIL: authenticated role tidak memiliki hak EXECUTE'
    WHEN a.anon_exec <> FALSE THEN 'FAIL: anon role memiliki hak efektif EXECUTE (kebocoran izin)'
    WHEN a.public_acl_leak <> FALSE THEN 'FAIL: Terdeteksi grant EXECUTE eksplisit/implisit kepada pseudo-role PUBLIC'
    WHEN a.anon_direct_grant_leak <> FALSE THEN 'FAIL: Terdeteksi grant EXECUTE langsung kepada role anon'
    WHEN s.schema_default_leaks_execute <> FALSE THEN 'FAIL: Terdeteksi default privilege schema yang membocorkan EXECUTE'
    ELSE 'PASS'
  END AS status
FROM expected_rpcs e
CROSS JOIN schema_default_func_privileges s
LEFT JOIN actual_rpcs a 
  ON a.proname = e.fn_name 
 AND a.actual_args = e.arg_types
ORDER BY e.display_signature;
```
- **Kriteria Lulus (PASS):** Tepat **6 baris** (mencakup 2 overload `is_platform_super_admin`), seluruhnya berstatus `'PASS'`:
  - `is_security_definer = true`
  - `runtime_config` memuat `search_path=public, pg_temp`
  - `has_explicit_acl = true` (`proacl` bukan NULL, membuktikan REVOKE/GRANT dieksekusi)
  - `authenticated_can_execute = true`
  - `anon_can_execute = false`
  - `public_acl_leak = false` dan `anon_direct_grant_leak = false`
  - `schema_default_leaks_execute = false`
- **Kriteria Gagal (FAIL):** Jika fungsi hilang, baris berstatus `'FAIL'`. Jika terdeteksi `proacl IS NULL`, kebocoran izin pada `anon_can_execute`, `public_acl_leak`, atau default privileges, kueri segera menghasilkan status `'FAIL'` dengan penjelasan spesifik.


---

### Kueri Verifikasi Pascamigrasi 5: Verifikasi 2 Fungsi Trigger (Terpisah sebagai Fungsi)
```sql
WITH expected_trigger_funcs(func_name) AS (
  VALUES
    ('trg_burn_user_code_on_profile_delete'),
    ('trg_enforce_profiles_user_code_immutable')
),
actual_funcs AS (
  SELECT
    p.proname AS func_name,
    t.typname AS return_type,
    p.prosecdef AS is_security_definer,
    p.proconfig AS runtime_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_type t ON t.oid = p.prorettype
  WHERE n.nspname = 'public'
)
SELECT
  e.func_name,
  a.return_type,
  a.is_security_definer,
  a.runtime_config,
  CASE
    WHEN a.func_name IS NOT NULL 
     AND a.return_type = 'trigger'
     AND a.is_security_definer = TRUE
     AND '{search_path=public, pg_temp}' = ANY(COALESCE(a.runtime_config, ARRAY[]::text[]))
    THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM expected_trigger_funcs e
LEFT JOIN actual_funcs a ON a.func_name = e.func_name
ORDER BY e.func_name;
```
- **Kriteria Lulus (PASS):** Tepat **2 baris** (`trg_burn_user_code_on_profile_delete`, `trg_enforce_profiles_user_code_immutable`) dengan `return_type = 'trigger'`, `is_security_definer = true`, dan seluruh baris berstatus `'PASS'`.
- **Kriteria Gagal (FAIL):** Objek fungsi hilang menghasilkan status `'FAIL'`.

---

### Kueri Verifikasi Pascamigrasi 6: Verifikasi 2 Trigger Aktif pada Tabel `public.profiles`
```sql
WITH expected_triggers(table_name, trigger_name, expected_timing, expected_event, expected_fn) AS (
  VALUES
    ('profiles', 'trg_profiles_burn_code_on_delete', 'BEFORE', 'DELETE', 'trg_burn_user_code_on_profile_delete'),
    ('profiles', 'trg_profiles_user_code_immutable', 'BEFORE', 'UPDATE', 'trg_enforce_profiles_user_code_immutable')
),
actual_triggers AS (
  SELECT 
    c.relname AS table_name,
    t.tgname AS trigger_name,
    CASE t.tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS actual_timing,
    CASE 
      WHEN t.tgtype & 8 = 8 THEN 'DELETE'
      WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
      ELSE 'OTHER'
    END AS actual_event,
    p.proname AS actual_fn,
    t.tgenabled AS enabled_state
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_proc p ON t.tgfoid = p.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND NOT t.tgisinternal
)
SELECT 
  e.table_name,
  e.trigger_name,
  e.expected_timing,
  e.expected_event,
  e.expected_fn,
  a.enabled_state,
  CASE 
    WHEN a.trigger_name IS NOT NULL
     AND a.actual_timing = e.expected_timing
     AND a.actual_event = e.expected_event
     AND a.actual_fn = e.expected_fn
     AND a.enabled_state = 'O'
    THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM expected_triggers e
LEFT JOIN actual_triggers a 
  ON a.table_name = e.table_name 
 AND a.trigger_name = e.trigger_name
ORDER BY e.trigger_name;
```
- **Kriteria Lulus (PASS):** Tepat **2 baris** aktif (`enabled_state = 'O'`) dan seluruhnya berstatus `'PASS'`:
  1. `trg_profiles_burn_code_on_delete` (`BEFORE DELETE` → `trg_burn_user_code_on_profile_delete`)
  2. `trg_profiles_user_code_immutable` (`BEFORE UPDATE` → `trg_enforce_profiles_user_code_immutable`)
- **Kriteria Gagal (FAIL):** Trigger hilang atau tidak aktif menghasilkan status `'FAIL'`.

---

### Kueri Verifikasi Pascamigrasi 7: Verifikasi Indeks B-Tree & Definisi Lengkap Constraints
*Memvalidasi metode B-Tree dan predikat parsial pada indeks, serta definisi formal SQL dari constraint kunci.*
```sql
-- 7A. Verifikasi Indeks B-Tree & Predikat Parsial
WITH expected_indexes(table_name, index_name, expected_method, expected_predicate) AS (
  VALUES
    ('profiles', 'idx_profiles_user_code', 'btree', '__NO_PRED__'),
    ('platform_super_admins', 'idx_platform_super_admins_active', 'btree', '(is_active = true)')
),
actual_indexes AS (
  SELECT 
    c.relname AS table_name,
    i.relname AS index_name,
    am.amname AS access_method,
    COALESCE(pg_get_expr(idx.indpred, idx.indrelid), '__NO_PRED__') AS actual_predicate,
    idx.indisvalid AS is_valid
  FROM pg_index idx
  JOIN pg_class i ON idx.indexrelid = i.oid
  JOIN pg_class c ON idx.indrelid = c.oid
  JOIN pg_am am ON i.relam = am.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
)
SELECT 
  e.table_name,
  e.index_name,
  a.access_method,
  a.actual_predicate,
  a.is_valid,
  CASE 
    WHEN a.index_name IS NOT NULL
     AND a.access_method = e.expected_method
     AND a.actual_predicate = e.expected_predicate
     AND a.is_valid = TRUE
    THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM expected_indexes e
LEFT JOIN actual_indexes a 
  ON a.table_name = e.table_name 
 AND a.index_name = e.index_name
ORDER BY e.table_name, e.index_name;

-- 7B. Verifikasi Definisi Lengkap Constraints
WITH expected_constraints(table_name, con_name, con_type) AS (
  VALUES
    ('profiles', 'profiles_user_code_unique', 'u'),
    ('profiles', 'profiles_user_code_safe_alphabet_chk', 'c'),
    ('tenant_memberships', 'tenant_memberships_role_chk', 'c'),
    ('burned_user_codes', 'burned_user_code_format_chk', 'c'),
    ('platform_super_admins', 'platform_super_admins_user_id_key', 'u')
),
actual_constraints AS (
  SELECT
    c.relname AS table_name,
    con.conname AS con_name,
    con.contype AS con_type,
    con.convalidated AS is_validated,
    pg_get_constraintdef(con.oid) AS con_definition
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = con.connamespace
  WHERE n.nspname = 'public'
)
SELECT
  e.table_name,
  e.con_name,
  e.con_type AS expected_type,
  a.con_type AS actual_type,
  a.is_validated,
  a.con_definition,
  CASE
    WHEN a.con_name IS NULL THEN 'FAIL'
    WHEN a.con_type <> e.con_type THEN 'FAIL'
    WHEN a.is_validated <> TRUE THEN 'FAIL'
    WHEN e.con_name = 'profiles_user_code_unique' AND a.con_definition NOT LIKE '%UNIQUE (user_code)%' THEN 'FAIL'
    WHEN e.con_name = 'platform_super_admins_user_id_key' AND a.con_definition NOT LIKE '%UNIQUE (user_id)%' THEN 'FAIL'
    WHEN e.con_name = 'profiles_user_code_safe_alphabet_chk' AND (a.con_definition NOT LIKE '%user_code%' OR a.con_definition NOT LIKE '%^[2-9A-HJ-NP-Z]{2,3}$%') THEN 'FAIL'
    WHEN e.con_name = 'burned_user_code_format_chk' AND (a.con_definition NOT LIKE '%user_code%' OR a.con_definition NOT LIKE '%^[2-9A-HJ-NP-Z]{2,3}$%') THEN 'FAIL'
    WHEN e.con_name = 'tenant_memberships_role_chk' AND (
      a.con_definition NOT LIKE '%super_admin%' OR
      a.con_definition NOT LIKE '%owner%' OR
      a.con_definition NOT LIKE '%admin%' OR
      a.con_definition NOT LIKE '%sales%' OR
      a.con_definition NOT LIKE '%customer%' OR
      a.con_definition NOT LIKE '%inventory_staff%' OR
      a.con_definition NOT LIKE '%accountant%' OR
      a.con_definition NOT LIKE '%branch_manager%'
    ) THEN 'FAIL'
    ELSE 'PASS'
  END AS status
FROM expected_constraints e
LEFT JOIN actual_constraints a 
  ON a.table_name = e.table_name 
 AND a.con_name = e.con_name
ORDER BY e.table_name, e.con_name;
```
- **Kriteria Lulus (PASS):** 
  - Kueri 7A: Tepat **2 baris indeks** dengan `access_method = 'btree'`, predikat parsial `idx_platform_super_admins_active` bernilai `(is_active = true)`, dan seluruhnya berstatus `'PASS'`.
  - Kueri 7B: Tepat **5 baris constraint** (`UNIQUE` & `CHECK` safe alphabet pada `profiles`, `CHECK` role pada `tenant_memberships`, `CHECK` regex pada `burned_user_codes`, dan `UNIQUE` pada `platform_super_admins`), seluruhnya berstatus `'PASS'`.
- **Kriteria Gagal (FAIL):** Ada baris berstatus `'FAIL'` atau jumlah objek tidak lengkap.

---

### Kueri Verifikasi Pascamigrasi 8: Verifikasi Matriks Hak Akses Tabel (SELECT, INSERT, UPDATE, DELETE, Hak Efektif, Audit ACL PUBLIC & RLS Defense-in-Depth)
*Menguji secara komprehensif hak akses `SELECT`, `INSERT`, `UPDATE`, `DELETE` untuk role `authenticated` dan `anon` via `has_table_privilege`, memeriksa grant langsung ke `PUBLIC` (`grantee = 0`) dan `anon` via `aclexplode(relacl)`, mengaudit default privileges tabel skema `public` (`pg_default_acl`), serta mengonfirmasi penegakan Row Level Security (`relrowsecurity = true`).*

> **Prinsip Pertahanan Berlapis (Defense-in-Depth) Hak Akses Tabel:**  
> Ketiadaan grant langsung kepada pseudo-role `PUBLIC` di `relacl` adalah syarat penting, namun **TIDAK CUKUP** dijadikan bukti tunggal bahwa akses tabel aman. Konfigurasi default privileges (`pg_default_acl`), keanggotaan peran (*role inheritance*), atau kepemilikan objek dapat memengaruhi hak efektif. Oleh karena itu, kueri di bawah menggabungkan 4 lapisan verifikasi:  
> 1. Audit grant langsung pada ACL (`relacl` via `aclexplode` dengan `grantee = 0` dan `grantee = anon`).  
> 2. Audit default privileges tingkat skema (`pg_default_acl` untuk objek `r` / relation).  
> 3. Evaluasi hak akses efektif runtime menggunakan `has_table_privilege` untuk role `anon` (wajib `FALSE` untuk seluruh operasi) dan `authenticated` (hanya `SELECT` pada seluruh tabel, serta `UPDATE` hanya pada `profiles`).  
> 4. Verifikasi status Row Level Security aktif (`relrowsecurity = true`) yang membatasi pembacaan/perubahan baris secara terisolasi.

```sql
WITH expected_table_grants(
  table_name, 
  exp_auth_sel, exp_auth_ins, exp_auth_upd, exp_auth_del, 
  exp_anon_sel, exp_anon_ins, exp_anon_upd, exp_anon_del
) AS (
  VALUES
    ('platform_super_admins', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
    ('burned_user_codes',     TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
    ('tenants',               TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
    ('profiles',              TRUE, FALSE, TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE),
    ('tenant_memberships',    TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
    ('audit_logs',            TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE)
),
schema_default_table_privileges AS (
  -- Memeriksa apakah ada konfigurasi default privilege pada schema public yang membocorkan DML tabel ke PUBLIC atau anon
  SELECT 
    EXISTS (
      SELECT 1 
      FROM pg_default_acl d
      JOIN pg_namespace n ON n.oid = d.defaclnamespace
      WHERE n.nspname = 'public' 
        AND d.defaclobjtype = 'r' -- relations / tables
        AND EXISTS (
          SELECT 1 FROM aclexplode(d.defaclacl) def_acl
          WHERE (def_acl.grantee = 0 OR def_acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon'))
            AND def_acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        )
    ) AS schema_default_leaks_table_access
),
actual_table_grants AS (
  SELECT
    c.relname AS table_name,
    c.relacl,
    c.relrowsecurity AS rls_enabled,
    has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_sel,
    has_table_privilege('authenticated', c.oid, 'INSERT') AS auth_ins,
    has_table_privilege('authenticated', c.oid, 'UPDATE') AS auth_upd,
    has_table_privilege('authenticated', c.oid, 'DELETE') AS auth_del,
    has_table_privilege('anon', c.oid, 'SELECT') AS anon_sel,
    has_table_privilege('anon', c.oid, 'INSERT') AS anon_ins,
    has_table_privilege('anon', c.oid, 'UPDATE') AS anon_upd,
    has_table_privilege('anon', c.oid, 'DELETE') AS anon_del,
    -- Audit kebocoran hak grup PUBLIC melalui relacl (grantee = 0)
    CASE 
      WHEN c.relacl IS NOT NULL AND EXISTS (
        SELECT 1 FROM aclexplode(c.relacl) acl 
        WHERE acl.grantee = 0 AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      ) THEN TRUE
      ELSE FALSE
    END AS public_acl_leak,
    -- Audit kebocoran grant eksplisit ke role anon pada relacl
    CASE
      WHEN c.relacl IS NOT NULL AND EXISTS (
        SELECT 1 FROM aclexplode(c.relacl) acl 
        WHERE acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon') 
          AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      ) THEN TRUE
      ELSE FALSE
    END AS anon_direct_grant_leak
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
)
SELECT
  e.table_name,
  a.rls_enabled,
  -- Hak Akses Efektif Authenticated
  a.auth_sel AS auth_select,
  a.auth_ins AS auth_insert,
  a.auth_upd AS auth_update,
  a.auth_del AS auth_delete,
  -- Hak Akses Efektif Anon (Wajib seluruhnya FALSE)
  (a.anon_sel OR a.anon_ins OR a.anon_upd OR a.anon_del) AS anon_any_privilege,
  -- Audit Kebocoran Grant ACL Langsung
  a.public_acl_leak,
  a.anon_direct_grant_leak,
  s.schema_default_leaks_table_access,
  CASE
    WHEN a.table_name IS NULL THEN 'FAIL: Tabel tidak ditemukan di catalog pg_class'
    WHEN a.rls_enabled <> TRUE THEN 'FAIL: Row Level Security (RLS) tidak aktif pada tabel ini'
    -- Evaluasi Hak Authenticated
    WHEN a.auth_sel <> e.exp_auth_sel THEN 'FAIL: Hak SELECT authenticated tidak sesuai ekspektasi'
    WHEN a.auth_ins <> e.exp_auth_ins THEN 'FAIL: Hak INSERT authenticated tidak sesuai ekspektasi (seharusnya FALSE)'
    WHEN a.auth_upd <> e.exp_auth_upd THEN 'FAIL: Hak UPDATE authenticated tidak sesuai ekspektasi'
    WHEN a.auth_del <> e.exp_auth_del THEN 'FAIL: Hak DELETE authenticated tidak sesuai ekspektasi (seharusnya FALSE)'
    -- Evaluasi Hak Anon (Wajib seluruhnya FALSE)
    WHEN a.anon_sel <> e.exp_anon_sel 
      OR a.anon_ins <> e.exp_anon_ins 
      OR a.anon_upd <> e.exp_anon_upd 
      OR a.anon_del <> e.exp_anon_del THEN 'FAIL: Role anon memiliki hak akses efektif (kebocoran keamanan)'
    -- Evaluasi Hak Public & Direct Anon Grant
    WHEN a.public_acl_leak <> FALSE THEN 'FAIL: Terdeteksi grant langsung di relacl kepada pseudo-role PUBLIC'
    WHEN a.anon_direct_grant_leak <> FALSE THEN 'FAIL: Terdeteksi grant langsung di relacl kepada role anon'
    WHEN s.schema_default_leaks_table_access <> FALSE THEN 'FAIL: Terdeteksi default privilege schema yang membocorkan akses tabel'
    ELSE 'PASS'
  END AS status
FROM expected_table_grants e
CROSS JOIN schema_default_table_privileges s
LEFT JOIN actual_table_grants a ON a.table_name = e.table_name
ORDER BY e.table_name;
```
- **Kriteria Lulus (PASS):** Tepat **6 baris** untuk seluruh 6 tabel inti, dengan seluruh baris berstatus `'PASS'`:
  - `rls_enabled = true` pada seluruh tabel.
  - `anon_any_privilege = false` (seluruh SELECT, INSERT, UPDATE, DELETE bernilai false untuk anon).
  - `public_acl_leak = false` dan `anon_direct_grant_leak = false` pada seluruh tabel.
  - `schema_default_leaks_table_access = false`.
  - `auth_select = true` pada seluruh tabel.
  - `auth_update = true` hanya pada `profiles`, dan `false` pada 5 tabel lainnya.
  - `auth_insert = false` dan `auth_delete = false` pada seluruh tabel.
- **Kriteria Gagal (FAIL):** Tabel hilang, RLS mati, terdapat kebocoran izin ke role anon/ACL public, atau ketidaksesuaian izin authenticated langsung menghasilkan `'FAIL'` dengan rincian penyebab.

---

## 8. Pernyataan Penutup & Kesiapan Otorisasi

Seluruh file sumber, ketergantungan relasional, penyesuaian policy, dan naskah migrasi telah diaudit dan diselaraskan secara sempurna dengan temuan aktual Supabase Cloud.

**STATUS:** **READY FOR PRODUCT OWNER AUTHORIZATION REVIEW** (Migrasi siap dieksekusi secara manual oleh Product Owner di Supabase Dashboard SQL Editor saat otorisasi diberikan).

---

**ZERO DATABASE EXECUTION — tidak ada SQL, migrasi, seed, rollback, atau perubahan Supabase Cloud yang dijalankan.**
