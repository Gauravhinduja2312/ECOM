import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import StarRating from './StarRating';
import { formatCurrency } from '../utils/format';
import { getProductDisplayImage, getProductFallbackImage } from '../utils/productImage';

export default function ProductCard({ product, onAdd }) {
  const inStock = Number(product.stock) > 0;
  const lowStock = inStock && Number(product.stock) < 3;
  const fallbackImage = getProductFallbackImage(product);
  const [imageSrc, setImageSrc] = useState(getProductDisplayImage(product));
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const sponsoredActive = Boolean(
    product.is_sponsored
    && (!product.sponsored_until || new Date(product.sponsored_until).getTime() > Date.now())
  );

  useEffect(() => {
    setImageSrc(getProductDisplayImage(product));
    
    // Fetch product reviews
    const fetchReviews = async () => {
      try {
        const response = await apiRequest(`/api/reviews/product/${product.id}`);
        setAverageRating(response.summary?.averageRating || 0);
        setTotalReviews(response.summary?.totalReviews || 0);
      } catch {
        setAverageRating(0);
        setTotalReviews(0);
      }
    };
    
    fetchReviews();
  }, [product]);

  return (
    <article className="group animate-fade-in-up glass-panel soft-ring rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-lg hover-glow">
      <div className="relative overflow-hidden rounded-xl">
        <img
          src={imageSrc}
          alt={product.name}
          className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          onError={() => {
            if (imageSrc !== fallbackImage) {
              setImageSrc(fallbackImage);
            }
          }}
        />
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold ${inStock ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
          {inStock ? 'In stock' : 'Sold out'}
        </span>
        {lowStock && (
          <span className="absolute left-2 top-10 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-semibold text-white">
            Low stock
          </span>
        )}
        {sponsoredActive && (
          <span className="absolute right-2 top-2 rounded-full bg-indigo-600/90 px-2.5 py-1 text-xs font-semibold text-white">
            Sponsored
          </span>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <h3 className="line-clamp-1 text-lg font-black tracking-tight text-slate-900">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
        
        {/* Rating Display */}
        <div className="flex items-center gap-2 py-1">
          <StarRating rating={averageRating} size="sm" />
          <span className="text-xs text-slate-600">
            {averageRating > 0 ? `${totalReviews} review${totalReviews === 1 ? '' : 's'}` : 'No reviews'}
          </span>
        </div>

        <p className="inline-flex items-center gap-1 text-base font-bold text-indigo-700">
          <span>💸</span>
          {formatCurrency(product.price)}
        </p>
        <p className="text-xs font-medium text-slate-500">Stock: {product.stock}</p>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          to={`/products/${product.id}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-100"
        >
          View Details
        </Link>
        <button
          type="button"
          className="btn-gradient rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white disabled:shadow-none"
          onClick={() => onAdd(product.id)}
          disabled={!inStock}
        >
          {inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </article>
  );
}
