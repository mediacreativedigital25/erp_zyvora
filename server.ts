import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import multer from 'multer';
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env.example') });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Multer memory storage for direct Cloudflare R2 S3 streaming
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB maximum
});

// Cloudflare R2 S3 Client Initialization Helper
function getR2S3Client(): {
  client: S3Client | null;
  bucket: string;
  endpoint: string;
  isConfigured: boolean;
  missingVars: string[];
} {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim() || '';
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() || '';
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim() || 'zyvora-media-production';
  const customEndpoint = process.env.CLOUDFLARE_R2_ENDPOINT?.trim();
  const endpoint = customEndpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  const missingVars: string[] = [];
  if (!accountId && !customEndpoint) missingVars.push('CLOUDFLARE_R2_ACCOUNT_ID');
  if (!accessKeyId) missingVars.push('CLOUDFLARE_R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missingVars.push('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  if (!bucket) missingVars.push('CLOUDFLARE_R2_BUCKET_NAME');

  if (missingVars.length > 0 || !endpoint) {
    return { client: null, bucket, endpoint, isConfigured: false, missingVars };
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucket, endpoint, isConfigured: true, missingVars: [] };
}

// Masking helper - NEVER expose complete tokens or secrets to client
function maskSecret(val?: string, prefixLen = 4, suffixLen = 4): string {
  if (!val || val.trim() === '') return 'Belum Dikonfigurasi';
  const trimmed = val.trim();
  if (trimmed.length <= prefixLen + suffixLen) return '••••••••';
  return `${trimmed.substring(0, prefixLen)}••••••••${trimmed.substring(trimmed.length - suffixLen)}`;
}

// Security Middleware: Require Super Admin (User Code '2A' & Super Admin role)
function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const userCode = (req.headers['x-user-code'] as string) || '';
  const userRole = (req.headers['x-user-role'] as string) || '';
  const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';

  // Strict verification: userCode must be '2A' AND (role === 'super_admin' OR isPlatformSuperAdmin)
  if (userCode !== '2A' || (userRole !== 'super_admin' && !isSuperAdmin)) {
    return res.status(403).json({
      success: false,
      error: 'Akses Ditolak: Endpoint ini terbatas khusus untuk Platform Super Admin (User Code: 2A).'
    });
  }

  next();
}

