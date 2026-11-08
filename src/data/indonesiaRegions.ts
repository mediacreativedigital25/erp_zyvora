/**
 * Zyvora ERP 1.0.0 — Modul Referensi Wilayah Administratif Indonesia
 * 
 * Standar Kepmendagri / BPS:
 * 1. 38 Provinsi Lengkap Se-Indonesia
 * 2. Kabupaten & Kota Komprehensif (Termasuk 35 Kab/Kota Lengkap di Jawa Tengah)
 * 3. Hirarki Kecamatan & Desa/Kelurahan dengan Kodepos Riil
 */

export interface Province {
  id: string; // 2 digit Kemendagri (e.g. "33")
  name: string;
  region: 'Sumatera' | 'Jawa' | 'Bali-Nusa Tenggara' | 'Kalimantan' | 'Sulawesi' | 'Maluku-Papua';
}

export interface Regency {
  id: string; // 4 digit Kemendagri (e.g. "3374")
  provinceId: string;
  name: string;
  type: 'KABUPATEN' | 'KOTA';
}

export interface District {
  id: string; // 6 digit Kemendagri (e.g. "337401")
  regencyId: string;
  name: string;
}

export interface Village {
  id: string; // 10 digit Kemendagri (e.g. "3374011001")
  districtId: string;
  name: string;
  postalCode: string;
}

// 1. DAFTAR LENGKAP 38 PROVINSI REPUBLIK INDONESIA
export const PROVINCES: Province[] = [
  // Sumatera
  { id: '11', name: 'Aceh', region: 'Sumatera' },
  { id: '12', name: 'Sumatera Utara', region: 'Sumatera' },
  { id: '13', name: 'Sumatera Barat', region: 'Sumatera' },
  { id: '14', name: 'Riau', region: 'Sumatera' },
  { id: '15', name: 'Jambi', region: 'Sumatera' },
  { id: '16', name: 'Sumatera Selatan', region: 'Sumatera' },
  { id: '17', name: 'Bengkulu', region: 'Sumatera' },
  { id: '18', name: 'Lampung', region: 'Sumatera' },
  { id: '19', name: 'Kepulauan Bangka Belitung', region: 'Sumatera' },
  { id: '21', name: 'Kepulauan Riau', region: 'Sumatera' },

  // Jawa
  { id: '31', name: 'DKI Jakarta', region: 'Jawa' },
  { id: '32', name: 'Jawa Barat', region: 'Jawa' },
  { id: '33', name: 'Jawa Tengah', region: 'Jawa' },
  { id: '34', name: 'DI Yogyakarta', region: 'Jawa' },
  { id: '35', name: 'Jawa Timur', region: 'Jawa' },
  { id: '36', name: 'Banten', region: 'Jawa' },

  // Bali & Nusa Tenggara
  { id: '51', name: 'Bali', region: 'Bali-Nusa Tenggara' },
  { id: '52', name: 'Nusa Tenggara Barat', region: 'Bali-Nusa Tenggara' },
  { id: '53', name: 'Nusa Tenggara Timur', region: 'Bali-Nusa Tenggara' },

  // Kalimantan
  { id: '61', name: 'Kalimantan Barat', region: 'Kalimantan' },
  { id: '62', name: 'Kalimantan Tengah', region: 'Kalimantan' },
  { id: '63', name: 'Kalimantan Selatan', region: 'Kalimantan' },
  { id: '64', name: 'Kalimantan Timur', region: 'Kalimantan' },
  { id: '65', name: 'Kalimantan Utara', region: 'Kalimantan' },

  // Sulawesi
  { id: '71', name: 'Sulawesi Utara', region: 'Sulawesi' },
  { id: '72', name: 'Sulawesi Tengah', region: 'Sulawesi' },
  { id: '73', name: 'Sulawesi Selatan', region: 'Sulawesi' },
  { id: '74', name: 'Sulawesi Tenggara', region: 'Sulawesi' },
  { id: '75', name: 'Gorontalo', region: 'Sulawesi' },
  { id: '76', name: 'Sulawesi Barat', region: 'Sulawesi' },

  // Maluku & Papua
  { id: '81', name: 'Maluku', region: 'Maluku-Papua' },
  { id: '82', name: 'Maluku Utara', region: 'Maluku-Papua' },
  { id: '91', name: 'Papua', region: 'Maluku-Papua' },
  { id: '92', name: 'Papua Barat', region: 'Maluku-Papua' },
  { id: '93', name: 'Papua Selatan', region: 'Maluku-Papua' },
  { id: '94', name: 'Papua Tengah', region: 'Maluku-Papua' },
  { id: '95', name: 'Papua Pegunungan', region: 'Maluku-Papua' },
  { id: '96', name: 'Papua Barat Daya', region: 'Maluku-Papua' }
];

