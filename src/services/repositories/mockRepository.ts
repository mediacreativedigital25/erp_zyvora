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
import {
  INITIAL_TENANT,
  INITIAL_BUSINESS_UNITS,
  INITIAL_BRANCHES,
  INITIAL_WAREHOUSES,
  INITIAL_CUSTOMERS,
  INITIAL_SALES_ORDERS,
  INITIAL_AUDIT_LOGS
} from '../../data/mockData';

export class MockCustomerRepository implements ICustomerRepository {
  private customers: Customer[] = [...INITIAL_CUSTOMERS];

  async getAll(tenantId: string): Promise<Customer[]> {
    return this.customers.filter((c) => c.tenantId === tenantId);
  }

  async getById(tenantId: string, id: string): Promise<Customer | null> {
    return this.customers.find((c) => c.tenantId === tenantId && c.id === id) || null;
  }

  async getByCode(tenantId: string, customerCode: string): Promise<Customer | null> {
    return this.customers.find((c) => c.tenantId === tenantId && c.customerCode === customerCode) || null;
  }

  async create(
    tenantId: string,
    data: Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'totalOrders' | 'outstandingBalance'>
  ): Promise<Customer> {
    const newCustomer: Customer = {
      ...data,
      id: `cust_${Date.now()}`,
      tenantId,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      outstandingBalance: 0
    };
    this.customers = [newCustomer, ...this.customers];
    return newCustomer;
  }
}

export class MockSalesOrderRepository implements ISalesOrderRepository {
  private orders: SalesOrder[] = [...INITIAL_SALES_ORDERS];

  async getAll(tenantId: string, branchId?: string): Promise<SalesOrder[]> {
    return this.orders.filter(
      (o) => o.tenantId === tenantId && (!branchId || o.branchId === branchId)
    );
  }

  async getById(tenantId: string, id: string): Promise<SalesOrder | null> {
    return this.orders.find((o) => o.tenantId === tenantId && o.id === id) || null;
  }

  async create(tenantId: string, orderData: Omit<SalesOrder, 'id' | 'tenantId'>): Promise<SalesOrder> {
    const newOrder: SalesOrder = {
      ...orderData,
      id: `so_${Date.now()}`,
      tenantId
    };
    this.orders = [newOrder, ...this.orders];
    return newOrder;
  }
}

export class MockTenantRepository implements ITenantRepository {
  async getTenant(id: string): Promise<Tenant | null> {
    return INITIAL_TENANT.id === id ? INITIAL_TENANT : null;
  }

  async getBusinessUnits(tenantId: string): Promise<BusinessUnit[]> {
    return INITIAL_BUSINESS_UNITS.filter((b) => b.tenantId === tenantId);
  }

  async getBranches(businessUnitId: string): Promise<Branch[]> {
    return INITIAL_BRANCHES.filter((br) => br.businessUnitId === businessUnitId);
  }

  async getWarehouses(branchId: string): Promise<Warehouse[]> {
    return INITIAL_WAREHOUSES.filter((w) => w.branchId === branchId);
  }
}

export class MockAuditRepository implements IAuditRepository {
  private logs: AuditLog[] = [...INITIAL_AUDIT_LOGS];

  async log(tenantId: string, logData: Omit<AuditLog, 'id' | 'tenantId' | 'timestamp'>): Promise<AuditLog> {
    const newLog: AuditLog = {
      ...logData,
      id: `log_${Date.now()}`,
      tenantId,
      timestamp: new Date().toISOString()
    };
    this.logs = [newLog, ...this.logs];
    return newLog;
  }

  async getAll(tenantId: string): Promise<AuditLog[]> {
    return this.logs.filter((l) => l.tenantId === tenantId);
  }
}

export const createMockRepositories = (): IDataRepositories => ({
  customer: new MockCustomerRepository(),
  salesOrder: new MockSalesOrderRepository(),
  tenant: new MockTenantRepository(),
  audit: new MockAuditRepository()
});
