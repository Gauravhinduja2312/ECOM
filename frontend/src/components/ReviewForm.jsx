import React, { useState } from 'react';
import { apiRequest } from '../services/api';
import StarRating from './StarRating';

export default function ReviewForm({ productId, eligibleOrders, onReviewSubmitted, session }) {
  const [selectedOrderId, setSelectedOrderId] = useState(eligibleOrders.length > 0 ? String(eligibleOrders[0].id) : '');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!session?.access_token) {
      setError('Please login to submit a review');
      return;
    }

    if (!selectedOrderId) {
      setError('Select a completed order first');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiRequest('/api/reviews', 'POST', session.access_token, {
        orderId: Number(selectedOrderId),
        productId: Number(productId),
        rating: Number(rating),
        review: reviewText,
      });

      setSuccess('✅ Review submitted successfully!');
      setReviewText('');
      setRating(5);
      
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (submitError) {
      setError(submitError.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (eligibleOrders.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-sm text-slate-600">
          📋 You can review this product after a completed purchase.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Completed Order
        </label>
        <select
          value={selectedOrderId}
          onChange={(e) => setSelectedOrderId(e.target.value)}
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {eligibleOrders.map((order) => (
            <option key={order.id} value={order.id}>
              Order #{order.id} - {new Date(order.created_at).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Rating
        </label>
        <div className="flex items-center gap-3">
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            size="lg"
            interactive={true}
          />
          <span className="ml-2 text-sm font-semibold text-slate-600">{rating}/5</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Your Review (Optional)
        </label>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          maxLength={500}
          className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Share your experience with this product..."
          rows={4}
        />
        <p className="mt-1 text-xs text-slate-500">
          {reviewText.length}/500 characters
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className={`w-full rounded-lg px-4 py-2.5 font-semibold text-white transition ${
          submitting
            ? 'bg-slate-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
        }`}
      >
        {submitting ? '⏳ Submitting...' : '✨ Submit Review'}
      </button>
    </div>
  );
}
