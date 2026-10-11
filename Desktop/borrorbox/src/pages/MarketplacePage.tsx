import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';
import { itemsService, ItemFilters } from '../services/api';
import { Item, Category, ItemLendingMode, ItemCondition } from '../types';
import { ItemCard } from '../components/ItemCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

const CATEGORIES: { label: string; value: Category | 'all' }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Textbooks & STEM', value: 'textbooks' },
  { label: 'Cameras & Audio', value: 'creative' },
  { label: 'Lab Gear & Kits', value: 'lab_gear' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Outdoors & Camping', value: 'outdoors' },
  { label: 'Sports & Games', value: 'sports' },
  { label: 'Campus Misc', value: 'miscellaneous' },
];

export const MarketplacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>(
    (searchParams.get('category') as Category) || 'all'
  );
  const [lendingMode, setLendingMode] = useState<ItemLendingMode | 'all'>(
    (searchParams.get('lendingMode') as ItemLendingMode) || 'all'
  );
  const [condition, setCondition] = useState<ItemCondition | 'all'>('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');

  // Items & loading/error states
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state with URL params
  useEffect(() => {
    const urlCat = searchParams.get('category');
    if (urlCat) setSelectedCategory(urlCat as Category);
    const urlMode = searchParams.get('lendingMode');
    if (urlMode) setLendingMode(urlMode as ItemLendingMode);
  }, [searchParams]);

  const fetchFilteredItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ItemFilters = {
        query: query.trim() || undefined,
        category: selectedCategory,
        lendingMode,
        condition,
        onlyAvailable: availableOnly,
        sortBy,
      };
      const data = await itemsService.listItems(filters);
      setItems(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load items. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredItems();
  }, [selectedCategory, lendingMode, condition, availableOnly, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredItems();
  };

  const handleResetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
    setLendingMode('all');
    setCondition('all');
    setAvailableOnly(false);
    setSortBy('newest');
    setSearchParams({});
  };

  const hasActiveFilters =
    query.trim() !== '' ||
    selectedCategory !== 'all' ||
    lendingMode !== 'all' ||
    condition !== 'all' ||
    availableOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Search Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Campus Marketplace</h1>
          <p className="text-sm text-stone-500 mt-1">
            Discover peer-owned academic tools, electronics, lab supplies, and recreational gear.
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, location, or keywords (e.g. calculator, camera, tent)..."
              className="w-full pl-11 pr-24 py-3 bg-white border border-stone-200 rounded-xl text-sm placeholder:text-stone-400 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Category Segmented Tabs */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200/60 w-max min-w-full sm:min-w-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Controls Bar: Mode, Condition, Available, Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 bg-white border border-stone-200 rounded-xl text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Lending Mode filter */}
          <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg">
            <button
              onClick={() => setLendingMode('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                lendingMode === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setLendingMode('free')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                lendingMode === 'free' ? 'bg-white text-emerald-800 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Free Only
            </button>
            <button
              onClick={() => setLendingMode('rent')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                lendingMode === 'rent' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Paid Rental
            </button>
          </div>

          <div className="h-4 w-px bg-stone-200 hidden sm:block" />

          {/* Condition Select */}
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as ItemCondition | 'all')}
            className="bg-stone-50 border border-stone-200 text-stone-700 rounded-lg px-2.5 py-1 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Any Condition</option>
            <option value="like_new">Like New</option>
            <option value="good">Good Condition</option>
            <option value="fair">Fair</option>
          </select>

          {/* Availability toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 select-none">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Available now only</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-stone-500 hover:text-red-600 transition-colors ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Sorting Dropdown & Results Counter */}
        <div className="flex items-center gap-3">
          <span className="text-stone-500 tabular-nums">
            {loading ? 'Searching...' : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-stone-50 border border-stone-200 text-stone-700 rounded-lg px-2.5 py-1 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="newest">Sort: Recently Listed</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Owner Rating</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchFilteredItems}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-medium text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Listings Grid / Loading / Empty */}
      {loading ? (
        <LoadingSkeleton count={8} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No campus items found"
          description="Try relaxing your filters or searching for different keywords like 'camera', 'calculator', or 'backpack'."
          actionText="Clear All Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