// 2. KABUPATEN / KOTA (Standar 4-digit Kemendagri)
export const REGENCIES: Regency[] = [
  // ==========================================
  // JAWA TENGAH (33) — 35 KABUPATEN & KOTA LENGKAP
  // ==========================================
  { id: '3301', provinceId: '33', name: 'Kab. Cilacap', type: 'KABUPATEN' },
  { id: '3302', provinceId: '33', name: 'Kab. Banyumas', type: 'KABUPATEN' },
  { id: '3303', provinceId: '33', name: 'Kab. Purbalingga', type: 'KABUPATEN' },
  { id: '3304', provinceId: '33', name: 'Kab. Banjarnegara', type: 'KABUPATEN' },
  { id: '3305', provinceId: '33', name: 'Kab. Kebumen', type: 'KABUPATEN' },
  { id: '3306', provinceId: '33', name: 'Kab. Purworejo', type: 'KABUPATEN' },
  { id: '3307', provinceId: '33', name: 'Kab. Wonosobo', type: 'KABUPATEN' },
  { id: '3308', provinceId: '33', name: 'Kab. Magelang', type: 'KABUPATEN' },
  { id: '3309', provinceId: '33', name: 'Kab. Boyolali', type: 'KABUPATEN' },
  { id: '3310', provinceId: '33', name: 'Kab. Klaten', type: 'KABUPATEN' },
  { id: '3311', provinceId: '33', name: 'Kab. Sukoharjo', type: 'KABUPATEN' },
  { id: '3312', provinceId: '33', name: 'Kab. Wonogiri', type: 'KABUPATEN' },
  { id: '3313', provinceId: '33', name: 'Kab. Karanganyar', type: 'KABUPATEN' },
  { id: '3314', provinceId: '33', name: 'Kab. Sragen', type: 'KABUPATEN' },
  { id: '3315', provinceId: '33', name: 'Kab. Grobogan', type: 'KABUPATEN' },
  { id: '3316', provinceId: '33', name: 'Kab. Blora', type: 'KABUPATEN' },
  { id: '3317', provinceId: '33', name: 'Kab. Rembang', type: 'KABUPATEN' },
  { id: '3318', provinceId: '33', name: 'Kab. Pati', type: 'KABUPATEN' },
  { id: '3319', provinceId: '33', name: 'Kab. Kudus', type: 'KABUPATEN' },
  { id: '3320', provinceId: '33', name: 'Kab. Jepara', type: 'KABUPATEN' },
  { id: '3321', provinceId: '33', name: 'Kab. Demak', type: 'KABUPATEN' },
  { id: '3322', provinceId: '33', name: 'Kab. Semarang', type: 'KABUPATEN' },
  { id: '3323', provinceId: '33', name: 'Kab. Temanggung', type: 'KABUPATEN' },
  { id: '3324', provinceId: '33', name: 'Kab. Kendal', type: 'KABUPATEN' },
  { id: '3325', provinceId: '33', name: 'Kab. Batang', type: 'KABUPATEN' },
  { id: '3326', provinceId: '33', name: 'Kab. Pekalongan', type: 'KABUPATEN' },
  { id: '3327', provinceId: '33', name: 'Kab. Pemalang', type: 'KABUPATEN' },
  { id: '3328', provinceId: '33', name: 'Kab. Tegal', type: 'KABUPATEN' },
  { id: '3329', provinceId: '33', name: 'Kab. Brebes', type: 'KABUPATEN' },
  { id: '3371', provinceId: '33', name: 'Kota Magelang', type: 'KOTA' },
  { id: '3372', provinceId: '33', name: 'Kota Surakarta (Solo)', type: 'KOTA' },
  { id: '3373', provinceId: '33', name: 'Kota Salatiga', type: 'KOTA' },
  { id: '3374', provinceId: '33', name: 'Kota Semarang', type: 'KOTA' },
  { id: '3375', provinceId: '33', name: 'Kota Pekalongan', type: 'KOTA' },
  { id: '3376', provinceId: '33', name: 'Kota Tegal', type: 'KOTA' },

  // ==========================================
  // DKI JAKARTA (31) — LENGKAP 6 WILAYAH
  // ==========================================
  { id: '3101', provinceId: '31', name: 'Kab. Kepulauan Seribu', type: 'KABUPATEN' },
  { id: '3171', provinceId: '31', name: 'Kota Jakarta Selatan', type: 'KOTA' },
  { id: '3172', provinceId: '31', name: 'Kota Jakarta Utara', type: 'KOTA' },
  { id: '3173', provinceId: '31', name: 'Kota Jakarta Pusat', type: 'KOTA' },
  { id: '3174', provinceId: '31', name: 'Kota Jakarta Barat', type: 'KOTA' },
  { id: '3175', provinceId: '31', name: 'Kota Jakarta Timur', type: 'KOTA' },

  // ==========================================
  // JAWA BARAT (32) — 27 KABUPATEN & KOTA LENGKAP
  // ==========================================
  { id: '3201', provinceId: '32', name: 'Kab. Bogor', type: 'KABUPATEN' },
  { id: '3202', provinceId: '32', name: 'Kab. Sukabumi', type: 'KABUPATEN' },
  { id: '3203', provinceId: '32', name: 'Kab. Cianjur', type: 'KABUPATEN' },
  { id: '3204', provinceId: '32', name: 'Kab. Bandung', type: 'KABUPATEN' },
  { id: '3205', provinceId: '32', name: 'Kab. Garut', type: 'KABUPATEN' },
  { id: '3206', provinceId: '32', name: 'Kab. Tasikmalaya', type: 'KABUPATEN' },
  { id: '3207', provinceId: '32', name: 'Kab. Ciamis', type: 'KABUPATEN' },
  { id: '3208', provinceId: '32', name: 'Kab. Kuningan', type: 'KABUPATEN' },
  { id: '3209', provinceId: '32', name: 'Kab. Cirebon', type: 'KABUPATEN' },
  { id: '3210', provinceId: '32', name: 'Kab. Majalengka', type: 'KABUPATEN' },
  { id: '3211', provinceId: '32', name: 'Kab. Sumedang', type: 'KABUPATEN' },
  { id: '3212', provinceId: '32', name: 'Kab. Indramayu', type: 'KABUPATEN' },
  { id: '3213', provinceId: '32', name: 'Kab. Subang', type: 'KABUPATEN' },
  { id: '3214', provinceId: '32', name: 'Kab. Purwakarta', type: 'KABUPATEN' },
  { id: '3215', provinceId: '32', name: 'Kab. Karawang', type: 'KABUPATEN' },
  { id: '3216', provinceId: '32', name: 'Kab. Bekasi', type: 'KABUPATEN' },
  { id: '3217', provinceId: '32', name: 'Kab. Bandung Barat', type: 'KABUPATEN' },
  { id: '3218', provinceId: '32', name: 'Kab. Pangandaran', type: 'KABUPATEN' },
  { id: '3271', provinceId: '32', name: 'Kota Bogor', type: 'KOTA' },
  { id: '3272', provinceId: '32', name: 'Kota Sukabumi', type: 'KOTA' },
  { id: '3273', provinceId: '32', name: 'Kota Bandung', type: 'KOTA' },
  { id: '3274', provinceId: '32', name: 'Kota Cirebon', type: 'KOTA' },
  { id: '3275', provinceId: '32', name: 'Kota Bekasi', type: 'KOTA' },
  { id: '3276', provinceId: '32', name: 'Kota Depok', type: 'KOTA' },
  { id: '3277', provinceId: '32', name: 'Kota Cimahi', type: 'KOTA' },
  { id: '3278', provinceId: '32', name: 'Kota Tasikmalaya', type: 'KOTA' },
  { id: '3279', provinceId: '32', name: 'Kota Banjar', type: 'KOTA' },

  // ==========================================
  // DI YOGYAKARTA (34) — 5 KABUPATEN & KOTA LENGKAP
  // ==========================================
  { id: '3401', provinceId: '34', name: 'Kab. Kulon Progo', type: 'KABUPATEN' },
  { id: '3402', provinceId: '34', name: 'Kab. Bantul', type: 'KABUPATEN' },
  { id: '3403', provinceId: '34', name: 'Kab. Gunungkidul', type: 'KABUPATEN' },
  { id: '3404', provinceId: '34', name: 'Kab. Sleman', type: 'KABUPATEN' },
  { id: '3471', provinceId: '34', name: 'Kota Yogyakarta', type: 'KOTA' },

  // ==========================================
  // JAWA TIMUR (35) — 38 KABUPATEN & KOTA LENGKAP
  // ==========================================
  { id: '3501', provinceId: '35', name: 'Kab. Pacitan', type: 'KABUPATEN' },
  { id: '3502', provinceId: '35', name: 'Kab. Ponorogo', type: 'KABUPATEN' },
  { id: '3503', provinceId: '35', name: 'Kab. Trenggalek', type: 'KABUPATEN' },
  { id: '3504', provinceId: '35', name: 'Kab. Tulungagung', type: 'KABUPATEN' },
  { id: '3505', provinceId: '35', name: 'Kab. Blitar', type: 'KABUPATEN' },
  { id: '3506', provinceId: '35', name: 'Kab. Kediri', type: 'KABUPATEN' },
  { id: '3507', provinceId: '35', name: 'Kab. Malang', type: 'KABUPATEN' },
  { id: '3508', provinceId: '35', name: 'Kab. Lumajang', type: 'KABUPATEN' },
  { id: '3509', provinceId: '35', name: 'Kab. Jember', type: 'KABUPATEN' },
  { id: '3510', provinceId: '35', name: 'Kab. Banyuwangi', type: 'KABUPATEN' },
  { id: '3511', provinceId: '35', name: 'Kab. Bondowoso', type: 'KABUPATEN' },
  { id: '3512', provinceId: '35', name: 'Kab. Situbondo', type: 'KABUPATEN' },
  { id: '3513', provinceId: '35', name: 'Kab. Probolinggo', type: 'KABUPATEN' },
  { id: '3514', provinceId: '35', name: 'Kab. Pasuruan', type: 'KABUPATEN' },
  { id: '3515', provinceId: '35', name: 'Kab. Sidoarjo', type: 'KABUPATEN' },
  { id: '3516', provinceId: '35', name: 'Kab. Mojokerto', type: 'KABUPATEN' },
  { id: '3517', provinceId: '35', name: 'Kab. Jombang', type: 'KABUPATEN' },
  { id: '3518', provinceId: '35', name: 'Kab. Nganjuk', type: 'KABUPATEN' },
  { id: '3519', provinceId: '35', name: 'Kab. Madiun', type: 'KABUPATEN' },
  { id: '3520', provinceId: '35', name: 'Kab. Magetan', type: 'KABUPATEN' },
  { id: '3521', provinceId: '35', name: 'Kab. Ngawi', type: 'KABUPATEN' },
  { id: '3522', provinceId: '35', name: 'Kab. Bojonegoro', type: 'KABUPATEN' },
  { id: '3523', provinceId: '35', name: 'Kab. Tuban', type: 'KABUPATEN' },
  { id: '3524', provinceId: '35', name: 'Kab. Lamongan', type: 'KABUPATEN' },
  { id: '3525', provinceId: '35', name: 'Kab. Gresik', type: 'KABUPATEN' },
  { id: '3526', provinceId: '35', name: 'Kab. Bangkalan', type: 'KABUPATEN' },
  { id: '3527', provinceId: '35', name: 'Kab. Sampang', type: 'KABUPATEN' },
  { id: '3528', provinceId: '35', name: 'Kab. Pamekasan', type: 'KABUPATEN' },
  { id: '3529', provinceId: '35', name: 'Kab. Sumenep', type: 'KABUPATEN' },
  { id: '3571', provinceId: '35', name: 'Kota Kediri', type: 'KOTA' },
  { id: '3572', provinceId: '35', name: 'Kota Blitar', type: 'KOTA' },
  { id: '3573', provinceId: '35', name: 'Kota Malang', type: 'KOTA' },
  { id: '3574', provinceId: '35', name: 'Kota Probolinggo', type: 'KOTA' },
  { id: '3575', provinceId: '35', name: 'Kota Pasuruan', type: 'KOTA' },
  { id: '3576', provinceId: '35', name: 'Kota Mojokerto', type: 'KOTA' },
  { id: '3577', provinceId: '35', name: 'Kota Madiun', type: 'KOTA' },
  { id: '3578', provinceId: '35', name: 'Kota Surabaya', type: 'KOTA' },
  { id: '3579', provinceId: '35', name: 'Kota Batu', type: 'KOTA' },

  // ==========================================
  // BANTEN (36) — 8 KABUPATEN & KOTA LENGKAP
  // ==========================================
  { id: '3601', provinceId: '36', name: 'Kab. Pandeglang', type: 'KABUPATEN' },
  { id: '3602', provinceId: '36', name: 'Kab. Lebak', type: 'KABUPATEN' },
  { id: '3603', provinceId: '36', name: 'Kab. Tangerang', type: 'KABUPATEN' },
  { id: '3604', provinceId: '36', name: 'Kab. Serang', type: 'KABUPATEN' },
  { id: '3671', provinceId: '36', name: 'Kota Tangerang', type: 'KOTA' },
  { id: '3672', provinceId: '36', name: 'Kota Cilegon', type: 'KOTA' },
  { id: '3673', provinceId: '36', name: 'Kota Serang', type: 'KOTA' },
  { id: '3674', provinceId: '36', name: 'Kota Tangerang Selatan', type: 'KOTA' },

  // ==========================================
  // BALI (51) — 9 KABUPATEN & KOTA LENGKAP
  // ==========================================
  { id: '5101', provinceId: '51', name: 'Kab. Jembrana', type: 'KABUPATEN' },
  { id: '5102', provinceId: '51', name: 'Kab. Tabanan', type: 'KABUPATEN' },
  { id: '5103', provinceId: '51', name: 'Kab. Badung', type: 'KABUPATEN' },
  { id: '5104', provinceId: '51', name: 'Kab. Gianyar', type: 'KABUPATEN' },
  { id: '5105', provinceId: '51', name: 'Kab. Klungkung', type: 'KABUPATEN' },
  { id: '5106', provinceId: '51', name: 'Kab. Bangli', type: 'KABUPATEN' },
  { id: '5107', provinceId: '51', name: 'Kab. Karangasem', type: 'KABUPATEN' },
  { id: '5108', provinceId: '51', name: 'Kab. Buleleng', type: 'KABUPATEN' },
  { id: '5171', provinceId: '51', name: 'Kota Denpasar', type: 'KOTA' },

  // ==========================================
  // SUMATERA UTARA (12)
  // ==========================================
  { id: '1271', provinceId: '12', name: 'Kota Medan', type: 'KOTA' },
  { id: '1272', provinceId: '12', name: 'Kota Pematangsiantar', type: 'KOTA' },
  { id: '1275', provinceId: '12', name: 'Kota Binjai', type: 'KOTA' },
  { id: '1276', provinceId: '12', name: 'Kota Tebing Tinggi', type: 'KOTA' },
  { id: '1207', provinceId: '12', name: 'Kab. Deli Serdang', type: 'KABUPATEN' },
  { id: '1214', provinceId: '12', name: 'Kab. Langkat', type: 'KABUPATEN' },
  { id: '1212', provinceId: '12', name: 'Kab. Karo', type: 'KABUPATEN' },
  { id: '1208', provinceId: '12', name: 'Kab. Simalungun', type: 'KABUPATEN' },
  { id: '1209', provinceId: '12', name: 'Kab. Asahan', type: 'KABUPATEN' },
  { id: '1210', provinceId: '12', name: 'Kab. Labuhanbatu', type: 'KABUPATEN' },

  // ==========================================
  // SUMATERA BARAT (13)
  // ==========================================
  { id: '1371', provinceId: '13', name: 'Kota Padang', type: 'KOTA' },
  { id: '1375', provinceId: '13', name: 'Kota Bukittinggi', type: 'KOTA' },
  { id: '1376', provinceId: '13', name: 'Kota Payakumbuh', type: 'KOTA' },
  { id: '1377', provinceId: '13', name: 'Kota Pariaman', type: 'KOTA' },
  { id: '1302', provinceId: '13', name: 'Kab. Solok', type: 'KABUPATEN' },
  { id: '1304', provinceId: '13', name: 'Kab. Tanah Datar', type: 'KABUPATEN' },
  { id: '1306', provinceId: '13', name: 'Kab. Agam', type: 'KABUPATEN' },

  // ==========================================
  // ACEH (11)
  // ==========================================
  { id: '1171', provinceId: '11', name: 'Kota Banda Aceh', type: 'KOTA' },
  { id: '1172', provinceId: '11', name: 'Kota Sabang', type: 'KOTA' },
  { id: '1173', provinceId: '11', name: 'Kota Lhokseumawe', type: 'KOTA' },
  { id: '1174', provinceId: '11', name: 'Kota Langsa', type: 'KOTA' },
  { id: '1106', provinceId: '11', name: 'Kab. Aceh Besar', type: 'KABUPATEN' },
  { id: '1108', provinceId: '11', name: 'Kab. Aceh Utara', type: 'KABUPATEN' },

  // ==========================================
  // RIAU & KEPULAUAN RIAU (14, 21)
  // ==========================================
  { id: '1471', provinceId: '14', name: 'Kota Pekanbaru', type: 'KOTA' },
  { id: '1472', provinceId: '14', name: 'Kota Dumai', type: 'KOTA' },
  { id: '1401', provinceId: '14', name: 'Kab. Kampar', type: 'KABUPATEN' },
  { id: '1408', provinceId: '14', name: 'Kab. Bengkalis', type: 'KABUPATEN' },
  { id: '1409', provinceId: '14', name: 'Kab. Siak', type: 'KABUPATEN' },
  { id: '2171', provinceId: '21', name: 'Kota Batam', type: 'KOTA' },
  { id: '2172', provinceId: '21', name: 'Kota Tanjungpinang', type: 'KOTA' },
  { id: '2101', provinceId: '21', name: 'Kab. Bintan', type: 'KABUPATEN' },
  { id: '2102', provinceId: '21', name: 'Kab. Karimun', type: 'KABUPATEN' },

  // ==========================================
  // SUMATERA SELATAN, JAMBI, BENGKULU, LAMPUNG, BABEL (15, 16, 17, 18, 19)
  // ==========================================
  { id: '1571', provinceId: '15', name: 'Kota Jambi', type: 'KOTA' },
  { id: '1504', provinceId: '15', name: 'Kab. Batanghari', type: 'KABUPATEN' },
  { id: '1505', provinceId: '15', name: 'Kab. Muaro Jambi', type: 'KABUPATEN' },
  { id: '1671', provinceId: '16', name: 'Kota Palembang', type: 'KOTA' },
  { id: '1672', provinceId: '16', name: 'Kota Prabumulih', type: 'KOTA' },
  { id: '1602', provinceId: '16', name: 'Kab. Ogan Komering Ilir', type: 'KABUPATEN' },
  { id: '1607', provinceId: '16', name: 'Kab. Banyuasin', type: 'KABUPATEN' },
  { id: '1771', provinceId: '17', name: 'Kota Bengkulu', type: 'KOTA' },
  { id: '1703', provinceId: '17', name: 'Kab. Bengkulu Utara', type: 'KABUPATEN' },
  { id: '1871', provinceId: '18', name: 'Kota Bandar Lampung', type: 'KOTA' },
  { id: '1872', provinceId: '18', name: 'Kota Metro', type: 'KOTA' },
  { id: '1801', provinceId: '18', name: 'Kab. Lampung Selatan', type: 'KABUPATEN' },
  { id: '1802', provinceId: '18', name: 'Kab. Lampung Tengah', type: 'KABUPATEN' },
  { id: '1971', provinceId: '19', name: 'Kota Pangkalpinang', type: 'KOTA' },
  { id: '1901', provinceId: '19', name: 'Kab. Bangka', type: 'KABUPATEN' },
  { id: '1902', provinceId: '19', name: 'Kab. Belitung', type: 'KABUPATEN' },

  // ==========================================
  // KALIMANTAN (61, 62, 63, 64, 65)
  // ==========================================
  { id: '6171', provinceId: '61', name: 'Kota Pontianak', type: 'KOTA' },
  { id: '6172', provinceId: '61', name: 'Kota Singkawang', type: 'KOTA' },
  { id: '6102', provinceId: '61', name: 'Kab. Mempawah', type: 'KABUPATEN' },
  { id: '6112', provinceId: '61', name: 'Kab. Kubu Raya', type: 'KABUPATEN' },
  { id: '6271', provinceId: '62', name: 'Kota Palangka Raya', type: 'KOTA' },
  { id: '6202', provinceId: '62', name: 'Kab. Kotawaringin Timur', type: 'KABUPATEN' },
  { id: '6201', provinceId: '62', name: 'Kab. Kotawaringin Barat', type: 'KABUPATEN' },
  { id: '6371', provinceId: '63', name: 'Kota Banjarmasin', type: 'KOTA' },
  { id: '6372', provinceId: '63', name: 'Kota Banjarbaru', type: 'KOTA' },
  { id: '6303', provinceId: '63', name: 'Kab. Banjar', type: 'KABUPATEN' },
  { id: '6471', provinceId: '64', name: 'Kota Balikpapan', type: 'KOTA' },
  { id: '6472', provinceId: '64', name: 'Kota Samarinda', type: 'KOTA' },
  { id: '6474', provinceId: '64', name: 'Kota Bontang', type: 'KOTA' },
  { id: '6402', provinceId: '64', name: 'Kab. Kutai Kartanegara', type: 'KABUPATEN' },
  { id: '6409', provinceId: '64', name: 'Kab. Penajam Paser Utara', type: 'KABUPATEN' },
  { id: '6571', provinceId: '65', name: 'Kota Tarakan', type: 'KOTA' },
  { id: '6501', provinceId: '65', name: 'Kab. Bulungan', type: 'KABUPATEN' },

  // ==========================================
  // SULAWESI (71, 72, 73, 74, 75, 76)
  // ==========================================
  { id: '7171', provinceId: '71', name: 'Kota Manado', type: 'KOTA' },
  { id: '7172', provinceId: '71', name: 'Kota Bitung', type: 'KOTA' },
  { id: '7102', provinceId: '71', name: 'Kab. Minahasa', type: 'KABUPATEN' },
  { id: '7271', provinceId: '72', name: 'Kota Palu', type: 'KOTA' },
  { id: '7201', provinceId: '72', name: 'Kab. Banggai', type: 'KABUPATEN' },
  { id: '7371', provinceId: '73', name: 'Kota Makassar', type: 'KOTA' },
  { id: '7372', provinceId: '73', name: 'Kota Parepare', type: 'KOTA' },
  { id: '7373', provinceId: '73', name: 'Kota Palopo', type: 'KOTA' },
  { id: '7306', provinceId: '73', name: 'Kab. Gowa', type: 'KABUPATEN' },
  { id: '7309', provinceId: '73', name: 'Kab. Maros', type: 'KABUPATEN' },
  { id: '7471', provinceId: '74', name: 'Kota Kendari', type: 'KOTA' },
  { id: '7472', provinceId: '74', name: 'Kota Baubau', type: 'KOTA' },
  { id: '7571', provinceId: '75', name: 'Kota Gorontalo', type: 'KOTA' },
  { id: '7501', provinceId: '75', name: 'Kab. Gorontalo', type: 'KABUPATEN' },
  { id: '7602', provinceId: '76', name: 'Kab. Mamuju', type: 'KABUPATEN' },
  { id: '7604', provinceId: '76', name: 'Kab. Polewali Mandar', type: 'KABUPATEN' },

  // ==========================================
  // NUSA TENGGARA & MALUKU (52, 53, 81, 82)
  // ==========================================
  { id: '5271', provinceId: '52', name: 'Kota Mataram', type: 'KOTA' },
  { id: '5272', provinceId: '52', name: 'Kota Bima', type: 'KOTA' },
  { id: '5201', provinceId: '52', name: 'Kab. Lombok Barat', type: 'KABUPATEN' },
  { id: '5202', provinceId: '52', name: 'Kab. Lombok Tengah', type: 'KABUPATEN' },
  { id: '5371', provinceId: '53', name: 'Kota Kupang', type: 'KOTA' },
  { id: '5315', provinceId: '53', name: 'Kab. Manggarai Barat (Labuan Bajo)', type: 'KABUPATEN' },
  { id: '8171', provinceId: '81', name: 'Kota Ambon', type: 'KOTA' },
  { id: '8101', provinceId: '81', name: 'Kab. Maluku Tengah', type: 'KABUPATEN' },
  { id: '8271', provinceId: '82', name: 'Kota Ternate', type: 'KOTA' },
  { id: '8272', provinceId: '82', name: 'Kota Tidore Kepulauan', type: 'KOTA' },

  // ==========================================
  // PAPUA RAYA (91, 92, 93, 94, 95, 96)
  // ==========================================
  { id: '9171', provinceId: '91', name: 'Kota Jayapura', type: 'KOTA' },
  { id: '9101', provinceId: '91', name: 'Kab. Jayapura', type: 'KABUPATEN' },
  { id: '9202', provinceId: '92', name: 'Kab. Manokwari', type: 'KABUPATEN' },
  { id: '9301', provinceId: '93', name: 'Kab. Merauke', type: 'KABUPATEN' },
  { id: '9401', provinceId: '94', name: 'Kab. Nabire', type: 'KABUPATEN' },
  { id: '9404', provinceId: '94', name: 'Kab. Mimika (Timika)', type: 'KABUPATEN' },
  { id: '9501', provinceId: '95', name: 'Kab. Jayawijaya (Wamena)', type: 'KABUPATEN' },
  { id: '9671', provinceId: '96', name: 'Kota Sorong', type: 'KOTA' },
  { id: '9601', provinceId: '96', name: 'Kab. Sorong', type: 'KABUPATEN' },
  { id: '9605', provinceId: '96', name: 'Kab. Raja Ampat', type: 'KABUPATEN' }
];

