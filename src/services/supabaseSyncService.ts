import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import {
  Customer,
  ServiceBookingOrder,
  ServiceBookingItem,
  PaymentMilestone,
  SalesOrder,
  SalesOrderItem,
  SalesInvoice,
  SalesInvoiceItem,
  ReceivePayment,
  Product,
  Vendor
} from '../types/erp';

// ====================================================================
// TENANT & DATE SANITIZATION HELPERS (PostgreSQL Type Compliance)
// ====================================================================

/**
 * Safely normalizes tenant IDs to guarantee foreign key integrity against public.tenants.
 * Never allows dummy/fallback UUIDs or raw codes to reach the database.
 */
export const sanitizeTenantId = (tid?: string | null): string => {
  if (!tid || tid === '00000000-0000-4000-8000-000000000001' || tid === 'undefined' || tid === 'null' || !tid.trim()) {
    return 'ten_zyvora_corp';
  }
  const clean = tid.trim();
  if (clean === 'ZYV-CORP') return 'ten_zyvora_corp';
  if (clean === 'HZK') return 'ten_hizaki_wedding';
  if (clean === 'YUL-HOLD') return 'ten_yulovi_holdings';
  if (clean === 'PLS-LOG') return 'ten_prima_logistik';
  return clean;
};

/**
 * Safely sanitizes date strings for PostgreSQL DATE columns.
 * Returns null if the value is empty, whitespace, or undefined.
 * If fallbackToToday is true, returns current YYYY-MM-DD instead of null.
 */
export const sanitizeDate = (val?: string | null, fallbackToToday = false): string | null => {
  if (!val || typeof val !== 'string' || val.trim() === '') {
    return fallbackToToday ? new Date().toISOString().split('T')[0] : null;
  }
  return val.trim();
};

// ====================================================================
// 1. CUSTOMERS SYNC
// ====================================================================

export const mapCustomerToRow = (c: Customer): Record<string, any> => {
  const row: Record<string, any> = {
    id: c.id,
    tenant_id: sanitizeTenantId(c.tenantId),
    customer_code: c.customerCode,
    customer_type: c.customerType || 'general',
    name: c.name,
    company_name: c.companyName || '',
    email: c.email || '',
    phone: c.phone || '',
    city: c.city || '',
    credit_limit: c.creditLimit || 0,
    total_orders: c.totalOrders || 0,
    outstanding_balance: c.outstandingBalance || 0,
    status: c.status || 'active',
    address: c.address || '',
    country: c.country || 'Indonesia'
  };

  if (c.paymentTerms !== undefined) row.payment_terms = c.paymentTerms;
  if (c.paymentTermsDays !== undefined) row.payment_terms_days = c.paymentTermsDays;
  if (c.defaultPaymentMethod !== undefined) row.default_payment_method = c.defaultPaymentMethod;
  if (c.defaultDownPaymentPercent !== undefined) row.default_down_payment_percent = c.defaultDownPaymentPercent;
  if (c.npwp !== undefined) row.npwp = c.npwp;
  if (c.province !== undefined) row.province = c.province;
  if (c.provinceId !== undefined) row.province_id = c.provinceId;
  if (c.regency !== undefined) row.regency = c.regency;
  if (c.regencyId !== undefined) row.regency_id = c.regencyId;
  if (c.district !== undefined) row.district = c.district;
  if (c.districtId !== undefined) row.district_id = c.districtId;
  if (c.village !== undefined) row.village = c.village;
  if (c.villageId !== undefined) row.village_id = c.villageId;
  if (c.postalCode !== undefined) row.postal_code = c.postalCode;
  if (c.eventTitle !== undefined) row.event_title = c.eventTitle;
  row.target_event_date = sanitizeDate(c.targetEventDate, false);
  if (c.eventSession !== undefined) row.event_session = c.eventSession;
  if (c.interestedBusinessLineId !== undefined) row.interested_business_line_id = c.interestedBusinessLineId;
  if (c.estimatedGuestCount !== undefined) row.estimated_guest_count = c.estimatedGuestCount;
  if (c.venueName !== undefined) row.venue_name = c.venueName;
  if (c.eventNotes !== undefined) row.event_notes = c.eventNotes;
  if (c.createdAt) row.created_at = c.createdAt;

  return row;
};