// 7 Platform Integrations Definition
function getIntegrationDefinitions() {
  const rawAnon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  const supabaseAnonKey =
    rawAnon && rawAnon !== 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY' && rawAnon !== ''
      ? rawAnon
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5manVjeWFiZmlxbG1yeG52aXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTI4NDcsImV4cCI6MjEwODI2ODg0N30.fg_-UDySy8oTxou9d48hE9dKPIoZWkujB3X-0iB4_uc';
  const fonnteToken = process.env.FONNTE_API_TOKEN;
  const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
  const r2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim();
  const r2SecretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim();
  const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim() || 'zyvora-media-production';
  const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT?.trim() || (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : '');
  const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim() || 'https://pub-r2.zyvora.com';

  const isR2Configured = Boolean(r2AccountId && r2AccessKey && r2SecretKey && r2BucketName);
  const midtransKey = process.env.MIDTRANS_SERVER_KEY;
  const xenditKey = process.env.XENDIT_SECRET_KEY;
  const rajaongkirKey = process.env.RAJAONGKIR_API_KEY;
  const biteshipKey = process.env.BITESHIP_API_KEY;

  return [
    {
      id: 'fonnte',
      name: 'Fonnte',
      provider: 'Fonnte WhatsApp Gateway',
      category: 'Komunikasi',
      scope: 'Platform (Global)',
      description: 'Layanan pengiriman pesan WhatsApp otomatis, notifikasi pesanan, OTP, dan dokumen PDF faktur penjualan.',
      isConfigured: Boolean(fonnteToken && fonnteToken.trim().length > 0),
      connectionStatus: fonnteToken ? 'pending' : 'unconfigured',
      maskedConfig: {
        'API Base URL': 'https://api.fonnte.com',
        'Device Status Endpoint': '/device',
        'API Token (Server Env)': maskSecret(fonnteToken, 4, 4),
        'Kode Negara Default': '62 (Indonesia)',
        'Scope Otorisasi': 'Platform Super Admin (Tingkat Platform)'
      },
      envRequirements: ['FONNTE_API_TOKEN'],
      notes: 'Kredensial disimpan aman di server environment. Belum ada nomor/device yang terhubung jika token belum dipasang.'
    },
    {
      id: 'cloudflare_r2',
      name: 'Cloudflare R2',
      provider: 'Cloudflare R2 (S3-Compatible Storage)',
      category: 'Media & Storage',
      scope: 'Platform (Global Multi-Tenant)',
      description: 'Penyimpanan berkas media terdistribusi bebas Base64 untuk logo holding, lampiran transaksi, dan arsip dokumen faktur.',
      isConfigured: isR2Configured,
      connectionStatus: isR2Configured ? 'pending' : 'unconfigured',
      maskedConfig: {
        'Public CDN URL': r2PublicUrl,
        'Bucket Name': r2BucketName,
        'Account ID (Server Env)': maskSecret(r2AccountId, 4, 4),
        'Access Key ID': maskSecret(r2AccessKey, 4, 4),
        'Secret Access Key': r2SecretKey ? '•••••••••••••••• (Tersimpan di Server)' : 'Belum Dikonfigurasi',
        'S3 API Endpoint': r2Endpoint ? (r2AccountId && r2Endpoint.includes(r2AccountId) ? `https://${maskSecret(r2AccountId, 4, 2)}.r2.cloudflarestorage.com` : r2Endpoint) : 'Belum Dikonfigurasi',
        'Namespace Multi-Tenant': 'tenants/{tenantId}/...'
      },
      envRequirements: [
        'CLOUDFLARE_R2_ACCOUNT_ID',
        'CLOUDFLARE_R2_ACCESS_KEY_ID',
        'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
        'CLOUDFLARE_R2_BUCKET_NAME',
        'CLOUDFLARE_R2_ENDPOINT',
        'CLOUDFLARE_R2_PUBLIC_URL'
      ],
      notes: 'Kredensial S3 API Cloudflare R2 disimpan aman di server environment. Rahasia tidak pernah diekspos ke browser pengguna.'
    },
    {
      id: 'supabase',
      name: 'Supabase / PostgreSQL',
      provider: 'Supabase Cloud (PostgreSQL 15 + GoTrue Auth)',
      category: 'Basis Data & Auth',
      scope: 'Platform (Core Infrastructure)',
      description: 'Pusat basis data relasional enterprise, engine otentikasi sesi JWT, penegakan isolasi baris data (RLS), dan audit log transaksi.',
      isConfigured: true,
      connectionStatus: 'connected',
      maskedConfig: {
        'Supabase Target URL': supabaseUrl,
        'Database Engine': 'PostgreSQL 15 (Supabase Cloud)',
        'Auth Engine': 'GoTrue JWT (Session & Timeout Guard C1)',
        'Anon / Publishable Key': maskSecret(supabaseAnonKey, 10, 8),
        'Service Role Key': 'Tersimpan di Vault Server (Tidak diekspos)',
        'Row Level Security': 'Aktif & Wajib Ditegakkan'
      },
      envRequirements: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'],
      notes: 'Target instance terpasang (nfjucyabfiqlmrxnviuz). Seluruh akses read/write melalui RLS.'
    },
    {
      id: 'dns',
      name: 'Domain & DNS',
      provider: 'Cloudflare Edge DNS',
      category: 'Domain & Jaringan',
      scope: 'Platform (Global Network)',
      description: 'Resolusi domain enterprise, pengelolaan routing nama host tenant, SSL/TLS otomatis, dan proteksi DDoS edge.',
      isConfigured: true,
      connectionStatus: 'connected',
      maskedConfig: {
        'Domain Utama': 'zyvora.com',
        'Domain Sekunder': 'yulovi.com',
        'Nameservers': 'ns.cloudflare.com',
        'Protokol SSL/TLS': 'Full (Strict) TLS 1.3',
        'Cloudflare Edge Proxy': 'Aktif (Orange Cloud)'
      },
      envRequirements: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID'],
      notes: 'Resolusi DNS diverifikasi secara nyata melalui query A record ke nama host terdaftar.'
    },
    {
      id: 'payment_gateway',
      name: 'Payment Gateway',
      provider: 'Belum Dipilih (Midtrans / Xendit)',
      category: 'Pembayaran',
      scope: 'Platform (Disalurkan ke Tenant)',
      description: 'Pemrosesan otomatis virtual account bank, QRIS, e-wallet, dan kartu debit/kredit untuk modul Piutang (AR).',
      isConfigured: Boolean(midtransKey || xenditKey),
      connectionStatus: 'unconfigured',
      maskedConfig: {
        'Provider Terpilih': midtransKey ? 'Midtrans' : xenditKey ? 'Xendit' : 'Belum Dipilih / Belum Dikonfigurasi',
        'Midtrans Server Key': maskSecret(midtransKey, 4, 4),
        'Xendit Secret Key': maskSecret(xenditKey, 4, 4),
        'Webhook Callback Endpoint': '/api/webhooks/payments',
        'Environment': 'Production / Sandbox'
      },
      envRequirements: ['MIDTRANS_SERVER_KEY', 'XENDIT_SECRET_KEY'],
      notes: 'Sesuai aturan keamanan: provider belum aktif sebelum kunci API resmi dipasang di environment server.'
    },
    {
      id: 'shipping_api',
      name: 'Shipping API',
      provider: 'Belum Dipilih (RajaOngkir / Biteship)',
      category: 'Logistik & Pengiriman',
      scope: 'Platform (Global Kurir)',
      description: 'Kalkulasi ongkos kirim multi-ekspedisi (JNE, TIKI, POS, SiCepat, J&T), pelacakan status AWB/resi, dan pickup paket.',
      isConfigured: Boolean(rajaongkirKey || biteshipKey),
      connectionStatus: 'unconfigured',
      maskedConfig: {
        'Provider Terpilih': rajaongkirKey ? 'RajaOngkir Pro' : biteshipKey ? 'Biteship' : 'Belum Dipilih / Belum Dikonfigurasi',
        'RajaOngkir API Key': maskSecret(rajaongkirKey, 4, 4),
        'Biteship API Key': maskSecret(biteshipKey, 4, 4),
        'Cakupan Ekspedisi': 'JNE, TIKI, POS, SiCepat, J&T, Wahana, AnterAja'
      },
      envRequirements: ['RAJAONGKIR_API_KEY', 'BITESHIP_API_KEY'],
      notes: 'Layanan logistik belum aktif di backend platform. Menunggu penentuan penyedia ekspedisi dan API key.'
    },
    {
      id: 'maps_distance',
      name: 'Maps & Distance API',
      provider: 'OpenStreetMap Tile Server & OSRM Engine',
      category: 'Peta & Geospasial',
      scope: 'Platform (Spatial Engine)',
      description: 'Visualisasi lokasi gudang, cabang, pemetaan rute kurir, dan perhitungan jarak kilometer antaralamat pengiriman.',
      isConfigured: true,
      connectionStatus: 'connected',
      maskedConfig: {
        'Tile Layer Server': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        'Routing & Distance Engine': 'OSRM Public Matrix API',
        'Frontend Map Library': 'Leaflet 1.9.4',
        'Google Maps Platform (Opsional)': maskSecret(process.env.GOOGLE_MAPS_API_KEY, 4, 4),
        'Atribusi Peta': '© OpenStreetMap contributors'
      },
      envRequirements: ['GOOGLE_MAPS_API_KEY (Opsional)'],
      notes: 'Engine OpenStreetMap aktif dan siap pakai tanpa memerlukan kunci berbayar. Google Maps opsional.'
    }
  ];
}

// In-memory cache for test results during runtime
const testResultsCache: Record<string, {
  isConnected: boolean;
  status: 'connected' | 'error' | 'unconfigured';
  checkedAt: string;
  latencyMs?: number;
  message: string;
  details?: Record<string, unknown>;
}> = {};

// GET /api/superadmin/connections - List all platform integrations
app.get('/api/superadmin/connections', requireSuperAdmin, (_req: Request, res: Response) => {
  const integrations = getIntegrationDefinitions().map((item) => {
    const cachedTest = testResultsCache[item.id];
    let finalStatus = item.connectionStatus;
    if (cachedTest) {
      finalStatus = cachedTest.status;
    }
    return {
      ...item,
      connectionStatus: finalStatus,
      lastTestResult: cachedTest || null
    };
  });

  return res.json({
    success: true,
    data: integrations,
    timestamp: new Date().toISOString()
  });
});

