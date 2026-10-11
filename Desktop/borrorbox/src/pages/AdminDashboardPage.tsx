import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Package, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  ShieldAlert,
  Search,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminService, itemsService } from '../services/api';
import { AdminStats, User, ReportedItem, BorrowRequest, Item } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<ReportedItem[]>([]);
  const [loans, setLoans] = useState<BorrowRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reports' | 'loans'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search in users
  const [userSearch, setUserSearch] = useState('');

  const fetchAdminData = async () => {
    if (!currentUser?.isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [s, u, r, l] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers(),
        adminService.getReports(),
        adminService.getAllLoans(),
      ]);
      setStats(s);
      setUsers(u);
      setReports(r);
      setLoans(l);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch admin data from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  // Server-confirmed authorization guard
  if (!currentUser || !currentUser.isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Campus Admin Authorization Required</h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          Access to student records, listing moderation, and loan auditing requires university administration or campus safety privileges verified by the backend.
        </p>

        <div className="pt-2 flex justify-center gap-3">
          <a
            href="/"
            className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold"
          >
            Return to Campus Home
          </a>
          {!currentUser && (
            <a
              href="/login"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
            >
              Sign In with Admin Account
            </a>
          )}
        </div>
      </div>
    );
  }

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    await adminService.toggleUserVerification(userId, !currentStatus);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isVerified: !currentStatus } : u))
    );
  };

  const handleReportAction = async (reportId: string, action: 'resolve' | 'dismiss') => {
    await adminService.resolveReport(reportId, action);
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: action === 'resolve' ? 'resolved' : 'dismissed' } : r))
    );
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.college.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Campus Authority
            </span>
            <span className="text-xs text-stone-400">·</span>
            <span className="text-xs text-stone-500">{currentUser.college}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Platform Administration & Moderation
          </h1>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-700 transition-colors self-start"
        >
          <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
          <span>Refresh Live Stats</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAdminData}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-semibold text-xs shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Overview */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-xs font-medium text-stone-500">Verified Students</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-stone-900 tabular-nums">
                {stats.totalUsers.toLocaleString()}
              </span>
              <span className="text-xs text-emerald-700 font-medium">99.4% active</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-xs font-medium text-stone-500">Active Listings</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-stone-900 tabular-nums">
                {stats.totalListings.toLocaleString()}
              </span>
              <span className="text-xs text-stone-500">Across 7 categories</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-xs font-medium text-stone-500">Current Active Loans</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-blue-700 tabular-nums">
                {stats.activeLoans.toLocaleString()}
              </span>
              <span className="text-xs text-blue-700 font-medium">On campus</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-xs font-medium text-stone-500">Flagged Items / Reports</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-amber-700 tabular-nums">
                {reports.filter((r) => r.status === 'pending').length}
              </span>
              <span className="text-xs text-amber-700 font-medium">Pending action</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto scrollbar-none pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Safety & Moderation ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2 px-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            User Verification ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`pb-2 px-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'loans'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Campus Loans Audit ({loans.length})
          </button>
        </div>

        {/* Tab 1: Moderation Reports */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-900">
                Item Moderation & Incident Reports
              </h2>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs divide-y divide-stone-100">
              {reports.map((report) => (
                <div key={report.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          report.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : report.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {report.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-stone-400">·</span>
                      <span className="text-xs text-stone-500">Reported by {report.reporterName}</span>
                    </div>

                    <h3 className="font-bold text-stone-900 text-sm">{report.itemTitle}</h3>
                    <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-100">
                      Reason: "{report.reason}"
                    </p>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReportAction(report.id, 'dismiss')}
                        className="px-3 py-1.5 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-semibold text-stone-600"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleReportAction(report.id, 'resolve')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                      >
                        Resolve & Moderate
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: User Verification Management */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-base font-bold text-stone-900">Registered Student Directory</h2>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter students by name or college..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Institution & Major</th>
                      <th className="p-4">Standing</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-stone-50/50">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border" />
                            <div>
                              <p className="font-semibold text-stone-900">{u.name}</p>
                              <p className="text-[11px] text-stone-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-stone-700">
                          <p className="font-medium">{u.college}</p>
                          <p className="text-[11px] text-stone-400">{u.department}</p>
                        </td>
                        <td className="p-4 text-stone-600">{u.yearOfStudy}</td>
                        <td className="p-4 font-semibold text-stone-800 tabular-nums">★ {u.rating}</td>
                        <td className="p-4">
                          {u.isVerified ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                              Verified
                            </span>
                          ) : (
                            <span className="text-stone-500 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                              Unverified
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleToggleVerification(u.id, u.isVerified)}
                            className="px-3 py-1 border border-stone-300 hover:bg-stone-100 rounded text-[11px] font-medium"
                          >
                            {u.isVerified ? 'Revoke Verification' : 'Verify Student'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Platform Loans Audit */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-stone-900">Campus Loans Audit Trail</h2>
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs divide-y divide-stone-100">
              {loans.map((loan) => (
                <div key={loan.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={loan.status} />
                      <span className="text-stone-400">·</span>
                      <span className="font-semibold text-stone-900">{loan.item.title}</span>
                    </div>
                    <p className="text-stone-500">
                      Borrower: <strong className="text-stone-700">{loan.borrower.name}</strong> · 
                      Owner: <strong className="text-stone-700">{loan.owner.name}</strong> · 
                      Dates: {loan.startDate} to {loan.endDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-800 tabular-nums">
                      {loan.estimatedTotal === 0 ? 'FREE' : `$${loan.estimatedTotal}`}
                    </p>
                    <p className="text-[11px] text-stone-400">{loan.pickupLocation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