export const mapRowToCustomer = (row: any): Customer => ({
  id: row.id,
  tenantId: row.tenant_id,
  customerCode: row.customer_code,
  customerType: row.customer_type || 'general',
  name: row.name,
  companyName: row.company_name || '',
  email: row.email || '',
  phone: row.phone || '',
  city: row.city || '',
  creditLimit: Number(row.credit_limit) || 0,
  totalOrders: Number(row.total_orders) || 0,
  outstandingBalance: Number(row.outstanding_balance) || 0,
  createdAt: row.created_at || new Date().toISOString(),
  status: row.status || 'active',
  paymentTerms: row.payment_terms,
  paymentTermsDays: row.payment_terms_days ? Number(row.payment_terms_days) : undefined,
  defaultPaymentMethod: row.default_payment_method,
  defaultDownPaymentPercent: row.default_down_payment_percent ? Number(row.default_down_payment_percent) : undefined,
  npwp: row.npwp,
  address: row.address,
  country: row.country || 'Indonesia',
  province: row.province,
  provinceId: row.province_id,
  regency: row.regency,
  regencyId: row.regency_id,
  district: row.district,
  districtId: row.district_id,
  village: row.village,
  villageId: row.village_id,
  postalCode: row.postal_code,
  eventTitle: row.event_title,
  targetEventDate: row.target_event_date,
  eventSession: row.event_session,
  interestedBusinessLineId: row.interested_business_line_id,
  estimatedGuestCount: row.estimated_guest_count ? Number(row.estimated_guest_count) : undefined,
  venueName: row.venue_name,
  eventNotes: row.event_notes
});

export const syncCustomerToSupabase = async (c: Customer): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) return { success: true };
  try {
    const client = getSupabaseClient();
    const row = mapCustomerToRow(c);
    const { error } = await client.from('customers').upsert(row);
    if (error) {
      console.warn('[Supabase Sync] Upsert customer error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync] Customer sync exception:', err);
    return { success: false, error: err?.message || 'Customer sync exception' };
  }
};

export const deleteCustomerFromSupabase = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('customers').delete().eq('id', id);
    if (error) console.warn('[Supabase Sync] Delete customer error:', error.message);
  } catch (err) {
    console.warn('[Supabase Sync] Delete customer exception:', err);
  }
};

export const fetchCustomersFromSupabase = async (tenantId?: string): Promise<Customer[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const client = getSupabaseClient();
    let query = client.from('customers').select('*');
    if (tenantId && tenantId !== 'ten_zyvora_corp' && tenantId !== 'all') {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Sync] Fetch customers error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToCustomer);
  } catch (err) {
    console.warn('[Supabase Sync] Fetch customers exception:', err);
    return [];
  }
};

// ====================================================================
// 2. SERVICE BOOKINGS SYNC (with Items & Milestones)
// ====================================================================

export const mapServiceBookingToRow = (b: ServiceBookingOrder): Record<string, any> => {
  const safeBookingDate = sanitizeDate(b.bookingDate, true)!;
  const safeCustomerName = (b.customerName && b.customerName.trim()) || 'Pelanggan Umum';
  const safeEventTitle = (b.eventTitle && b.eventTitle.trim()) || `Pesanan ${safeCustomerName}`;
  const safeEventDate = sanitizeDate(b.eventDate, false) || safeBookingDate;

  return {
    id: b.id,
    tenant_id: sanitizeTenantId(b.tenantId),
    booking_number: b.bookingNumber,
    booking_date: safeBookingDate,
    customer_id: b.customerId || null,
    customer_code: b.customerCode || 'CUST',
    customer_name: safeCustomerName,
    customer_phone: b.customerPhone || '',
    customer_email: b.customerEmail || '',
    event_title: safeEventTitle,
    event_date: safeEventDate,
    event_session: b.eventSession || 'morning',
    venue_name: b.venueName || '',
    venue_address: b.venueAddress || '',
    venue_city: b.venueCity || '',
    distance_from_hq_km: b.distanceFromHqKm || null,
    estimated_guest_count: b.estimatedGuestCount || null,
    subtotal: b.subtotal || 0,
    discount_total: b.discountTotal || 0,
    discount1: b.discount1 || 0,
    discount2: b.discount2 || 0,
    tax_amount: b.taxAmount || 0,
    total_amount: b.totalAmount || 0,
    paid_amount: b.paidAmount || 0,
    outstanding_balance: b.outstandingBalance || 0,
    status: b.status || 'open',
    sales_pic_name: b.salesPicName || '',
    branch_id: b.branchId || null,
    branch_code: b.branchCode || null,
    branch_name: b.branchName || null,
    order_type: b.orderType || null,
    warehouse_name: b.warehouseName || null,
    delivery_via: b.deliveryVia || null,
    price_list: b.priceList || null,
    payment_term_text: b.paymentTermText || null,
    so_format: b.soFormat || null,
    notes: b.notes || '',
    assigned_crew_lead_name: b.assignedCrewLeadName || null,
    assigned_crew_count: b.assignedCrewCount || 0,
    assigned_crew_members: b.assignedCrewMembers || [],
    assigned_vehicle_id: b.assignedVehicleId || null,
    assigned_vehicle_plate: b.assignedVehiclePlate || null,
    assigned_vehicle_model: b.assignedVehicleModel || null,
    receive_number: b.receiveNumber || null,
    receive_date: sanitizeDate(b.receiveDate, false),
    delivery_order_number: b.deliveryOrderNumber || null,
    picking_date: sanitizeDate(b.pickingDate, false),
    created_at: b.createdAt || new Date().toISOString()
  };
};

