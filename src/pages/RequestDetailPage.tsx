import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileCheck,
  PackageCheck,
  RotateCcw,
  Star
} from 'lucide-react';
import { requestsService, chatService } from '../services/api';
import { BorrowRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [request, setRequest] = useState<BorrowRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequest = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await requestsService.getRequestById(id);
      setRequest(data);
    } catch (err: any) {
      setError(err?.message || 'Loan request not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const [actionError, setActionError] = useState<string | null>(null);

  const handleUpdateStatus = async (status: any) => {
    if (!request) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await requestsService.updateRequestStatus(request.id, status);
      setRequest(updated);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update request on backend.');
    } finally {
      setActionLoading(false);
    }
  };

  const isOwner = currentUser?.id === request?.ownerId;
  const isBorrower = currentUser?.id === request?.borrowerId;

  const handleMessagePeer = async () => {
    if (!currentUser || !request) return;
    const recipient = isOwner ? request.borrower : request.owner;
    try {
      const { conversationId } = await chatService.sendMessage({
        recipientId: recipient.id,
        senderId: currentUser.id,
        text: `Hey ${recipient.name.split(' ')[0]}, about our loan for ${request.item.title}...`,
        itemId: request.itemId,
        itemTitle: request.item.title,
      });
      navigate('/messages', { state: { conversationId } });
    } catch {
      navigate('/messages');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-6 bg-stone-200 rounded w-1/4" />
        <div className="h-32 bg-stone-200 rounded-2xl" />
        <div className="h-64 bg-stone-200 rounded-2xl" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold text-stone-900">Request Not Found</h2>
        <p className="text-xs text-stone-500">{error || 'This borrowing record does not exist.'}</p>
        <Link
          to="/requests/borrowing"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </Link>
      </div>
    );
  }

  // Stepper Stage
  const steps = [
    { title: 'Requested', done: true, timestamp: request.createdAt },
    { 
      title: 'Approved', 
      done: request.status !== 'pending' && request.status !== 'rejected' && request.status !== 'cancelled',
      timestamp: request.status !== 'pending' ? request.updatedAt : undefined 
    },
    { 
      title: 'Handed Over', 
      done: request.status === 'active' || request.status === 'returned' || request.status === 'overdue',
      timestamp: request.handoverConfirmedAt 
    },
    { 
      title: 'Returned', 
      done: request.status === 'returned',
      timestamp: request.returnedConfirmedAt 
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to={isOwner ? '/requests/lending' : '/requests/borrowing'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {isOwner ? 'Lending Center' : 'My Requests'}</span>
        </Link>
      </div>

      {/* Header card with status */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={request.status} />
            <span className="text-xs text-stone-400">·</span>
            <span className="text-xs text-stone-500">ID: {request.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            {request.item.title}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Submitted on {new Date(request.createdAt).toLocaleDateString()}
          </p>
        </div>

        <button
          onClick={handleMessagePeer}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat with {isOwner ? request.borrower.name.split(' ')[0] : request.owner.name.split(' ')[0]}</span>
        </button>
      </div>

      {/* Handover & Loan Stepper Tracker */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-6">
          Campus Loan Lifecycle Tracker
        </h2>
        <div className="grid grid-cols-4 gap-2 relative">
          {steps.map((step, idx) => (
            <div key={step.title} className="text-center relative">
              <div
                className={`w-9 h-9 rounded-full mx-auto flex items-center justify-center font-bold text-xs mb-2 transition-colors ${
                  step.done
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-400 border border-stone-200'
                }`}
              >
                {step.done ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
              </div>
              <p className={`text-xs font-semibold ${step.done ? 'text-stone-900' : 'text-stone-400'}`}>
                {step.title}
              </p>
              {step.timestamp && (
                <p className="text-[10px] text-stone-400 mt-0.5">
                  {new Date(step.timestamp).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Agreement Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loan Details */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
          <h2 className="text-sm font-bold text-stone-900">Agreed Loan Terms</h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Borrow Dates:</span>
              <span className="font-semibold text-stone-800">
                {request.startDate} to {request.endDate} ({request.totalDays} days)
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Agreed Daily Rate:</span>
              <span className="font-semibold text-stone-800 tabular-nums">
                {request.dailyPrice === 0 ? 'FREE' : `$${request.dailyPrice} / day`}
              </span>
            </div>

            {request.deposit > 0 && (
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Refundable Deposit:</span>
                <span className="font-semibold text-stone-800 tabular-nums">${request.deposit}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-b border-stone-100">
              <span className="text-stone-500">Campus Pickup Spot:</span>
              <span className="font-semibold text-stone-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {request.pickupLocation}
              </span>
            </div>

            <div className="flex justify-between py-2 text-sm font-bold text-stone-900 pt-1">
              <span>Rental Total:</span>
              <span className="text-emerald-700 tabular-nums">
                {request.estimatedTotal === 0 ? 'FREE' : `$${request.estimatedTotal}`}
              </span>
            </div>
          </div>

          {request.message && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs">
              <span className="text-stone-500 block mb-1 font-medium">Borrower Message:</span>
              <p className="text-stone-700 italic">"{request.message}"</p>
            </div>
          )}
        </div>

        {/* Counterpart Student Card & Actions */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900 mb-4">
              {isOwner ? 'Borrower Information' : 'Owner Information'}
            </h2>

            {(() => {
              const peer = isOwner ? request.borrower : request.owner;
              return (
                <div className="flex items-start gap-4">
                  <img
                    src={peer.avatarUrl}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover border border-stone-200 shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-stone-900 text-base">{peer.name}</p>
                      {peer.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">{peer.college} · {peer.department}</p>
                    <div className="flex items-center gap-1 text-xs text-stone-600">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-semibold tabular-nums">{peer.rating}</span>
                      <span className="text-stone-400">({peer.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Interactive State Actions */}
          <div className="pt-4 border-t border-stone-100 space-y-2">
            {actionError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                {actionError}
              </div>
            )}
            {isOwner && request.status === 'pending' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus('rejected')}
                  disabled={actionLoading}
                  className="flex-1 py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleUpdateStatus('approved')}
                  disabled={actionLoading}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Approve Request
                </button>
              </div>
            )}

            {isOwner && request.status === 'approved' && (
              <button
                onClick={() => handleUpdateStatus('active')}
                disabled={actionLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Confirm Handover to Borrower</span>
              </button>
            )}

            {isOwner && request.status === 'active' && (
              <button
                onClick={() => handleUpdateStatus('returned')}
                disabled={actionLoading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Item Returned in Good Condition</span>
              </button>
            )}

            {isBorrower && request.status === 'pending' && (
              <button
                onClick={() => handleUpdateStatus('cancelled')}
                disabled={actionLoading}
                className="w-full py-2 px-3 border border-red-200 text-red-700 hover:bg-red-50 rounded-lg text-xs font-medium"
              >
                Cancel This Borrow Request
              </button>
            )}

            {request.status === 'returned' && (
              <div className="p-3 bg-stone-50 rounded-lg text-center text-xs text-stone-600 font-medium">
                ✓ Loan completed and archived. Thank you for campus sharing!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
