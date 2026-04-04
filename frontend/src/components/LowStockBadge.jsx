import React from 'react';

export default function LowStockBadge({ stock = 0 }) {
  if (!stock || stock >= 3) {
    return null;
  }

  const isVeryLow = stock === 1;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      isVeryLow
        ? 'bg-red-100 text-red-700 border border-red-200'
        : 'bg-amber-100 text-amber-700 border border-amber-200'
    }`}>
      <span>{isVeryLow ? '⚠️' : '⚡'}</span>
      {isVeryLow ? 'Only 1 left' : `Only ${stock} left`}
    </div>
  );
}