export const mapRowToServiceBooking = (row: any): ServiceBookingOrder => {
  const items: ServiceBookingItem[] = (row.items || []).map((i: any) => ({
    id: i.id,
    businessLineId: i.business_line_id || '',
    businessLineName: i.business_line_name || '',
    costCenterCode: i.cost_center_code || '',
    serviceName: i.service_name || '',
    sku: i.sku || '',
    description: i.description || '',
    quantity: Number(i.quantity) || 1,
    uom: i.uom || 'Package',
    unitPrice: Number(i.unit_price) || 0,
    discount: Number(i.discount) || 0,
    discountPercent: Number(i.discount_percent) || 0,
    subtotal: Number(i.subtotal) || 0,
    isBonus: Boolean(i.is_bonus)
  }));

  const milestones: PaymentMilestone[] = (row.milestones || []).map((m: any) => ({
    id: m.id,
    milestoneName: m.milestone_name || '',
    percentage: Number(m.percentage) || 0,
    amount: Number(m.amount) || 0,
    dueDate: m.due_date || '',
    paidAmount: Number(m.paid_amount) || 0,
    paidDate: m.paid_date || undefined,
    status: m.status || 'unpaid'
  }));

  return {
    id: row.id,
    tenantId: row.tenant_id,
    bookingNumber: row.booking_number,
    bookingDate: row.booking_date,
    customerId: row.customer_id,
    customerCode: row.customer_code,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || '',
    customerEmail: row.customer_email || '',
    eventTitle: row.event_title,
    eventDate: row.event_date,
    eventSession: row.event_session || 'morning',
    venueName: row.venue_name || '',
    venueAddress: row.venue_address || '',
    venueCity: row.venue_city || '',
    distanceFromHqKm: row.distance_from_hq_km ? Number(row.distance_from_hq_km) : undefined,
    estimatedGuestCount: row.estimated_guest_count ? Number(row.estimated_guest_count) : undefined,
    items,
    milestones,
    subtotal: Number(row.subtotal) || 0,
    discountTotal: Number(row.discount_total) || 0,
    discount1: Number(row.discount1) || 0,
    discount2: Number(row.discount2) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    outstandingBalance: Number(row.outstanding_balance) || 0,
    status: row.status || 'open',
    salesPicName: row.sales_pic_name || '',
    branchId: row.branch_id,
    branchCode: row.branch_code,
    branchName: row.branch_name,
    orderType: row.order_type,
    warehouseName: row.warehouse_name,
    deliveryVia: row.delivery_via,
    priceList: row.price_list,
    paymentTermText: row.payment_term_text,
    soFormat: row.so_format,
    notes: row.notes || '',
    assignedCrewLeadName: row.assigned_crew_lead_name,
    assignedCrewCount: row.assigned_crew_count ? Number(row.assigned_crew_count) : 0,
    assignedCrewMembers: row.assigned_crew_members || [],
    assignedVehicleId: row.assigned_vehicle_id,
    assignedVehiclePlate: row.assigned_vehicle_plate,
    assignedVehicleModel: row.assigned_vehicle_model,
    receiveNumber: row.receive_number,
    receiveDate: row.receive_date,
    deliveryOrderNumber: row.delivery_order_number,
    pickingDate: row.picking_date,
    createdAt: row.created_at || new Date().toISOString()
  };
};

