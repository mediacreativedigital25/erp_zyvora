import React, { useState, useMemo } from 'react';
import { Plus, Users, ShoppingBag, FileText, CheckCircle2 } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PageShell } from '../components/common/PageShell';
import { PageToolbar } from '../components/common/PageToolbar';
import { PageTable, Column } from '../components/common/PageTable';
import { PageEmptyState } from '../components/common/PageEmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Pagination } from '../components/common/Pagination';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';
import { CustomerDirectoryView } from '../components/sales/CustomerDirectoryView';
import { SalesOrderGoodsView } from '../components/sales/SalesOrderGoodsView';
import { SalesOrderServiceView } from '../components/sales/SalesOrderServiceView';
import { SalesOrderReceiveView } from '../components/sales/SalesOrderReceiveView';
import { SalesOrderPickingView } from '../components/sales/SalesOrderPickingView';
import { SalesPrintInvoiceView } from '../components/sales/SalesPrintInvoiceView';
import { ServiceScheduleBookingView } from '../components/sales/ServiceScheduleBookingView';
import { Customer } from '../types/erp';

export const PenjualanPage: React.FC = () => {
  const { customers, activeFeatureId } = useErp();

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);

  // Filtering Customers when registered
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
      );
    });
  }, [customers, search]);

  const pagedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const customerColumns: Column<Customer>[] = [
    {
      key: 'customerCode',
      header: 'Customer Code',
      render: (row) => (
        <span className="font-mono font-bold text-xs bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA] px-2 py-0.5 rounded">
          {row.customerCode}
        </span>
      )
    },
    {
      key: 'companyName',
      header: 'Customer & Organization',
      render: (row) => (
        <div>
          <div className="font-semibold text-[#0F172A]">{row.eventTitle || row.companyName}</div>
          <div className="text-[11px] text-[#475569]">PIC: {row.name}</div>
        </div>
      )
    },
    {
      key: 'city',
      header: 'Administrative Region',
      render: (row) => (
        <div>
          <div className="text-xs text-[#0F172A]">{row.regency || row.city || '-'}</div>
          {row.province && <div className="text-[11px] text-[#475569]">{row.province}</div>}
        </div>
      )
    },
    {
      key: 'distanceFromHqKm',
      header: 'Distance from HQ',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#086288]">
          {row.distanceFromHqKm !== undefined ? `±${row.distanceFromHqKm} km` : '-'}
        </span>
      )
    },
    {
      key: 'creditLimit',
      header: 'Credit Terms',
      align: 'right',
      render: (row) => (
        <span className="font-mono tabular-nums font-semibold text-[#0F172A]">
          Rp {row.creditLimit.toLocaleString('id-ID')}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />
    }
  ];

  // Route: Customer Directory (sales_customers / customers)
  if (activeFeatureId === 'sales_customers' || activeFeatureId === 'customers') {
    return (
      <PageShell breadcrumbs={[{ label: 'Sales' }, { label: 'Customer Directory' }]}>
        <div className="mt-4">
          <CustomerDirectoryView />
        </div>
      </PageShell>
    );
  }

  // Route: Unified Sales Order (sales_order / sales_order_service)
  if (activeFeatureId === 'sales_order_service' || activeFeatureId === 'sales_order') {
    return (
      <PageShell breadcrumbs={[{ label: 'Sales' }, { label: 'Sales Order' }]}>
        <div className="mt-4">
          <SalesOrderServiceView />
        </div>
      </PageShell>
    );
  }

  // Route: Service Schedule & Booking (sales_service_schedule / service_schedule)
  if (activeFeatureId === 'sales_service_schedule' || activeFeatureId === 'service_schedule') {
    return (
      <PageShell breadcrumbs={[{ label: 'Sales' }, { label: 'Service Schedule & Booking' }]}>
        <div className="mt-4">
          <ServiceScheduleBookingView />
        </div>
      </PageShell>
    );
  }

  // Route: Sales Order Receive (sales_order_receive / order_receipt)
  if (activeFeatureId === 'sales_order_receive' || activeFeatureId === 'order_receipt') {
    return (
      <PageShell breadcrumbs={[{ label: 'Sales' }, { label: 'Sales Order Receive' }]}>
        <div className="mt-4">
          <SalesOrderReceiveView />
        </div>
      </PageShell>
    );
  }

  // Route: Sales Order Picking (sales_order_picking)
  if (activeFeatureId === 'sales_order_picking') {
    return (
      <PageShell breadcrumbs={[{ label: 'Sales' }, { label: 'Sales Order Picking' }]}>
        <div className="mt-4">
          <SalesOrderPickingView />
        </div>
      </PageShell>
    );
  }

  // Route: Print Invoice (sales_print_invoice / invoices)
  if (activeFeatureId === 'sales_print_invoice' || activeFeatureId === 'invoices') {
    return (
      <PageShell breadcrumbs={[{ label: 'Sales' }, { label: 'Print Invoice' }]}>
        <div className="mt-4">
          <SalesPrintInvoiceView />
        </div>
      </PageShell>
    );
  }

  // Default Route: Sales Order (default)
  return (
    <PageShell breadcrumbs={[{ label: 'Sales' }, { label: 'Sales Order' }]}>
      <div className="mt-4">
        <SalesOrderServiceView />
      </div>
    </PageShell>
  );
};
