import React from 'react';

export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-stone-200 overflow-hidden p-4 space-y-4">
          <div className="aspect-4/3 w-full bg-stone-200 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-stone-200 rounded w-1/3 animate-pulse" />
            <div className="h-5 bg-stone-200 rounded w-4/5 animate-pulse" />
            <div className="h-4 bg-stone-200 rounded w-1/2 animate-pulse" />
          </div>
          <div className="pt-3 border-t border-stone-100 flex justify-between items-center">
            <div className="h-6 w-6 rounded-full bg-stone-200 animate-pulse" />
            <div className="h-4 bg-stone-200 rounded w-1/4 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};