export const syncServiceBookingToSupabase = async (b: ServiceBookingOrder): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) return { success: true };
  try {
    const client = getSupabaseClient();
    const row = mapServiceBookingToRow(b);
    const { error: bookingError } = await client.from('service_bookings').upsert(row);
    if (bookingError) {
      console.warn('[Supabase Sync] Upsert booking error:', bookingError.message);
      return { success: false, error: bookingError.message };
    }

    // Upsert items
    if (b.items && b.items.length > 0) {
      const itemsRows = b.items.map((i) => ({
        id: i.id,
        booking_id: b.id,
        business_line_id: i.businessLineId || null,
        business_line_name: i.businessLineName || null,
        cost_center_code: i.costCenterCode || null,
        service_name: i.serviceName,
        sku: i.sku || null,
        description: i.description || null,
        quantity: i.quantity,
        uom: i.uom || 'Package',
        unit_price: i.unitPrice,
        discount: i.discount || 0,
        discount_percent: i.discountPercent || 0,
        subtotal: i.subtotal,
        is_bonus: i.isBonus || false
      }));
      await client.from('service_booking_items').upsert(itemsRows);
    }

    // Upsert milestones
    if (b.milestones && b.milestones.length > 0) {
      const safeDueDateFallback = sanitizeDate(b.bookingDate, true)!;
      const milestoneRows = b.milestones.map((m) => ({
        id: m.id,
        booking_id: b.id,
        milestone_name: m.milestoneName || 'Tahap Pembayaran',
        percentage: m.percentage || 0,
        amount: m.amount || 0,
        due_date: sanitizeDate(m.dueDate, false) || safeDueDateFallback,
        paid_amount: m.paidAmount || 0,
        paid_date: sanitizeDate(m.paidDate, false),
        status: m.status || 'unpaid'
      }));
      await client.from('service_booking_milestones').upsert(milestoneRows);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync] Service booking sync exception:', err);
    return { success: false, error: err?.message || 'Booking sync exception' };
  }
};

export const deleteServiceBookingFromSupabase = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('service_bookings').delete().eq('id', id);
    if (error) console.warn('[Supabase Sync] Delete booking error:', error.message);
  } catch (err) {
    console.warn('[Supabase Sync] Delete booking exception:', err);
  }
};

export const fetchServiceBookingsFromSupabase = async (tenantId?: string): Promise<ServiceBookingOrder[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const client = getSupabaseClient();
    let query = client
      .from('service_bookings')
      .select('*, items:service_booking_items(*), milestones:service_booking_milestones(*)');
    if (tenantId && tenantId !== 'ten_zyvora_corp' && tenantId !== 'all') {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Sync] Fetch bookings error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToServiceBooking);
  } catch (err) {
    console.warn('[Supabase Sync] Fetch bookings exception:', err);
    return [];
  }
};

// ====================================================================
// 3. SALES ORDERS SYNC (with Items)
// ====================================================================

export const mapSalesOrderToRow = (o: SalesOrder): Record<string, any> => {
  const safeOrderDate = sanitizeDate(o.orderDate, true)!;
  const safeCustomerName = (o.customerName && o.customerName.trim()) || 'Pelanggan Umum';

  return {
    id: o.id,
    tenant_id: sanitizeTenantId(o.tenantId),
    business_unit_id: o.businessUnitId || null,
    branch_id: o.branchId || null,
    warehouse_id: o.warehouseId || null,
    order_number: o.orderNumber,
    customer_id: o.customerId || null,
    customer_code: o.customerCode || 'CUST',
    customer_name: safeCustomerName,
    customer_phone: o.customerPhone || '',
    customer_address: o.customerAddress || '',
    order_date: safeOrderDate,
    delivery_date: sanitizeDate(o.deliveryDate, false),
    payment_method: o.paymentMethod || 'cash',
    payment_terms_days: o.paymentTermsDays || 0,
    subtotal: o.subtotal || 0,
    discount_total: o.discountTotal || 0,
    tax: o.tax || 0,
    total_amount: o.totalAmount || 0,
    status: o.status || 'open',
    receive_number: o.receiveNumber || null,
    receive_date: sanitizeDate(o.receiveDate, false),
    delivery_order_number: o.deliveryOrderNumber || null,
    picking_date: sanitizeDate(o.pickingDate, false),
    notes: o.notes || '',
    created_at: safeOrderDate ? `${safeOrderDate}T00:00:00Z` : new Date().toISOString()
  };
};