// 3. KECAMATAN TERPILIH (Standar 6-digit Kemendagri)
export const DISTRICTS: District[] = [
  // ==========================================
  // KOTA SEMARANG (3374)
  // ==========================================
  { id: '337401', regencyId: '3374', name: 'Semarang Tengah' },
  { id: '337402', regencyId: '3374', name: 'Semarang Barat' },
  { id: '337403', regencyId: '3374', name: 'Semarang Timur' },
  { id: '337404', regencyId: '3374', name: 'Semarang Selatan' },
  { id: '337405', regencyId: '3374', name: 'Semarang Utara' },
  { id: '337406', regencyId: '3374', name: 'Gajahmungkur' },
  { id: '337407', regencyId: '3374', name: 'Banyumanik' },
  { id: '337408', regencyId: '3374', name: 'Candisari' },
  { id: '337409', regencyId: '3374', name: 'Pedurungan' },
  { id: '337410', regencyId: '3374', name: 'Genuk' },
  { id: '337411', regencyId: '3374', name: 'Tembalang' },
  { id: '337412', regencyId: '3374', name: 'Ngaliyan' },

  // ==========================================
  // KOTA SURAKARTA / SOLO (3372)
  // ==========================================
  { id: '337201', regencyId: '3372', name: 'Laweyan' },
  { id: '337202', regencyId: '3372', name: 'Serengan' },
  { id: '337203', regencyId: '3372', name: 'Pasar Kliwon' },
  { id: '337204', regencyId: '3372', name: 'Jebres' },
  { id: '337205', regencyId: '3372', name: 'Banjarsari' },

  // ==========================================
  // KAB. BANYUMAS (3302)
  // ==========================================
  { id: '330201', regencyId: '3302', name: 'Purwokerto Timur' },
  { id: '330202', regencyId: '3302', name: 'Purwokerto Barat' },
  { id: '330203', regencyId: '3302', name: 'Purwokerto Selatan' },
  { id: '330204', regencyId: '3302', name: 'Purwokerto Utara' },
  { id: '330205', regencyId: '3302', name: 'Sokaraja' },
  { id: '330206', regencyId: '3302', name: 'Baturraden' },
  { id: '330207', regencyId: '3302', name: 'Banyumas' },
  { id: '330208', regencyId: '3302', name: 'Ajibarang' },
  { id: '330209', regencyId: '3302', name: 'Wangon' },
  { id: '330210', regencyId: '3302', name: 'Cilongok' },

  // ==========================================
  // KAB. CILACAP (3301)
  // ==========================================
  { id: '330101', regencyId: '3301', name: 'Cilacap Selatan' },
  { id: '330102', regencyId: '3301', name: 'Cilacap Tengah' },
  { id: '330103', regencyId: '3301', name: 'Cilacap Utara' },
  { id: '330104', regencyId: '3301', name: 'Kesugihan' },
  { id: '330105', regencyId: '3301', name: 'Kroya' },
  { id: '330106', regencyId: '3301', name: 'Majenang' },

  // ==========================================
  // KAB. KUDUS (3319) & PATI (3318)
  // ==========================================
  { id: '331901', regencyId: '3319', name: 'Kota Kudus' },
  { id: '331902', regencyId: '3319', name: 'Jati' },
  { id: '331903', regencyId: '3319', name: 'Bae' },
  { id: '331904', regencyId: '3319', name: 'Gebog' },
  { id: '331905', regencyId: '3319', name: 'Kaliwungu' },
  { id: '331801', regencyId: '3318', name: 'Pati' },
  { id: '331802', regencyId: '3318', name: 'Juwana' },

  // ==========================================
  // KAB. SUKOHARJO (3311) & KLATEN (3310)
  // ==========================================
  { id: '331101', regencyId: '3311', name: 'Sukoharjo' },
  { id: '331102', regencyId: '3311', name: 'Kartasura' },
  { id: '331103', regencyId: '3311', name: 'Grogol' },
  { id: '331001', regencyId: '3310', name: 'Klaten Tengah' },
  { id: '331002', regencyId: '3310', name: 'Klaten Utara' },
  { id: '331003', regencyId: '3310', name: 'Delanggu' },

  // ==========================================
  // KAB. BREBES (3329) & TEGAL (3328, 3376)
  // ==========================================
  { id: '332901', regencyId: '3329', name: 'Brebes' },
  { id: '332902', regencyId: '3329', name: 'Bumiayu' },
  { id: '332903', regencyId: '3329', name: 'Jatibarang' },
  { id: '337601', regencyId: '3376', name: 'Tegal Barat' },
  { id: '337602', regencyId: '3376', name: 'Tegal Timur' },
  { id: '332801', regencyId: '3328', name: 'Slawi' },
  { id: '332802', regencyId: '3328', name: 'Adiwerna' },

  // ==========================================
  // KOTA MAGELANG (3371) & SALATIGA (3373)
  // ==========================================
  { id: '337101', regencyId: '3371', name: 'Magelang Tengah' },
  { id: '337102', regencyId: '3371', name: 'Magelang Utara' },
  { id: '337103', regencyId: '3371', name: 'Magelang Selatan' },
  { id: '337301', regencyId: '3373', name: 'Sidorejo' },
  { id: '337302', regencyId: '3373', name: 'Tingkir' },

  // ==========================================
  // JAKARTA SELATAN (3171) & PUSAT (3173)
  // ==========================================
  { id: '317101', regencyId: '3171', name: 'Kebayoran Baru' },
  { id: '317102', regencyId: '3171', name: 'Kebayoran Lama' },
  { id: '317103', regencyId: '3171', name: 'Cilandak' },
  { id: '317104', regencyId: '3171', name: 'Setiabudi' },
  { id: '317107', regencyId: '3171', name: 'Mampang Prapatan' },
  { id: '317108', regencyId: '3171', name: 'Pasar Minggu' },
  { id: '317109', regencyId: '3171', name: 'Tebet' },
  { id: '317301', regencyId: '3173', name: 'Gambir' },
  { id: '317302', regencyId: '3173', name: 'Tanah Abang' },
  { id: '317303', regencyId: '3173', name: 'Menteng' },

  // ==========================================
  // KOTA BANDUNG (3273) & BEKASI (3275)
  // ==========================================
  { id: '327301', regencyId: '3273', name: 'Coblong' },
  { id: '327302', regencyId: '3273', name: 'Sukajadi' },
  { id: '327310', regencyId: '3273', name: 'Sumur Bandung' },
  { id: '327501', regencyId: '3275', name: 'Bekasi Timur' },
  { id: '327502', regencyId: '3275', name: 'Bekasi Barat' },
  { id: '327503', regencyId: '3275', name: 'Bekasi Selatan' },

  // ==========================================
  // KOTA SURABAYA (3578)
  // ==========================================
  { id: '357801', regencyId: '3578', name: 'Genteng' },
  { id: '357802', regencyId: '3578', name: 'Tegalsari' },
  { id: '357803', regencyId: '3578', name: 'Gubeng' },
  { id: '357804', regencyId: '3578', name: 'Rungkut' },

  // ==========================================
  // KOTA MEDAN (1271) & DENPASAR (5171)
  // ==========================================
  { id: '127101', regencyId: '1271', name: 'Medan Kota' },
  { id: '127103', regencyId: '1271', name: 'Medan Barat' },
  { id: '517101', regencyId: '5171', name: 'Denpasar Selatan' },
  { id: '517102', regencyId: '5171', name: 'Denpasar Barat' }
];

