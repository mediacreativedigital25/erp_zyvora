import {
  Customer,
  SalesOrder,
  Tenant,
  BusinessUnit,
  Branch,
  Warehouse,
  AuditLog
} from '../../types/erp';

export interface ICustomerRepository {
  getAll(tenantId: string): Promise<Customer[]>;
  getById(tenantId: string, id: string): Promise<Customer | null>;
  getByCode(tenantId: string, customerCode: string): Promise<Customer | null>;
  create(tenantId: string, customer: Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'totalOrders' | 'outstandingBalance'>): Promise<Customer>;
}

export interface ISalesOrderRepository {
  getAll(tenantId: string, branchId?: string): Promise<SalesOrder[]>;
  getById(tenantId: string, id: string): Promise<SalesOrder | null>;
  create(tenantId: string, order: Omit<SalesOrder, 'id' | 'tenantId'>): Promise<SalesOrder>;
}

export interface ITenantRepository {
  getTenant(id: string): Promise<Tenant | null>;
  getBusinessUnits(tenantId: string): Promise<BusinessUnit[]>;
  getBranches(businessUnitId: string): Promise<Branch[]>;
  getWarehouses(branchId: string): Promise<Warehouse[]>;
}

export interface IAuditRepository {
  log(tenantId: string, log: Omit<AuditLog, 'id' | 'tenantId' | 'timestamp'>): Promise<AuditLog>;
  getAll(tenantId: string): Promise<AuditLog[]>;
}

export interface IDataRepositories {
  customer: ICustomerRepository;
  salesOrder: ISalesOrderRepository;
  tenant: ITenantRepository;
  audit: IAuditRepository;
}