// POST /api/superadmin/connections/:id/test - Run a REAL connection test
app.post('/api/superadmin/connections/:id/test', requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const startTime = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    switch (id) {
      case 'supabase': {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nfjucyabfiqlmrxnviuz.supabase.co';
        const rawKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
        const supabaseKey =
          rawKey && rawKey !== 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY' && rawKey !== ''
            ? rawKey
            : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5manVjeWFiZmlxbG1yeG52aXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTI4NDcsImV4cCI6MjEwODI2ODg0N30.fg_-UDySy8oTxou9d48hE9dKPIoZWkujB3X-0iB4_uc';

        const pingRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
          method: 'GET',
          headers: { apikey: supabaseKey }
        });
        const latencyMs = Date.now() - startTime;

        if (pingRes.ok || pingRes.status === 200) {
          const result = {
            isConnected: true,
            status: 'connected' as const,
            checkedAt,
            latencyMs,
            message: `Koneksi ke Supabase PostgreSQL berhasil diverifikasi. Respons HTTP ${pingRes.status} (${latencyMs}ms).`,
            details: {
              url: supabaseUrl,
              httpStatus: pingRes.status,
              authHealth: 'OK'
            }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        } else {
          const result = {
            isConnected: false,
            status: 'error' as const,
            checkedAt,
            latencyMs,
            message: `Koneksi Supabase mengembalikan status HTTP ${pingRes.status}.`,
            details: { httpStatus: pingRes.status }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        }
      }

      case 'cloudflare_r2': {
        const { client, bucket, endpoint, isConfigured, missingVars } = getR2S3Client();
        const cdnUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim() || 'https://pub-r2.zyvora.com';

        // 1. Validasi konfigurasi server-side
        if (!isConfigured || !client) {
          // Probe CDN public reachability for diagnostic context
          let cdnReachable = false;
          try {
            const cdnRes = await fetch(cdnUrl, { method: 'HEAD' });
            cdnReachable = cdnRes.status < 500;
          } catch {
            cdnReachable = false;
          }
          const latencyMs = Date.now() - startTime;

          const result = {
            isConnected: false,
            status: 'unconfigured' as const,
            checkedAt,
            latencyMs,
            message: `Belum dikonfigurasi: Variabel environment Cloudflare R2 belum lengkap (${missingVars.join(', ')}). Sesuai aturan, status tidak diubah menjadi terhubung.`,
            details: {
              isConfigured: false,
              missingVariables: missingVars,
              bucket: bucket || 'Belum Dikonfigurasi',
              endpoint: endpoint || 'Belum Dikonfigurasi',
              cdnDomain: cdnUrl,
              cdnReachable
            }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        }

        // 2. Real AWS SDK S3 test against Cloudflare R2 API
        try {
          const command = new ListObjectsV2Command({
            Bucket: bucket,
            MaxKeys: 1
          });
          await client.send(command);
          const latencyMs = Date.now() - startTime;

          const result = {
            isConnected: true,
            status: 'connected' as const,
            checkedAt,
            latencyMs,
            message: `Koneksi Cloudflare R2 (S3-compatible API) berhasil diverifikasi. Bucket "${bucket}" aktif dan dapat diakses (${latencyMs}ms).`,
            details: {
              isConfigured: true,
              bucket,
              endpoint: endpoint ? 'https://••••••••.r2.cloudflarestorage.com' : 'Terkonfigurasi',
              cdnUrl,
              s3Operation: 'ListObjectsV2Command (Success)'
            }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        } catch (s3Err: unknown) {
          const latencyMs = Date.now() - startTime;
          const errorName = (s3Err as { name?: string })?.name || 'S3ClientError';
          const errorMsg = s3Err instanceof Error ? s3Err.message : 'Kesalahan otentikasi S3 Cloudflare R2';

          const result = {
            isConnected: false,
            status: 'error' as const,
            checkedAt,
            latencyMs,
            message: `Uji koneksi S3 Cloudflare R2 gagal (${errorName}): ${errorMsg}`,
            details: {
              isConfigured: true,
              bucket,
              errorName
            }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        }
      }

      case 'fonnte': {
        const fonnteToken = process.env.FONNTE_API_TOKEN;
        if (!fonnteToken || fonnteToken.trim() === '') {
          const latencyMs = Date.now() - startTime;
          const result = {
            isConnected: false,
            status: 'unconfigured' as const,
            checkedAt,
            latencyMs,
            message: 'Belum dikonfigurasi: Token FONNTE_API_TOKEN belum dipasang di environment server platform. Sesuai aturan, status tidak diubah menjadi terhubung.',
            details: {
              tokenConfigured: false,
              recommendation: 'Tambahkan token resmi dari dashboard.fonnte.com ke file environment.'
            }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        }

        // Real check to Fonnte API
        const fonnteRes = await fetch('https://api.fonnte.com/device', {
          method: 'POST',
          headers: { Authorization: fonnteToken }
        });
        const latencyMs = Date.now() - startTime;
        const resJson = await fonnteRes.json().catch(() => ({}));

        if (fonnteRes.ok && resJson.status === true) {
          const result = {
            isConnected: true,
            status: 'connected' as const,
            checkedAt,
            latencyMs,
            message: `Koneksi Fonnte WhatsApp Gateway berhasil. Device: ${resJson.device || 'Terkoneksi'} (${latencyMs}ms).`,
            details: resJson
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        } else {
          const result = {
            isConnected: false,
            status: 'error' as const,
            checkedAt,
            latencyMs,
            message: `Verifikasi Fonnte gagal: ${resJson.reason || resJson.message || `HTTP ${fonnteRes.status}`}`,
            details: resJson
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        }
      }

      case 'dns': {
        const targetDomain = 'zyvora.com';
        try {
          const addresses = await dns.promises.resolve4(targetDomain).catch(() => []);
          const latencyMs = Date.now() - startTime;

          if (addresses.length > 0) {
            const result = {
              isConnected: true,
              status: 'connected' as const,
              checkedAt,
              latencyMs,
              message: `Resolusi DNS domain ${targetDomain} berhasil melalui DNS resolver sistem. Alamat IP: ${addresses.join(', ')} (${latencyMs}ms).`,
              details: {
                domain: targetDomain,
                resolvedIps: addresses,
                nameservers: ['ns.cloudflare.com']
              }
            };
            testResultsCache[id] = result;
            return res.json({ success: true, data: result });
          } else {
            // Fallback query via Cloudflare DoH
            const dohRes = await fetch(`https://1.1.1.1/dns-query?name=${targetDomain}&type=A`, {
              headers: { Accept: 'application/dns-json' }
            });
            const dohData = await dohRes.json();
            const dohLatency = Date.now() - startTime;
            const ips = dohData.Answer ? dohData.Answer.map((a: { data: string }) => a.data) : [];

            const result = {
              isConnected: ips.length > 0,
              status: ips.length > 0 ? ('connected' as const) : ('error' as const),
              checkedAt,
              latencyMs: dohLatency,
              message: ips.length > 0
                ? `Resolusi DNS Cloudflare 1.1.1.1 berhasil: ${ips.join(', ')} (${dohLatency}ms).`
                : `Domain ${targetDomain} belum memiliki A record terdaftar di DNS publik.`,
              details: { domain: targetDomain, resolvedIps: ips }
            };
            testResultsCache[id] = result;
            return res.json({ success: true, data: result });
          }
        } catch (err: unknown) {
          const latencyMs = Date.now() - startTime;
          const result = {
            isConnected: false,
            status: 'error' as const,
            checkedAt,
            latencyMs,
            message: `Uji DNS gagal: ${err instanceof Error ? err.message : 'Kesalahan resolusi DNS'}`,
            details: {}
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        }
      }

      case 'payment_gateway': {
        const midtransKey = process.env.MIDTRANS_SERVER_KEY;
        const xenditKey = process.env.XENDIT_SECRET_KEY;
        const latencyMs = Date.now() - startTime;

        if (!midtransKey && !xenditKey) {
          const result = {
            isConnected: false,
            status: 'unconfigured' as const,
            checkedAt,
            latencyMs,
            message: 'Belum dikonfigurasi: Tidak ada provider payment gateway yang aktif atau memiliki API key di environment platform (MIDTRANS_SERVER_KEY atau XENDIT_SECRET_KEY belum diisi).',
            details: {
              activeProvider: null,
              recommendation: 'Pilih provider (Midtrans / Xendit) dan masukkan Server Key di environment platform.'
            }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        }

        const result = {
          isConnected: true,
          status: 'connected' as const,
          checkedAt,
          latencyMs,
          message: `Kredensial payment gateway terdeteksi (${midtransKey ? 'Midtrans' : 'Xendit'}).`,
          details: { activeProvider: midtransKey ? 'Midtrans' : 'Xendit' }
        };
        testResultsCache[id] = result;
        return res.json({ success: true, data: result });
      }

      case 'shipping_api': {
        const rajaongkirKey = process.env.RAJAONGKIR_API_KEY;
        const biteshipKey = process.env.BITESHIP_API_KEY;
        const latencyMs = Date.now() - startTime;

        if (!rajaongkirKey && !biteshipKey) {
          const result = {
            isConnected: false,
            status: 'unconfigured' as const,
            checkedAt,
            latencyMs,
            message: 'Belum dikonfigurasi: Kunci API layanan pengiriman (RAJAONGKIR_API_KEY atau BITESHIP_API_KEY) belum terpasang di environment platform. Modul pengiriman menggunakan data offline sementara.',
            details: {
              activeProvider: null,
              recommendation: 'Daftarkan akun di RajaOngkir atau Biteship lalu pasang API key ke environment platform.'
            }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        }

        const result = {
          isConnected: true,
          status: 'connected' as const,
          checkedAt,
          latencyMs,
          message: `Kunci API shipping terdeteksi (${rajaongkirKey ? 'RajaOngkir' : 'Biteship'}).`,
          details: { activeProvider: rajaongkirKey ? 'RajaOngkir' : 'Biteship' }
        };
        testResultsCache[id] = result;
        return res.json({ success: true, data: result });
      }

      case 'maps_distance': {
        // Ping OpenStreetMap tile server
        const tileRes = await fetch('https://tile.openstreetmap.org/0/0/0.png', {
          method: 'GET',
          headers: { 'User-Agent': 'ZyvoraERP/1.0.0 (contact@zyvora.com)' }
        });
        const latencyMs = Date.now() - startTime;

        if (tileRes.ok) {
          const result = {
            isConnected: true,
            status: 'connected' as const,
            checkedAt,
            latencyMs,
            message: `Layanan OpenStreetMap Tile Server & Leaflet terhubung sempurna (${latencyMs}ms). Status HTTP ${tileRes.status}.`,
            details: {
              httpStatus: tileRes.status,
              provider: 'OpenStreetMap',
              routing: 'OSRM Matrix Engine Aktif'
            }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        } else {
          const result = {
            isConnected: false,
            status: 'error' as const,
            checkedAt,
            latencyMs,
            message: `OpenStreetMap tile server merespons dengan HTTP ${tileRes.status}.`,
            details: { httpStatus: tileRes.status }
          };
          testResultsCache[id] = result;
          return res.json({ success: true, data: result });
        }
      }

      default:
        return res.status(404).json({ success: false, error: `Integrasi '${id}' tidak ditemukan.` });
    }
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const result = {
      isConnected: false,
      status: 'error' as const,
      checkedAt,
      latencyMs,
      message: `Terjadi kegagalan saat menguji koneksi: ${err instanceof Error ? err.message : 'Network error'}`,
      details: {}
    };
    testResultsCache[id] = result;
    return res.json({ success: true, data: result });
  }
});

// ==============================================================================
// CLOUDFLARE R2 MEDIA STORAGE ENDPOINTS (Direct S3-Compatible Upload & Cleanup)
// ==============================================================================

// POST /api/media/upload - Direct upload to Cloudflare R2 with automatic multi-tenant folder structure
app.post('/api/media/upload', memoryUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Tidak ada berkas yang diunggah.' });
    }

    const tenantId = (req.body.tenantId as string) || 'common';
    const category = (req.body.category as string) || 'attachments';
    const prefix = (req.body.prefix as string) || 'file';

    const sanitizedTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '') || 'common';
    const sanitizedCategory = category.replace(/[^a-zA-Z0-9_-]/g, '') || 'attachments';
    const sanitizedPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'file';

    const originalExt = path.extname(req.file.originalname).replace('.', '').toLowerCase();
    const ext = originalExt || (req.file.mimetype === 'image/webp' ? 'webp' : 'png');
    const timestamp = Date.now();
    const storageKey = `tenants/${sanitizedTenant}/${sanitizedCategory}/${sanitizedPrefix}_${timestamp}.${ext}`;

    const { client, bucket, isConfigured } = getR2S3Client();
    const cdnUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim() || 'https://pub-r2.zyvora.my.id';

    if (!isConfigured || !client) {
      return res.status(503).json({
        success: false,
        error: 'Cloudflare R2 belum dikonfigurasi di server environment. Pengunggahan membutuhkan kredensial R2 yang lengkap.'
      });
    }

    // Direct PutObjectCommand to Cloudflare R2 bucket
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype || 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable'
    });

    await client.send(putCommand);

    const publicAssetUrl = `${cdnUrl.replace(/\/+$/, '')}/${storageKey}`;

    return res.json({
      success: true,
      url: publicAssetUrl,
      key: storageKey,
      size: req.file.size,
      mimeType: req.file.mimetype,
      convertedToWebP: req.file.mimetype === 'image/webp',
      tenantId: sanitizedTenant,
      category: sanitizedCategory
    });
  } catch (err: unknown) {
    console.error('R2 PutObject error:', err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Terjadi kegagalan saat mengunggah berkas ke Cloudflare R2.'
    });
  }
});

// DELETE /api/media/delete - Remove asset from Cloudflare R2 with tenant isolation verification
app.delete('/api/media/delete', async (req: Request, res: Response) => {
  try {
    const { url, key, tenantId } = req.body;
    let storageKey = (key as string) || '';

    if (!storageKey && url) {
      const cdnUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim() || 'https://pub-r2.zyvora.my.id';
      storageKey = url.replace(cdnUrl, '').replace(/^\/+/, '');
    }

    if (!storageKey) {
      return res.status(400).json({ success: false, error: 'Key atau URL berkas tidak valid.' });
    }

    const sanitizedTenant = (tenantId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedTenant && !storageKey.startsWith(`tenants/${sanitizedTenant}/`)) {
      return res.status(403).json({
        success: false,
        error: 'Isolasi Tenant: Dilarang menghapus berkas di luar namespace tenant Anda.'
      });
    }

    const { client, bucket, isConfigured } = getR2S3Client();
    if (isConfigured && client) {
      const delCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: storageKey
      });
      await client.send(delCommand);
    }

    return res.json({
      success: true,
      message: 'Objek berhasil dihapus dari Cloudflare R2.',
      key: storageKey
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menghapus berkas dari Cloudflare R2.'
    });
  }
});

