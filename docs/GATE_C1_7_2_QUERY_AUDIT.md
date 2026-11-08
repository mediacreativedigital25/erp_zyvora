# ZYVORA ERP 1.0.0 — GATE C1.7.2: READ-ONLY QUERY ACCURACY & PRE-MIGRATION CHECKLIST AUDIT

**Tanggal Pemeriksaan:** 2026-10-24  
**Auditor:** Senior Software Engineer / Security Auditor (AI Studio Engine)  
**Target Database:** Supabase PostgreSQL Cloud  
**Project Reference:** `nfjucyabfiqlmrxnviuz`  
**Status Otorisasi:** PENDING PRODUCT OWNER APPROVAL (DO NOT EXECUTE MIGRATION)  
**Mode Operasi:** ZERO DATABASE EXECUTION — STATIC READ-ONLY & LOCAL SUITE VERIFICATION  

---

## 1. Ringkasan Eksekutif & Verdict

Berdasarkan audit komparatif antara:
1. Naskah migrasi `docs/migrations/001_user_access_and_rbac.sql`
2. Rencana integrasi `docs/SUPABASE_INTEGRATION_PLAN.md`
3. Manual kueri inspeksi `docs/DATABASE_SCHEMA_AUDIT.md`
4. Batasan tata kelola keamanan Product Owner (PO)

### **VERDICT RESMI: READY WITH RESTRICTIONS**

> **PERINGATAN STATUS:** Naskah migrasi **TIDAK DIIZINKAN DIJALANKAN SECARA OTOMATIS** dan **TIDAK MENDAPATKAN STATUS 'READY FOR EXECUTION'**. Status cloud saat ini tetap **`CLOUD STATUS UNKNOWN`** karena AI Studio tidak terhubung langsung ke database dan tidak pernah mengeksekusi DDL/DML ke cloud. Izin eksekusi berada 100% di bawah kewenangan mutlak Product Owner setelah verifikasi manual selesai dilakukan.

---

## 2. Audit Akurasi Kueri Inspeksi Read-Only (Kueri 1 s.d. 6)

Setiap kueri pada `docs/DATABASE_SCHEMA_AUDIT.md` telah diaudit terhadap DDL sumber, katalog PostgreSQL (`information_schema`, `pg_catalog`), privasi data, dan pembatasan wewenang (privilege context).

### Tabel Status Kueri:

| No | Kueri Inspeksi | Status Audit Awal | Status Akhir | Temuan & Tindakan Remediasi |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Pemeriksaan Akun Super Admin (`auth.users`)** | PERLU PERBAIKAN | **DIPERBAIKI** | Kueri murni `SELECT` valid. Namun sebelumnya belum mendokumentasikan bahwa akses ke skema `auth` memerlukan peran administratif (`postgres` di Supabase SQL Editor), serta belum menyertakan alternatif visual melalui menu Supabase Dashboard (**Authentication → Users**). |
| **2** | **Pemeriksaan Dependensi Struktur Skema Dasar** | PERLU PERBAIKAN | **DIPERBAIKI** | Kueri lama hanya menghitung jumlah kolom dan menampilkan sampel array kolom, tanpa memverifikasi Primary Key (PK), Foreign Key (FK), tipe data presisi, atau aturan relasional. Telah dipecah menjadi **2A (Kolom & Tipe)**, **2B (PK & Unique)**, dan **2C (FK Relationships)**. |
| **3** | **Pemeriksaan Integritas & Nilai `user_code`** | PERLU PERBAIKAN | **DIPERBAIKI** | Kueri lama pada 3B langsung menampilkan PII (`full_name`, `email`) secara terbuka. Telah diremediasi dengan kueri agregat zero-PII (`total_profiles_with_code`, `compliant_code_count`, `violating_code_count`) dan kueri diagnostik 3C bersyarat yang hanya menampilkan UUID dan panjang kode jika ada pelanggaran. |
| **4** | **Pemeriksaan Distribusi Role (`tenant_memberships`)** | VALID | **VALID** | Kueri agregat aman dan zero-PII. Mengelompokkan role secara ketat sesuai mandat PO: 5 role resmi (`super_admin`, `owner`, `admin`, `sales`, `customer`), status HOLD (`inventory_staff`, `accountant`), status REVIEW (`branch_manager`), dan penandaan role legacy (`sales_rep`) tanpa normalisasi paksa. |
| **5** | **Pemeriksaan Objek Migrasi 001** | PERLU PERBAIKAN | **DIPERBAIKI** | Kueri lama menggabungkan fungsi dan tidak memisahkan indeks serta constraint. Telah dipecah secara modular menjadi: **5A (Tabel Keamanan)**, **5B (Fungsi RPC & Trigger)**, **5C (Indeks B-Tree)**, **5D (Check & Unique Constraint)**, dan **5E (RLS Policies)**. |
| **6** | **Pemeriksaan Trigger `profiles`** | PERLU PERBAIKAN | **DIPERBAIKI** | Kueri lama hanya melihat `information_schema.triggers` umum. Telah dicocokkan secara presisi antara nama trigger `trg_profiles_burn_code_on_delete` dan fungsi eksekutornya `public.trg_burn_user_code_on_profile_delete()`, serta ditambahkan kueri inspeksi fungsi pada `pg_proc`. |

