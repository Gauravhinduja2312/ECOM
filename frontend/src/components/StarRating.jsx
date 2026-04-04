import React from 'react';

export default function StarRating({ rating = 0, onRatingChange = null, size = 'md', interactive = false }) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const [hoverRating, setHoverRating] = React.useState(0);
  const displayRating = hoverRating || rating;

  return (
    <div className={`flex gap-1 ${interactive ? 'cursor-pointer' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRatingChange && onRatingChange(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={`transition ${interactive ? 'hover:scale-110' : ''}`}
        >
          <span className={sizeClasses[size]}>
            {star <= displayRating ? '⭐' : '☆'}
          </span>
        </button>
      ))}
      {rating > 0 && !interactive && (
        <span className="ml-2 inline-flex items-center text-sm font-semibold text-slate-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
