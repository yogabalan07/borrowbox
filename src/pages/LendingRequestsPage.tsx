import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Check, 
  X, 
  Calendar, 
  MapPin, 
  MessageSquare, 
  PackageCheck, 
  RotateCcw,
  ShieldCheck,
  Star,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requestsService, chatService } from '../services/api';
import { BorrowRequest } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { SafeImg } from '../components/SafeImg';

export const LendingRequestsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLendingRequests = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await requestsService.getMyLendingRequests(currentUser.id);
      setRequests(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load incoming lending requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLendingRequests();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <PackageCheck className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Sign in to manage lending</h2>
        <p className="text-xs text-stone-500">
          Sign in to review student requests for your listed gear.
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

  const handleStatusChange = async (requestId: string, newStatus: any) => {
    setActionLoadingId(requestId);
    try {
      await requestsService.updateRequestStatus(requestId, newStatus);
      await fetchLendingRequests();
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const activeAndApproved = requests.filter(
    (r) =>
      r.status === 'approved' ||
      r.status === 'active' ||
      r.status === 'overdue' ||
      r.status === 'return_pending'
  );
  const pastRequests = requests.filter((r) => r.status === 'returned' || r.status === 'rejected' || r.status === 'cancelled');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Lending Center
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage incoming borrow requests for your items, approve handovers, and verify returns.
          </p>
        </div>

        <Link
          to="/items/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <span>List Another Item</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>{error}</span>
          </div>
          <button
            onClick={fetchLendingRequests}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-semibold text-xs shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Pending Action Items Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-stone-900">
            Pending Student Requests ({pendingRequests.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 bg-white rounded-2xl border border-stone-200 animate-pulse text-xs text-stone-400">
            Loading requests...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-dashed border-stone-200 text-center text-xs text-stone-500">
            No pending requests currently awaiting your response. You're all caught up!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <SafeImg
                    src={req.item.images?.[0]}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-100"
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                        Needs Your Review
                      </span>
                      <span className="text-xs text-stone-400">·</span>
                      <span className="text-xs text-stone-500">
                        Received {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-bold text-stone-900 text-base">{req.item.title}</h3>

                    {/* Requester Profile Snapshot */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 pt-0.5">
                      <span className="font-semibold text-stone-800">{req.borrower.name}</span>
                      <span>·</span>
                      <span>{req.borrower.department}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-stone-700">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="tabular-nums font-semibold">{req.borrower.rating}</span>
                      </span>
                    </div>

                    {/* Requested note */}
                    <p className="text-xs text-stone-600 italic bg-stone-50 p-2.5 rounded-lg border border-stone-100 max-w-xl">
                      "{req.message}"
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 pt-1">
                      <span className="flex items-center gap-1 font-medium text-stone-800">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {req.startDate} → {req.endDate} ({req.totalDays} days)
                      </span>
                      <span className="tabular-nums font-bold text-emerald-800">
                        {req.estimatedTotal === 0 ? 'FREE Borrow' : `$${req.estimatedTotal} rental total`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Approve / Reject CTA Buttons */}
                <div className="flex items-center gap-2.5 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
                  <button
                    onClick={() => handleStatusChange(req.id, 'rejected')}
                    disabled={actionLoadingId === req.id}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5 text-stone-500" />
                    <span>Decline</span>
                  </button>

                  <button
                    onClick={() => handleStatusChange(req.id, 'approved')}
                    disabled={actionLoadingId === req.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Request</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active & Approved Handover Section */}
      <section className="space-y-4 pt-6 border-t border-stone-200">
        <h2 className="text-lg font-bold text-stone-900">
          Scheduled & Active Loans ({activeAndApproved.length})
        </h2>

        {activeAndApproved.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-stone-200 text-center text-xs text-stone-500">
            No active loans or approved pickups at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {activeAndApproved.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <SafeImg
                    src={req.item.images?.[0]}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-100"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={req.status} />
                      <span className="text-xs text-stone-400">·</span>
                      <span className="text-xs text-stone-500">Borrower: {req.borrower.name}</span>
                    </div>

                    <h3 className="font-bold text-stone-900 text-base">{req.item.title}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
                      <span>Pickup Spot: <strong>{req.pickupLocation}</strong></span>
                      <span>Return Due: <strong>{req.endDate}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Handover & Return confirmation actions */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
                  {req.status === 'approved' && (
                    <button
                      onClick={() => handleStatusChange(req.id, 'active')}
                      disabled={actionLoadingId === req.id}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Confirm Item Handed Over</span>
                    </button>
                  )}

                  {(req.status === 'active' || req.status === 'overdue') && (
                    <button
                      onClick={() => handleStatusChange(req.id, 'returned')}
                      disabled={actionLoadingId === req.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Returned in Good Shape</span>
                    </button>
                  )}

                  {req.status === 'return_pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(req.id, 'active')}
                        disabled={actionLoadingId === req.id}
                        className="px-3 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Not Received</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(req.id, 'returned')}
                        disabled={actionLoadingId === req.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Return Received</span>
                      </button>
                    </>
                  )}

                  <Link
                    to={`/requests/${req.id}`}
                    className="px-3 py-2 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-medium text-stone-700 transition-colors"
                  >
                    View Agreement
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History of Past Loans */}
      {pastRequests.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-stone-200">
          <h2 className="text-base font-bold text-stone-800">
            Lending History & Closed Loans ({pastRequests.length})
          </h2>
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 text-xs">
            {pastRequests.map((req) => (
              <div key={req.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-stone-900">{req.item.title}</p>
                  <p className="text-stone-500 mt-0.5">
                    Borrower: {req.borrower.name} · {req.startDate} to {req.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={req.status} />
                  <Link to={`/requests/${req.id}`} className="text-stone-400 hover:text-stone-700 font-medium">
                    Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
