import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CheckCircle2, XCircle, ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { Item } from '../types';

interface ItemCardProps {
  item: Item;
}

const CATEGORY_LABELS: Record<string, string> = {
  textbooks: 'Textbooks & STEM',
  electronics: 'Electronics',
  lab_gear: 'Lab Gear & Kits',
  creative: 'Cameras & Audio',
  outdoors: 'Outdoors & Camping',
  sports: 'Sports & Games',
  miscellaneous: 'Campus Misc',
};

const CONDITION_LABELS: Record<string, string> = {
  like_new: 'Like New',
  good: 'Good Condition',
  fair: 'Fair',
};

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const primaryImage = item.images && item.images.length > 0 ? item.images[0] : null;

  return (
    <article className="group bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col h-full">
      {/* Image Container with 4:3 Aspect Ratio */}
      <Link 
        to={`/items/${item.id}`} 
        className="relative block aspect-4/3 w-full bg-stone-100 overflow-hidden"
      >
        {primaryImage && !imageFailed ? (
          <img
            src={primaryImage}
            alt={item.title}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-4">
            <ImageIcon className="w-10 h-10 mb-2 stroke-1" />
            <span className="text-xs font-medium text-stone-500">{CATEGORY_LABELS[item.category] || 'Campus Gear'}</span>
          </div>
        )}

        {/* Clean top badges: Free vs Paid */}
        <div className="absolute top-3 left-3">
          {item.lendingMode === 'free' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-700 text-white shadow-xs">
              FREE
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-900/90 text-white shadow-xs backdrop-blur-xs tabular-nums">
              ${item.dailyPrice}<span className="font-normal text-stone-300 text-[10px] ml-0.5">/day</span>
            </span>
          )}
        </div>

        {/* Availability status flag */}
        <div className="absolute top-3 right-3">
          <span 
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium backdrop-blur-xs ${
              item.isAvailable
                ? 'bg-white/90 text-emerald-800 border border-emerald-200/50'
                : 'bg-stone-800/90 text-stone-200'
            }`}
          >
            {item.isAvailable ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Available</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-stone-400" />
                <span>On Loan</span>
              </>
            )}
          </span>
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Unboxed Metadata Line with typographic separators */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1.5">
            <span>{CATEGORY_LABELS[item.category] || item.category}</span>
            <span aria-hidden="true">·</span>
            <span>{CONDITION_LABELS[item.condition] || item.condition}</span>
          </div>

          {/* Title */}
          <Link to={`/items/${item.id}`} className="block">
            <h3 className="font-semibold text-stone-900 text-base leading-snug line-clamp-2 hover:text-emerald-700 transition-colors">
              {item.title}
            </h3>
          </Link>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-stone-500 mt-2 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-stone-400" />
            <span className="truncate">{item.pickupLocation}</span>
          </div>
        </div>

        {/* Owner profile & CTA button */}
        <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {item.owner?.avatarUrl ? (
              <img
                src={item.owner.avatarUrl}
                alt={item.owner.name}
                className="w-6 h-6 rounded-full object-cover shrink-0 border border-stone-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                {item.owner?.name ? item.owner.name.charAt(0).toUpperCase() : 'S'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-stone-800 truncate">{item.owner?.name || 'Student'}</p>
              <p className="text-[11px] text-stone-500 truncate">
                {item.owner?.college ? item.owner.college.split(' ')[0] : 'Campus'}
              </p>
            </div>
          </div>

          <Link
            to={`/items/${item.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline shrink-0 group/link"
          >
            <span>View Details</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </article>
  );
};
