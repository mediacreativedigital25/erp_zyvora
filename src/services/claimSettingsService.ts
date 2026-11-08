/**
 * Zyvora ERP 1.0.0 — Claim Settings Service
 * Manages Claim Expense Categories and Operational Activities (Master > Keuangan > Setting Claim Expense)
 */

import { ClaimExpenseCategory, ClaimExpenseActivity } from '../types/erp';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { assertValidTenantId } from './supabaseSyncService';

export const INITIAL_CLAIM_CATEGORIES: ClaimExpenseCategory[] = [
  {
    id: 'cat_01',
    code: 'EXP-FUEL',
    name: 'Bahan Bakar & Kendaraan (Vehicle & Fuel)',
    isVehicleActivity: true,
    maxLimit: 750000,
    isReceiptRequired: true,
    isActive: true
  },
  {
    id: 'cat_02',
    code: 'EXP-TRAVEL',
    name: 'Perjalanan Dinas (Travel & Lodging)',
    isVehicleActivity: false,
    maxLimit: 2500000,
    isReceiptRequired: true,
    isActive: true
  },
  {
    id: 'cat_03',
    code: 'EXP-MEAL',
    name: 'Konsumsi & Representasi (Meals & Client)',
    isVehicleActivity: false,
    maxLimit: 500000,
    isReceiptRequired: true,
    isActive: true
  },
  {
    id: 'cat_04',
    code: 'EXP-OFFICE',
    name: 'Perlengkapan Kantor (Office Supplies / ATK)',
    isVehicleActivity: false,
    maxLimit: 1000000,
    isReceiptRequired: true,
    isActive: true
  },
  {
    id: 'cat_05',
    code: 'EXP-LOGIS',
    name: 'Kurir & Logistik Pengiriman (Logistics)',
    isVehicleActivity: false,
    maxLimit: 500000,
    isReceiptRequired: true,
    isActive: true
  },
  {
    id: 'cat_06',
    code: 'EXP-GEN',
    name: 'Operasional Umum (General Operations)',
    isVehicleActivity: false,
    maxLimit: 1500000,
    isReceiptRequired: true,
    isActive: true
  }
];

export const INITIAL_CLAIM_ACTIVITIES: ClaimExpenseActivity[] = [
  {
    id: 'act_01',
    code: 'ACT-DELIV',
    name: 'Pengantaran Hampers Undangan',
    businessLineId: 'lob_01', // Queinvite
    description: 'Pengiriman paket sampel dan pesanan undangan VIP ke klien langsung',
    isActive: true
  },
  {
    id: 'act_02',
    code: 'ACT-CLIENT',
    name: 'Meeting Koordinasi Vendor & Klien',
    businessLineId: 'lob_01',
    description: 'Pertemuan pembahasan layout dan desain undangan dengan pihak wedding organizer',
    isActive: true
  },
  {
    id: 'act_03',
    code: 'ACT-OFFICE',
    name: 'Operasional Kantor & Gudang Harian',
    businessLineId: undefined, // All
    description: 'Kegiatan pemeliharaan operasional kantor dan kebersihan gudang',
    isActive: true
  },
  {
    id: 'act_04',
    code: 'ACT-MAINT',
    name: 'Perawatan & Servis Armada Rutin',
    businessLineId: undefined, // All
    description: 'Ganti oli berkala, tune-up, dan perbaikan ringan kendaraan operasional kantor',
    isActive: true
  }
];

const LOCAL_STORAGE_CATEGORIES_KEY = 'ZYVORA_CLAIM_CATEGORIES_CACHE';
const LOCAL_STORAGE_ACTIVITIES_KEY = 'ZYVORA_CLAIM_ACTIVITIES_CACHE';

export class ClaimSettingsService {
  // ====================================================================
  // 1. KATEGORI KLAIM BIAYA (CLAIM EXPENSE CATEGORIES)
  // ====================================================================

