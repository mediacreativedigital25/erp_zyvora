/**
 * Zyvora ERP 1.0.0 — Indonesia Administrative Region Service
 * 
 * Standard Kemendagri / BPS 4-Tier Hierarchy:
 * 1. Provinsi (Province)
 * 2. Kabupaten / Kota (Regency / City)
 * 3. Kecamatan (District)
 * 4. Kelurahan / Desa (Village / Sub-district) & Kode Pos
 * 
 * Features:
 * - Hybrid: Instant local fallback (src/data/indonesiaRegions.ts) + on-demand lazy API fetching
 * - Resilient in-memory caching to avoid duplicate network requests
 * - Postal code recommendation
 * - Backward-compatible ID & Name resolver for existing tenant data
 */

import {
  PROVINCES,
  REGENCIES,
  DISTRICTS,
  VILLAGES,
  Province,
  Regency,
  District,
  Village
} from '../data/indonesiaRegions';

export interface RegionItem {
  id: string;
  name: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export const SUPPORTED_COUNTRIES = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'SG', name: 'Singapura' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Filipina' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Jepang' },
  { code: 'CN', name: 'Tiongkok' },
  { code: 'US', name: 'Amerika Serikat' }
];

export class IndonesiaRegionService {
  private static cacheRegencies = new Map<string, RegionItem[]>();
  private static cacheDistricts = new Map<string, RegionItem[]>();
  private static cacheVillages = new Map<string, RegionItem[]>();

  /**
   * Format Kemendagri uppercase strings to neat Title Case
   * (e.g. "KOTA JAKARTA SELATAN" -> "Kota Jakarta Selatan")
   */
  static formatTitleCase(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map((word) => {
        if (!word) return '';
        // Preserve common acronyms
        if (word === 'dki' || word === 'di') return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  /**
   * 1. Get all 38 official Provinces
   */
  static getProvinces(): Province[] {
    return PROVINCES;
  }

  /**
   * 2. Get Regencies / Cities by Province ID
   */
  static async getRegencies(provinceId: string): Promise<RegionItem[]> {
    if (!provinceId) return [];

    if (this.cacheRegencies.has(provinceId)) {
      return this.cacheRegencies.get(provinceId)!;
    }

    // Baseline from local master
    const local = REGENCIES.filter((r) => r.provinceId === provinceId).map((r) => ({
      id: r.id,
      name: r.name
    }));

    // Try fetching from public Kemendagri open endpoint (Direct Cloudflare HTTPS first, github.io as secondary)
    const endpoints = [
      `https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`,
      `https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provinceId}.json`
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const remote: Array<{ id: string; name: string }> = await res.json();
          const mergedMap = new Map<string, RegionItem>();

          remote.forEach((item) => {
            mergedMap.set(item.id, {
              id: item.id,
              name: this.formatTitleCase(item.name)
            });
          });

          // Overlay local entries for enhanced naming
          local.forEach((item) => {
            mergedMap.set(item.id, item);
          });

          const result = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
          this.cacheRegencies.set(provinceId, result);
          return result;
        }
      } catch {
        // Try next endpoint or local
      }
    }

    const fallback = local.sort((a, b) => a.name.localeCompare(b.name));
    this.cacheRegencies.set(provinceId, fallback);
    return fallback;
  }

  /**
   * 3. Get Districts (Kecamatan) by Regency ID
   */
  static async getDistricts(regencyId: string): Promise<RegionItem[]> {
    if (!regencyId) return [];

    if (this.cacheDistricts.has(regencyId)) {
      return this.cacheDistricts.get(regencyId)!;
    }

    // Local baseline
    const local = DISTRICTS.filter((d) => d.regencyId === regencyId).map((d) => ({
      id: d.id,
      name: d.name
    }));

    const endpoints = [
      `https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regencyId}.json`,
      `https://emsifa.github.io/api-wilayah-indonesia/api/districts/${regencyId}.json`
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const remote: Array<{ id: string; name: string }> = await res.json();
          const mergedMap = new Map<string, RegionItem>();

          remote.forEach((item) => {
            mergedMap.set(item.id, {
              id: item.id,
              name: this.formatTitleCase(item.name)
            });
          });

          local.forEach((item) => {
            const foundRemote = remote.find(
              (r) => r.name.toLowerCase() === item.name.toLowerCase()
            );
            if (foundRemote) {
              mergedMap.set(foundRemote.id, { id: foundRemote.id, name: item.name });
            } else {
              mergedMap.set(item.id, item);
            }
          });

          const result = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
          this.cacheDistricts.set(regencyId, result);
          return result;
        }
      } catch {
        // Try next
      }
    }

