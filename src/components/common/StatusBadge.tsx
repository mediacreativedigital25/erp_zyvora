import React from 'react';

export type StatusType =
  | 'active'
  | 'inactive'
  | 'draft'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'invoiced'
  | 'cancelled'
  | 'approved'
  | 'received'
  | 'billed'
  | 'posted'
  | 'reversed'
  | 'inbound'
  | 'outbound'
  | 'transfer'
  | 'adjustment';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const getStatusConfig = (s: string) => {
    switch (s.toLowerCase()) {
      case 'active':
      case 'confirmed':
      case 'posted':
      case 'received':
        return {
          text: label || (s === 'confirmed' ? 'Terkonfirmasi' : s === 'posted' ? 'Terposting' : s === 'received' ? 'Diterima' : 'Aktif'),
          dotColor: 'bg-[#16A34A]',
          textColor: 'text-[#16A34A]'
        };
      case 'processing':
      case 'shipped':
      case 'approved':
      case 'inbound':
      case 'transfer':
        return {
          text: label || (s === 'processing' ? 'Diproses' : s === 'shipped' ? 'Dikirim' : s === 'approved' ? 'Disetujui' : s === 'inbound' ? 'Barang Masuk' : 'Transfer'),
          dotColor: 'bg-[#086288]',
          textColor: 'text-[#086288]'
        };
      case 'draft':
      case 'adjustment':
        return {
          text: label || (s === 'draft' ? 'Draf' : 'Penyesuaian'),
          dotColor: 'bg-[#D97706]',
          textColor: 'text-[#D97706]'
        };
      case 'invoiced':
      case 'billed':
        return {
          text: label || (s === 'invoiced' ? 'Terfaktur' : 'Tertagih'),
          dotColor: 'bg-[#0284C7]',
          textColor: 'text-[#0284C7]'
        };
      case 'cancelled':
      case 'inactive':
      case 'reversed':
      case 'outbound':
        return {
          text: label || (s === 'cancelled' ? 'Dibatalkan' : s === 'reversed' ? 'Dibalikkan' : s === 'outbound' ? 'Barang Keluar' : 'Non-Aktif'),
          dotColor: 'bg-[#DC2626]',
          textColor: 'text-[#DC2626]'
        };
      default:
        return {
          text: label || s,
          dotColor: 'bg-[#94A3B8]',
          textColor: 'text-[#475569]'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.textColor} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} aria-hidden="true" />
      <span>{config.text}</span>
    </span>
  );
};