export const mapRowToSalesOrder = (row: any): SalesOrder => {
  const items: SalesOrderItem[] = (row.items || []).map((i: any) => ({
    productId: i.product_id || '',
    sku: i.sku || '',
    name: i.name || '',
    quantity: Number(i.quantity) || 1,
    uom: i.uom || 'Pcs',
    unitPrice: Number(i.unit_price) || 0,
    discount: Number(i.discount) || 0,
    total: Number(i.total) || 0,
    isBonus: Boolean(i.is_bonus)
  }));

  return {
    id: row.id,
    tenantId: row.tenant_id,
    businessUnitId: row.business_unit_id || '',
    branchId: row.branch_id || '',
    warehouseId: row.warehouse_id || '',
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerCode: row.customer_code,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || '',
    customerAddress: row.customer_address || '',
    orderDate: row.order_date,
    deliveryDate: row.delivery_date,
    paymentMethod: row.payment_method || 'cash',
    paymentTermsDays: Number(row.payment_terms_days) || 0,
    subtotal: Number(row.subtotal) || 0,
    discountTotal: Number(row.discount_total) || 0,
    tax: Number(row.tax) || 0,
    totalAmount: Number(row.total_amount) || 0,
    status: row.status || 'open',
    receiveNumber: row.receive_number,
    receiveDate: row.receive_date,
    deliveryOrderNumber: row.delivery_order_number,
    pickingDate: row.picking_date,
    notes: row.notes || '',
    items
  };
};

export const syncSalesOrderToSupabase = async (o: SalesOrder): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) return { success: true };
  try {
    const client = getSupabaseClient();
    const row = mapSalesOrderToRow(o);
    const { error } = await client.from('sales_orders').upsert(row);
    if (error) {
      console.warn('[Supabase Sync] Upsert sales order error:', error.message);
      return { success: false, error: error.message };
    }

    if (o.items && o.items.length > 0) {
      const itemsRows = o.items.map((i, idx) => ({
        id: `${o.id}_item_${idx + 1}`,
        order_id: o.id,
        product_id: i.productId || null,
        sku: i.sku || null,
        name: i.name,
        quantity: i.quantity,
        uom: i.uom || 'Pcs',
        unit_price: i.unitPrice,
        discount: i.discount || 0,
        total: i.total,
        is_bonus: i.isBonus || false
      }));
      await client.from('sales_order_items').upsert(itemsRows);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync] Sales order sync exception:', err);
    return { success: false, error: err?.message || 'Sales order sync exception' };
  }
};

export const deleteSalesOrderFromSupabase = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('sales_orders').delete().eq('id', id);
    if (error) console.warn('[Supabase Sync] Delete sales order error:', error.message);
  } catch (err) {
    console.warn('[Supabase Sync] Delete sales order exception:', err);
  }
};

