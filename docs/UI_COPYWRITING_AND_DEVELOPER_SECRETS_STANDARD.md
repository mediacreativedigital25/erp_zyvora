# ZYVORA ERP — STANDAR COPYWRITING UI & KERAHASIAAN ARSITEKTUR DEVELOPER

## 1. Prinsip Utama (Core Invariant)
Seluruh teks yang muncul pada antarmuka pengguna (UI/UX) — termasuk form input, modal/dialog popup, keterangan upload file, label dropdown, toast notification, placeholder, tooltip, dan pesan kesalahan — **TIDAK BOLEH** mengekspos rincian infrastruktur backend, nama vendor pihak ketiga, atau rahasia teknis developer.

Aplikasi Zyvora ERP harus selalu menampilkan bahasa bisnis formal, berkelas enterprise, bersih, dan berorientasi pada kemudahan pengguna (*User-Centric*).

---

## 2. Istilah yang Dilarang di Antarmuka Pengguna (UI Blacklist)

| Istilah Terlarang (Developer Secrets) | Alasan Kerahasiaan | Padanan Resmi yang Wajib Digunakan |
| :--- | :--- | :--- |
| **Cloudflare R2** / **R2 Storage** | Nama layanan vendor object storage developer | **Penyimpanan Cloud Teroptimasi** / **Sistem Media Cloud** |
| **Supabase** / **Supabase Auth** / **Supabase DB** | Vendor backend & identity provider developer | **Sistem Autentikasi Resmi** / **Sistem Cloud Terhubung** / **Sistem Pusat** |
| **PostgreSQL RLS** / **Row Level Security** | Implementasi arsitektur database internal | **Sistem Isolasi Keamanan Multi-Tenant** |
| **WebP** (pada label dan notifikasi umum) | Format teknis algoritma kompresi | **Foto Dioptimalkan** / **Foto Produk** / **Foto Sampel Layanan** |
| **Database** (pada toast notifikasi berhasil simpan) | Istilah teknis programmer | **Katalog Sistem** / **Sistem Pusat** / **Data Tersimpan** |
| **Project ID / API Key / UUID URL** | Kredensial rahasia gateway backend | **Zyvora Cloud Engine** (atau sembunyikan sepenuhnya) |

---

## 3. Kamus Panduan Kalimat Standar

### A. Upload Foto Produk & Lampiran Dokumen
* ❌ *Salah:* `Format PNG, JPG, atau WebP. Otomatis dikompresi ke WebP sebelum disimpan ke Cloudflare R2.`
*  *Standar:* `Format PNG, JPG, atau WebP (Maks. 2MB). Gambar otomatis dioptimalkan agar cepat dimuat.`
* ❌ *Salah:* `Foto Produk (Konversi Otomatis WebP)`
*  *Standar:* `Foto Produk`
* ❌ *Salah:* `Foto Jasa Terkompresi WebP (14.2 KB)`
*  *Standar:* `Foto Produk Berhasil Diproses`

### B. Notifikasi Toast (Pemberitahuan Sukses / Gagal)
* ❌ *Salah:* `SKU berhasil disimpan ke database Supabase.`
*  *Standar:* `SKU berhasil disimpan ke katalog sistem.`
* ❌ *Salah:* `Status produk berhasil diperbarui di database.`
*  *Standar:* `Status produk berhasil diperbarui.`
* ❌ *Salah:* `Gagal menghubungi Supabase client.`
*  *Standar:* `Gagal memperbarui data ke sistem pusat. Silakan coba kembali.`

### C. Status Koneksi & Halaman Login
* ❌ *Salah:* `Supabase Auth Online` | `nfjucyabfiqlmrxnviuz`
*  *Standar:* `Sistem Cloud Terhubung` | `Zyvora Cloud Engine`
* ❌ *Salah:* `Mode bypass developer gate C1 tanpa Supabase Auth.`
*  *Standar:* `Mode simulasi pengujian lokal aktif.`

---

## 4. Ketentuan Teknis Implementasi
* **Proses background tetap canggih:** Logika kompresi WebP berbasis Canvas dan upload ke object storage R2 serta mutasi atomic ke Supabase tetap berjalan 100% di lapisan logika/services (`MediaService`, `ProductService`, `TenantMasterService`).
* **Hanya representasi teks ke pengguna yang disanitasi** agar rahasia developer tetap aman dan pengalaman pengguna terasa profesional.
