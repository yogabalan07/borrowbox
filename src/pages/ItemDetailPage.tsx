import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  ShieldCheck, 
  Star, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare, 
  ArrowLeft, 
  Clock, 
  Info,
  Shield,
  FileCheck,
  Edit3,
  Trash2,
  Power
} from 'lucide-react';
import { itemsService, requestsService, chatService } from '../services/api';
import { Item } from '../types';
import { useAuth } from '../context/AuthContext';

export const ItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for Borrow Request
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestSuccessId, setRequestSuccessId] = useState<string | null>(null);

  // Owner/admin management state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Default dates: tomorrow to +3 days
  useEffect(() => {
    const today = new Date();
    const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    const end = new Date(tom);
    end.setDate(end.getDate() + 2);

    setStartDate(tom.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    itemsService.getItem(id)
      .then((data) => {
        setItem(data);
        setActiveImageIndex(0);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Item could not be found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Duration & Cost Calculation
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysCount = calculateDays();
  const estimatedCost = item ? (item.lendingMode === 'free' ? 0 : item.dailyPrice * daysCount) : 0;
  const isOwner = currentUser?.id === item?.ownerId;
  const canManage = isOwner || Boolean(currentUser?.isAdmin);

  const handleToggleAvailability = async () => {
    if (!item) return;
    setActionError(null);
    setTogglingAvailability(true);
    try {
      const updated = await itemsService.updateItem(item.id, { isAvailable: !item.isAvailable });
      setItem(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update availability.');
    } finally {
      setTogglingAvailability(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!item) return;
    if (!window.confirm('Delete this listing permanently? This action cannot be undone.')) {
      return;
    }
    setActionError(null);
    setDeleting(true);
    try {
      await itemsService.deleteItem(item.id);
      navigate(isOwner ? '/my-listings' : '/marketplace', { replace: true });
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete this listing.');
      setDeleting(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentUser) {
      setFormError('Please sign in to your student account to borrow this item.');
      return;
    }
    if (isOwner) {
      setFormError('You cannot request your own listed item.');
      return;
    }
    if (daysCount <= 0) {
      setFormError('Return date must be after the start date.');
      return;
    }
    if (item && daysCount < item.minBorrowDays) {
      setFormError(`Minimum borrow duration is ${item.minBorrowDays} day(s).`);
      return;
    }
    if (item && daysCount > item.maxBorrowDays) {
      setFormError(`Maximum borrow duration is ${item.maxBorrowDays} day(s).`);
      return;
    }

    setSubmitting(true);
    try {
      const created = await requestsService.createRequest({
        itemId: item!.id,
        startDate,
        endDate,
        message: message.trim() || `Hi ${item?.owner?.name || 'there'}, I would love to borrow this for ${daysCount} days.`,
      });
      setRequestSuccessId(created.id);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit borrow request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!currentUser || !item) return;
    try {
      const { conversationId } = await chatService.sendMessage({
        recipientId: item.ownerId,
        senderId: currentUser.id,
        text: `Hi ${item.owner.name}! I have a quick question about your ${item.title}.`,
        itemId: item.id,
        itemTitle: item.title,
      });
      navigate('/messages', { state: { conversationId } });
    } catch {
      navigate('/messages');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
          <div className="lg:col-span-7 aspect-4/3 bg-stone-200 rounded-2xl" />
          <div className="lg:col-span-5 space-y-6">
            <div className="h-8 bg-stone-200 rounded w-3/4" />
            <div className="h-6 bg-stone-200 rounded w-1/2" />
            <div className="h-32 bg-stone-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Listing Not Found</h2>
        <p className="text-sm text-stone-500">{error || 'This campus listing is unavailable or has been removed.'}</p>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to all listings</span>
        </Link>
      </div>

      {/* Main PDP 2-Column Split: Gallery Left, Contiguous Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Media & Full Item Description */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main Photo Showcase */}
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 aspect-4/3 shadow-xs flex items-center justify-center">
              {item.images && item.images.length > 0 ? (
                <img
                  src={item.images[activeImageIndex] || item.images[0]}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 text-stone-400">
                  <FileCheck className="w-12 h-12 stroke-1 mb-2 mx-auto" />
                  <span className="text-xs font-medium">No photo uploaded</span>
                </div>
              )}
            </div>

            {item.images && item.images.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {item.images.map((image, index) => (
                  <button
                    key={`${item.id}-image-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImageIndex === index
                        ? 'border-emerald-600'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                    aria-label={`View photo ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Specs */}
          <div className="space-y-6 bg-white p-6 rounded-2xl border border-stone-200">
            <div>
              <h2 className="text-lg font-bold text-stone-900 mb-3">About this item</h2>
              <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>

            <div className="pt-6 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block mb-1">Campus Pickup Spot</span>
                <span className="font-medium text-stone-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  {item.pickupLocation}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block mb-1">Borrow Duration Limits</span>
                <span className="font-medium text-stone-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-stone-500 shrink-0" />
                  {item.minBorrowDays} to {item.maxBorrowDays} days
                </span>
              </div>
            </div>

            {item.guidelines && (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70 text-xs text-stone-600 space-y-1">
                <span className="font-semibold text-stone-800 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  Owner Guidelines & Care Instructions
                </span>
                <p>{item.guidelines}</p>
              </div>
            )}
          </div>

          {/* Verified Owner Profile Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {item.owner?.avatarUrl ? (
                <img
                  src={item.owner.avatarUrl}
                  alt={item.owner.name}
                  className="w-14 h-14 rounded-full object-cover border border-stone-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center border border-emerald-200 shrink-0">
                  {item.owner?.name ? item.owner.name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-900 text-base">{item.owner?.name}</h3>
                  {item.owner?.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified Student
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                  <span>{item.owner.college}</span>
                  <span>·</span>
                  <span>{item.owner.department}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-stone-600 mt-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold tabular-nums">{item.owner.rating}</span>
                  <span className="text-stone-400">({item.owner.reviewCount} campus reviews)</span>
                </div>
              </div>
            </div>

            {!isOwner && (
              <button
                onClick={handleStartChat}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                <MessageSquare className="w-4 h-4 text-stone-500" />
                <span>Chat with {item.owner.name.split(' ')[0]}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Contiguous Purchase / Borrowing Module */}
        <div className="lg:col-span-5 sticky top-24 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
            {/* Title & Category Line */}
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
                <span className="uppercase tracking-wide font-medium">{item.category}</span>
                <span>·</span>
                <span>Condition: {item.condition.replace('_', ' ')}</span>
              </div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight leading-snug">
                {item.title}
              </h1>
            </div>

            {/* Rate & Deposit Breakdown */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 block">Lending Rate</span>
                {item.lendingMode === 'free' ? (
                  <span className="text-2xl font-bold text-emerald-700">FREE</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-stone-900 tabular-nums">${item.dailyPrice}</span>
                    <span className="text-xs text-stone-500 font-medium">/ day</span>
                  </div>
                )}
              </div>

              {item.deposit > 0 && (
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">Security Deposit</span>
                  <span className="text-base font-semibold text-stone-700 tabular-nums">${item.deposit}</span>
                  <span className="text-[10px] text-stone-400 block">Refundable upon return</span>
                </div>
              )}
            </div>

            {/* Request Form */}
            {requestSuccessId ? (
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-semibold text-emerald-900 text-base">Request Submitted!</h4>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  {item.owner.name} has been notified. You can track this loan request and view campus pickup instructions in your requests center.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    to={`/requests/${requestSuccessId}`}
                    className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    View Request Details & Timeline
                  </Link>
                  <Link
                    to="/requests/borrowing"
                    className="text-xs text-emerald-800 hover:underline font-medium"
                  >
                    Back to My Borrowing Requests
                  </Link>
                </div>
              </div>
            ) : canManage ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <p className="font-semibold">
                    {isOwner ? 'This is your listing.' : 'Administrator moderation view.'}
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    {isOwner
                      ? 'You cannot borrow an item you own. Manage availability, details, or incoming requests from here.'
                      : 'You can review, edit, or remove this listing on behalf of the platform.'}
                  </p>
                  {isOwner && (
                    <Link
                      to="/requests/lending"
                      className="inline-block font-semibold text-amber-900 underline mt-1"
                    >
                      Go to Lending Center →
                    </Link>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 text-xs">
                  <div>
                    <span className="font-semibold text-stone-800 block">Listing status</span>
                    <span className={item.isAvailable ? 'text-emerald-700' : 'text-amber-700'}>
                      {item.isAvailable ? 'Available for borrowing' : 'Paused / on loan'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAvailability}
                    disabled={togglingAvailability}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:bg-stone-50 disabled:opacity-60 text-stone-700 rounded-lg font-semibold"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{item.isAvailable ? 'Mark unavailable' : 'Mark available'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to={`/items/${item.id}/edit`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Listing</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleDeleteListing}
                    disabled={deleting}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-60 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>

                {actionError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    {actionError}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Return Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Message to {item.owner.name.split(' ')[0]}
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Briefly state what you need this for and your preferred meetup time..."
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Calculation Summary */}
                <div className="py-3 px-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-stone-600">
                    <span>Borrow Duration:</span>
                    <span className="font-semibold text-stone-900 tabular-nums">
                      {daysCount > 0 ? `${daysCount} day${daysCount > 1 ? 's' : ''}` : 'Select dates'}
                    </span>
                  </div>
                  {item.lendingMode === 'rent' && (
                    <div className="flex justify-between text-stone-600">
                      <span>Daily Rate × Days:</span>
                      <span className="font-semibold text-stone-900 tabular-nums">
                        ${item.dailyPrice} × {daysCount} = ${estimatedCost}
                      </span>
                    </div>
                  )}
                  {item.deposit > 0 && (
                    <div className="flex justify-between text-stone-500 text-[11px]">
                      <span>Refundable Deposit:</span>
                      <span className="tabular-nums">${item.deposit}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-900 text-sm">
                    <span>Estimated Total:</span>
                    <span className="text-emerald-700 tabular-nums">
                      {item.lendingMode === 'free' ? 'FREE' : `$${estimatedCost}`}
                    </span>
                  </div>
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !item.isAvailable}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-colors shadow-xs ${
                    item.isAvailable
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  {submitting
                    ? 'Submitting Request...'
                    : item.isAvailable
                    ? item.lendingMode === 'free'
                      ? 'Request to Borrow (Free)'
                      : `Request to Rent ($${estimatedCost})`
                    : 'Currently On Loan'}
                </button>
              </form>
            )}

            {/* Trust disclaimer */}
            <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Campus peer verification protects both sides. No payments processed until in-person inspection.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
