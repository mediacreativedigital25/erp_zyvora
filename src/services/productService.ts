/**
 * Zyvora ERP 1.0.0 — Live Product & Services Repository Service
 *
 * Mengelola persistensi data live ke database Supabase untuk:
 * - public.products (Barang Fisik & Digital)
 * - public.service_items (Layanan Jasa & Undangan Digital)
 *
 * Mendukung isolasi multi-tenant, caching lokal reaktif, dan self-healing fallback.
 */

import { Product, ServiceItem, UserProfile } from '../types/erp';
import { isSupabaseConfigured, getSupabaseClient } from './supabaseClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ProductService {
  private static memoryProducts: Map<string, Product[]> = new Map();
  private static memoryServices: Map<string, ServiceItem[]> = new Map();

  private static resolveTenantId(rawId: string): string {
    if (rawId && UUID_REGEX.test(rawId)) {
      return rawId;
    }
    return '00000000-0000-0000-0000-000000000001';
  }

  // ====================================================================
  // 1. PRODUK FISIK / PERSEDIAAN
  // ====================================================================

  /**
   * Mengambil daftar produk live dari Supabase (dengan cache fallback)
   */
  static async getProducts(tenantId: string): Promise<Product[]> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_PRODUCTS_${tenantId}`;

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('products')
          .select('*')
          .eq('tenant_id', validTenantId)
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          const mapped: Product[] = data.map((row: any) => ({
            id: row.id,
            tenantId: row.tenant_id,
            sku: row.sku,
            barcode: row.barcode || '',
            name: row.name,
            description: row.description || '',
            type: row.type || 'physical',
            category: row.category,
            businessLineId: row.business_line_id || undefined,
            uom: row.uom,
            weightGram: row.weight_gram || 0,
            minStockLevel: row.min_stock_level || 0,
            costPrice: parseFloat(row.cost_price) || 0,
            sellingPrice: parseFloat(row.selling_price) || 0,
            imageUrl: row.image_url || '',
            stockByWarehouse: row.stock_by_warehouse || {},
            totalStock: row.total_stock || 0,
            status: row.status as Product['status']
          }));

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(mapped));
            } catch {}
          }
          return mapped;
        }
      } catch (err) {
        console.warn('[ProductService] Supabase getProducts notice:', err);
      }
    }

    // Cache fallback
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.memoryProducts.set(validTenantId, parsed);
          return parsed;
        }
      } catch {}
    }

    return this.memoryProducts.get(validTenantId) || [];
  }

  /**
   * Menyimpan produk fisik baru atau memperbarui yang sudah ada secara live ke Supabase
   */
  static async saveProduct(
    tenantId: string,
    product: Product,
    actor?: UserProfile
  ): Promise<Product> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_PRODUCTS_${tenantId}`;

    const validBusinessLineId =
      product.businessLineId && UUID_REGEX.test(product.businessLineId)
        ? product.businessLineId
        : null;

    const payload: Record<string, any> = {
      tenant_id: validTenantId,
      sku: product.sku.trim().toUpperCase(),
      barcode: product.barcode?.trim() || null,
      name: product.name.trim(),
      description: product.description?.trim() || null,
      type: product.type || 'physical',
      category: product.category,
      business_line_id: validBusinessLineId,
      uom: product.uom,
      weight_gram: product.weightGram || 0,
      min_stock_level: product.minStockLevel || 0,
      cost_price: product.costPrice || 0,
      selling_price: product.sellingPrice || 0,
      image_url: product.imageUrl || null,
      stock_by_warehouse: product.stockByWarehouse || {},
      total_stock: product.totalStock || 0,
      status: product.status || 'active',
      updated_at: new Date().toISOString()
    };

    if (product.id && UUID_REGEX.test(product.id)) {
      payload.id = product.id;
    }

    if (actor?.id && UUID_REGEX.test(actor.id)) {
      payload.created_by = actor.id;
    }

    let persistedProduct: Product = { ...product };

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('products')
          .upsert(payload, { onConflict: 'tenant_id,sku' })
          .select()
          .single();

        if (!error && data) {
          persistedProduct = {
            id: data.id,
            tenantId: data.tenant_id,
            sku: data.sku,
            barcode: data.barcode || '',
            name: data.name,
            description: data.description || '',
            type: data.type || 'physical',
            category: data.category,
            businessLineId: data.business_line_id || undefined,
            uom: data.uom,
            weightGram: data.weight_gram || 0,
            minStockLevel: data.min_stock_level || 0,
            costPrice: parseFloat(data.cost_price) || 0,
            sellingPrice: parseFloat(data.selling_price) || 0,
            imageUrl: data.image_url || '',
            stockByWarehouse: data.stock_by_warehouse || {},
            totalStock: data.total_stock || 0,
            status: data.status as Product['status']
          };
        }
      } catch (err) {
        console.warn('[ProductService] Supabase saveProduct notice:', err);
      }
    }

    // Perbarui memory dan local cache
    const currentList = await this.getProducts(tenantId);
    const index = currentList.findIndex((p) => p.sku === persistedProduct.sku || p.id === persistedProduct.id);
    let updated: Product[];
    if (index >= 0) {
      updated = currentList.map((p, i) => (i === index ? persistedProduct : p));
    } else {
      updated = [...currentList, persistedProduct];
    }
    this.memoryProducts.set(validTenantId, updated);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {}
    }

    return persistedProduct;
  }

  /**
   * Mengubah status produk fisik (aktif / nonaktif) secara live
   */
  static async toggleProductStatus(
    tenantId: string,
    productId: string,
    newStatus: 'active' | 'inactive'
  ): Promise<void> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_PRODUCTS_${tenantId}`;

    if (isSupabaseConfigured && UUID_REGEX.test(productId)) {
      try {
        const client = getSupabaseClient();
        await client
          .from('products')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', productId)
          .eq('tenant_id', validTenantId);
      } catch (err) {
        console.warn('[ProductService] Supabase toggleProductStatus notice:', err);
      }
    }

    // Update memory & local cache
    const currentList = await this.getProducts(tenantId);
    const updated = currentList.map((p) => (p.id === productId ? { ...p, status: newStatus } : p));
    this.memoryProducts.set(validTenantId, updated);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {}
    }
  }

  // ====================================================================
  // 2. LAYANAN JASA & PRODUK DIGITAL
  // ====================================================================

  /**
   * Mengambil daftar layanan jasa live dari Supabase
   */
  static async getServices(tenantId: string): Promise<ServiceItem[]> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_SERVICES_${tenantId}`;

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('service_items')
          .select('*')
          .eq('tenant_id', validTenantId)
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          const mapped: ServiceItem[] = data.map((row: any) => ({
            id: row.id,
            tenantId: row.tenant_id,
            code: row.code,
            barcode: row.barcode || '',
            name: row.name,
            description: row.description || '',
            category: row.category,
            businessLineId: row.business_line_id || undefined,
            uom: row.uom,
            costPrice: parseFloat(row.cost_price) || 0,
            rate: parseFloat(row.rate) || 0,
            imageUrl: row.image_url || '',
            isActive: Boolean(row.is_active)
          }));

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(mapped));
            } catch {}
          }
          return mapped;
        }
      } catch (err) {
        console.warn('[ProductService] Supabase getServices notice:', err);
      }
    }

    // Cache fallback
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.memoryServices.set(validTenantId, parsed);
          return parsed;
        }
      } catch {}
    }

    return this.memoryServices.get(validTenantId) || [];
  }

  /**
   * Menyimpan layanan jasa live ke Supabase
   */
  static async saveService(
    tenantId: string,
    service: ServiceItem,
    actor?: UserProfile
  ): Promise<ServiceItem> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_SERVICES_${tenantId}`;

    const validBusinessLineId =
      service.businessLineId && UUID_REGEX.test(service.businessLineId)
        ? service.businessLineId
        : null;

    const payload: Record<string, any> = {
      tenant_id: validTenantId,
      code: service.code.trim().toUpperCase(),
      barcode: service.barcode?.trim() || null,
      name: service.name.trim(),
      description: service.description?.trim() || null,
      category: service.category,
      business_line_id: validBusinessLineId,
      uom: service.uom,
      cost_price: service.costPrice || 0,
      rate: service.rate || 0,
      image_url: service.imageUrl || null,
      is_active: service.isActive !== false,
      updated_at: new Date().toISOString()
    };

    if (service.id && UUID_REGEX.test(service.id)) {
      payload.id = service.id;
    }

    if (actor?.id && UUID_REGEX.test(actor.id)) {
      payload.created_by = actor.id;
    }

    let persistedService: ServiceItem = { ...service };

    if (isSupabaseConfigured) {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('service_items')
          .upsert(payload, { onConflict: 'tenant_id,code' })
          .select()
          .single();

        if (!error && data) {
          persistedService = {
            id: data.id,
            tenantId: data.tenant_id,
            code: data.code,
            barcode: data.barcode || '',
            name: data.name,
            description: data.description || '',
            category: data.category,
            businessLineId: data.business_line_id || undefined,
            uom: data.uom,
            costPrice: parseFloat(data.cost_price) || 0,
            rate: parseFloat(data.rate) || 0,
            imageUrl: data.image_url || '',
            isActive: Boolean(data.is_active)
          };
        }
      } catch (err) {
        console.warn('[ProductService] Supabase saveService notice:', err);
      }
    }

    // Cache update memory & localStorage
    const currentList = await this.getServices(tenantId);
    const index = currentList.findIndex((s) => s.code === persistedService.code || s.id === persistedService.id);
    let updated: ServiceItem[];
    if (index >= 0) {
      updated = currentList.map((s, i) => (i === index ? persistedService : s));
    } else {
      updated = [...currentList, persistedService];
    }
    this.memoryServices.set(validTenantId, updated);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {}
    }

    return persistedService;
  }

  /**
   * Mengubah status aktif layanan jasa live
   */
  static async toggleServiceStatus(
    tenantId: string,
    serviceId: string,
    isActive: boolean
  ): Promise<void> {
    const validTenantId = this.resolveTenantId(tenantId);
    const cacheKey = `ZYVORA_SERVICES_${tenantId}`;

    if (isSupabaseConfigured && UUID_REGEX.test(serviceId)) {
      try {
        const client = getSupabaseClient();
        await client
          .from('service_items')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', serviceId)
          .eq('tenant_id', validTenantId);
      } catch (err) {
        console.warn('[ProductService] Supabase toggleServiceStatus notice:', err);
      }
    }

    // Cache update memory & localStorage
    const currentList = await this.getServices(tenantId);
    const updated = currentList.map((s) => (s.id === serviceId ? { ...s, isActive } : s));
    this.memoryServices.set(validTenantId, updated);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      } catch {}
    }
  }
}
