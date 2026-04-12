import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { useToast } from '../services/ToastContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { profile, session } = useAuth();
  const { addToast } = useToast();
  const [product, setProduct] = useState(null);
  const [sellerDisplayName, setSellerDisplayName] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

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
            'order_placed', 'processing', 'ready_for_pickup', 'shipped', 'completed', 'paid', 'delivered', 'pending',
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

  const handleAddToCart = async () => {
    if (!session) {
      addToast('Please sign in to continue.', 'error');
      navigate('/auth');
      return;
    }
    
    setAddingToCart(true);
    try {
      await addToCart(product.id);
      addToast(`${product.name} added to your cart.`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to add to cart.', 'error');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleReviewSubmitted = () => {
    loadReviews();
    addToast('Review submitted successfully.', 'success');
  };

  if (loading) return <Loader text="Loading product details..." />;
  if (error || !product) return (
    <div className="bg-[#020617] min-h-screen pt-64 flex flex-col items-center">
      <ErrorMessage message={error || 'Product Not Found'} />
      <button onClick={() => navigate('/products')} className="btn-elite mt-8 px-10 py-4 text-[10px]">BACK TO SHOP</button>
    </div>
  );

  const inStock = Number(product.stock) > 0;
  const fallbackImage = getProductFallbackImage(product);

  return (
    <div className="bg-[#020617] min-h-screen pt-64 pb-20 text-white">
      <section className="mx-auto max-w-7xl px-6 stagger-elite">
        {/* Core Product Display */}
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Visual Domain */}
          <div className="relative group">
            <div className="glass-card overflow-hidden rounded-[2.5rem] bg-white/5 border border-white/10 aspect-square">
              <img
                src={imageSrc}
                alt={product.name}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                onError={() => {
                  if (imageSrc !== fallbackImage) setImageSrc(fallbackImage);
                }}
              />
            </div>
            <div className={`absolute top-6 left-6 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${
              inStock ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-rose-600 text-white shadow-rose-600/20'
            }`}>
              {inStock ? `IN STOCK: ${product.stock}` : 'OUT OF STOCK'}
            </div>
          </div>

          {/* Intel Domain */}
          <div className="flex flex-col justify-center">
            <div className="stagger-children space-y-8">
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Product ID: #{product.id}</p>
                <h1 className="text-5xl font-black tracking-tight uppercase leading-none">{product.name}</h1>
                
                <div className="mt-8 flex items-center gap-6">
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-3 rounded-2xl border border-white/5">
                    <StarRating rating={ratingSummary.averageRating || 0} size="sm" />
                    <span className="text-xs font-black text-indigo-400 ml-2">{ratingSummary.averageRating || 0}</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{ratingSummary.totalReviews || 0} REVIEWS</p>
                </div>
              </div>

              <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-xl">
                {product.description}
              </p>

              <div className="flex flex-col gap-4">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Market Value & Savings</p>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <p className="text-5xl font-black tracking-tighter text-white">{formatCurrency(product.price)}</p>
                    <p className="text-[10px] font-black text-slate-500 line-through opacity-50 uppercase tracking-widest mt-1">
                      Instead of {formatCurrency(product.price * 1.3)}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Save 23%</p>
                    <p className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-widest">College Discount</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex flex-wrap items-center gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={!inStock || addingToCart}
                  className="btn-elite px-12 py-6 text-[11px] tracking-[0.25em] flex items-center gap-4 shadow-[0_0_40px_rgba(79,70,229,0.25)]"
                >
                  {addingToCart ? 'ADDING...' : inStock ? 'ADD TO CART' : 'OUT OF STOCK'}
                </button>
                
                <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Category</p>
                  <p className="text-xs font-black text-white uppercase tracking-widest">{product.category || 'GENERAL'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="mt-32 space-y-16">
          <div className="flex items-center gap-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Customer Reviews</h2>
            <div className="h-px flex-1 bg-white/5"></div>
          </div>

          <div className="grid gap-12 lg:grid-cols-2">
            <div className="glass-card p-10 stagger-children">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-indigo-500"></span> 
                Latest Reviews
              </h3>
              <ReviewsList
                reviews={reviews}
                averageRating={ratingSummary.averageRating || 0}
                totalReviews={ratingSummary.totalReviews || 0}
              />
            </div>

            <div className="glass-card p-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> 
                Rate this Product
              </h3>
              <ReviewForm
                productId={id}
                eligibleOrders={eligibleOrders}
                onReviewSubmitted={handleReviewSubmitted}
                session={session}
              />
            </div>
          </div>
        </div>

        {/* Related Assets */}
        <div className="mt-32">
          <div className="flex items-center gap-8 mb-16">
            <h2 className="text-3xl font-black uppercase tracking-tighter">You might also like</h2>
            <div className="h-px flex-1 bg-white/5"></div>
          </div>
          <RecommendedProducts productId={id} />
        </div>
      </section>
    </div>
  );
}