---

## 3. Rincian Perubahan pada `docs/DATABASE_SCHEMA_AUDIT.md`

Berikut adalah rangkuman perbaikan substansial yang telah diterapkan pada `docs/DATABASE_SCHEMA_AUDIT.md`:

1. **Penegasan Privilege Context Supabase SQL Editor:**  
   Menjelaskan bahwa di Supabase Dashboard SQL Editor, kueri dijalankan sebagai peran `postgres` (superuser / database owner), sehingga memiliki hak baca penuh terhadap `auth.users`, `pg_catalog`, dan `information_schema`. Memberikan opsi visual bagi PO jika tidak ingin menjalankan query teks.
2. **Ekspansi Kueri 2 (Verifikasi Struktural Menyeluruh):**
   - **2A:** Menginspeksi `column_name`, `data_type`, `is_nullable`, dan `column_default` untuk tabel `tenants`, `profiles`, `tenant_memberships`, dan `audit_logs`.
   - **2B:** Menginspeksi `PRIMARY KEY` dan `UNIQUE` constraint menggunakan gabungan `information_schema.table_constraints` dan `key_column_usage`.
   - **2C:** Menginspeksi `FOREIGN KEY` (tabel sumber, kolom sumber, tabel rujukan, kolom rujukan, serta aturan update/delete) menggunakan `information_schema.referential_constraints`.
3. **Pemberlakuan Prinsip Zero-PII pada Kueri 3:**
   - Menghapus pembacaan nama lengkap dan email pengguna saat memvalidasi kesesuaian format kode 2–3 karakter alfabet 32-simbol aman (`^[2-9A-HJ-NP-Z]{2,3}$`).
   - Menyediakan kueri diagnostik 3C yang hanya dijalankan jika ditemukan baris yang melanggar (`violating_code_count > 0`), dan hanya menampilkan UUID teknis profil serta kode yang bersangkutan.
4. **Pemisahan Objek (Separation of Concerns) pada Kueri 5:**
   - Memisahkan pemeriksaan tabel (`platform_super_admins`, `burned_user_codes`), fungsi (`is_platform_super_admin`, `generate_concurrency_safe_user_code`, `is_user_code_available`, `assign_user_role`, `toggle_user_status`, `trg_burn_user_code_on_profile_delete`), indeks (`idx_profiles_user_code`, `idx_platform_super_admins_active`), constraint (`profiles_user_code_unique`, `profiles_user_code_safe_alphabet_chk`, `burned_user_code_format_chk`), dan seluruh 9 kebijakan RLS pada `pg_policies`.