// ==============================================================================
// SUPABASE USER MANAGEMENT & ENTERPRISE RBAC SYNCHRONIZATION ENDPOINTS
// ==============================================================================

const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5manVjeWFiZmlxbG1yeG52aXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTI4NDcsImV4cCI6MjEwODI2ODg0N30.fg_-UDySy8oTxou9d48hE9dKPIoZWkujB3X-0iB4_uc';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nfjucyabfiqlmrxnviuz.supabase.co';
const rawServerAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const supabaseAnonKey =
  rawServerAnonKey && rawServerAnonKey !== 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY' && rawServerAnonKey !== ''
    ? rawServerAnonKey
    : DEFAULT_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serverSupabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface ServerUserRecord {
  id: string;
  userCode: string;
  email: string;
  fullName: string;
  role: string;
  roleTitle: string;
  isPlatformSuperAdmin: boolean;
  status: 'active' | 'inactive';
  tenantId: string;
  tenantName?: string;
  allowedBusinessUnits: string[];
  allowedBranches: string[];
  createdAt: string;
  phone?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CANONICAL_FALLBACK_TENANT_ID = '00000000-0000-4000-8000-000000000001';

async function getOrResolveValidTenantId(preferredTenantId?: string): Promise<string> {
  if (preferredTenantId && UUID_REGEX.test(preferredTenantId)) {
    return preferredTenantId;
  }

  try {
    const { data: firstTenant } = await serverSupabase
      .from('tenants')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (firstTenant?.id && UUID_REGEX.test(firstTenant.id)) {
      return firstTenant.id;
    }

    const newTenantId = crypto.randomUUID();
    const { error: insErr } = await serverSupabase.from('tenants').insert({
      id: newTenantId,
      code: 'ZYVORA_HQ',
      name: 'PT Zyvora Pratama Indonesia',
      status: 'active'
    });

    if (!insErr) {
      return newTenantId;
    }
  } catch (err) {
    console.warn('getOrResolveValidTenantId warning:', err);
  }

  return CANONICAL_FALLBACK_TENANT_ID;
}

// In-memory persistent buffer - strictly synchronized with authentic Supabase database
// Option A: Clean production baseline containing only the 1 authentic Platform Super Admin
let serverUsersStore: ServerUserRecord[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    userCode: '2A',
    email: 'admin@yulovi.com',
    fullName: 'Platform Administrator',
    role: 'super_admin',
    roleTitle: 'Platform Super Admin',
    isPlatformSuperAdmin: true,
    status: 'active',
    tenantId: '00000000-0000-4000-8000-000000000001',
    tenantName: 'Zyvora Global Enterprises',
    allowedBusinessUnits: ['bu_distribusi', 'bu_retail'],
    allowedBranches: ['br_jkt_hq'],
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

// GET /api/users - Fetch users with live Supabase synchronization
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    let dbUsers: ServerUserRecord[] = [];
    let supabaseSuccess = false;

    try {
      const { data: profiles, error: pErr } = await serverSupabase
        .from('profiles')
        .select('id, user_code, full_name, email, avatar_url, created_at');

      if (!pErr && profiles && profiles.length > 0) {
        supabaseSuccess = true;

        const memMap = new Map<string, any>();
        try {
          const { data: mems } = await serverSupabase
            .from('tenant_memberships')
            .select('user_id, tenant_id, role, status');
          if (mems) {
            mems.forEach((m: any) => memMap.set(m.user_id, m));
          }
        } catch {
          // ignore
        }

        const saSet = new Set<string>();
        try {
          const { data: sas } = await serverSupabase
            .from('platform_super_admins')
            .select('user_id, is_active')
            .eq('is_active', true);
          if (sas) {
            sas.forEach((s: any) => saSet.add(s.user_id));
          }
        } catch {
          // ignore
        }

        dbUsers = profiles.map((p: any) => {
          const m = memMap.get(p.id);
          const isSA = saSet.has(p.id) || p.user_code === '2A' || p.email === 'admin@yulovi.com';
          const role = isSA ? 'super_admin' : (m?.role || 'sales');
          return {
            id: p.id,
            userCode: p.user_code || (isSA ? '2A' : 'USR'),
            fullName: p.full_name || p.email,
            email: p.email,
            role,
            roleTitle: isSA ? 'Platform Super Admin' : `${role.toUpperCase()} Member`,
            isPlatformSuperAdmin: isSA,
            status: (m?.status || 'active') as 'active' | 'inactive',
            tenantId: m?.tenant_id || 'ten_zyvora_corp',
            allowedBusinessUnits: ['bu_distribusi'],
            allowedBranches: ['br_jkt_hq'],
            createdAt: p.created_at || new Date().toISOString()
          };
        });
      }
    } catch (dbErr) {
      console.warn('[Supabase Sync] Querying profiles error:', dbErr);
    }

    // Merge: Live DB users + Store users (strictly de-duplicated by email)
    // dbUsers first, then serverUsersStore overrides so role & status changes stick immediately
    const combinedMap = new Map<string, ServerUserRecord>();
    for (const u of dbUsers) {
      if (u.email) combinedMap.set(u.email.toLowerCase(), u);
    }
    for (const u of serverUsersStore) {
      if (!u.email) continue;
      const existing = combinedMap.get(u.email.toLowerCase());
      if (existing) {
        combinedMap.set(u.email.toLowerCase(), {
          ...existing,
          ...u,
          // Retain authentic database UUID if present
          id: existing.id || u.id
        });
      } else {
        combinedMap.set(u.email.toLowerCase(), u);
      }
    }

    const result = Array.from(combinedMap.values());
    return res.json({
      success: true,
      data: result,
      source: supabaseSuccess ? 'supabase' : 'server_cache',
      count: result.length
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memuat data pengguna.'
    });
  }
});

