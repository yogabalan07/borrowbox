import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  ArrowRight, 
  X, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requestsService } from '../services/api';
import { BorrowRequest, BorrowRequestStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { SafeImg } from '../components/SafeImg';

const STATUS_TABS: { label: string; value: 'all' | BorrowRequestStatus }[] = [
  { label: 'All Requests', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Active Loans', value: 'active' },
  { label: 'Awaiting Return', value: 'return_pending' },
  { label: 'Returned', value: 'returned' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Rejected / Cancelled', value: 'rejected' },
];

export const BorrowingRequestsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [selectedTab, setSelectedTab] = useState<'all' | BorrowRequestStatus>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await requestsService.getMyBorrowingRequests(currentUser.id);
      setRequests(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load borrowing requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <Clock className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Sign in to view requests</h2>
        <p className="text-xs text-stone-500">
          Sign in to check the status of your gear requests and loans.
        </p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this borrow request?')) return;
    setActionLoadingId(requestId);
    try {
      await requestsService.updateRequestStatus(requestId, 'cancelled');
      await fetchRequests();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReportReturn = async (requestId: string) => {
    if (!confirm('Report this item as returned to its owner for confirmation?')) return;
    setActionLoadingId(requestId);
    try {
      await requestsService.updateRequestStatus(requestId, 'return_pending');
      await fetchRequests();
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'rejected') return r.status === 'rejected' || r.status === 'cancelled';
    return r.status === selectedTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            My Borrowing Requests
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Track gear you've requested or currently have checked out from peers.
          </p>
        </div>

        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <span>Find More Items</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200/60 w-max min-w-full sm:min-w-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedTab(tab.value)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                selectedTab === tab.value
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchRequests}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-semibold text-xs shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-6 bg-white rounded-xl border border-stone-200 animate-pulse space-y-3">
              <div className="h-5 bg-stone-200 rounded w-1/3" />
              <div className="h-4 bg-stone-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title="No requests in this status"
          description="You haven't requested any items matching this filter yet."
          actionText="Browse Marketplace"
          actionHref="/marketplace"
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs hover:border-stone-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <SafeImg
                  src={req.item.images?.[0]}
                  alt={req.item.title}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-stone-100"
                />

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={req.status} />
                    <span className="text-xs text-stone-400">·</span>
                    <span className="text-xs text-stone-500 font-medium">
                      Requested {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <Link
                    to={`/requests/${req.id}`}
                    className="text-base font-bold text-stone-900 hover:text-emerald-700 transition-colors block"
                  >
                    {req.item.title}
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                    <span className="flex items-center gap-1 font-medium text-stone-800">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      {req.startDate} → {req.endDate} ({req.totalDays} days)
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      {req.pickupLocation}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
                    <span>Owner: <strong className="text-stone-800 font-semibold">{req.owner.name}</strong></span>
                    <span>·</span>
                    <span className="tabular-nums font-semibold text-emerald-800">
                      {req.estimatedTotal === 0 ? 'FREE' : `$${req.estimatedTotal} total`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2.5 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100 shrink-0">
                <Link
                  to={`/requests/${req.id}`}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Details & Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {req.status === 'pending' && (
                  <button
                    onClick={() => handleCancelRequest(req.id)}
                    disabled={actionLoadingId === req.id}
                    className="px-3 py-2 border border-stone-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-stone-600 rounded-lg text-xs font-medium transition-colors"
                  >
                    {actionLoadingId === req.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}

                {(req.status === 'active' || req.status === 'overdue') && (
                  <button
                    onClick={() => handleReportReturn(req.id)}
                    disabled={actionLoadingId === req.id}
                    className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    {actionLoadingId === req.id ? 'Reporting...' : 'Report Returned'}
                  </button>
                )}

                {req.status === 'return_pending' && (
                  <span className="px-3 py-2 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-xs font-medium">
                    Awaiting owner confirmation
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