    const fallback = local.sort((a, b) => a.name.localeCompare(b.name));
    this.cacheDistricts.set(regencyId, fallback);
    return fallback;
  }

  /**
   * 4. Get Villages / Kelurahan / Desa by District ID
   */
  static async getVillages(districtId: string): Promise<RegionItem[]> {
    if (!districtId) return [];

    if (this.cacheVillages.has(districtId)) {
      return this.cacheVillages.get(districtId)!;
    }

    // Local baseline
    const local = VILLAGES.filter((v) => v.districtId === districtId).map((v) => {
      const coords = this.lookupCoordinates(v.name);
      return {
        id: v.id,
        name: v.name,
        postalCode: v.postalCode,
        latitude: coords?.latitude,
        longitude: coords?.longitude
      };
    });

    const endpoints = [
      `https://www.emsifa.com/api-wilayah-indonesia/api/villages/${districtId}.json`,
      `https://emsifa.github.io/api-wilayah-indonesia/api/villages/${districtId}.json`
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const remote: Array<{ id: string; name: string }> = await res.json();
          const mergedMap = new Map<string, RegionItem>();

          remote.forEach((item) => {
            const formattedName = this.formatTitleCase(item.name);
            const localMatch = local.find(
              (l) => l.name.toLowerCase() === formattedName.toLowerCase() || l.name.toLowerCase() === item.name.toLowerCase()
            );
            const postalCode = localMatch?.postalCode || this.lookupPostalCode(formattedName);
            const coords = localMatch?.latitude !== undefined
              ? { latitude: localMatch.latitude, longitude: localMatch.longitude! }
              : this.lookupCoordinates(formattedName);

            mergedMap.set(item.id, {
              id: item.id,
              name: formattedName,
              postalCode,
              latitude: coords?.latitude,
              longitude: coords?.longitude
            });
          });

          local.forEach((item) => {
            const match = remote.find((r) => r.name.toLowerCase() === item.name.toLowerCase());
            if (match) {
              mergedMap.set(match.id, {
                id: match.id,
                name: item.name,
                postalCode: item.postalCode,
                latitude: item.latitude,
                longitude: item.longitude
              });
            } else {
              mergedMap.set(item.id, item);
            }
          });

          const result = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
          this.cacheVillages.set(districtId, result);
          return result;
        }
      } catch {
        // Try next
      }
    }

    const fallback = local.sort((a, b) => a.name.localeCompare(b.name));
    this.cacheVillages.set(districtId, fallback);
    return fallback;
  }

  /**
   * Internal postal code dictionary lookup
   */
  private static lookupPostalCode(name: string): string {
    if (!name) return '';
    const clean = name.toLowerCase().replace(/^(kelurahan|desa|kel\.|ds\.)\s+/i, '').trim();

    const DICT: Record<string, string> = {
      // Jakarta Selatan & Pusat
      senayan: '12190',
      melawai: '12160',
      'kramat pela': '12130',
      selong: '12110',
      'rawa barat': '12180',
      petogogan: '12170',
      pulo: '12160',
      'cipete utara': '12150',
      'cipete selatan': '12410',
      'gandaria utara': '12140',
      'gandaria selatan': '12420',
      'cilandak barat': '12430',
      'lebak bulus': '12440',
      'pondok labu': '12450',
      'pondok pinang': '12310',
      setiabudi: '12910',
      karet: '12920',
      'karet semanggi': '12930',
      'karet kuningan': '12940',
      'kuningan timur': '12950',
      'kuningan barat': '12710',
      'menteng atas': '12960',
      'pasar manggis': '12970',
      guntur: '12980',
      'tebet barat': '12810',
      'tebet timur': '12820',
      'kebon baru': '12830',
      'bukit duri': '12840',
      manggarai: '12850',
      'manggarai selatan': '12860',
      'mampang prapatan': '12790',
      'pela mampang': '12720',
      bangka: '12730',
      kalibata: '12740',
      pancoran: '12780',
      'pasar minggu': '12520',
      kebagusan: '12520',
      ragunan: '12550',
      jagakarsa: '12620',
      ciganjur: '12630',
      cipedak: '12630',
      'lenteng agung': '12610',
      'srengseng sawah': '12640',
      gambir: '10110',
      'bendungan hilir': '10210',
      'karet tengsin': '10220',
      'kebon melati': '10230',
      'kebon kacang': '10240',
      'kampung bali': '10250',
      petamburan: '10260',
      gelora: '10270',
      menteng: '10310',
      pegangsaan: '10320',
      cikini: '10330',
      gondangdia: '10350',
      senen: '10410',
      kwitang: '10420',
      'cempaka putih timur': '10510',
      'cempaka putih barat': '10520',
      kemayoran: '10620',

      // Jakarta Barat, Timur, Utara
      tomang: '11440',
      grogol: '11450',
      'tanjung duren utara': '11470',
      'tanjung duren selatan': '11470',
      palmerah: '11480',
      slipi: '11410',
      'kembangan utara': '11610',
      'kembangan selatan': '11610',
      'meruya utara': '11620',
      'meruya selatan': '11650',
      'kebon jeruk': '11530',
      rawamangun: '13220',
      'kelapa gading timur': '14240',
      'kelapa gading barat': '14240',
      pluit: '14450',

      // Semarang, Solo, Jawa Tengah
      miroto: '50134',
      sekayu: '50132',
      pekunden: '50134',
      krobokan: '50141',
      bojongsalaman: '50141',
      gajahmungkur: '50232',
      'bendan ngisor': '50233',
      banyumanik: '50264',
      'srondol wetan': '50263',
      tembalang: '50275',
      ngaliyan: '50181',
      laweyan: '57148',
      purwosari: '57142',
      sondakan: '57147',
      jebres: '57126',
      mojosongo: '57127',
      banjarsari: '57139',
      manahan: '57139',
      'purwokerto wetan': '53111',
      'purwokerto lor': '53114',
      kranji: '53116',
      sokanegara: '53115',
      rejasari: '53132',
      bantarsoka: '53133',
      berkoh: '53146',
      karangpucung: '53142',
      bancarkembar: '53121',
      grendeng: '53122',
      'sokaraja kulon': '53181',
      baturraden: '53151',
      cilacap: '53211',
      sidakaya: '53212',
      sidanegara: '53223',
      gumilir: '53231',
      demaan: '59313',
      kartasura: '57169',
      'madegondo': '57552',
      'solo baru': '57552',

      // Jawa Barat (Bandung Raya, Nagreg, Cimahi, Bogor, Bekasi, Tangerang)
      binong: '40275',
      gumuruh: '40275',
      maleer: '40274',
      kebongedang: '40274',
      'kebon gedang': '40274',
      kacapiring: '40271',
      kebonwaru: '40272',
      samoja: '40273',
      cibangkong: '40273',
      batununggal: '40266',
      dago: '40135',
      'lebak siliwangi': '40132',
      lebakgede: '40132',
      'sadang serang': '40133',
      sadangserang: '40133',
      sekeloa: '40134',
      cipaganti: '40131',
      sukajadi: '40162',
      sukawarna: '40164',
      pasteur: '40161',
      sukagalih: '40163',
      sukabungah: '40162',
      gegerkalong: '40153',
      sarijadi: '40151',
      sukarasa: '40152',
      tamansari: '40116',
      cihapit: '40114',
      citarum: '40115',
      braga: '40111',
      'kebon pisang': '40112',
      merdeka: '40113',
      'babakan ciamis': '40117',
      malabar: '40262',
      burangrang: '40262',
      cihaurgeulis: '40122',
      turangga: '40264',
      'lingkar selatan': '40263',
      paledang: '40261',
      cikawao: '40261',
      balonggede: '40251',
      pasirluyu: '40254',
      cijerah: '40213',
      ciseureuh: '40255',
      antapani: '40291',
      'antapani tengah': '40291',
      'antapani kidul': '40291',
      'antapani wetan': '40291',
      arcamanik: '40293',
      cisaranten: '40293',
      citaman: '40215',
      nagreg: '40215',
      mandalawangi: '40215',
      ganjarsabar: '40215',
      cibiru: '40614',
      cileunyi: '40622',
      jatinangor: '45363',
      lembang: '40391',
      padalarang: '40553',
      cimahi: '40511',
      baros: '40521',

      // Banten & Jatim
      'embong kaliasin': '60271',
      ketabang: '60272',
      tegalsari: '60262',
      gubeng: '60281',
      rungkut: '60293'
    };

    return DICT[clean] || '';
  }

  private static onlinePostalCodeCache = new Map<string, string>();

  /**
   * Asynchronously queries online Postal Code lookup endpoint
   * (kodepos.vercel.app / fallback) and caches the result.
   */
  static async fetchPostalCodeOnline(
    villageName?: string,
    districtName?: string,
    regencyName?: string
  ): Promise<string> {
    if (!villageName && !districtName) return '';

    const cacheKey = [villageName, districtName, regencyName]
      .filter(Boolean)
      .map((s) => s!.toLowerCase().trim())
      .join('::');

    if (this.onlinePostalCodeCache.has(cacheKey)) {
      return this.onlinePostalCodeCache.get(cacheKey)!;
    }

    // Check synchronous lookup first
    const syncSuggested = this.suggestPostalCode(undefined, villageName, undefined, districtName, regencyName);
    if (syncSuggested) {
      this.onlinePostalCodeCache.set(cacheKey, syncSuggested);
      return syncSuggested;
    }

    const cleanV = (villageName || '').trim();
    const cleanD = (districtName || '').trim();

    const queries = [
      cleanV && cleanD ? `${cleanV} ${cleanD}` : '',
      cleanD || '',
      cleanV || ''
    ].filter(Boolean);

    for (const q of queries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`https://kodepos.vercel.app/search/?q=${encodeURIComponent(q)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const data: Array<{ village?: string; district?: string; code?: number | string }> = json.data || [];
          if (data.length > 0) {
            let match = data.find(
              (d) =>
                cleanV &&
                cleanD &&
                d.village?.toLowerCase() === cleanV.toLowerCase() &&
                d.district?.toLowerCase() === cleanD.toLowerCase()
            );
            if (!match && cleanV) {
              match = data.find((d) => d.village?.toLowerCase() === cleanV.toLowerCase());
            }
            if (!match && cleanD) {
              match = data.find((d) => d.district?.toLowerCase() === cleanD.toLowerCase());
            }
            if (match && match.code) {
              const codeStr = String(match.code).padStart(5, '0');
              this.onlinePostalCodeCache.set(cacheKey, codeStr);
              return codeStr;
            }
          }
        }
      } catch {
        // Continue to next query attempt
      }
    }

    return '';
  }

  /**
   * 5. Suggest Postal Code based on Village and/or District
   */
  static suggestPostalCode(
    villageId?: string,
    villageName?: string,
    districtId?: string,
    districtName?: string,
    regencyName?: string
  ): string {
    // 1. Direct match by villageId in local VILLAGES
    if (villageId) {
      const byId = VILLAGES.find((v) => v.id === villageId);
      if (byId && byId.postalCode) return byId.postalCode;
    }

    // 2. Match by villageName in local VILLAGES
    if (villageName) {
      const cleanName = villageName.trim().toLowerCase();
      const byName = VILLAGES.find((v) => v.name.toLowerCase() === cleanName);
      if (byName && byName.postalCode) return byName.postalCode;

      // Check internal dictionary
      const fromDict = this.lookupPostalCode(villageName);
      if (fromDict) return fromDict;
    }

    // 3. Fallback: check cache for village with postal code
    if (districtId && this.cacheVillages.has(districtId)) {
      const list = this.cacheVillages.get(districtId)!;
      if (villageId) {
        const item = list.find((v) => v.id === villageId);
        if (item?.postalCode) return item.postalCode;
      }
      if (villageName) {
        const cleanName = villageName.trim().toLowerCase();
        const item = list.find((v) => v.name.toLowerCase() === cleanName);
        if (item?.postalCode) return item.postalCode;
      }
    }

    // 4. District name heuristics fallback
    if (districtName) {
      const cleanDistrict = districtName.trim().toLowerCase();
      if (cleanDistrict === 'batununggal') return '40275';
      if (cleanDistrict === 'lengkong') return '40262';
      if (cleanDistrict === 'coblong') return '40135';
      if (cleanDistrict === 'sukajadi') return '40162';
      if (cleanDistrict === 'bandung wetan') return '40115';
      if (cleanDistrict === 'sumur bandung') return '40111';
      if (cleanDistrict === 'regol') return '40251';
      if (cleanDistrict === 'antapani') return '40291';
      if (cleanDistrict === 'arcamanik') return '40293';
      if (cleanDistrict === 'nagreg') return '40215';
      if (cleanDistrict === 'kebayoran baru') return '12190';
      if (cleanDistrict === 'setiabudi') return '12910';
      if (cleanDistrict === 'menteng') return '10310';
      if (cleanDistrict === 'gambir') return '10110';
      if (cleanDistrict === 'semarang tengah') return '50134';
      if (cleanDistrict === 'laweyan') return '57148';
      if (cleanDistrict === 'gubeng') return '60281';
      if (cleanDistrict === 'tegalsari') return '60262';
    }

    return '';
  }

  /**
   * Fast coordinate lookup for known Indonesian administrative areas (Kelurahan, Kecamatan, Kota)
   */
  static lookupCoordinates(
    villageName?: string,
    districtName?: string,
    regencyName?: string
  ): { latitude: number; longitude: number } | null {
    const v = villageName ? villageName.toLowerCase().replace(/^(kelurahan|desa|kel\.|ds\.)\s+/i, '').trim() : '';
    const d = districtName ? districtName.toLowerCase().replace(/^(kecamatan|kec\.)\s+/i, '').trim() : '';
    const r = regencyName ? regencyName.toLowerCase().replace(/^(kota|kabupaten|kab\.)\s+/i, '').trim() : '';

    // 1. Village match (highest precision)
    if (v) {
      const VILLAGE_COORDS: Record<string, [number, number]> = {
        // Bandung
        pasteur: [-6.8909, 107.5995],
        sukabungah: [-6.8912, 107.5941],
        sukagalih: [-6.8863, 107.5892],
        sukawarna: [-6.8841, 107.5855],
        binong: [-6.9388, 107.6364],
        maleer: [-6.9324, 107.6341],
        samoja: [-6.9248, 107.6256],
        kacapiring: [-6.9212, 107.6288],
        kebonwaru: [-6.9189, 107.6345],
        gumuruh: [-6.9351, 107.6392],
        cibangkong: [-6.9288, 107.6305],
        dago: [-6.8812, 107.6181],
        sarijadi: [-6.8772, 107.5841],
        isola: [-6.8601, 107.5932],
        ledeng: [-6.8532, 107.5978],
        cipaganti: [-6.8942, 107.6038],
        cihampelas: [-6.8992, 107.6042],
        merdeka: [-6.9123, 107.6112],
        braga: [-6.9175, 107.6098],
        'kebon pisang': [-6.9198, 107.6145],
        babakanciamis: [-6.9142, 107.6074],
        burangrang: [-6.9265, 107.6189],
        malabar: [-6.9281, 107.6212],
        cijerah: [-6.9221, 107.5623],
        antapani: [-6.9182, 107.6588],
        // Jakarta
        senayan: [-6.2255, 106.808],
        melawai: [-6.2443, 106.8012],
        selong: [-6.2361, 106.8055],
        gandaria: [-6.2512, 106.7865],
        menteng: [-6.1963, 106.8327],
        kuningan: [-6.2297, 106.8272],
        setiabudi: [-6.2115, 106.8291],
        gambir: [-6.1762, 106.8306],
        kemayoran: [-6.1601, 106.8552]
      };
      if (VILLAGE_COORDS[v]) {
        return { latitude: VILLAGE_COORDS[v][0], longitude: VILLAGE_COORDS[v][1] };
      }
    }

    // 2. District match (medium precision)
    if (d) {
      const DISTRICT_COORDS: Record<string, [number, number]> = {
        batununggal: [-6.9485, 107.6322],
        sukajadi: [-6.885, 107.593],
        coblong: [-6.882, 107.615],
        'sumur bandung': [-6.918, 107.611],
        lengkong: [-6.932, 107.622],
        regol: [-6.935, 107.609],
        astanaanyar: [-6.936, 107.598],
        'astana anyar': [-6.936, 107.598],
        cicendo: [-6.908, 107.601],
        sukasari: [-6.868, 107.587],
        cibeunying: [-6.899, 107.633],
        buahbatu: [-6.945, 107.653],
        'kebayoran baru': [-6.244, 106.801],
        'kebayoran lama': [-6.241, 106.778],
        cilandak: [-6.292, 106.803],
        tebet: [-6.231, 106.858],
        menteng: [-6.196, 106.833]
      };
      if (DISTRICT_COORDS[d]) {
        return { latitude: DISTRICT_COORDS[d][0], longitude: DISTRICT_COORDS[d][1] };
      }
    }

    // 3. Regency / City match
    if (r) {
      const REGENCY_COORDS: Record<string, [number, number]> = {
        bandung: [-6.9175, 107.6191],
        'kota bandung': [-6.9175, 107.6191],
        cimahi: [-6.8722, 107.542],
        'kabupaten bandung': [-7.0253, 107.5186],
        'bandung barat': [-6.8378, 107.4812],
        'jakarta selatan': [-6.2615, 106.8106],
        'jakarta pusat': [-6.1805, 106.8284],
        'jakarta barat': [-6.1674, 106.7637],
        'jakarta timur': [-6.225, 106.9004],
        'jakarta utara': [-6.1384, 106.864],
        bogor: [-6.5971, 106.806],
        depok: [-6.4025, 106.7942],
        tangerang: [-6.1783, 106.6319],
        bekasi: [-6.2383, 106.9756],
        surabaya: [-7.2575, 112.7521],
        semarang: [-6.9667, 110.4167],
        yogyakarta: [-7.7956, 110.3695],
        denpasar: [-8.6705, 115.2126]
      };
      if (REGENCY_COORDS[r]) {
        return { latitude: REGENCY_COORDS[r][0], longitude: REGENCY_COORDS[r][1] };
      }
    }

    return null;
  }

  // =========================================================================
  // EMSIFA API WILAYAH INDONESIA V2 — PLAYGROUND INTEGRATION
  // =========================================================================
  public static readonly EMSIFA_V2_BASE_URL = 'https://www.emsifa.com/api-wilayah-indonesia/v2';
  private static v2Cache = new Map<string, ApiCallResult<unknown>>();

  /**
   * Generic Emsifa v2 HTTP Request executor with latency measurement,
   * in-memory caching, and robust error handling.
   */
  static async executeV2Request<T = unknown>(
    endpoint: string,
    forceRefresh = false
  ): Promise<ApiCallResult<T>> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.EMSIFA_V2_BASE_URL}${cleanEndpoint}`;
    const method = 'GET';

    if (!forceRefresh && this.v2Cache.has(url)) {
      return this.v2Cache.get(url)! as ApiCallResult<T>;
    }

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const durationMs = Math.max(1, Math.round(endTime - startTime));
      const rawText = await response.text();

      if (!response.ok) {
        const errorResult: ApiCallResult<T> = {
          url,
          method,
          status: response.status,
          statusText: response.statusText || (response.status === 404 ? 'Not Found' : 'Error'),
          durationMs,
          ok: false,
          data: null,
          rawText,
          error: `HTTP ${response.status}: ${response.statusText || 'Gagal memuat data dari API'}`
        };
        // Don't cache 5xx, but we can temporarily hold 404
        if (response.status === 404) {
          this.v2Cache.set(url, errorResult);
        }
        return errorResult;
      }

      let parsed: unknown = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        return {
          url,
          method,
          status: response.status,
          statusText: 'Parse Error',
          durationMs,
          ok: false,
          data: null,
          rawText,
          error: `Format JSON tidak valid: ${parseErr instanceof Error ? parseErr.message : 'Unknown'}`
        };
      }

      const resObj = parsed as { data?: T; meta?: Record<string, unknown> };
      const extractedData = resObj && typeof resObj === 'object' && 'data' in resObj
        ? (resObj.data as T)
        : (parsed as T);
      const meta = resObj && typeof resObj === 'object' && 'meta' in resObj
        ? resObj.meta
        : undefined;

      const successResult: ApiCallResult<T> = {
        url,
        method,
        status: response.status,
        statusText: response.statusText || 'OK',
        durationMs,
        ok: true,
        data: extractedData,
        meta,
        rawText
      };

      this.v2Cache.set(url, successResult);
      return successResult;
    } catch (netErr: unknown) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const durationMs = Math.max(1, Math.round(endTime - startTime));
      const isAbort = netErr instanceof Error && netErr.name === 'AbortError';

      return {
        url,
        method,
        status: 0,
        statusText: isAbort ? 'Request Timeout' : 'Network Error',
        durationMs,
        ok: false,
        data: null,
        rawText: '',
        error: isAbort
          ? 'Koneksi timeout (melebihi batas waktu 10 detik).'
          : netErr instanceof Error
          ? netErr.message
          : 'Terjadi kegagalan jaringan saat menghubungi API Emsifa.'
      };
    }
  }

  /**
   * V2: Fetch all provinces
   */
  static async fetchV2Provinces(forceRefresh = false): Promise<ApiCallResult<EmsifaV2Province[]>> {
    return this.executeV2Request<EmsifaV2Province[]>('/provinces.json', forceRefresh);
  }

  /**
   * V2: Fetch regencies by provinceId
   */
  static async fetchV2Regencies(provinceId: string, forceRefresh = false): Promise<ApiCallResult<EmsifaV2Regency[]>> {
    if (!provinceId) {
      return {
        url: `${this.EMSIFA_V2_BASE_URL}/regencies/.json`,
        method: 'GET',
        status: 400,
        statusText: 'Bad Request',
        durationMs: 0,
        ok: false,
        data: null,
        rawText: '',
        error: 'Province ID wajib diisi.'
      };
    }
    return this.executeV2Request<EmsifaV2Regency[]>(`/regencies/${provinceId}.json`, forceRefresh);
  }

  /**
   * V2: Fetch districts by regencyId
   */
  static async fetchV2Districts(regencyId: string, forceRefresh = false): Promise<ApiCallResult<EmsifaV2District[]>> {
    if (!regencyId) {
      return {
        url: `${this.EMSIFA_V2_BASE_URL}/districts/.json`,
        method: 'GET',
        status: 400,
        statusText: 'Bad Request',
        durationMs: 0,
        ok: false,
        data: null,
        rawText: '',
        error: 'Regency ID wajib diisi.'
      };
    }
    return this.executeV2Request<EmsifaV2District[]>(`/districts/${regencyId}.json`, forceRefresh);
  }

  /**
   * V2: Fetch villages by districtId
   */
  static async fetchV2Villages(districtId: string, forceRefresh = false): Promise<ApiCallResult<EmsifaV2Village[]>> {
    if (!districtId) {
      return {
        url: `${this.EMSIFA_V2_BASE_URL}/villages/.json`,
        method: 'GET',
        status: 400,
        statusText: 'Bad Request',
        durationMs: 0,
        ok: false,
        data: null,
        rawText: '',
        error: 'District ID wajib diisi.'
      };
    }
    return this.executeV2Request<EmsifaV2Village[]>(`/villages/${districtId}.json`, forceRefresh);
  }

  /**
   * V2: Fetch boundary path (polygon) for any region ID
   */
  static async fetchV2Path(regionId: string, forceRefresh = false): Promise<ApiCallResult<EmsifaV2PathData>> {
    if (!regionId) {
      return {
        url: `${this.EMSIFA_V2_BASE_URL}/paths/.json`,
        method: 'GET',
        status: 400,
        statusText: 'Bad Request',
        durationMs: 0,
        ok: false,
        data: null,
        rawText: '',
        error: 'Region ID wajib diisi untuk memeriksa path.'
      };
    }
    return this.executeV2Request<EmsifaV2PathData>(`/paths/${regionId}.json`, forceRefresh);
  }

  /**
   * V2: Search by postal code
   */
  static async fetchV2PostalCode(postalCode: string, forceRefresh = false): Promise<ApiCallResult<EmsifaV2PostalCodeResult[]>> {
    const cleanCode = postalCode.trim();
    if (!cleanCode) {
      return {
        url: `${this.EMSIFA_V2_BASE_URL}/postal-codes/.json`,
        method: 'GET',
        status: 400,
        statusText: 'Bad Request',
        durationMs: 0,
        ok: false,
        data: null,
        rawText: '',
        error: 'Kode pos wajib diisi.'
      };
    }
    return this.executeV2Request<EmsifaV2PostalCodeResult[]>(`/postal-codes/${cleanCode}.json`, forceRefresh);
  }

  /**
   * Clear V2 API memory cache
   */
  static clearV2Cache(): void {
    this.v2Cache.clear();
  }
}

export interface EmsifaV2Province {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  has_path?: boolean;
  capital?: string;
  population?: number;
  total_area?: number;
  tz?: number;
  elv?: number;
}

export interface EmsifaV2Regency {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  has_path?: boolean;
  capital?: string;
  population?: number;
  total_area?: number;
  tz?: number;
  elv?: number;
}

export interface EmsifaV2District {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  has_path?: boolean;
}

export interface EmsifaV2Village {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  has_path?: boolean;
  postal_code?: string;
}

export interface EmsifaV2PathData {
  id: string;
  // Normalized or raw path
  path: unknown;
}

export interface EmsifaV2PostalCodeResult {
  id: string;
  name: string;
  postal_code: string;
  has_path?: boolean;
  province?: { id: string; name: string };
  regency?: { id: string; name: string };
  district?: { id: string; name: string };
}

export interface ApiCallResult<T> {
  url: string;
  method: string;
  status: number;
  statusText: string;
  durationMs: number;
  ok: boolean;
  data: T | null;
  meta?: Record<string, unknown>;
  rawText: string;
  error?: string;
}

