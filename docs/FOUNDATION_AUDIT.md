# ZYVORA ERP 1.0.0 — FOUNDATION CODE & SECURITY AUDIT

Tanggal Audit: 2026-10-22  
Auditor: Senior ERP Architect, Application Security Engineer, Database Architect  
Status Fondasi: Verified (Stage A Completed)

---

## 1. Lingkup Pemeriksaan & File Terverifikasi

File-file berikut telah diperiksa secara menyeluruh:
- `src/types/erp.ts`: Definisi antarmuka TypeScript untuk multi-tenant, unit bisnis, cabang, gudang, pelanggan, pesanan penjualan, pembelian, kartu stok, rekening keuangan, voucher jurnal, karyawan, dan audit log.
- `src/data/mockData.ts`: Dataset in-memory awal untuk keperluan evaluasi desain workspace, demonstrasi UI, dan preview browser.
- `src/context/ErpContext.tsx`: State manager reaktif yang menangani tenant switcher, branch switcher, koleksi data, generator nomor dokumen, dan modal global.
- `src/App.tsx` & `src/components/layout/`: Application shell, topbar, sidebar, modal pencarian global, drawer notifikasi, dan toast.
- `src/pages/*`: 9 modul operasional (`DashboardPage`, `PenjualanPage`, `PembelianPage`, `PersediaanPage`, `KeuanganPage`, `AkuntansiPage`, `SdmPage`, `LaporanPage`, `PengaturanPage`).
- `package.json`, `tsconfig.json`, `vite.config.ts`, `/.env.example`, `/.gitignore`.

---

## 2. Hasil Audit Nyata terhadap 7 Pertanyaan Inti

### 1. Bagian mana yang menggunakan data demo atau state lokal?
- **Fakta:** Saat ini **seluruh data operasional** (pelanggan, pesanan penjualan, purchase orders, pergerakan stok, saldo kas/bank, jurnal umum, karyawan, dan log audit) disimpan di dalam state React lokal (`useState`) di dalam `src/context/ErpContext.tsx` dengan data inisial dari `src/data/mockData.ts`.
- **Indikator:** Setiap halaman memiliki label eksplisit `DEMO DATA` di header untuk mencegah kesalahpahaman bahwa data yang tampil adalah data produksi.
- **Konsekuensi:** Perubahan data (tambah pelanggan, buat pesanan, posting jurnal) hanya bertahan selama sesi browser dan akan ter-reset saat halaman di-refresh penuh.

### 2. Apakah autentikasi sudah tersedia?
- **Fakta:** Belum ada mekanisme autentikasi terhubung ke backend.
- **Kondisi Saat Ini:** Pengguna aktif di-hardcode sebagai profil simulasi `CURRENT_USER` (`usr_iklas_padli`, peran: `tenant_admin`, email: `iklaspadli85@gmail.com`) pada `mockData.ts`.
- **Kebutuhan:** Autentikasi sesi harus diintegrasikan dengan Supabase Auth (`supabase.auth.getSession()`, `supabase.auth.signInWithPassword()`, dll.) menggunakan JWT claims yang menyematkan hak akses tenant.

### 3. Apakah data pelanggan dan transaksi sudah menggunakan Supabase?
- **Fakta:** Belum. Tidak ada panggilan API `supabase.from('customers')` atau `supabase.from('sales_orders')` yang aktif di komponen UI saat ini.
- **Langkah yang Ditetapkan:** Arsitektur harus diisolasi menggunakan **Repository Pattern** (`CustomerRepository`, `SalesOrderRepository`, dsb.), sehingga komponen UI tetap bersih dan transisi dari Mock Repository ke Supabase Repository dapat dilakukan secara bertahap dan terkontrol tanpa merusak tampilan.

### 4. Apakah validasi dan business logic terpisah dari UI?
- **Fakta:** Sebagian besar logika validasi (misal: panjang kode pelanggan, perhitungan subtotal + PPN 11%, pengecekan keseimbangan debit/kredit) masih berada inline di dalam handler komponen form (`PenjualanPage.tsx`, `AkuntansiPage.tsx`, dan `ErpContext.tsx`).
- **Kebutuhan Arsitektur:** Logika domain harus diekstrak ke layer validasi independen (`src/domain/validators/` dan `src/services/`) agar dapat diuji secara terpisah dari lifecycle komponen React.

### 5. Apakah nomor dokumen dibuat secara aman dan konsisten?
- **Kondisi Frontend Saat Ini:** Nomor dokumen dibuat melalui helper `generateSequenceNumber(prefix)` di `ErpContext.tsx` dengan pola `PREFIX-YYYYMM-XXXXXX`.
- **Risiko Keamanan:** Generator nomor urut di frontend **tidak aman untuk lingkungan multi-user / produksi** karena rentan terhadap race condition (tabrakan nomor jika dua operator membuat transaksi pada detik yang sama) dan manipulasi klien.
- **Solusi Produksi:** Di Supabase PostgreSQL, penomoran urut wajib dihasilkan oleh PostgreSQL sequence atau stored procedure atomik (`SELECT nextval(...)` atau trigger database dengan isolasi per-tenant).

### 6. Apakah ada risiko tenant data leakage?
- **Risiko Frontend:** Karena state berada di memori klien, jika kredensial `service_role` bocor atau jika query klien mengirimkan `tenant_id` tanpa validasi server-side, pengguna jahat dapat membaca data tenant lain.
- **Mitigasi Wajib:**
  1. Jangan pernah memasukkan `SUPABASE_SERVICE_ROLE_KEY` ke bundle frontend. Hanya gunakan `anon` / `publishable` key.
  2. Penegakan isolasi tenant wajib berada di **PostgreSQL Row Level Security (RLS)** dengan memeriksa token claim `auth.uid()` terhadap tabel `tenant_memberships`.
  3. Validasi membership harus menolak request jika user tidak memiliki relasi sah ke `tenant_id` terkait.

### 7. Apakah build dan TypeScript check berhasil?
- **Fakta:** Verifikasi build (`npm run build`) dan type-checking (`tsc --noEmit`) berhasil 100% tanpa error, tanpa kompilasi gagal, dan tanpa sintaks rusak.

---

## 3. Matriks Kesiapan Komponen

| Komponen / Layer | Status Saat Ini | Target Produksi | Kesiapan Integrasi |
| :--- | :--- | :--- | :--- |
| **UI Shell & Navigasi** | Selesai & Stabil | Tetap dipertahankan | 100% (Ready) |
| **Types & Interface** | Lengkap di `src/types/erp.ts` | Aligned dengan model database | 95% (Ready) |
| **Supabase Client SDK** | `@supabase/supabase-js` terinstal | Client singleton dengan env check | 90% (Ready) |
| **Repository Layer** | Inline di Context | Interface terpisah (Mock vs Supabase) | Tahap C (In Progress) |
| **Database Schema** | Belum terverifikasi langsung | Supabase PostgreSQL `nfjucyabfiqlmrxnviuz` | Menunggu eksekusi skrip audit |
| **RLS Policies** | Blueprint dirancang | Ditegakkan di Supabase | Siap diterapkan |
