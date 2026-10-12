import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User as UserIcon, 
  ShieldCheck, 
  Star, 
  MapPin, 
  Calendar, 
  Mail, 
  Phone, 
  Edit3, 
  Package, 
  Clock, 
  X,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { itemsService, requestsService } from '../services/api';
import { Item, BorrowRequest } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ItemCard } from '../components/ItemCard';
import { SafeImg } from '../components/SafeImg';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateProfile } = useAuth();

  const [myItems, setMyItems] = useState<Item[]>([]);
  const [borrowHistory, setBorrowHistory] = useState<BorrowRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'history'>('listings');
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);

  // Edit form state
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editDept, setEditDept] = useState(currentUser?.department || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    setEditBio(currentUser.bio || '');
    setEditPhone(currentUser.phone || '');
    setEditDept(currentUser.department || '');

    Promise.all([
      itemsService.getMyListings(),
      requestsService.getMyBorrowingRequests(currentUser.id),
    ])
      .then(([items, history]) => {
        setMyItems(items);
        setBorrowHistory(history);
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to load profile data from backend.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfileData();
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        bio: editBio,
        phone: editPhone,
        department: editDept,
      });
      setIsEditingModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <UserIcon className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Sign in to view your profile</h2>
        <p className="text-xs text-stone-500">
          Your profile, listed gear, and borrowing records will be available once signed in.
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>{error}</span>
          </div>
          <button
            onClick={fetchProfileData}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-semibold text-xs shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Student Profile Identity Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <SafeImg
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-stone-200 shrink-0 shadow-xs"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-stone-900">{currentUser.name}</h1>
                {currentUser.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Campus Student
                  </span>
                )}
              </div>

              <p className="text-sm text-stone-600 font-medium">
                {currentUser.college} · {currentUser.department} ({currentUser.yearOfStudy})
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 pt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  {currentUser.email}
                </span>
                {currentUser.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    {currentUser.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  Joined {currentUser.joinedDate}
                </span>
              </div>

              {currentUser.bio && (
                <p className="text-xs text-stone-600 italic max-w-2xl pt-2">
                  "{currentUser.bio}"
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsEditingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Reputation Score & Metrics */}
        <div className="mt-8 pt-6 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
          <div>
            <span className="text-xs text-stone-400 block">Student Trust Rating</span>
            <div className="flex items-center justify-center sm:justify-start gap-1 mt-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-xl font-bold text-stone-900 tabular-nums">{currentUser.rating}</span>
              <span className="text-xs text-stone-400">/ 5.0</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-stone-400 block">Peer Reviews</span>
            <span className="text-xl font-bold text-stone-900 tabular-nums mt-1 block">
              {currentUser.reviewCount}
            </span>
          </div>

          <div>
            <span className="text-xs text-stone-400 block">Gear Items Listed</span>
            <span className="text-xl font-bold text-stone-900 tabular-nums mt-1 block">
              {myItems.length}
            </span>
          </div>

          <div>
            <span className="text-xs text-stone-400 block">Total Campus Borrows</span>
            <span className="text-xl font-bold text-stone-900 tabular-nums mt-1 block">
              {borrowHistory.length}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-stone-200">
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'listings'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            My Listed Items ({myItems.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Borrowing History ({borrowHistory.length})
          </button>
        </div>

        {/* Tab 1: Listed Items */}
        {activeTab === 'listings' && (
          <div>
            {myItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 bg-white rounded-2xl border border-dashed border-stone-200">
                You haven't listed any items on campus yet.{' '}
                <Link to="/items/new" className="text-emerald-700 font-semibold underline">
                  List gear now
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Borrowing History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {borrowHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 bg-white rounded-2xl border border-dashed border-stone-200">
                No borrowing history yet.{' '}
                <Link to="/marketplace" className="text-emerald-700 font-semibold underline">
                  Browse items
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-xs">
                {borrowHistory.map((req) => (
                  <div key={req.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <SafeImg
                        src={req.item.images?.[0]}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-100"
                      />
                      <div className="min-w-0">
                        <Link to={`/requests/${req.id}`} className="font-semibold text-stone-900 text-sm hover:text-emerald-700 truncate block">
                          {req.item.title}
                        </Link>
                        <p className="text-xs text-stone-500 truncate mt-0.5">
                          Owner: {req.owner.name} · {req.startDate} to {req.endDate} ({req.totalDays} days)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={req.status} />
                      <Link
                        to={`/requests/${req.id}`}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-stone-900 text-base">Edit Profile Information</h3>
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Department / Major</label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Short Bio</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell campus peers what you study or what gear you enjoy sharing..."
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