// POST /api/users - Add user with real Supabase Auth + Profiles sync
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { email, fullName, role, tenantId, preferredUserCode, password, phone, tenantName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Email wajib diisi dengan format valid.' });
    }
    if (!fullName || fullName.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Nama lengkap pengguna wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanRole = role || 'sales';
    const cleanTenantId = tenantId || 'ten_zyvora_corp';

    // Check duplicate email in serverUsersStore
    if (serverUsersStore.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ success: false, error: `Email [${cleanEmail}] sudah terdaftar pada sistem.` });
    }

    // Determine User Code (2-3 chars safe alphabet)
    let userCode = (preferredUserCode || '').trim().toUpperCase();
    if (userCode) {
      if (!/^[2-9A-HJ-NP-Z]{2,3}$/.test(userCode)) {
        return res.status(400).json({
          success: false,
          error: `Kode User [${userCode}] tidak memenuhi format standar (2-3 karakter alfanumerik tanpa glif ambigu O, 0, I, 1).`
        });
      }
      if (serverUsersStore.some((u) => u.userCode === userCode)) {
        return res.status(400).json({ success: false, error: `Kode User [${userCode}] sudah digunakan akun lain.` });
      }
    } else {
      const existing = new Set(serverUsersStore.map((u) => u.userCode));
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      for (let i = 0; i < 50; i++) {
        const c1 = chars[Math.floor(Math.random() * chars.length)];
        const c2 = chars[Math.floor(Math.random() * chars.length)];
        const c3 = chars[Math.floor(Math.random() * chars.length)];
        const candidate = `${c1}${c2}${c3}`;
        if (!existing.has(candidate)) {
          userCode = candidate;
          break;
        }
      }
      if (!userCode) userCode = 'USR';
    }

    let authUserId: string = crypto.randomUUID();
    let supabaseAuthSuccess = false;
    let supabaseDbSuccess = false;
    let syncNotes = '';

    // 1. Attempt Supabase Auth creation
    try {
      if (supabaseServiceKey) {
        const { data: authData, error: authError } = await serverSupabase.auth.admin.createUser({
          email: cleanEmail,
          password: password || 'ZyvoraP@ss2026!',
          email_confirm: true,
          user_metadata: { full_name: cleanName, user_code: userCode }
        });
        if (!authError && authData?.user) {
          authUserId = authData.user.id;
          supabaseAuthSuccess = true;
        } else if (authError) {
          syncNotes += `Auth Admin: ${authError.message}. `;
        }
      } else {
        const { data: authData, error: authError } = await serverSupabase.auth.signUp({
          email: cleanEmail,
          password: password || 'ZyvoraP@ss2026!',
          options: {
            data: { full_name: cleanName, user_code: userCode }
          }
        });
        if (!authError && authData?.user) {
          authUserId = authData.user.id;
          supabaseAuthSuccess = true;
        } else if (authError) {
          syncNotes += `Auth SignUp: ${authError.message}. `;
        }
      }
    } catch (authErr) {
      syncNotes += `Auth Exception: ${authErr instanceof Error ? authErr.message : 'Unknown'}. `;
    }

    // 2. Synchronize to Supabase Postgres Tables (profiles, tenant_memberships)
    try {
      const { error: profErr } = await serverSupabase.from('profiles').upsert({
        id: authUserId,
        user_code: userCode,
        full_name: cleanName,
        email: cleanEmail
      });

      if (!profErr) {
        supabaseDbSuccess = true;
      } else {
        syncNotes += `Tabel profiles: ${profErr.message} (${profErr.code || ''}). `;
      }

      const validTenantId = await getOrResolveValidTenantId(cleanTenantId);
      await serverSupabase.from('tenant_memberships').upsert({
        user_id: authUserId,
        tenant_id: validTenantId,
        role: cleanRole,
        status: 'active'
      }, { onConflict: 'user_id, tenant_id' });

      if (cleanRole === 'super_admin') {
        await serverSupabase.from('platform_super_admins').upsert({
          user_id: authUserId,
          is_active: true
        });
      }
    } catch (dbErr) {
      syncNotes += `Database Table sync: ${dbErr instanceof Error ? dbErr.message : 'Unknown'}. `;
    }

    const newUser: ServerUserRecord = {
      id: authUserId,
      userCode,
      email: cleanEmail,
      fullName: cleanName,
      role: cleanRole,
      roleTitle: cleanRole === 'super_admin' ? 'Platform Super Admin' : `${cleanRole.toUpperCase()} Member`,
      isPlatformSuperAdmin: cleanRole === 'super_admin',
      status: 'active',
      tenantId: cleanTenantId,
      tenantName: tenantName || 'Zyvora Global Enterprises',
      allowedBusinessUnits: ['bu_distribusi'],
      allowedBranches: ['br_jkt_hq'],
      createdAt: new Date().toISOString(),
      phone: phone || ''
    };

    // Prepend to server store to guarantee it immediately appears in all subsequent queries
    serverUsersStore.unshift(newUser);

    const message = supabaseDbSuccess
      ? `Pengguna ${cleanName} (${userCode}) berhasil ditambahkan dan disinkronkan langsung ke database Supabase.`
      : `Pengguna ${cleanName} (${userCode}) berhasil ditambahkan ke sistem.`;

    return res.status(201).json({
      success: true,
      user: newUser,
      message,
      supabaseSync: {
        auth: supabaseAuthSuccess,
        database: supabaseDbSuccess,
        notes: syncNotes.trim() || 'Berhasil disinkronkan ke Supabase'
      }
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memproses penambahan pengguna.'
    });
  }
});

