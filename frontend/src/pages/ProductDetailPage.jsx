import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useCart } from '../services/CartContext';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../utils/format';
import { getProductDisplayImage, getProductFallbackImage } from '../utils/productImage';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { profile } = useAuth();
  const [product, setProduct] = useState(null);
  const [sellerDisplayName, setSellerDisplayName] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      setLoading(false);
    };

    fetchProduct();
  }, [id, profile?.role]);

  if (loading) return <Loader text="Loading product details..." />;
  if (error || !product) return <ErrorMessage message={error || 'Product not found'} />;

  const inStock = Number(product.stock) > 0;
  const fallbackImage = getProductFallbackImage(product);

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 animate-fade-in-up">
      <div className="grid gap-8 md:grid-cols-2 stagger-children">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <img
            src={imageSrc}
            alt={product.name}
            className="h-80 w-full object-cover"
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
            {inStock ? 'In stock' : 'Sold out'}
          </span>
        </div>
        <div className="glass-panel soft-ring rounded-2xl p-6 hover-glow">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Product Details</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{product.name}</h1>
          <p className="mt-4 leading-relaxed text-slate-600">{product.description}</p>
          <p className="text-gradient mt-5 text-3xl font-black">{formatCurrency(product.price)}</p>
          <div className="mt-4 space-y-1 text-sm text-slate-600">
            <p>
              Category: <span className="font-semibold text-slate-800">{product.category || 'General'}</span>
            </p>
            <p>
              Stock: <span className="font-semibold text-slate-800">{product.stock}</span>
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
    </section>
  );
}