5. **Presisi Trigger pada Kueri 6:**
   - Memverifikasi trigger `trg_profiles_burn_code_on_delete` pada `information_schema.triggers`.
   - Memverifikasi fungsi PL/pgSQL pendukung `public.trg_burn_user_code_on_profile_delete` pada `pg_proc`.

---

## 4. Panduan Langkah demi Langkah bagi Product Owner di Supabase Dashboard

1. **Akses Dashboard:**
   - Login ke [https://supabase.com/dashboard](https://supabase.com/dashboard) dan pilih proyek `nfjucyabfiqlmrxnviuz`.
2. **Navigasi ke SQL Editor:**
   - Klik tab **SQL Editor** pada navigasi sisi kiri.
   - Buat tab baru dengan mengklik **New query**.
3. **Jalankan Kueri 1 s.d. 6 Secara Sekuensial:**
   - Salin setiap blok kueri dari `docs/DATABASE_SCHEMA_AUDIT.md`.
   - Jalankan kueri dengan menekan tombol **Run**.
4. **Catat dan Evaluasi Hasil:**
   - Cocokkan output kueri dengan Checklist Keputusan PO pada Bagian 5 di bawah ini.

---

## 5. Checklist Evaluasi Keputusan Product Owner Sebelum Otorisasi

| Langkah | Item Verifikasi | Kriteria Kelayakan Eksekusi | Status Cloud Saat Ini | Risiko Jika Diabaikan |
| :---: | :--- | :--- | :---: | :--- |
| **#1** | **Akun Supabase Auth Super Admin** | Tepat 1 baris untuk `64.iklas@gmail.com` pada `auth.users` | `CLOUD STATUS UNKNOWN` | **FATAL**: Transaksi migrasi Section 9 otomatis abort (`ROLLBACK 100%`) dengan error `ERR_ZYVORA_BOOTSTRAP_SUPER_ADMIN_NOT_FOUND`. |
| **#2** | **Tabel Dasar & Relasi FK** | Tabel `tenants`, `profiles`, `tenant_memberships`, `audit_logs` ada dan terikat FK | `CLOUD STATUS UNKNOWN` | **FATAL**: Penambahan kolom, constraint, dan trigger pada `profiles` atau policy RLS akan gagal sintaks / relasi tidak ditemukan. |
| **#3** | **Validitas user_code Existing** | `violating_code_count = 0` pada Kueri 3B | `CLOUD STATUS UNKNOWN` | **FATAL**: Penambahan CHECK constraint `profiles_user_code_safe_alphabet_chk` akan gagal jika ada kode yang melanggar. |
| **#4** | **Distribusi Role Existing** | Tidak ada error pembacaan role; role HOLD/REVIEW teridentifikasi | `CLOUD STATUS UNKNOWN` | Pelanggaran mandat PO jika terjadi normalisasi role massal yang tidak sah. |
| **#5** | **Idempotensi Objek Keamanan** | Objek migrasi 001 bersih (clean) atau siap di-replace | `CLOUD STATUS UNKNOWN` | Tidak ada risiko fatal (naskah idempoten), namun berguna untuk baseline audit. |

> **KEPUTUSAN GERBANG PO:**  
> Otorisasi migrasi `001_user_access_and_rbac.sql` **HANYA BOLEH DIBERIKAN** jika Item #1, #2, dan #3 berstatus **TERPENUHI 100%**.

---

## 6. Penegasan Status dan Batasan

1. **Status Cloud:** Seluruh komponen database Supabase pada project ref `nfjucyabfiqlmrxnviuz` tetap dinyatakan berstatus **`CLOUD STATUS UNKNOWN`** sampai Product Owner menyelesaikan inspeksi manual dan mencatat hasilnya.
2. **Verdict Akhir:** **READY WITH RESTRICTIONS** (Tolak pemberian status `READY FOR EXECUTION` pada tahap ini).
3. **Komitmen Mutlak:**
   **ZERO DATABASE EXECUTION — tidak ada SQL, migrasi, seed, rollback, atau perubahan Supabase Cloud yang dijalankan.**
