import React from 'react';
import StarRating from './StarRating';

export default function ReviewsList({ reviews = [], averageRating = 0, totalReviews = 0 }) {
  return (
    <div className="space-y-4">
      {/* Rating Summary */}
      <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-slate-600">Average Rating</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{averageRating.toFixed(1)}</p>
          </div>
          <div className="text-right">
            <StarRating rating={averageRating} size="lg" />
            <p className="mt-2 text-sm text-slate-600">
              {totalReviews} review{totalReviews === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">
          {totalReviews === 0 ? 'No reviews yet' : `Customer Reviews (${totalReviews})`}
        </h3>

        {reviews.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-600">
              Be the first to review this product! 👋
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{review.user_name}</p>
                    <span className="text-xs text-slate-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={Number(review.rating || 0)} size="sm" />
                  </div>
                </div>
              </div>

              {review.review && (
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                  "{review.review}"
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
