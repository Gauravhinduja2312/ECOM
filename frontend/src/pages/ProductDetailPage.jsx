import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import StarRating from '../components/StarRating';
import ReviewsList from '../components/ReviewsList';
import ReviewForm from '../components/ReviewForm';
import RecommendedProducts from '../components/RecommendedProducts';
import { useCart } from '../services/CartContext';
import { useAuth } from '../services/AuthContext';
import { apiRequest } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../utils/format';
import { getProductDisplayImage, getProductFallbackImage } from '../utils/productImage';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { profile, session } = useAuth();
  const [product, setProduct] = useState(null);
  const [sellerDisplayName, setSellerDisplayName] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReviews = async () => {
    try {
      const reviewResponse = await apiRequest(`/api/reviews/product/${id}`);
      setReviews(reviewResponse.reviews || []);
      setRatingSummary(reviewResponse.summary || { averageRating: 0, totalReviews: 0 });
    } catch {
      setReviews([]);
      setRatingSummary({ averageRating: 0, totalReviews: 0 });
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProduct(data);
        setImageSrc(getProductDisplayImage(data));

        if (profile?.role === 'admin' && data?.seller_id) {
          const { data: sellerData } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.seller_id)
            .maybeSingle();

          const derivedName = (sellerData?.email || '').split('@')[0];
          const displayName =
            sellerData?.name ||
            sellerData?.full_name ||
            sellerData?.username ||
            derivedName ||
            sellerData?.email ||
            String(data.seller_id);

          setSellerDisplayName(displayName);
        } else {
          setSellerDisplayName('');
        }
      }

      await loadReviews();

      if (session?.access_token) {
        try {
          const myOrders = await apiRequest('/api/payment/my-orders', 'GET', session.access_token);
          const reviewEligibleStatuses = new Set([
            'order_placed',
            'processing',
            'ready_for_pickup',
            'shipped',
            'completed',
            'paid',
            'delivered',
            'pending',
          ]);
          const completedOrdersForProduct = (myOrders.orders || []).filter((order) => (
            reviewEligibleStatuses.has(String(order.status || '').toLowerCase())
            && (order.items || []).some((item) => Number(item.product_id) === Number(id))
          ));

          setEligibleOrders(completedOrdersForProduct);
        } catch {
          setEligibleOrders([]);
        }
      }

      setLoading(false);
    };

    fetchProduct();
  }, [id, profile?.role, session?.access_token]);

  const handleReviewSubmitted = () => {
    loadReviews();
  };

  if (loading) return <Loader text="Loading product details..." />;
  if (error || !product) return <ErrorMessage message={error || 'Product not found'} />;

  const inStock = Number(product.stock) > 0;
  const fallbackImage = getProductFallbackImage(product);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 animate-fade-in-up">
      {/* Product Main Section */}
      <div className="grid gap-8 md:grid-cols-2 stagger-children">
        {/* Image */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <img
            src={imageSrc}
            alt={product.name}
            className="h-96 w-full object-cover"
            onError={() => {
              if (imageSrc !== fallbackImage) {
                setImageSrc(fallbackImage);
              }
            }}
          />
          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${
              inStock ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
            }`}
          >
            {inStock ? `${product.stock} in stock` : 'Sold out'}
          </span>
        </div>

        {/* Product Info */}
        <div className="glass-panel soft-ring rounded-2xl p-6 hover-glow">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Product Details</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{product.name}</h1>

          {/* Rating Badge */}
          <div className="mt-4 flex items-center gap-4">
            <div>
              <StarRating rating={ratingSummary.averageRating || 0} size="md" />
            </div>
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{ratingSummary.averageRating || 0}/5</p>
              <p className="text-xs">{ratingSummary.totalReviews || 0} review{ratingSummary.totalReviews === 1 ? '' : 's'}</p>
            </div>
          </div>

          <p className="mt-4 leading-relaxed text-slate-600">{product.description}</p>
          
          <p className="text-gradient mt-5 text-4xl font-black">{formatCurrency(product.price)}</p>

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>
              Category: <span className="font-semibold text-slate-800">{product.category || 'General'}</span>
            </p>
            {profile?.role === 'admin' && sellerDisplayName && (
              <p>
                Posted by: <span className="font-semibold text-slate-800">{sellerDisplayName}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => addToCart(product.id)}
            disabled={!inStock}
            className="btn-gradient mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span>🛒</span>
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>

      <ErrorMessage message={error} />

      {/* Reviews and Feedback Section */}
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {/* Reviews List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">💬 Customer Feedback</h2>
          <ReviewsList
            reviews={reviews}
            averageRating={ratingSummary.averageRating || 0}
            totalReviews={ratingSummary.totalReviews || 0}
          />
        </div>

        {/* Write Review Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">✍️ Share Your Experience</h2>
          <ReviewForm
            productId={id}
            eligibleOrders={eligibleOrders}
            onReviewSubmitted={handleReviewSubmitted}
            session={session}
          />
        </div>
      </div>

      {/* Recommended Products */}
      <div className="mt-10">
        <RecommendedProducts productId={id} />
      </div>
    </section>
  );
}
