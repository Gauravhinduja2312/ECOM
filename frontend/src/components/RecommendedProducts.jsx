import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import StarRating from './StarRating';
import { formatCurrency } from '../utils/format';
import { getProductDisplayImage, getProductFallbackImage } from '../utils/productImage';

export default function RecommendedProducts({ productId }) {
  const [recommendations, setRecommendations] = useState({ sameCategory: [], trending: [] });
  const [loading, setLoading] = useState(true);
  const fallbackImage = getProductFallbackImage({});

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await apiRequest(`/api/products/${productId}/recommended`);
        setRecommendations(response || { sameCategory: [], trending: [] });
      } catch {
        setRecommendations({ sameCategory: [], trending: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [productId]);

  if (loading) {
    return <div className="py-10 text-center text-slate-600">Loading recommendations...</div>;
  }

  const allRecommendations = [...recommendations.sameCategory, ...recommendations.trending];

  if (allRecommendations.length === 0) {
    return null;
  }

  const ProductCardSmall = ({ product }) => {
    const [imageSrc, setImageSrc] = useState(getProductDisplayImage(product));
    const inStock = Number(product.stock) > 0;

    return (
      <Link
        to={`/products/${product.id}`}
        className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-md hover:-translate-y-0.5"
      >
        <div className="overflow-hidden rounded-lg">
          <img
            src={imageSrc}
            alt={product.name}
            className="h-32 w-full object-cover transition hover:scale-105"
            onError={() => setImageSrc(fallbackImage)}
          />
        </div>
        <div className="mt-2 space-y-1">
          <h4 className="line-clamp-1 text-sm font-semibold text-slate-900">{product.name}</h4>
          <div className="flex items-center gap-1">
            <StarRating rating={product.reviews?.avgRating || 0} size="sm" />
            <span className="text-xs text-slate-500">({product.reviews?.totalReviews || 0})</span>
          </div>
          <p className="text-sm font-bold text-indigo-700">{formatCurrency(product.price)}</p>
          <p className={`text-xs font-medium ${inStock ? 'text-emerald-700' : 'text-rose-700'}`}>
            {inStock ? 'In stock' : 'Sold out'}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">✨ Recommended for You</h2>

      {/* Same Category */}
      {recommendations.sameCategory.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">📦 Similar Products</h3>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {recommendations.sameCategory.slice(0, 4).map((product) => (
              <ProductCardSmall key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Trending */}
      {recommendations.trending.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-slate-800">🔥 Trending Now</h3>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {recommendations.trending.slice(0, 4).map((product) => (
              <ProductCardSmall key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
