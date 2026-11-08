-- ============================================================
-- ZYVORA ERP 1.0.0 — FULL CLEAN SUPABASE MIGRATION & SEEDS
-- Project: nfjucyabfiqlmrxnviuz
-- Copy and run this entire script in Supabase SQL Editor.
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DROP EMPTY TABLES SAFELY (CASCADE cleans up broken constraints)
-- Note: public.profiles is PRESERVED (contains your 2 admin accounts)
DROP TABLE IF EXISTS public.service_booking_milestones CASCADE;
DROP TABLE IF EXISTS public.service_booking_items CASCADE;
DROP TABLE IF EXISTS public.service_bookings CASCADE;
DROP TABLE IF EXISTS public.sales_order_items CASCADE;
DROP TABLE IF EXISTS public.sales_orders CASCADE;
DROP TABLE IF EXISTS public.sales_invoice_items CASCADE;
DROP TABLE IF EXISTS public.sales_invoices CASCADE;
DROP TABLE IF EXISTS public.receive_payments CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.warehouses CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.business_units CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.app_navigation_items CASCADE;
DROP TABLE IF EXISTS public.tenant_settings CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- 3. TENANTS
CREATE TABLE public.tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  slug TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'growth',
  tenant_number TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. BUSINESS UNITS
CREATE TABLE public.business_units (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  tax_id TEXT,
  currency TEXT NOT NULL DEFAULT 'IDR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. BRANCHES
CREATE TABLE public.branches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_unit_id TEXT REFERENCES public.business_units(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_headquarters BOOLEAN DEFAULT false,
  code_suffix TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. WAREHOUSES
CREATE TABLE public.warehouses (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'central',
  address TEXT,
  capacity_m2 NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. EMPLOYEES
CREATE TABLE public.employees (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  department TEXT,
  department_id TEXT,
  position TEXT,
  position_id TEXT,
  branch_id TEXT DEFAULT 'br_jkt_hq',
  branch_name TEXT,
  business_line_id TEXT,
  business_line_name TEXT,
  cost_center_code TEXT DEFAULT 'CC-SHARED-HOLDING',
  cost_center_name TEXT,
  employment_type TEXT DEFAULT 'permanent',
  contract_end_date DATE,
  join_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',
  supervisor_id TEXT,
  supervisor_name TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  npwp TEXT,
  ptkp_status TEXT,
  bpjs_ketenagakerjaan TEXT,
  bpjs_kesehatan TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  address TEXT,
  country TEXT DEFAULT 'Indonesia',
  province_id TEXT,
  province_name TEXT,
  regency_id TEXT,
  regency_name TEXT,
  district_id TEXT,
  district_name TEXT,
  village_id TEXT,
  village_name TEXT,
  postal_code TEXT,
  rt TEXT,
  rw TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 8. CUSTOMERS
CREATE TABLE public.customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_code TEXT NOT NULL,
  customer_type TEXT DEFAULT 'general',
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  credit_limit NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  payment_terms TEXT,
  payment_terms_days INTEGER DEFAULT 0,
  default_payment_method TEXT,
  default_down_payment_percent NUMERIC,
  npwp TEXT,
  address TEXT,
  country TEXT DEFAULT 'Indonesia',
  province TEXT,
  province_id TEXT,
  regency TEXT,
  regency_id TEXT,
  district TEXT,
  district_id TEXT,
  village TEXT,
  village_id TEXT,
  postal_code TEXT,
  event_title TEXT,
  target_event_date DATE,
  event_session TEXT,
  interested_business_line_id TEXT,
  estimated_guest_count INTEGER,
  venue_name TEXT,
  event_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 9. VENDORS
CREATE TABLE public.vendors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  vendor_code TEXT NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  payment_terms TEXT,
  address TEXT,
  country TEXT DEFAULT 'Indonesia',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 10. PRODUCTS
CREATE TABLE public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'physical',
  category TEXT NOT NULL,
  uom TEXT NOT NULL DEFAULT 'Pcs',
  selling_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  weight_gram NUMERIC,
  image_url TEXT,
  stock_by_warehouse JSONB DEFAULT '{}',
  total_stock INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  business_line_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 11. SALES ORDERS & ITEMS
CREATE TABLE public.sales_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  business_unit_id TEXT REFERENCES public.business_units(id) ON DELETE SET NULL,
  branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  warehouse_id TEXT REFERENCES public.warehouses(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  customer_id TEXT,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  order_date DATE NOT NULL,
  delivery_date DATE,
  payment_method TEXT,
  payment_terms_days INTEGER DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  receive_number TEXT,
  receive_date DATE,
  delivery_order_number TEXT,
  picking_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE public.sales_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id TEXT,
  sku TEXT,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'Pcs',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  is_bonus BOOLEAN DEFAULT false
);

-- 12. SERVICE BOOKINGS & ITEMS & MILESTONES
CREATE TABLE public.service_bookings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_number TEXT NOT NULL,
  booking_date DATE NOT NULL,
  customer_id TEXT,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  event_title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_session TEXT NOT NULL DEFAULT 'morning',
  venue_name TEXT,
  venue_address TEXT,
  venue_city TEXT,
  distance_from_hq_km NUMERIC,
  estimated_guest_count INTEGER,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC DEFAULT 0,
  discount1 NUMERIC DEFAULT 0,
  discount2 NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  sales_pic_name TEXT,
  branch_id TEXT,
  branch_code TEXT,
  branch_name TEXT,
  order_type TEXT,
  warehouse_name TEXT,
  delivery_via TEXT,
  price_list TEXT,
  payment_term_text TEXT,
  so_format TEXT,
  notes TEXT,
  assigned_crew_lead_name TEXT,
  assigned_crew_count INTEGER DEFAULT 0,
  assigned_crew_members JSONB DEFAULT '[]',
  assigned_vehicle_id TEXT,
  assigned_vehicle_plate TEXT,
  assigned_vehicle_model TEXT,
  receive_number TEXT,
  receive_date DATE,
  delivery_order_number TEXT,
  picking_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE public.service_booking_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  booking_id TEXT NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,
  business_line_id TEXT,
  business_line_name TEXT,
  cost_center_code TEXT,
  service_name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  uom TEXT DEFAULT 'Package',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  is_bonus BOOLEAN DEFAULT false
);

CREATE TABLE public.service_booking_milestones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  booking_id TEXT NOT NULL REFERENCES public.service_bookings(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'unpaid'
);

-- 13. SALES INVOICES & ITEMS
CREATE TABLE public.sales_invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'service_booking',
  source_id TEXT,
  source_number TEXT,
  customer_id TEXT,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_method TEXT,
  payment_terms_days INTEGER DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  delivery_order_number TEXT,
  branch_id TEXT,
  branch_code TEXT,
  sales_pic_name TEXT,
  is_printed BOOLEAN DEFAULT false,
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE public.sales_invoice_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  invoice_id TEXT NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  uom TEXT DEFAULT 'Package',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  cost_center_code TEXT
);

-- 14. RECEIVE PAYMENTS (AR)
CREATE TABLE public.receive_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL,
  sys_number TEXT,
  branch_id TEXT,
  branch_code TEXT,
  branch_name TEXT,
  document_number TEXT,
  payment_date DATE NOT NULL,
  payment_allocation TEXT DEFAULT 'automatic',
  from_invoice_collection BOOLEAN DEFAULT false,
  invoice_collection_number TEXT,
  collector_id TEXT,
  collector_code TEXT,
  collector_name TEXT,
  customer_id TEXT,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  currency TEXT DEFAULT 'IDR',
  total_payment_amount NUMERIC NOT NULL DEFAULT 0,
  total_allocated_amount NUMERIC DEFAULT 0,
  payment_methods JSONB DEFAULT '[]',
  allocations JSONB DEFAULT '[]',
  source TEXT DEFAULT 'Zyvora',
  status TEXT NOT NULL DEFAULT 'draft',
  is_checked BOOLEAN DEFAULT false,
  is_deposited BOOLEAN DEFAULT false,
  deposited_at TIMESTAMPTZ,
  cash_transaction_id TEXT,
  cash_transaction_number TEXT,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 15. AUDIT LOGS
CREATE TABLE public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  description TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. NAVIGATION ITEMS (app_navigation_items)
CREATE TABLE public.app_navigation_items (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  parent_id TEXT,
  label TEXT NOT NULL,
  icon_name TEXT DEFAULT 'Boxes',
  route_id TEXT,
  badge TEXT,
  is_ready BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 10,
  min_role TEXT DEFAULT 'sales',
  tenant_id TEXT,
  custom_config JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 17. TENANT SETTINGS
CREATE TABLE public.tenant_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 18. PROFILES COLUMNS ENRICHMENT (PRESERVE USER DATA)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'sales';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_platform_super_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allowed_business_units JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allowed_branches JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 19. PERMISSIONS (GRANT TO ANON & AUTHENTICATED)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 20. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_booking_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receive_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- 21. POLICIES (DROP & RECREATE SAFELY)
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'tenants','business_units','branches','warehouses','employees',
    'customers','vendors','products','sales_orders','sales_order_items',
    'service_bookings','service_booking_items','service_booking_milestones',
    'sales_invoices','sales_invoice_items','receive_payments','audit_logs',
    'app_navigation_items','tenant_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_authenticated" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "allow_all_authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    
    EXECUTE format('DROP POLICY IF EXISTS "allow_anon_read" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "allow_anon_read" ON public.%I FOR SELECT TO anon USING (true)', tbl);
    
    EXECUTE format('DROP POLICY IF EXISTS "allow_anon_write" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "allow_anon_write" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- 22. MASTER DATA SEEDS (CLEAN & CONSISTENT)
INSERT INTO public.tenants (id, name, code, slug, plan, tenant_number, status)
VALUES 
  ('ten_zyvora_corp', 'Zyvora Global Enterprises', 'ZYV-CORP', 'zyvora-enterprises', 'enterprise', '001', 'active'),
  ('ten_yulovi_holdings', 'PT Yulovi Niaga Nusantara', 'YUL-HOLD', 'yulovi-holdings', 'enterprise', '002', 'active'),
  ('ten_prima_logistik', 'PT Prima Logistik Sentosa', 'PLS-LOG', 'prima-logistik', 'growth', '003', 'active');

INSERT INTO public.business_units (id, tenant_id, code, name, tax_id, currency, is_active)
VALUES
  ('bu_distribusi', 'ten_zyvora_corp', 'BU-01', 'PT Zyvora Distribusi Nusantara', '01.345.678.9-012.000', 'IDR', true),
  ('bu_retail', 'ten_zyvora_corp', 'BU-02', 'PT Zyvora Retail Dinamika', '02.987.654.3-045.000', 'IDR', true);

INSERT INTO public.branches (id, tenant_id, business_unit_id, code, name, city, address, phone, is_headquarters, code_suffix, is_active)
VALUES
  ('br_jkt_hq', 'ten_zyvora_corp', 'bu_distribusi', 'BR-01', 'Jakarta Pusat (Kantor Pusat)', 'Jakarta', 'Jl. Sudirman Kav. 52-53, Jakarta Selatan', '+62 21 5289 0000', true, '', true),
  ('br_sub_east', 'ten_zyvora_corp', 'bu_distribusi', 'BR-02', 'Surabaya Cabang Timur', 'Surabaya', 'Kawasan Industri Rungkut Blok B-12, Surabaya', '+62 31 8432 1100', false, 'A', true),
  ('br_mdn_west', 'ten_zyvora_corp', 'bu_distribusi', 'BR-03', 'Medan Cabang Deli', 'Medan', 'Jl. Krakatau No. 88, Medan Timur', '+62 61 6612 9900', false, 'B', true),
  ('br_bdg', 'ten_zyvora_corp', 'bu_distribusi', 'BR-04', 'Bandung Event Studio & Office', 'Bandung', 'Jl. Riau No. 45, Citarum, Bandung', '+62 22 4231 8800', false, 'C', true);

INSERT INTO public.warehouses (id, branch_id, tenant_id, code, name, type, address, capacity_m2, is_active)
VALUES
  ('wh_cakung_01', 'br_jkt_hq', 'ten_zyvora_corp', 'WH-JKT-01', 'Gudang Pusat Cakung', 'central', 'Kawasan Logistik Cakung Indah Blok A4', 5200, true),
  ('wh_marunda_02', 'br_jkt_hq', 'ten_zyvora_corp', 'WH-JKT-02', 'Gudang Transit Marunda', 'transit', 'Jl. Akses Pelabuhan Marunda No. 19', 2400, true),
  ('wh_rungkut_03', 'br_sub_east', 'ten_zyvora_corp', 'WH-SUB-01', 'Gudang Regional Rungkut', 'retail', 'Rungkut Industri Raya No. 45, Surabaya', 3800, true),
  ('wh_belawan_04', 'br_mdn_west', 'ten_zyvora_corp', 'WH-MDN-01', 'Gudang Hub Belawan', 'transit', 'Pelabuhan Belawan Sektor 3, Medan', 1900, true);

INSERT INTO public.employees (
  id, tenant_id, employee_code, full_name, email, phone,
  department, department_id, position, position_id, branch_id, branch_name,
  business_line_id, business_line_name, cost_center_code, cost_center_name,
  employment_type, join_date, status
)
VALUES
  ('emp_01', 'ten_zyvora_corp', '00120261027001', 'Iklas Padli', 'iklaspadli85@gmail.com', '+62 811 9922 881', 'Executive & Board', 'dept_exec', 'Chief Operating Officer', 'pos_coo', 'br_jkt_hq', 'Jakarta Pusat (Kantor Pusat)', 'lob_ten_zyvora_corp_holding', 'Holding / Shared Services', 'CC-SHARED-HOLDING', 'Holding / Shared Services', 'permanent', '2026-10-27', 'active'),
  ('emp_02', 'ten_zyvora_corp', '00120261027002', 'Sri Wahyuni, S.E., Ak.', 'sri.wahyuni@zyvora.id', '+62 812 8844 112', 'Finance & Accounting', 'dept_fin', 'Chief Financial Accountant', 'pos_fin_mgr', 'br_jkt_hq', 'Jakarta Pusat (Kantor Pusat)', 'lob_ten_zyvora_corp_holding', 'Holding / Shared Services', 'CC-SHARED-HOLDING', 'Holding / Shared Services', 'permanent', '2026-10-27', 'active'),
  ('emp_03', 'ten_zyvora_corp', '00120261027003', 'Bambang Pamungkas', 'bambang.log@zyvora.id', '+62 813 7721 349', 'Operations & Logistics', 'dept_ops', 'Warehouse Lead Cakung', 'pos_wh_lead', 'br_jkt_hq', 'Jakarta Pusat (Kantor Pusat)', 'lob_ten_zyvora_corp_hizaki', 'Hizaki Wedding Planner', 'CC-LOB-HIZAKI', 'Hizaki Wedding Planner', 'permanent', '2026-10-27', 'active'),
  ('emp_04', 'ten_zyvora_corp', '001A20261027001', 'Arya Pratama', 'arya.sub@zyvora.id', '+62 818 6629 110', 'Operations & Logistics', 'dept_ops', 'Branch Manager Surabaya', 'pos_bm_sby', 'br_sub_east', 'Surabaya Cabang Timur', 'lob_ten_zyvora_corp_aurum', 'Aurum Deco', 'CC-LOB-AURUM', 'Aurum Deco', 'permanent', '2026-10-27', 'active');

INSERT INTO public.customers (
  id, tenant_id, customer_code, customer_type, name, company_name, email, phone, city, credit_limit, total_orders, outstanding_balance, status, address
)
VALUES
  ('c001', 'ten_zyvora_corp', 'CUST-001', 'corporate', 'PT Maju Bersama Logistik', 'PT Maju Bersama Logistik', 'finance@majubersama.co.id', '+62 21 8899 0011', 'Jakarta', 150000000, 12, 45000000, 'active', 'Jl. Kawasan Industri Pulogadung No. 12'),
  ('c002', 'ten_zyvora_corp', 'CUST-002', 'corporate', 'CV Sentosa Abadi Makmur', 'CV Sentosa Abadi Makmur', 'purchasing@sentosaabadi.com', '+62 31 7766 5544', 'Surabaya', 75000000, 8, 12500000, 'active', 'Jl. Margomulyo Indah Blok H-7'),
  ('c003', 'ten_zyvora_corp', 'CUST-003', 'booking', 'Amanda Putri & Rangga Pratama', 'Private Wedding Client', 'amanda.rangga.wedding@gmail.com', '+62 812 3456 7890', 'Bandung', 50000000, 1, 35000000, 'active', 'Jl. Setiabudhi No. 210, Bandung');

INSERT INTO public.products (
  id, tenant_id, sku, name, description, type, category, uom, selling_price, cost_price, min_stock_level, total_stock, status
)
VALUES
  ('prod_01', 'ten_zyvora_corp', 'SKU-LOG-PALLET', 'Wooden Cargo Pallet Euro Standard', 'Pallet kayu standar ekspor 120x80cm', 'physical', 'Logistics Supplies', 'Pcs', 185000, 120000, 50, 420, 'active'),
  ('prod_02', 'ten_zyvora_corp', 'SKU-SRV-WED-L', 'Ki Mi Ko Full Wedding Organizer (Luxury)', 'Layanan lengkap WO, Master of Ceremony & Usher 12 Pax', 'service', 'Wedding & Event Service', 'Package', 45000000, 22000000, 0, 0, 'active'),
  ('prod_03', 'ten_zyvora_corp', 'SKU-SRV-DECO-E', 'Aurum Elegant Floral Stage & Backdrop', 'Dekorasi panggung 16m + lighting moving beam', 'service', 'Event Decoration', 'Package', 32000000, 14000000, 0, 0, 'active');

-- Update profiles with default tenant if null
UPDATE public.profiles SET tenant_id = 'ten_zyvora_corp' WHERE tenant_id IS NULL;

SELECT 'Migration and Master Seeds completed successfully!' AS status;