export const fetchSalesOrdersFromSupabase = async (tenantId?: string): Promise<SalesOrder[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const client = getSupabaseClient();
    let query = client.from('sales_orders').select('*, items:sales_order_items(*)');
    if (tenantId && tenantId !== 'ten_zyvora_corp' && tenantId !== 'all') {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('order_date', { ascending: false });

    if (error) {
      console.warn('[Supabase Sync] Fetch sales orders error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToSalesOrder);
  } catch (err) {
    console.warn('[Supabase Sync] Fetch sales orders exception:', err);
    return [];
  }
};

// ====================================================================
// 4. SALES INVOICES SYNC (with Items)
// ====================================================================

export const mapInvoiceToRow = (inv: SalesInvoice): Record<string, any> => {
  const safeInvoiceDate = sanitizeDate(inv.invoiceDate, true)!;
  const safeDueDate = sanitizeDate(inv.dueDate, false) || safeInvoiceDate;

  return {
    id: inv.id,
    tenant_id: sanitizeTenantId(inv.tenantId),
    invoice_number: inv.invoiceNumber,
    source_type: inv.sourceType || 'service_booking',
    source_id: inv.sourceId || null,
    source_number: inv.sourceNumber || null,
    customer_id: inv.customerId || null,
    customer_code: inv.customerCode || 'CUST',
    customer_name: (inv.customerName && inv.customerName.trim()) || 'Pelanggan Umum',
    customer_phone: inv.customerPhone || '',
    customer_address: inv.customerAddress || '',
    invoice_date: safeInvoiceDate,
    due_date: safeDueDate,
    payment_method: inv.paymentMethod || 'transfer',
    payment_terms_days: inv.paymentTermsDays || 0,
    subtotal: inv.subtotal || 0,
    discount_total: inv.discountTotal || 0,
    tax_amount: inv.taxAmount || 0,
    total_amount: inv.totalAmount || 0,
    paid_amount: inv.paidAmount || 0,
    outstanding_balance: inv.outstandingBalance || 0,
    status: inv.status || 'unpaid',
    notes: inv.notes || '',
    delivery_order_number: inv.deliveryOrderNumber || null,
    branch_id: inv.branchId || null,
    branch_code: inv.branchCode || null,
    sales_pic_name: inv.salesPicName || null,
    is_printed: inv.isPrinted || false,
    printed_at: sanitizeDate(inv.printedAt, false),
    created_at: inv.createdAt || new Date().toISOString()
  };
};

export const mapRowToInvoice = (row: any): SalesInvoice => {
  const items: SalesInvoiceItem[] = (row.items || []).map((i: any) => ({
    id: i.id,
    description: i.description || '',
    quantity: Number(i.quantity) || 1,
    uom: i.uom || 'Package',
    unitPrice: Number(i.unit_price) || 0,
    discount: Number(i.discount) || 0,
    subtotal: Number(i.subtotal) || 0,
    costCenterCode: i.cost_center_code
  }));

  return {
    id: row.id,
    tenantId: row.tenant_id,
    invoiceNumber: row.invoice_number,
    sourceType: row.source_type || 'service_booking',
    sourceId: row.source_id,
    sourceNumber: row.source_number,
    customerId: row.customer_id,
    customerCode: row.customer_code,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || '',
    customerAddress: row.customer_address || '',
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    paymentMethod: row.payment_method || 'transfer',
    paymentTermsDays: Number(row.payment_terms_days) || 0,
    items,
    subtotal: Number(row.subtotal) || 0,
    discountTotal: Number(row.discount_total) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    outstandingBalance: Number(row.outstanding_balance) || 0,
    status: row.status || 'unpaid',
    notes: row.notes || '',
    deliveryOrderNumber: row.delivery_order_number,
    branchId: row.branch_id,
    branchCode: row.branch_code,
    salesPicName: row.sales_pic_name,
    isPrinted: Boolean(row.is_printed),
    printedAt: row.printed_at,
    createdAt: row.created_at || new Date().toISOString()
  };
};

export const syncInvoiceToSupabase = async (inv: SalesInvoice): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) return { success: true };
  try {
    const client = getSupabaseClient();
    const row = mapInvoiceToRow(inv);
    const { error } = await client.from('sales_invoices').upsert(row);
    if (error) {
      console.warn('[Supabase Sync] Upsert invoice error:', error.message);
      return { success: false, error: error.message };
    }

    if (inv.items && inv.items.length > 0) {
      const itemsRows = inv.items.map((i) => ({
        id: i.id,
        invoice_id: inv.id,
        description: i.description,
        quantity: i.quantity,
        uom: i.uom || 'Package',
        unit_price: i.unitPrice,
        discount: i.discount || 0,
        subtotal: i.subtotal,
        cost_center_code: i.costCenterCode || null
      }));
      await client.from('sales_invoice_items').upsert(itemsRows);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync] Invoice sync exception:', err);
    return { success: false, error: err?.message || 'Invoice sync exception' };
  }
};

export const deleteInvoiceFromSupabase = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('sales_invoices').delete().eq('id', id);
    if (error) console.warn('[Supabase Sync] Delete invoice error:', error.message);
  } catch (err) {
    console.warn('[Supabase Sync] Delete invoice exception:', err);
  }
};

