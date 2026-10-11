import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  ArrowRightLeft, 
  Clock, 
  Calendar, 
  PlusCircle, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requestsService, itemsService, notificationsService } from '../services/api';
import { BorrowRequest, Item, NotificationItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [lendingRequests, setLendingRequests] = useState<BorrowRequest[]>([]);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    Promise.all([
      requestsService.getMyBorrowingRequests(currentUser.id),
      requestsService.getMyLendingRequests(currentUser.id),
      itemsService.getMyItems(currentUser.id),
      notificationsService.getNotifications(currentUser.id),
    ])
      .then(([borrowing, lending, items, notifs]) => {
        setBorrowRequests(borrowing);
        setLendingRequests(lending);
        setMyItems(items);
        setRecentNotifications(notifs.slice(0, 4));
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to load dashboard data from backend.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <Package className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Sign in to view your dashboard</h2>
        <p className="text-xs text-stone-500">
          Your active loans, items listed, and incoming requests will appear here once authenticated.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/login"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-stone-100 text-stone-800 rounded-lg text-xs font-semibold hover:bg-stone-200"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  const activeLoans = borrowRequests.filter((r) => r.status === 'active');
  const pendingBorrowRequests = borrowRequests.filter((r) => r.status === 'pending');
  const pendingLendingRequests = lendingRequests.filter((r) => r.status === 'pending');
  const upcomingReturns = activeLoans.filter((r) => {
    const end = new Date(r.endDate).getTime();
    const now = new Date().getTime();
    return end - now < 3 * 24 * 3600 * 1000; // within 3 days
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Student Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Welcome back, {currentUser?.name.split(' ')[0]}!
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {currentUser?.college} · {currentUser?.department} ({currentUser?.yearOfStudy})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/items/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List New Item</span>
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-sm font-medium transition-colors"
          >
            <span>Browse Gear</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-semibold text-xs shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-medium text-stone-500">Active Borrowed Items</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-stone-900 tabular-nums">{activeLoans.length}</span>
            <span className="text-xs text-emerald-700 font-medium">In use</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-medium text-stone-500">Items Listed by You</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-stone-900 tabular-nums">{myItems.length}</span>
            <Link to="/profile" className="text-xs text-stone-400 hover:text-stone-700 font-medium">Manage →</Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-medium text-stone-500">Incoming Requests</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-amber-700 tabular-nums">{pendingLendingRequests.length}</span>
            <Link to="/requests/lending" className="text-xs text-amber-700 hover:underline font-medium">Review →</Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs font-medium text-stone-500">Upcoming Returns</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-stone-900 tabular-nums">{upcomingReturns.length}</span>
            <span className="text-xs text-stone-400">Next 72 hrs</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Loans & Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Active Loans & Lending Requests */}
        <div className="lg:col-span-8 space-y-8">
          {/* Active Loans Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Your Active Loans</h2>
              <Link to="/requests/borrowing" className="text-xs font-medium text-emerald-700 hover:underline">
                View all borrowing ({borrowRequests.length})
              </Link>
            </div>

            {loading ? (
              <p className="text-xs text-stone-400 py-4">Loading loans...</p>
            ) : activeLoans.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                You currently have no active borrowed items.{' '}
                <Link to="/marketplace" className="text-emerald-700 font-medium hover:underline">
                  Browse items on campus
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeLoans.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={req.item.images[0]}
                        alt={req.item.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 border border-stone-100"
                      />
                      <div>
                        <Link to={`/requests/${req.id}`} className="font-semibold text-stone-900 text-sm hover:text-emerald-700">
                          {req.item.title}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                          <span>Owner: {req.owner.name}</span>
                          <span>·</span>
                          <span>Due: {req.endDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={req.status} />
                      <Link
                        to={`/requests/${req.id}`}
                        className="p-1.5 text-stone-400 hover:text-stone-700"
                        title="View Loan Details"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incoming Lending Requests */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Incoming Requests for Your Items</h2>
              <Link to="/requests/lending" className="text-xs font-medium text-emerald-700 hover:underline">
                View all incoming ({lendingRequests.length})
              </Link>
            </div>

            {loading ? (
              <p className="text-xs text-stone-400 py-4">Loading requests...</p>
            ) : pendingLendingRequests.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                No pending requests waiting for your approval.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingLendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs font-semibold text-amber-900">
                        {req.borrower.name} wants to borrow {req.item.title}
                      </p>
                      <p className="text-xs text-stone-600 mt-1">
                        Dates: {req.startDate} to {req.endDate} ({req.totalDays} days) · {req.estimatedTotal === 0 ? 'FREE' : `$${req.estimatedTotal}`}
                      </p>
                    </div>

                    <Link
                      to="/requests/lending"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs shrink-0"
                    >
                      <span>Review in Lending Center</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Your Listed Items Preview */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Your Listed Items</h2>
              <Link to="/items/new" className="text-xs font-medium text-emerald-700 hover:underline">
                + Add another item
              </Link>
            </div>

            {myItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                You haven't listed any items yet.{' '}
                <Link to="/items/new" className="text-emerald-700 font-medium hover:underline">
                  List your first item now
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-stone-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.images[0]}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover shrink-0 border border-stone-100"
                      />
                      <div className="min-w-0">
                        <Link to={`/items/${item.id}`} className="font-semibold text-stone-900 text-xs truncate block hover:text-emerald-700">
                          {item.title}
                        </Link>
                        <p className="text-[11px] text-stone-500 truncate mt-0.5">
                          {item.lendingMode === 'free' ? 'FREE' : `$${item.dailyPrice}/day`} · {item.isAvailable ? 'Available' : 'On loan'}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/items/${item.id}/edit`}
                      className="px-2.5 py-1 text-xs border border-stone-300 hover:bg-stone-50 rounded-md text-stone-700 shrink-0 font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Campus Activity & Notifications */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Recent Campus Activity</h3>
              <Link to="/notifications" className="text-xs text-emerald-700 hover:underline">
                All
              </Link>
            </div>

            {recentNotifications.length === 0 ? (
              <p className="text-xs text-stone-400 py-3">No new notifications</p>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((n) => (
                  <Link
                    key={n.id}
                    to={n.link}
                    className={`block p-3 rounded-xl border text-xs transition-colors ${
                      n.isRead
                        ? 'border-stone-100 bg-stone-50/50 hover:bg-stone-50'
                        : 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                    }`}
                  >
                    <p className="font-semibold text-stone-900">{n.title}</p>
                    <p className="text-stone-600 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-stone-400 block mt-2">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Campus Pickup Safe Landmark Reminders */}
          <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 text-xs text-stone-600 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-stone-900">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Recommended Handover Spots</span>
            </div>
            <p className="leading-relaxed">
              Always exchange items in high-traffic, well-lit campus areas: Green Library lobby, Packard atrium, student center information desks, or dorm common lounges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