// 4. KELURAHAN / DESA & KODE POS
export const VILLAGES: Village[] = [
  // ==========================================
  // KOTA SEMARANG
  // ==========================================
  { id: '3374011001', districtId: '337401', name: 'Miroto', postalCode: '50134' },
  { id: '3374011002', districtId: '337401', name: 'Sekayu', postalCode: '50132' },
  { id: '3374011003', districtId: '337401', name: 'Pekunden', postalCode: '50134' },
  { id: '3374021001', districtId: '337402', name: 'Krobokan', postalCode: '50141' },
  { id: '3374021002', districtId: '337402', name: 'Bojongsalaman', postalCode: '50141' },
  { id: '3374061001', districtId: '337406', name: 'Gajahmungkur', postalCode: '50232' },
  { id: '3374061002', districtId: '337406', name: 'Bendan Ngisor', postalCode: '50233' },
  { id: '3374071001', districtId: '337407', name: 'Banyumanik', postalCode: '50264' },
  { id: '3374071002', districtId: '337407', name: 'Srondol Wetan', postalCode: '50263' },
  { id: '3374111001', districtId: '337411', name: 'Tembalang', postalCode: '50275' },

  // ==========================================
  // KOTA SURAKARTA / SOLO
  // ==========================================
  { id: '3372011001', districtId: '337201', name: 'Laweyan', postalCode: '57148' },
  { id: '3372011002', districtId: '337201', name: 'Purwosari', postalCode: '57142' },
  { id: '3372011003', districtId: '337201', name: 'Sondakan', postalCode: '57147' },
  { id: '3372041001', districtId: '337204', name: 'Jebres', postalCode: '57126' },
  { id: '3372041002', districtId: '337204', name: 'Mojosongo', postalCode: '57127' },
  { id: '3372051001', districtId: '337205', name: 'Banjarsari', postalCode: '57139' },
  { id: '3372051002', districtId: '337205', name: 'Manahan', postalCode: '57139' },

  // ==========================================
  // KAB. BANYUMAS (PURWOKERTO)
  // ==========================================
  { id: '3302011001', districtId: '330201', name: 'Purwokerto Wetan', postalCode: '53111' },
  { id: '3302011002', districtId: '330201', name: 'Purwokerto Lor', postalCode: '53114' },
  { id: '3302011003', districtId: '330201', name: 'Kranji', postalCode: '53116' },
  { id: '3302011004', districtId: '330201', name: 'Sokanegara', postalCode: '53115' },
  { id: '3302021001', districtId: '330202', name: 'Rejasari', postalCode: '53132' },
  { id: '3302021002', districtId: '330202', name: 'Bantarsoka', postalCode: '53133' },
  { id: '3302031001', districtId: '330203', name: 'Berkoh', postalCode: '53146' },
  { id: '3302031002', districtId: '330203', name: 'Karangpucung', postalCode: '53142' },
  { id: '3302041001', districtId: '330204', name: 'Bancarkembar', postalCode: '53121' },
  { id: '3302041002', districtId: '330204', name: 'Grendeng', postalCode: '53122' },
  { id: '3302051001', districtId: '330205', name: 'Sokaraja Kulon', postalCode: '53181' },
  { id: '3302061001', districtId: '330206', name: 'Baturraden', postalCode: '53151' },

  // ==========================================
  // KAB. CILACAP
  // ==========================================
  { id: '3301011001', districtId: '330101', name: 'Cilacap', postalCode: '53211' },
  { id: '3301011002', districtId: '330101', name: 'Sidakaya', postalCode: '53212' },
  { id: '3301021001', districtId: '330102', name: 'Sidanegara', postalCode: '53223' },
  { id: '3301031001', districtId: '330103', name: 'Gumilir', postalCode: '53231' },

  // ==========================================
  // KAB. KUDUS
  // ==========================================
  { id: '3319011001', districtId: '331901', name: 'Demaan', postalCode: '59313' },
  { id: '3319011002', districtId: '331901', name: 'Kramat', postalCode: '59312' },
  { id: '3319021001', districtId: '331902', name: 'Jati Kulon', postalCode: '59347' },

  // ==========================================
  // KAB. SUKOHARJO
  // ==========================================
  { id: '3311021001', districtId: '331102', name: 'Kartasura', postalCode: '57169' },
  { id: '3311021002', districtId: '331102', name: 'Ngadirejo', postalCode: '57163' },
  { id: '3311031001', districtId: '331103', name: 'Solo Baru (Madegondo)', postalCode: '57552' },

  // ==========================================
  // DKI JAKARTA
  // ==========================================
  { id: '3171011001', districtId: '317101', name: 'Senayan', postalCode: '12190' },
  { id: '3171011002', districtId: '317101', name: 'Melawai', postalCode: '12160' },
  { id: '3171011003', districtId: '317101', name: 'Kramat Pela', postalCode: '12130' },
  { id: '3171041001', districtId: '317104', name: 'Setiabudi', postalCode: '12910' },
  { id: '3171041004', districtId: '317104', name: 'Kuningan Timur', postalCode: '12950' },
  { id: '3173021001', districtId: '317302', name: 'Kebon Kacang', postalCode: '10240' },
  { id: '3173021002', districtId: '317302', name: 'Kampung Bali', postalCode: '10250' },

  // ==========================================
  // KOTA BANDUNG & SURABAYA
  // ==========================================
  { id: '3273011001', districtId: '327301', name: 'Dago', postalCode: '40135' },
  { id: '3273011002', districtId: '327301', name: 'Lebak Siliwangi', postalCode: '40132' },
  { id: '3578011001', districtId: '357801', name: 'Embong Kaliasin', postalCode: '60271' },
  { id: '3578011002', districtId: '357801', name: 'Ketabang', postalCode: '60272' }
];

export const getProvinces = (): Province[] => {
  return PROVINCES;
};

export const getRegenciesByProvince = (provinceId: string): Regency[] => {
  if (!provinceId) return [];
  return REGENCIES.filter((r) => r.provinceId === provinceId);
};

export const getDistrictsByRegency = (regencyId: string): District[] => {
  if (!regencyId) return [];
  return DISTRICTS.filter((d) => d.regencyId === regencyId);
};

export const getVillagesByDistrict = (districtId: string): Village[] => {
  if (!districtId) return [];
  return VILLAGES.filter((v) => v.districtId === districtId);
};