export const fetchInvoicesFromSupabase = async (tenantId?: string): Promise<SalesInvoice[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const client = getSupabaseClient();
    let query = client.from('sales_invoices').select('*, items:sales_invoice_items(*)');
    if (tenantId && tenantId !== 'ten_zyvora_corp' && tenantId !== 'all') {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('invoice_date', { ascending: false });

    if (error) {
      console.warn('[Supabase Sync] Fetch invoices error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToInvoice);
  } catch (err) {
    console.warn('[Supabase Sync] Fetch invoices exception:', err);
    return [];
  }
};

// ====================================================================
// 5. RECEIVE PAYMENTS SYNC
// ====================================================================

export const mapReceivePaymentToRow = (rp: ReceivePayment): Record<string, any> => {
  const safePaymentDate = sanitizeDate(rp.paymentDate, true)!;

  return {
    id: rp.id,
    tenant_id: sanitizeTenantId(rp.tenantId),
    payment_number: rp.paymentNumber,
    sys_number: rp.sysNumber || null,
    branch_id: rp.branchId || null,
    branch_code: rp.branchCode || null,
    branch_name: rp.branchName || null,
    document_number: rp.documentNumber || null,
    payment_date: safePaymentDate,
    payment_allocation: rp.paymentAllocation || 'automatic',
    from_invoice_collection: rp.fromInvoiceCollection || false,
    invoice_collection_number: rp.invoiceCollectionNumber || null,
    collector_id: rp.collectorId || null,
    collector_code: rp.collectorCode || null,
    collector_name: rp.collectorName || null,
    customer_id: rp.customerId || null,
    customer_code: rp.customerCode || 'CUST',
    customer_name: (rp.customerName && rp.customerName.trim()) || 'Pelanggan Umum',
    currency: rp.currency || 'IDR',
    total_payment_amount: rp.totalPaymentAmount || 0,
    total_allocated_amount: rp.totalAllocatedAmount || 0,
    payment_methods: rp.paymentMethods || [],
    allocations: rp.allocations || [],
    source: rp.source || 'Zyvora',
    status: rp.status || 'draft',
    is_checked: rp.isChecked || false,
    is_deposited: rp.isDeposited || false,
    deposited_at: sanitizeDate(rp.depositedAt, false),
    cash_transaction_id: rp.cashTransactionId || null,
    cash_transaction_number: rp.cashTransactionNumber || null,
    notes: rp.notes || null,
    approved_at: sanitizeDate(rp.approvedAt, false),
    approved_by: rp.approvedBy || null,
    created_at: rp.createdAt || new Date().toISOString()
  };
};

export const mapRowToReceivePayment = (row: any): ReceivePayment => ({
  id: row.id,
  tenantId: row.tenant_id,
  paymentNumber: row.payment_number,
  sysNumber: row.sys_number,
  branchId: row.branch_id,
  branchCode: row.branch_code,
  branchName: row.branch_name,
  documentNumber: row.document_number,
  paymentDate: row.payment_date,
  paymentAllocation: row.payment_allocation || 'automatic',
  fromInvoiceCollection: Boolean(row.from_invoice_collection),
  invoiceCollectionNumber: row.invoice_collection_number,
  collectorId: row.collector_id,
  collectorCode: row.collector_code,
  collectorName: row.collector_name,
  customerId: row.customer_id,
  customerCode: row.customer_code,
  customerName: row.customer_name,
  currency: row.currency || 'IDR',
  totalPaymentAmount: Number(row.total_payment_amount) || 0,
  totalAllocatedAmount: Number(row.total_allocated_amount) || 0,
  paymentMethods: row.payment_methods || [],
  allocations: row.allocations || [],
  source: row.source || 'Zyvora',
  status: row.status || 'draft',
  isChecked: Boolean(row.is_checked),
  isDeposited: Boolean(row.is_deposited),
  depositedAt: row.deposited_at,
  cashTransactionId: row.cash_transaction_id,
  cashTransactionNumber: row.cash_transaction_number,
  notes: row.notes,
  approvedAt: row.approved_at,
  approvedBy: row.approved_by,
  createdAt: row.created_at || new Date().toISOString()
});

export const syncReceivePaymentToSupabase = async (rp: ReceivePayment): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured) return { success: true };
  try {
    const client = getSupabaseClient();
    const row = mapReceivePaymentToRow(rp);
    const { error } = await client.from('receive_payments').upsert(row);
    if (error) {
      console.warn('[Supabase Sync] Upsert receive payment error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync] Receive payment sync exception:', err);
    return { success: false, error: err?.message || 'Receive payment sync exception' };
  }
};

export const fetchReceivePaymentsFromSupabase = async (tenantId?: string): Promise<ReceivePayment[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const client = getSupabaseClient();
    let query = client.from('receive_payments').select('*');
    if (tenantId && tenantId !== 'ten_zyvora_corp' && tenantId !== 'all') {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.order('payment_date', { ascending: false });

    if (error) {
      console.warn('[Supabase Sync] Fetch receive payments error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToReceivePayment);
  } catch (err) {
    console.warn('[Supabase Sync] Fetch receive payments exception:', err);
    return [];
  }
};

// ====================================================================
// 6. PRODUCTS SYNC
// ====================================================================

export const mapProductToRow = (p: Product): Record<string, any> => ({
  id: p.id,
  tenant_id: sanitizeTenantId(p.tenantId),
  sku: p.sku,
  barcode: p.barcode || null,
  name: p.name,
  description: p.description || null,
  type: p.type || 'physical',
  category: p.category,
  uom: p.uom,
  selling_price: p.sellingPrice || 0,
  cost_price: p.costPrice || 0,
  min_stock_level: p.minStockLevel || 0,
  weight_gram: p.weightGram || null,
  image_url: p.imageUrl || null,
  stock_by_warehouse: p.stockByWarehouse || {},
  total_stock: p.totalStock || 0,
  status: p.status || 'active',
  business_line_id: p.businessLineId || null
});

export const mapRowToProduct = (row: any): Product => ({
  id: row.id,
  tenantId: row.tenant_id,
  sku: row.sku,
  barcode: row.barcode,
  name: row.name,
  description: row.description,
  type: row.type || 'physical',
  category: row.category,
  uom: row.uom,
  costPrice: Number(row.cost_price) || 0,
  sellingPrice: Number(row.selling_price) || 0,
  minStockLevel: Number(row.min_stock_level) || 0,
  weightGram: row.weight_gram ? Number(row.weight_gram) : undefined,
  imageUrl: row.image_url,
  stockByWarehouse: row.stock_by_warehouse || {},
  totalStock: Number(row.total_stock) || 0,
  status: row.status || 'active',
  businessLineId: row.business_line_id
});

export const syncProductToSupabase = async (p: Product): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    const client = getSupabaseClient();
    const row = mapProductToRow(p);
    const { error } = await client.from('products').upsert(row);
    if (error) console.warn('[Supabase Sync] Upsert product error:', error.message);
  } catch (err) {
    console.warn('[Supabase Sync] Product sync exception:', err);
  }
};

export const deleteProductFromSupabase = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('products').delete().eq('id', id);
    if (error) console.warn('[Supabase Sync] Delete product error:', error.message);
  } catch (err) {
    console.warn('[Supabase Sync] Delete product exception:', err);
  }
};

