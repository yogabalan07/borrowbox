import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  MapPin, 
  Info,
  AlertCircle,
  X
} from 'lucide-react';
import { itemsService } from '../services/api';
import { Category, ItemCondition, ItemLendingMode } from '../types';
import { useAuth } from '../context/AuthContext';

export const CreateEditItemPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('textbooks');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [lendingMode, setLendingMode] = useState<ItemLendingMode>('free');
  const [dailyPrice, setDailyPrice] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [pickupLocation, setPickupLocation] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [minBorrowDays, setMinBorrowDays] = useState<number>(1);
  const [maxBorrowDays, setMaxBorrowDays] = useState<number>(14);
  const [guidelines, setGuidelines] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      setFetchLoading(true);
      itemsService.getItem(id)
        .then((existing) => {
          setTitle(existing.title);
          setDescription(existing.description);
          setCategory(existing.category);
          setCondition(existing.condition);
          setLendingMode(existing.lendingMode);
          setDailyPrice(existing.dailyPrice);
          setDeposit(existing.deposit);
          setPickupLocation(existing.pickupLocation);
          if (existing.images && existing.images.length > 0) {
            setImageUrl(existing.images[0]);
          }
          setMinBorrowDays(existing.minBorrowDays);
          setMaxBorrowDays(existing.maxBorrowDays);
          setGuidelines(existing.guidelines || '');
          setIsAvailable(existing.isAvailable);
        })
        .catch((err) => setError(err.message || 'Failed to load item for editing.'))
        .finally(() => setFetchLoading(false));
    }
  }, [id, isEditing]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('You must be signed in to create or edit listings.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const images = imageUrl.trim() ? [imageUrl.trim()] : [];
      const payload = {
        title,
        description,
        category,
        condition,
        lendingMode,
        dailyPrice: lendingMode === 'free' ? 0 : Number(dailyPrice),
        deposit: Number(deposit),
        pickupLocation,
        images,
        isAvailable,
        minBorrowDays: Number(minBorrowDays),
        maxBorrowDays: Number(maxBorrowDays),
        guidelines,
      };

      if (isEditing && id) {
        await itemsService.updateItem(id, payload);
        navigate(`/items/${id}`);
      } else {
        const created = await itemsService.createItem(payload);
        navigate(`/items/${created.id}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save listing.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-8 bg-white rounded-2xl border border-stone-200 animate-pulse text-xs text-stone-400">
          Loading listing details...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          to={isEditing ? `/items/${id}` : '/marketplace'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel & Go Back</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          {isEditing ? 'Edit Campus Listing' : 'List an Item for Campus Sharing'}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Share textbooks, calculators, lab gear, cameras, and recreational equipment with verified students.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs">
        {error && (
          <div className="p-3 mb-6 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload & Preview */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-stone-800">
              Item Photo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 aspect-4/3 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center relative">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Listing preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 p-1 bg-stone-900/70 hover:bg-stone-900 text-white rounded-full text-xs shadow-xs"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4 text-stone-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 stroke-1" />
                    <span className="text-xs">No image selected</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-7 space-y-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">
                    Upload from device:
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg cursor-pointer border border-stone-300 font-medium transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="pt-1">
                  <label className="block text-[11px] text-stone-500 mb-1">
                    Or enter an image web URL:
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/item-photo.jpg"
                    className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Listing Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TI-84 Plus CE Graphing Calculator with Charger"
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="textbooks">Textbooks & STEM Guides</option>
                <option value="electronics">Electronics & Computing</option>
                <option value="lab_gear">Lab Gear & Prototyping Kits</option>
                <option value="creative">Cameras & Audio Gear</option>
                <option value="outdoors">Outdoors & Camping</option>
                <option value="sports">Sports & Campus Games</option>
                <option value="miscellaneous">Campus Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="like_new">Like New (Mint / Unblemished)</option>
                <option value="good">Good (Normal minor wear, 100% functional)</option>
                <option value="fair">Fair (Visible cosmetic wear, works properly)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Description & What’s Included *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what condition the item is in, cables/accessories included, and any helpful tips..."
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Lending Mode (Free vs Paid) */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-4">
            <span className="block text-xs font-bold text-stone-800">
              Lending Mode & Pricing *
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setLendingMode('free');
                  setDailyPrice(0);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border text-center transition-colors ${
                  lendingMode === 'free'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                Free Borrowing (Campus Community Spirit)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLendingMode('rent');
                  if (dailyPrice === 0) setDailyPrice(5);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border text-center transition-colors ${
                  lendingMode === 'rent'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                }`}
              >
                Paid Rental (Daily Rate)
              </button>
            </div>

            {lendingMode === 'rent' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Daily Rental Price ($/day)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">$</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={dailyPrice}
                      onChange={(e) => setDailyPrice(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Optional Refundable Deposit ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold">$</span>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={deposit}
                      onChange={(e) => setDeposit(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location & Duration Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Campus Pickup Spot *
              </label>
              <input
                type="text"
                required
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="e.g. Green Library East Desk"
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Min Days
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={minBorrowDays}
                onChange={(e) => setMinBorrowDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Max Days
              </label>
              <input
                type="number"
                min={minBorrowDays}
                max={90}
                value={maxBorrowDays}
                onChange={(e) => setMaxBorrowDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 tabular-nums"
              />
            </div>
          </div>

          {/* Usage guidelines */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Care Instructions / Return Checklist (Optional)
            </label>
            <input
              type="text"
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              placeholder="e.g. Return with camera lens cap and recharge battery beforehand"
              className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAvailableToggle"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isAvailableToggle" className="text-xs font-medium text-stone-700 cursor-pointer">
              Listing is currently available for new borrowing requests
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              {loading ? 'Saving Listing...' : isEditing ? 'Update Listing' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
