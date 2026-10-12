import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  PlusCircle,
  Edit3,
  Trash2,
  Power,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { itemsService } from '../services/api';
import { Item } from '../types';
import { ItemCard } from '../components/ItemCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const MyListingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchListings = () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    itemsService
      .getMyListings()
      .then((data) => setItems(data))
      .catch((err: any) =>
        setError(err?.message || 'Failed to load your listings from backend.')
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchListings();
  }, [currentUser]);

  const handleToggleAvailability = async (item: Item) => {
    setRowError(null);
    setBusyId(item.id);
    try {
      const updated = await itemsService.updateItem(item.id, {
        isAvailable: !item.isAvailable,
      });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err: any) {
      setRowError(err.message || 'Failed to update availability.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: Item) => {
    if (
      !window.confirm(
        `Delete "${item.title}" permanently? This action cannot be undone.`
      )
    ) {
      return;
    }
    setRowError(null);
    setBusyId(item.id);
    try {
      await itemsService.deleteItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      setRowError(err.message || 'Failed to delete this listing.');
    } finally {
      setBusyId(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <Package className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Sign in to manage your listings</h2>
        <p className="text-xs text-stone-500">
          Review, edit, pause, or remove the gear you have shared with campus peers.
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            My Listings
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {loading
              ? 'Loading your shared items...'
              : `${items.length} ${items.length === 1 ? 'item' : 'items'} listed by you`}
          </p>
        </div>
        <Link
          to="/items/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>List New Item</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchListings}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-semibold text-xs shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {rowError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{rowError}</span>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={8} />
      ) : items.length === 0 ? (
        <EmptyState
          title="You have no listings yet"
          description="Share textbooks, calculators, lab gear, or cameras with students on your campus."
          actionText="List Your First Item"
          onAction={() => navigate('/items/new')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3">
              <ItemCard item={item} />

              <div className="flex items-center gap-2">
                <Link
                  to={`/items/${item.id}/edit`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleToggleAvailability(item)}
                  disabled={busyId === item.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-stone-300 hover:bg-stone-50 disabled:opacity-60 text-stone-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{item.isAvailable ? 'Pause' : 'Activate'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={busyId === item.id}
                  className="inline-flex items-center justify-center px-3 py-2 border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60 rounded-lg transition-colors"
                  aria-label={`Delete ${item.title}`}
                  title="Delete listing"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