  static async getCategories(tenantId: string): Promise<ClaimExpenseCategory[]> {
    const safeTenantId = assertValidTenantId(tenantId);
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('claim_expense_categories')
          .select('*')
          .eq('tenant_id', safeTenantId)
          .order('code', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            tenantId: row.tenant_id,
            code: row.code,
            name: row.name,
            isVehicleActivity: Boolean(row.is_vehicle_activity),
            maxLimit: Number(row.max_limit) || 0,
            isReceiptRequired: Boolean(row.is_receipt_required),
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
        }
      } catch (err) {
        console.warn('Fallback to local storage for claim categories:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
        if (cached) return JSON.parse(cached);
        localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(INITIAL_CLAIM_CATEGORIES));
      } catch {}
    }

    return INITIAL_CLAIM_CATEGORIES;
  }

  static async saveCategory(category: Partial<ClaimExpenseCategory>, tenantId: string): Promise<ClaimExpenseCategory> {
    const safeTenantId = assertValidTenantId(category.tenantId || tenantId);
    const list = await this.getCategories(safeTenantId);
    let updated: ClaimExpenseCategory;

    if (category.id) {
      const idx = list.findIndex((c) => c.id === category.id);
      if (idx >= 0) {
        updated = {
          ...list[idx],
          ...category,
          tenantId: safeTenantId,
          updatedAt: new Date().toISOString()
        } as ClaimExpenseCategory;
        list[idx] = updated;
      } else {
        updated = {
          ...category,
          id: category.id,
          tenantId: safeTenantId,
          isActive: category.isActive ?? true
        } as ClaimExpenseCategory;
        list.push(updated);
      }
    } else {
      updated = {
        id: `cat_${Date.now()}`,
        tenantId: safeTenantId,
        code: (category.code || 'EXP-NEW').toUpperCase().trim(),
        name: category.name || 'New Claim Category',
        isVehicleActivity: Boolean(category.isVehicleActivity),
        maxLimit: Number(category.maxLimit) || 0,
        isReceiptRequired: category.isReceiptRequired ?? true,
        isActive: category.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(updated);
    }

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('claim_expense_categories').upsert({
          id: updated.id,
          tenant_id: safeTenantId,
          code: updated.code,
          name: updated.name,
          is_vehicle_activity: updated.isVehicleActivity,
          max_limit: updated.maxLimit,
          is_receipt_required: updated.isReceiptRequired,
          is_active: updated.isActive,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to upsert claim category to cloud server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(list));
      } catch {}
    }

    return updated;
  }

  static async deleteCategory(id: string, tenantId: string): Promise<boolean> {
    const safeTenantId = assertValidTenantId(tenantId);
    const list = await this.getCategories(safeTenantId);
    const filtered = list.filter((c) => c.id !== id);

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('claim_expense_categories').delete().eq('id', id).eq('tenant_id', safeTenantId);
      } catch (err) {
        console.warn('Failed to delete claim category from server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(filtered));
      } catch {}
    }

    return true;
  }

  // ====================================================================
  // 2. AKTIVITAS OPERASIONAL (CLAIM EXPENSE ACTIVITIES)
  // ====================================================================

  static async getActivities(tenantId: string): Promise<ClaimExpenseActivity[]> {
    const safeTenantId = assertValidTenantId(tenantId);
    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('claim_expense_activities')
          .select('*')
          .eq('tenant_id', safeTenantId)
          .order('code', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            tenantId: row.tenant_id,
            code: row.code,
            name: row.name,
            businessLineId: row.business_line_id,
            description: row.description,
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));
        }
      } catch (err) {
        console.warn('Fallback to local storage for claim activities:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_ACTIVITIES_KEY);
        if (cached) return JSON.parse(cached);
        localStorage.setItem(LOCAL_STORAGE_ACTIVITIES_KEY, JSON.stringify(INITIAL_CLAIM_ACTIVITIES));
      } catch {}
    }

    return INITIAL_CLAIM_ACTIVITIES;
  }

  static async saveActivity(activity: Partial<ClaimExpenseActivity>, tenantId: string): Promise<ClaimExpenseActivity> {
    const safeTenantId = assertValidTenantId(activity.tenantId || tenantId);
    const list = await this.getActivities(safeTenantId);
    let updated: ClaimExpenseActivity;

    if (activity.id) {
      const idx = list.findIndex((a) => a.id === activity.id);
      if (idx >= 0) {
        updated = {
          ...list[idx],
          ...activity,
          tenantId: safeTenantId,
          updatedAt: new Date().toISOString()
        } as ClaimExpenseActivity;
        list[idx] = updated;
      } else {
        updated = {
          ...activity,
          id: activity.id,
          tenantId: safeTenantId,
          isActive: activity.isActive ?? true
        } as ClaimExpenseActivity;
        list.push(updated);
      }
    } else {
      updated = {
        id: `act_${Date.now()}`,
        tenantId: safeTenantId,
        code: (activity.code || 'ACT-NEW').toUpperCase().trim(),
        name: activity.name || 'New Activity',
        businessLineId: activity.businessLineId,
        description: activity.description,
        isActive: activity.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(updated);
    }

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('claim_expense_activities').upsert({
          id: updated.id,
          tenant_id: safeTenantId,
          code: updated.code,
          name: updated.name,
          business_line_id: updated.businessLineId,
          description: updated.description,
          is_active: updated.isActive,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to upsert claim activity to cloud server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_ACTIVITIES_KEY, JSON.stringify(list));
      } catch {}
    }

    return updated;
  }

  static async deleteActivity(id: string, tenantId: string): Promise<boolean> {
    const safeTenantId = assertValidTenantId(tenantId);
    const list = await this.getActivities(safeTenantId);
    const filtered = list.filter((a) => a.id !== id);

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        await client.from('claim_expense_activities').delete().eq('id', id).eq('tenant_id', safeTenantId);
      } catch (err) {
        console.warn('Failed to delete claim activity from server:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_ACTIVITIES_KEY, JSON.stringify(filtered));
      } catch {}
    }

    return true;
  }
}