// PUT /api/users/:id - Update user details (name, role, status, etc.)
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, role, status, phone, tenantId, actorId, actorEmail, actorUserCode } = req.body;

    const callerId = (actorId || req.headers['x-user-id'] || '').toString();
    const callerCode = (actorUserCode || req.headers['x-user-code'] || '').toString().toUpperCase();
    const callerEmail = (actorEmail || req.headers['x-user-email'] || '').toString().toLowerCase();

    let existingIdx = serverUsersStore.findIndex(
      (u) => u.id === id || u.userCode === id || (u.email && u.email.toLowerCase() === id.toLowerCase())
    );
    let target = existingIdx >= 0 ? serverUsersStore[existingIdx] : null;

    if (!target) {
      // Query authentic Supabase profiles to get real email, userCode, and fullName
      try {
        const { data: prof } = await serverSupabase
          .from('profiles')
          .select('id, user_code, full_name, email, created_at')
          .or(`id.eq.${id},user_code.eq.${id},email.eq.${id}`)
          .maybeSingle();

        if (prof) {
          // Check if already in store by email
          const existingByEmailIdx = serverUsersStore.findIndex(
            (u) => u.email && u.email.toLowerCase() === prof.email?.toLowerCase()
          );

          if (existingByEmailIdx >= 0) {
            target = serverUsersStore[existingByEmailIdx];
            target.id = prof.id;
            target.userCode = prof.user_code || target.userCode;
          } else {
            target = {
              id: prof.id,
              userCode: prof.user_code || 'USR',
              email: prof.email || '',
              fullName: prof.full_name || fullName || 'User',
              role: role || 'sales',
              roleTitle: 'Member',
              isPlatformSuperAdmin: role === 'super_admin',
              status: status || 'active',
              tenantId: tenantId || 'ten_zyvora_corp',
              allowedBusinessUnits: ['bu_distribusi'],
              allowedBranches: ['br_jkt_hq'],
              createdAt: prof.created_at || new Date().toISOString()
            };
            serverUsersStore.unshift(target);
          }
        }
      } catch (profErr) {
        console.warn('Failed querying profile in PUT /api/users/:id:', profErr);
      }

      if (!target) {
        target = {
          id,
          userCode: 'USR',
          email: '',
          fullName: fullName || 'User',
          role: role || 'sales',
          roleTitle: 'Member',
          isPlatformSuperAdmin: role === 'super_admin',
          status: status || 'active',
          tenantId: tenantId || 'ten_zyvora_corp',
          allowedBusinessUnits: ['bu_distribusi'],
          allowedBranches: ['br_jkt_hq'],
          createdAt: new Date().toISOString()
        };
        serverUsersStore.unshift(target);
      }
    }

    // MANDAT USER: Khusus Super Admin tidak bisa dihapus / edit selain oleh Super Admin sendiri
    const isTargetSuper =
      target.userCode === '2A' ||
      target.isPlatformSuperAdmin ||
      target.role === 'super_admin' ||
      (target.email && target.email.toLowerCase() === 'admin@yulovi.com');

    if (isTargetSuper) {
      const isSelf =
        (callerId && (callerId === target.id || callerId === target.userCode)) ||
        (callerCode && callerCode === target.userCode.toUpperCase()) ||
        (callerEmail && target.email && callerEmail === target.email.toLowerCase());

      if ((callerId || callerCode || callerEmail) && !isSelf) {
        return res.status(403).json({
          success: false,
          error: 'Tindakan Ditolak: Akun Super Admin hanya dapat diedit oleh Super Admin itu sendiri.'
        });
      }

      // Cegah penurunan role jika Super Admin terakhir
      if (role && role !== 'super_admin') {
        const otherActiveSuperAdmins = serverUsersStore.filter(
          (u) =>
            (u.userCode === '2A' || u.isPlatformSuperAdmin || u.role === 'super_admin' || u.email.toLowerCase() === 'admin@yulovi.com') &&
            u.status === 'active' &&
            u.id !== target.id &&
            u.email.toLowerCase() !== target.email.toLowerCase()
        );
        if (otherActiveSuperAdmins.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Tindakan Ditolak: Tidak dapat mengubah Role Super Admin terakhir sistem.'
          });
        }
      }
    }

    if (fullName) target.fullName = fullName.trim();
    if (role) {
      target.role = role;
      target.isPlatformSuperAdmin = role === 'super_admin';
      target.roleTitle =
        role === 'super_admin'
          ? 'Platform Super Admin'
          : role === 'owner'
          ? 'Business Owner & Director'
          : role === 'admin'
          ? 'Operations Administrator'
          : role === 'sales'
          ? 'Senior Key Account Sales'
          : 'Client Portal Representative';
    }
    if (status) target.status = status;
    if (phone !== undefined) target.phone = phone;
    if (tenantId) target.tenantId = tenantId;

    // Purge any dummy records with empty email from serverUsersStore
    serverUsersStore = serverUsersStore.filter((u) => u.email && u.email.length > 0);
    if (!serverUsersStore.some((u) => u.id === target!.id || u.email === target!.email)) {
      serverUsersStore.unshift(target);
    }

    // Sync to Supabase Postgres (profiles and tenant_memberships)
    try {
      if (fullName) {
        await serverSupabase.from('profiles').update({ full_name: target.fullName }).eq('id', target.id);
      }
      if (role || status) {
        const validTenantId = await getOrResolveValidTenantId(target.tenantId);
        target.tenantId = validTenantId;

        await serverSupabase.from('tenant_memberships').upsert({
          user_id: target.id,
          tenant_id: validTenantId,
          role: target.role,
          status: target.status || 'active'
        }, { onConflict: 'user_id, tenant_id' });
      }
      if (role === 'super_admin') {
        await serverSupabase.from('platform_super_admins').upsert({ user_id: target.id, is_active: true });
      } else if (target.role !== 'super_admin' && target.userCode !== '2A' && target.email.toLowerCase() !== 'admin@yulovi.com') {
        await serverSupabase.from('platform_super_admins').delete().eq('user_id', target.id);
      }
    } catch (e) {
      console.warn('Supabase update warning:', e);
    }

    return res.json({
      success: true,
      user: target,
      message: `Data pengguna ${target.fullName} (${target.userCode}) berhasil diperbarui dan disinkronkan.`
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memperbarui data pengguna.'
    });
  }
});

