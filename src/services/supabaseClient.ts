import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable extraction (safe in both browser/Vite and Node/tsx test runner)
const rawSupabaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_URL as string | undefined)
    : undefined;
const rawSupabaseKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
    : undefined;

// Fallback to designated Zyvora project configuration
export const TARGET_PROJECT_ID = 'nfjucyabfiqlmrxnviuz';
export const DEFAULT_SUPABASE_URL = `https://${TARGET_PROJECT_ID}.supabase.co`;
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5manVjeWFiZmlxbG1yeG52aXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTI4NDcsImV4cCI6MjEwODI2ODg0N30.fg_-UDySy8oTxou9d48hE9dKPIoZWkujB3X-0iB4_uc';

export const supabaseUrl = rawSupabaseUrl || DEFAULT_SUPABASE_URL;
export const supabaseKey =
  rawSupabaseKey && rawSupabaseKey.trim() !== '' && rawSupabaseKey !== 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY'
    ? rawSupabaseKey
    : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseKey && supabaseKey.trim() !== '');

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return clientInstance;
};

export interface TableProbeStatus {
  tableName: string;
  exists: boolean;
  message?: string;
}

export interface ConnectionTestResult {
  isConfigured: boolean;
  isConnected: boolean;
  error: string | null;
  latencyMs?: number;
  targetUrl: string;
  tableProbes?: TableProbeStatus[];
}

/**
 * Lightweight safe ping to test Supabase connection and probe public schema readiness.
 */
export const testSupabaseConnection = async (): Promise<ConnectionTestResult> => {
  const result: ConnectionTestResult = {
    isConfigured: isSupabaseConfigured,
    isConnected: false,
    error: null,
    targetUrl: supabaseUrl,
    tableProbes: []
  };

  if (!isSupabaseConfigured) {
    result.error = 'VITE_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi.';
    return result;
  }

  const client = getSupabaseClient();
  const startTime = performance.now();

  try {
    // 1. Verify Auth endpoint
    const { error: authError } = await client.auth.getSession();
    const endTime = performance.now();
    result.latencyMs = Math.round(endTime - startTime);

    if (authError) {
      result.error = `Auth ping error: ${authError.message}`;
      result.isConnected = false;
      return result;
    }

    result.isConnected = true;

    // 2. Safe read-only HEAD probe of core target tables
    const tablesToProbe = ['tenants', 'profiles', 'customers', 'sales_orders', 'audit_logs'];
    const probes: TableProbeStatus[] = [];

    for (const table of tablesToProbe) {
      try {
        const { error: probeErr } = await client
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (probeErr) {
          if (
            probeErr.code === '42P01' ||
            probeErr.code === 'PGRST205' ||
            probeErr.message?.toLowerCase().includes('does not exist') ||
            probeErr.message?.toLowerCase().includes('schema cache')
          ) {
            probes.push({ tableName: table, exists: false, message: 'Tabel belum dimigrasikan di public schema (PGRST205)' });
          } else if (probeErr.code === 'PGRST301' || probeErr.message?.toLowerCase().includes('jwt')) {
            probes.push({ tableName: table, exists: true, message: 'Tabel terproteksi RLS / butuh auth token' });
          } else {
            probes.push({ tableName: table, exists: false, message: probeErr.message });
          }
        } else {
          probes.push({ tableName: table, exists: true, message: 'Tabel aktif dan dapat diakses' });
        }
      } catch (err: unknown) {
        probes.push({
          tableName: table,
          exists: false,
          message: err instanceof Error ? err.message : 'Error kueri'
        });
      }
    }

    result.tableProbes = probes;
  } catch (err: unknown) {
    const endTime = performance.now();
    result.latencyMs = Math.round(endTime - startTime);
    result.error = err instanceof Error ? err.message : 'Koneksi jaringan ke Supabase gagal.';
    result.isConnected = false;
  }

  return result;
};
