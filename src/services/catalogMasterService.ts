/**
 * Zyvora ERP 1.0.0 - Catalog Master Repository Service
 *
 * Mengelola persistensi data live untuk:
 * - public.product_categories (Kategori Barang & Layanan)
 * - public.unit_of_measures (Satuan Ukur / UoM)
 *
 * Dilengkapi isolasi multi-tenant, zero leakage rahasia developer,
 * auto-seeding data awal, dan fallback local cache.
 */

import { ProductCategory, UnitOfMeasure, UserProfile } from '../types/erp';
import { isSupabaseConfigured, getSupabaseClient } from './supabaseClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEFAULT_INITIAL_CATEGORIES: ProductCategory[] = [
  {
    id: 'cat_01',
    code: 'CAT-SMB',
    name: 'Food & Groceries',
    itemType: 'physical',
    description: 'Essential foodstuffs, grains, and staple commodities',
    isActive: true
  },
  {
    id: 'cat_02',
    code: 'CAT-MNM',
    name: 'Beverages & Dairy',
    itemType: 'physical',
    description: 'Packaged drinks, dairy products, and bottled refreshments',
    isActive: true
  },
  {
    id: 'cat_03',
    code: 'CAT-FMC',
    name: 'Consumer Goods & Retail',
    itemType: 'physical',
    description: 'Fast-moving consumer goods and household merchandise',
    isActive: true
  },
  {
    id: 'cat_04',
    code: 'CAT-MMD',
    name: 'Multimedia & Digital Invitations',
    itemType: 'service',
    description: 'Interactive web invitations, digital stationery, and creative media',
    isActive: true
  },
  {
    id: 'cat_05',
    code: 'CAT-LOG',
    name: 'Handling & Cargo Services',
    itemType: 'service',
    description: 'Warehouse labor, container unboxing, and freight handling',
    isActive: true
  },
  {
    id: 'cat_06',
    code: 'CAT-TRN',
    name: 'Transportation & Logistics',
    itemType: 'service',
    description: 'Heavy fleet trucking, intercity transport, and delivery dispatch',
    isActive: true
  }
];

export const DEFAULT_INITIAL_UOMS: UnitOfMeasure[] = [
  {
    id: 'uom_01',
    code: 'PCS',
    name: 'Pieces (Pcs) / Unit',
    classification: 'General',
    description: 'Standard single unit piece',
    isActive: true
  },
  {
    id: 'uom_02',
    code: 'DUS',
    name: 'Carton / Dus',
    classification: 'Packaging',
    description: 'Master carton containing multiple retail units',
    isActive: true
  },
  {
    id: 'uom_03',
    code: 'KRG',
    name: 'Sack / Bag (Karung)',
    classification: 'Packaging',
    description: 'Heavy duty woven bag for bulk grains',
    isActive: true
  },
  {
    id: 'uom_04',
    code: 'KG',
    name: 'Kilogram (Kg)',
    classification: 'Weight',
    description: 'Metric weight standard (1,000 grams)',
    isActive: true
  },
  {
    id: 'uom_05',
    code: 'LTR',
    name: 'Liter (L)',
    classification: 'Volume',
    description: 'Liquid volume measurement',
    isActive: true
  },
  {
    id: 'uom_06',
    code: 'BOX',
    name: 'Box / Container',
    classification: 'Packaging',
    description: 'Rigid corrugated retail presentation box',
    isActive: true
  },
  {
    id: 'uom_07',
    code: 'PKT',
    name: 'Service Package',
    classification: 'Service',
    description: 'Fixed-scope turnkey service engagement',
    isActive: true
  },
  {
    id: 'uom_08',
    code: 'PRJ',
    name: 'Project / Milestone',
    classification: 'Service',
    description: 'Deliverable-based customized scope',
    isActive: true
  },
  {
    id: 'uom_09',
    code: 'JAM',
    name: 'Hourly Rate',
    classification: 'Service',
    description: 'Time and materials billing unit',
    isActive: true
  },
  {
    id: 'uom_10',
    code: 'BLN',
    name: 'Monthly Subscription',
    classification: 'Service',
    description: 'Recurring monthly retainer or software seat',
    isActive: true
  },
  {
    id: 'uom_11',
    code: 'SESI',
    name: 'Event / Session',
    classification: 'Service',
    description: 'Single scheduled appearance or performance',
    isActive: true
  },
  {
    id: 'uom_12',
    code: 'TRP',
    name: 'Delivery Trip',
    classification: 'Logistics',
    description: 'Point-to-point roundtrip dispatch run',
    isActive: true
  }
];