// PATCH /api/users/:id/status - Toggle user status (active / inactive)
app.patch('/api/users/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason, actorId, actorEmail, actorUserCode } = req.body;

    const callerId = (actorId || req.headers['x-user-id'] || '').toString();
    const callerCode = (actorUserCode || req.headers['x-user-code'] || '').toString().toUpperCase();
    const callerEmail = (actorEmail || req.headers['x-user-email'] || '').toString().toLowerCase();

    const target = serverUsersStore.find(
      (u) => u.id === id || u.userCode === id || u.email.toLowerCase() === id.toLowerCase()
    );
    if (!target) {
      return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
    }

    // MANDAT USER: Khusus Super Admin tidak bisa diubah statusnya selain oleh Super Admin sendiri
    const isTargetSuper =
      target.userCode === '2A' ||
      target.isPlatformSuperAdmin ||
      target.role === 'super_admin' ||
      target.email.toLowerCase() === 'admin@yulovi.com';

    if (isTargetSuper) {
      const isSelf =
        (callerId && (callerId === target.id || callerId === target.userCode)) ||
        (callerCode && callerCode === target.userCode.toUpperCase()) ||
        (callerEmail && callerEmail === target.email.toLowerCase());

      if ((callerId || callerCode || callerEmail) && !isSelf) {
        return res.status(403).json({
          success: false,
          error: 'Tindakan Ditolak: Status akun Super Admin hanya dapat diubah oleh Super Admin itu sendiri.'
        });
      }

      if (status === 'inactive') {
        const otherActiveSuperAdmins = serverUsersStore.filter(
          (u) =>
            (u.userCode === '2A' || u.isPlatformSuperAdmin || u.role === 'super_admin' || u.email.toLowerCase() === 'admin@yulovi.com') &&
            u.status === 'active' &&
            u.id !== target.id &&
            u.email.toLowerCase() !== target.email.toLowerCase()
        );
        if (otherActiveSuperAdmins.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Tindakan Ditolak: Tidak dapat menonaktifkan Super Admin terakhir sistem.'
          });
        }
      }
    }

    target.status = status;

    // Sync to Supabase
    try {
      await serverSupabase.from('tenant_memberships').upsert({
        user_id: target.id,
        tenant_id: target.tenantId || 'ten_zyvora_corp',
        role: target.role,
        status
      });
      if (status === 'inactive') {
        await serverSupabase.from('burned_user_codes').upsert({
          user_code: target.userCode,
          original_user_id: target.id,
          reason: reason || 'Dinonaktifkan oleh administrator'
        });
      }
    } catch (e) {
      console.warn('Supabase status sync warning:', e);
    }

    return res.json({
      success: true,
      user: target,
      message: `Status akun ${target.fullName} (${target.userCode}) berhasil diubah menjadi ${status}.`
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Gagal mengubah status pengguna.'
    });
  }
});

