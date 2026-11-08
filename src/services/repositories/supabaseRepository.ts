import { SupabaseClient } from '@supabase/supabase-js';
import {
  ICustomerRepository,
  ISalesOrderRepository,
  ITenantRepository,
  IAuditRepository,
  IDataRepositories
} from './types';
import {
  Customer,
  SalesOrder,
  Tenant,
  BusinessUnit,
  Branch,
  Warehouse,
  AuditLog
} from '../../types/erp';

export class SupabaseCustomerRepository implements ICustomerRepository {
  constructor(private client: SupabaseClient) {}

  async getAll(tenantId: string): Promise<Customer[]> {
    const { data, error } = await this.client
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('SupabaseCustomerRepository.getAll error:', error);
      throw new Error(`Gagal memuat data pelanggan dari Supabase: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      customerCode: row.customer_code,
      name: row.name,
      companyName: row.company_name,
      email: row.email || '',
      phone: row.phone || '',
      city: row.city || '',
      creditLimit: Number(row.credit_limit) || 0,
      totalOrders: Number(row.total_orders) || 0,
      outstandingBalance: Number(row.outstanding_balance) || 0,
      createdAt: row.created_at,
      status: row.status || 'active'
    }));
  }

  async getById(tenantId: string, id: string): Promise<Customer | null> {
    const { data, error } = await this.client
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      tenantId: data.tenant_id,
      customerCode: data.customer_code,
      name: data.name,
      companyName: data.company_name,
      email: data.email || '',
      phone: data.phone || '',
      city: data.city || '',
      creditLimit: Number(data.credit_limit) || 0,
      totalOrders: Number(data.total_orders) || 0,
      outstandingBalance: Number(data.outstanding_balance) || 0,
      createdAt: data.created_at,
      status: data.status || 'active'
    };
  }

  async getByCode(tenantId: string, customerCode: string): Promise<Customer | null> {
    const { data, error } = await this.client
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('customer_code', customerCode)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      tenantId: data.tenant_id,
      customerCode: data.customer_code,
      name: data.name,
      companyName: data.company_name,
      email: data.email || '',
      phone: data.phone || '',
      city: data.city || '',
      creditLimit: Number(data.credit_limit) || 0,
      totalOrders: Number(data.total_orders) || 0,
      outstandingBalance: Number(data.outstanding_balance) || 0,
      createdAt: data.created_at,
      status: data.status || 'active'
    };
  }

  async create(
    tenantId: string,
    data: Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'totalOrders' | 'outstandingBalance'>
  ): Promise<Customer> {
    const payload = {
      tenant_id: tenantId,
      customer_code: data.customerCode,
      name: data.name,
      company_name: data.companyName,
      email: data.email,
      phone: data.phone,
      city: data.city,
      credit_limit: data.creditLimit,
      status: data.status || 'active'
    };

    const { data: inserted, error } = await this.client
      .from('customers')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('SupabaseCustomerRepository.create error:', error);
      throw new Error(`Gagal menyimpan pelanggan ke Supabase: ${error.message}`);
    }

    return {
      id: inserted.id,
      tenantId: inserted.tenant_id,
      customerCode: inserted.customer_code,
      name: inserted.name,
      companyName: inserted.company_name,
      email: inserted.email || '',
      phone: inserted.phone || '',
      city: inserted.city || '',
      creditLimit: Number(inserted.credit_limit) || 0,
      totalOrders: 0,
      outstandingBalance: 0,
      createdAt: inserted.created_at,
      status: inserted.status
    };
  }
}

export class SupabaseSalesOrderRepository implements ISalesOrderRepository {
  constructor(private client: SupabaseClient) {}

  async getAll(tenantId: string, branchId?: string): Promise<SalesOrder[]> {
    let query = this.client
      .from('sales_orders')
      .select('*, items:sales_order_items(*)')
      .eq('tenant_id', tenantId)
      .order('order_date', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('SupabaseSalesOrderRepository.getAll error:', error);
      throw new Error(`Gagal memuat pesanan penjualan: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      businessUnitId: row.business_unit_id,
      branchId: row.branch_id,
      warehouseId: row.warehouse_id,
      orderNumber: row.order_number,
      customerCode: row.customer_code,
      customerName: row.customer_name,
      orderDate: row.order_date,
      deliveryDate: row.delivery_date,
      subtotal: Number(row.subtotal) || 0,
      tax: Number(row.tax) || 0,
      totalAmount: Number(row.total_amount) || 0,
      status: row.status,
      notes: row.notes,
      items: (row.items || []).map((i: any) => ({
        productId: i.product_id,
        sku: i.sku,
        name: i.name,
        quantity: Number(i.quantity) || 0,
        uom: i.uom,
        unitPrice: Number(i.unit_price) || 0,
        discount: Number(i.discount) || 0,
        total: Number(i.total) || 0
      }))
    }));
  }

  async getById(tenantId: string, id: string): Promise<SalesOrder | null> {
    const { data, error } = await this.client
      .from('sales_orders')
      .select('*, items:sales_order_items(*)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      tenantId: data.tenant_id,
      businessUnitId: data.business_unit_id,
      branchId: data.branch_id,
      warehouseId: data.warehouse_id,
      orderNumber: data.order_number,
      customerCode: data.customer_code,
      customerName: data.customer_name,
      orderDate: data.order_date,
      deliveryDate: data.delivery_date,
      subtotal: Number(data.subtotal) || 0,
      tax: Number(data.tax) || 0,
      totalAmount: Number(data.total_amount) || 0,
      status: data.status,
      notes: data.notes,
      items: (data.items || []).map((i: any) => ({
        productId: i.product_id,
        sku: i.sku,
        name: i.name,
        quantity: Number(i.quantity) || 0,
        uom: i.uom,
        unitPrice: Number(i.unit_price) || 0,
        discount: Number(i.discount) || 0,
        total: Number(i.total) || 0
      }))
    };
  }

  async create(tenantId: string, orderData: Omit<SalesOrder, 'id' | 'tenantId'>): Promise<SalesOrder> {
    const { data: insertedOrder, error: orderError } = await this.client
      .from('sales_orders')
      .insert({
        tenant_id: tenantId,
        business_unit_id: orderData.businessUnitId,
        branch_id: orderData.branchId,
        warehouse_id: orderData.warehouseId,
        order_number: orderData.orderNumber,
        customer_code: orderData.customerCode,
        customer_name: orderData.customerName,
        order_date: orderData.orderDate,
        delivery_date: orderData.deliveryDate,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        total_amount: orderData.totalAmount,
        status: orderData.status,
        notes: orderData.notes
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Gagal menyimpan pesanan: ${orderError.message}`);
    }

    return {
      ...orderData,
      id: insertedOrder.id,
      tenantId
    };
  }
}

export class SupabaseTenantRepository implements ITenantRepository {
  constructor(private client: SupabaseClient) {}

  async getTenant(id: string): Promise<Tenant | null> {
    const { data, error } = await this.client
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      slug: data.slug,
      plan: data.plan,
      createdAt: data.created_at,
      status: data.status
    };
  }

  async getBusinessUnits(tenantId: string): Promise<BusinessUnit[]> {
    const { data, error } = await this.client
      .from('business_units')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) return [];
    return (data || []).map((b: any) => ({
      id: b.id,
      tenantId: b.tenant_id,
      code: b.code,
      name: b.name,
      taxId: b.tax_id || '',
      currency: b.currency || 'IDR',
      isActive: b.is_active
    }));
  }

  async getBranches(businessUnitId: string): Promise<Branch[]> {
    const { data, error } = await this.client
      .from('branches')
      .select('*')
      .eq('business_unit_id', businessUnitId);

    if (error) return [];
    return (data || []).map((br: any) => ({
      id: br.id,
      businessUnitId: br.business_unit_id,
      code: br.code,
      name: br.name,
      city: br.city || '',
      address: br.address || '',
      phone: br.phone || '',
      isHeadquarters: br.is_headquarters,
      isActive: br.is_active
    }));
  }

  async getWarehouses(branchId: string): Promise<Warehouse[]> {
    const { data, error } = await this.client
      .from('warehouses')
      .select('*')
      .eq('branch_id', branchId);

    if (error) return [];
    return (data || []).map((w: any) => ({
      id: w.id,
      branchId: w.branch_id,
      code: w.code,
      name: w.name,
      type: w.type,
      address: w.address || '',
      capacityM2: Number(w.capacity_m2) || 0,
      isActive: w.is_active
    }));
  }
}

export class SupabaseAuditRepository implements IAuditRepository {
  constructor(private client: SupabaseClient) {}

  async log(tenantId: string, logData: Omit<AuditLog, 'id' | 'tenantId' | 'timestamp'>): Promise<AuditLog> {
    const payload = {
      tenant_id: tenantId,
      actor_name: logData.actorName,
      actor_role: logData.actorRole,
      action: logData.action,
      entity: logData.entity,
      entity_id: logData.entityId,
      description: logData.description,
      ip_address: logData.ipAddress
    };

    const { data, error } = await this.client
      .from('audit_logs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('Gagal mencatat audit log ke Supabase:', error);
      return {
        ...logData,
        id: `local_log_${Date.now()}`,
        tenantId,
        timestamp: new Date().toISOString()
      };
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      actorName: data.actor_name,
      actorRole: data.actor_role,
      action: data.action,
      entity: data.entity,
      entityId: data.entity_id,
      description: data.description,
      ipAddress: data.ip_address,
      timestamp: data.created_at
    };
  }

  async getAll(tenantId: string): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];
    return (data || []).map((d: any) => ({
      id: d.id,
      tenantId: d.tenant_id,
      actorName: d.actor_name,
      actorRole: d.actor_role,
      action: d.action,
      entity: d.entity,
      entityId: d.entity_id,
      description: d.description,
      ipAddress: d.ip_address,
      timestamp: d.created_at
    }));
  }
}

export const createSupabaseRepositories = (client: SupabaseClient): IDataRepositories => ({
  customer: new SupabaseCustomerRepository(client),
  salesOrder: new SupabaseSalesOrderRepository(client),
  tenant: new SupabaseTenantRepository(client),
  audit: new SupabaseAuditRepository(client)
});