// Fallback in-memory storage (Node testing environment)
const memoryCategories = new Map<string, ProductCategory[]>();
const memoryUoms = new Map<string, UnitOfMeasure[]>();

export class CatalogMasterService {
  private static resolveTenantId(rawId: string): string {
    if (rawId && UUID_REGEX.test(rawId)) {
      return rawId;
    }
    return '00000000-0000-0000-0000-000000000001';
  }

  // ====================================================================
  // 1. PRODUCT CATEGORIES (CRUD)
  // ====================================================================

  static async getCategories(tenantId: string): Promise<ProductCategory[]> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_CATEGORIES_${tenantId}`;

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('product_categories')
          .select('*')
          .eq('tenant_id', validTenantId)
          .order('name', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: ProductCategory[] = data.map((row: any) => ({
            id: row.id,
            tenantId: row.tenant_id,
            code: row.code,
            name: row.name,
            itemType: row.item_type || 'all',
            description: row.description || '',
            isActive: row.is_active ?? true,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(mapped));
            } catch {}
          }
          memoryCategories.set(tenantId, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[CatalogMasterService] getCategories notice:', err);
      }
    }

    // Fallback: LocalStorage / Memory
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryCategories.set(tenantId, parsed);
            return parsed;
          }
        }
      } catch {}
    }

    if (memoryCategories.has(tenantId)) {
      return memoryCategories.get(tenantId)!;
    }

    // Default Seed
    const seeded = DEFAULT_INITIAL_CATEGORIES.map((c) => ({
      ...c,
      tenantId: validTenantId
    }));
    memoryCategories.set(tenantId, seeded);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(seeded));
      } catch {}
    }
    return seeded;
  }

  static async saveCategory(
    tenantId: string,
    category: ProductCategory,
    actor?: UserProfile
  ): Promise<ProductCategory> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_CATEGORIES_${tenantId}`;

    const payload: any = {
      tenant_id: validTenantId,
      code: category.code.trim().toUpperCase(),
      name: category.name.trim(),
      item_type: category.itemType || 'all',
      description: category.description || '',
      is_active: category.isActive ?? true,
      updated_at: new Date().toISOString()
    };

    if (category.id && UUID_REGEX.test(category.id)) {
      payload.id = category.id;
    }

    let persisted: ProductCategory = { ...category, tenantId: validTenantId };

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('product_categories')
          .upsert(payload, { onConflict: 'tenant_id,code' })
          .select()
          .single();

        if (!error && data) {
          persisted = {
            id: data.id,
            tenantId: data.tenant_id,
            code: data.code,
            name: data.name,
            itemType: data.item_type,
            description: data.description || '',
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        console.warn('[CatalogMasterService] saveCategory notice:', err);
      }
    }

    // Sync Cache
    const currentList = await this.getCategories(tenantId);
    const idx = currentList.findIndex((c) => c.id === persisted.id || c.code === persisted.code);
    let updated: ProductCategory[];
    if (idx >= 0) {
      updated = currentList.map((c, i) => (i === idx ? persisted : c));
    } else {
      updated = [...currentList, persisted];
    }
    memoryCategories.set(tenantId, updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {}
    }

