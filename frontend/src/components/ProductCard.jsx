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
    <article className="group animate-standard-reveal glass-primary rounded-3xl p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
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
      <div className="mt-6 space-y-4">
        <h3 className="line-clamp-1 text-2xl font-black tracking-tighter text-white uppercase">{product.name}</h3>
        <p className="line-clamp-2 text-sm font-medium text-slate-400 leading-relaxed">{product.description}</p>
        
        {/* Rating Display */}
        <div className="flex items-center gap-3 py-1">
          <StarRating rating={averageRating} size="sm" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {averageRating > 0 ? `${totalReviews} REVIEWS` : 'NO REVIEWS'}
          </span>
        </div>

        <p className="inline-flex items-center gap-2 text-xl font-black text-indigo-400 uppercase tracking-tighter">
          <span>🏷️</span>
          {formatCurrency(product.price)}
        </p>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">Quantity: {product.stock}</p>
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to={`/products/${product.id}`}
          className="flex-1 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
        >
          Details
        </Link>
        <button
          type="button"
          className="btn-primary flex-2 px-6 py-3 text-[10px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => onAdd(product.id)}
          disabled={!inStock}
        >
          {inStock ? 'Add to Cart' : 'Sold Out'}
        </button>
      </div>
    </article>
  );
}