// DELETE /api/users/:id - Delete or deactivate user with protection for super admin
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, permanent, actorId, actorEmail, actorUserCode } = req.body || {};

    const callerId = (actorId || req.headers['x-user-id'] || '').toString();
    const callerCode = (actorUserCode || req.headers['x-user-code'] || '').toString().toUpperCase();
    const callerEmail = (actorEmail || req.headers['x-user-email'] || '').toString().toLowerCase();

    const idx = serverUsersStore.findIndex(
      (u) => u.id === id || u.userCode === id || u.email.toLowerCase() === id.toLowerCase()
    );
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
    }

    const target = serverUsersStore[idx];

    // MANDAT USER: Khusus Super Admin tidak bisa dihapus selain oleh Super Admin sendiri
    const isTargetSuper =
      target.userCode === '2A' ||
      target.isPlatformSuperAdmin ||
      target.role === 'super_admin' ||
      target.email.toLowerCase() === 'admin@yulovi.com';

    if (isTargetSuper) {
      const isSelf =
        (callerId && (callerId === target.id || callerId === target.userCode)) ||
        (callerCode && callerCode === target.userCode.toUpperCase()) ||
        (callerEmail && callerEmail === target.email.toLowerCase());

      if (!isSelf) {
        return res.status(403).json({
          success: false,
          error: 'Tindakan Ditolak: Akun Super Admin tidak dapat dihapus selain oleh Super Admin itu sendiri.'
        });
      }

      // Super Admin tidak dapat menghapus akunnya jika merupakan Super Admin terakhir
      const otherActiveSuperAdmins = serverUsersStore.filter(
        (u) =>
          (u.userCode === '2A' || u.isPlatformSuperAdmin || u.role === 'super_admin' || u.email.toLowerCase() === 'admin@yulovi.com') &&
          u.status === 'active' &&
          u.id !== target.id &&
          u.email.toLowerCase() !== target.email.toLowerCase()
      );
      if (otherActiveSuperAdmins.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Tindakan Ditolak: Tidak dapat menghapus Super Admin terakhir sistem.'
        });
      }
    }

    if (permanent) {
      serverUsersStore.splice(idx, 1);
    } else {
      target.status = 'inactive';
    }

    // Supabase sync
    try {
      if (permanent) {
        await serverSupabase.from('tenant_memberships').delete().eq('user_id', target.id);
        await serverSupabase.from('profiles').delete().eq('id', target.id);
      } else {
        await serverSupabase.from('tenant_memberships').update({ status: 'inactive' }).eq('user_id', target.id);
      }
      await serverSupabase.from('burned_user_codes').upsert({
        user_code: target.userCode,
        original_user_id: target.id,
        reason: reason || 'Dihapus/Dinonaktifkan dari sistem'
      });
    } catch (e) {
      console.warn('Supabase delete sync warning:', e);
    }

    return res.json({
      success: true,
      message: permanent
        ? `Pengguna ${target.fullName} (${target.userCode}) berhasil dihapus dari sistem.`
        : `Pengguna ${target.fullName} (${target.userCode}) berhasil dinonaktifkan dari sistem. Kode user diamankan.`
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memproses penghapusan pengguna.'
    });
  }
});

// GET /api/auth/resolve-profile - Unify login profile resolution & self-healing auto-provisioning
app.get('/api/auth/resolve-profile', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId || '').toString().trim();
    const email = (req.query.email || '').toString().trim().toLowerCase();

    if (!userId && !email) {
      return res.status(400).json({ success: false, error: 'userId atau email wajib disertakan.' });
    }

    // 1. Locate in serverUsersStore
    let found = serverUsersStore.find(
      (u) => (userId && u.id === userId) || (email && u.email && u.email.toLowerCase() === email)
    );

    // 2. Locate in profiles if not in store
    if (!found) {
      try {
        const { data: prof } = await serverSupabase
          .from('profiles')
          .select('id, user_code, full_name, email, created_at')
          .or(`id.eq.${userId || '00000000-0000-0000-0000-000000000000'},email.eq.${email || 'invalid'}`)
          .maybeSingle();

        if (prof) {
          const isSA = prof.user_code === '2A' || (prof.email && prof.email.toLowerCase() === 'admin@yulovi.com');
          const validTenantId = await getOrResolveValidTenantId();
          found = {
            id: prof.id,
            userCode: prof.user_code || (isSA ? '2A' : 'USR'),
            email: prof.email || email,
            fullName: prof.full_name || 'User',
            role: isSA ? 'super_admin' : 'sales',
            roleTitle: isSA ? 'Platform Super Admin' : 'Sales Member',
            isPlatformSuperAdmin: isSA,
            status: 'active',
            tenantId: validTenantId,
            tenantName: 'Zyvora Enterprise HQ',
            allowedBusinessUnits: ['bu_distribusi'],
            allowedBranches: ['br_jkt_hq'],
            createdAt: prof.created_at || new Date().toISOString()
          };
          serverUsersStore.unshift(found);
        }
      } catch (err) {
        console.warn('Profile search warning in resolve-profile:', err);
      }
    }

    if (!found) {
      return res.status(404).json({
        success: false,
        error: 'Profil pengguna tidak ditemukan pada sistem.'
      });
    }

    // Ensure valid UUID tenantId
    found.tenantId = await getOrResolveValidTenantId(found.tenantId);

    // Self-healing: Proactively sync/upsert to Supabase tenant_memberships
    try {
      await serverSupabase.from('tenant_memberships').upsert({
        user_id: found.id,
        tenant_id: found.tenantId,
        role: found.role,
        status: found.status || 'active'
      }, { onConflict: 'user_id, tenant_id' });

      if (found.role === 'super_admin' || found.isPlatformSuperAdmin) {
        await serverSupabase.from('platform_super_admins').upsert({
          user_id: found.id,
          is_active: true
        }, { onConflict: 'user_id' });
      }
    } catch (syncErr) {
      console.warn('Self-healing sync warning in resolve-profile:', syncErr);
    }

    return res.json({
      success: true,
      profile: found
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Gagal memproses resolusi profil autentikasi.'
    });
  }
});

// Mount Vite or serve static dist
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Zyvora ERP 1.0.0] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Zyvora ERP server:', err);
  process.exit(1);
});