    return persisted;
  }

  static async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_CATEGORIES_${tenantId}`;

    if (isSupabaseConfigured && UUID_REGEX.test(categoryId)) {
      try {
        const client = getSupabaseClient();
        await client
          .from('product_categories')
          .delete()
          .eq('id', categoryId)
          .eq('tenant_id', validTenantId);
      } catch (err) {
        console.warn('[CatalogMasterService] deleteCategory notice:', err);
      }
    }

    const currentList = await this.getCategories(tenantId);
    const filtered = currentList.filter((c) => c.id !== categoryId);
    memoryCategories.set(tenantId, filtered);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      } catch {}
    }
  }

  // ====================================================================
  // 2. UNITS OF MEASURE / UOM (CRUD)
  // ====================================================================

  static async getUoms(tenantId: string): Promise<UnitOfMeasure[]> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_UOMS_${tenantId}`;

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('unit_of_measures')
          .select('*')
          .eq('tenant_id', validTenantId)
          .order('name', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: UnitOfMeasure[] = data.map((row: any) => ({
            id: row.id,
            tenantId: row.tenant_id,
            code: row.code,
            name: row.name,
            classification: row.classification || 'General',
            description: row.description || '',
            isActive: row.is_active ?? true,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(mapped));
            } catch {}
          }
          memoryUoms.set(tenantId, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[CatalogMasterService] getUoms notice:', err);
      }
    }

    // Fallback Local Cache
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryUoms.set(tenantId, parsed);
            return parsed;
          }
        }
      } catch {}
    }

    if (memoryUoms.has(tenantId)) {
      return memoryUoms.get(tenantId)!;
    }

    const seeded = DEFAULT_INITIAL_UOMS.map((u) => ({
      ...u,
      tenantId: validTenantId
    }));
    memoryUoms.set(tenantId, seeded);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(seeded));
      } catch {}
    }
    return seeded;
  }

  static async saveUom(
    tenantId: string,
    uom: UnitOfMeasure,
    actor?: UserProfile
  ): Promise<UnitOfMeasure> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_UOMS_${tenantId}`;

    const payload: any = {
      tenant_id: validTenantId,
      code: uom.code.trim().toUpperCase(),
      name: uom.name.trim(),
      classification: uom.classification || 'General',
      description: uom.description || '',
      is_active: uom.isActive ?? true,
      updated_at: new Date().toISOString()
    };

    if (uom.id && UUID_REGEX.test(uom.id)) {
      payload.id = uom.id;
    }

    let persisted: UnitOfMeasure = { ...uom, tenantId: validTenantId };

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('unit_of_measures')
          .upsert(payload, { onConflict: 'tenant_id,code' })
          .select()
          .single();

        if (!error && data) {
          persisted = {
            id: data.id,
            tenantId: data.tenant_id,
            code: data.code,
            name: data.name,
            classification: data.classification,
            description: data.description || '',
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        console.warn('[CatalogMasterService] saveUom notice:', err);
      }
    }

    // Sync Cache
    const currentList = await this.getUoms(tenantId);
    const idx = currentList.findIndex((u) => u.id === persisted.id || u.code === persisted.code);
    let updated: UnitOfMeasure[];
    if (idx >= 0) {
      updated = currentList.map((u, i) => (i === idx ? persisted : u));
    } else {
      updated = [...currentList, persisted];
    }
    memoryUoms.set(tenantId, updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {}
    }

    return persisted;
  }

  static async deleteUom(tenantId: string, uomId: string): Promise<void> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_UOMS_${tenantId}`;

    if (isSupabaseConfigured && UUID_REGEX.test(uomId)) {
      try {
        const client = getSupabaseClient();
        await client
          .from('unit_of_measures')
          .delete()
          .eq('id', uomId)
          .eq('tenant_id', validTenantId);
      } catch (err) {
        console.warn('[CatalogMasterService] deleteUom notice:', err);
      }
    }

    const currentList = await this.getUoms(tenantId);
    const filtered = currentList.filter((u) => u.id !== uomId);
    memoryUoms.set(tenantId, filtered);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      } catch {}
    }
  }
}