export const fetchProductsFromSupabase = async (tenantId: string): Promise<Product[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) {
      console.warn('[Supabase Sync] Fetch products error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToProduct);
  } catch (err) {
    console.warn('[Supabase Sync] Fetch products exception:', err);
    return [];
  }
};

// ====================================================================
// 7. VENDORS SYNC
// ====================================================================

export const mapVendorToRow = (v: Vendor): Record<string, any> => ({
  id: v.id,
  tenant_id: sanitizeTenantId(v.tenantId),
  vendor_code: v.vendorCode,
  name: v.name,
  company_name: v.companyName || null,
  email: v.email || null,
  phone: v.phone || null,
  city: v.city || null,
  status: v.status || 'active',
  payment_terms: v.paymentTerms || null,
  address: v.address || null,
  country: v.country || 'Indonesia'
});

export const mapRowToVendor = (row: any): Vendor => ({
  id: row.id,
  tenantId: row.tenant_id,
  vendorCode: row.vendor_code,
  name: row.name,
  companyName: row.company_name || '',
  category: row.category || 'General',
  email: row.email || '',
  phone: row.phone || '',
  city: row.city || '',
  status: row.status || 'active',
  paymentTerms: row.payment_terms || 'Net 30',
  paymentTermsDays: Number(row.payment_terms_days) || 30,
  address: row.address || '',
  country: row.country || 'Indonesia'
});

export const syncVendorToSupabase = async (v: Vendor): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    const client = getSupabaseClient();
    const row = mapVendorToRow(v);
    const { error } = await client.from('vendors').upsert(row);
    if (error) console.warn('[Supabase Sync] Upsert vendor error:', error.message);
  } catch (err) {
    console.warn('[Supabase Sync] Vendor sync exception:', err);
  }
};

export const deleteVendorFromSupabase = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured) return;
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('vendors').delete().eq('id', id);
    if (error) console.warn('[Supabase Sync] Delete vendor error:', error.message);
  } catch (err) {
    console.warn('[Supabase Sync] Delete vendor exception:', err);
  }
};

export const fetchVendorsFromSupabase = async (tenantId: string): Promise<Vendor[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('vendors')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) {
      console.warn('[Supabase Sync] Fetch vendors error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToVendor);
  } catch (err) {
    console.warn('[Supabase Sync] Fetch vendors exception:', err);
    return [];
  }
};
