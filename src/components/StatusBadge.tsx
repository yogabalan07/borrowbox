import React from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Check, 
  Ban,
  PackageCheck,
  RotateCcw
} from 'lucide-react';
import { BorrowRequestStatus } from '../types';

interface StatusBadgeProps {
  status: BorrowRequestStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Pending Owner Approval</span>
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Approved · Ready for Pickup</span>
        </span>
      );
    case 'active':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
          <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Active Loan · In Use</span>
        </span>
      );
    case 'returned':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
          <Check className="w-3.5 h-3.5 text-stone-600" />
          <span>Returned & Closed</span>
        </span>
      );
    case 'return_pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-50 text-violet-800 border border-violet-200">
          <RotateCcw className="w-3.5 h-3.5 text-violet-600" />
          <span>Awaiting Return Confirmation</span>
        </span>
      );
    case 'overdue':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-800 border border-red-200">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>Overdue for Return</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
          <XCircle className="w-3.5 h-3.5 text-stone-500" />
          <span>Declined by Owner</span>
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
          <Ban className="w-3.5 h-3.5 text-stone-500" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-700">
          <span>{status}</span>
        </span>
      );
  }
};
