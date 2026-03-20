import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useCart } from '../services/CartContext';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../utils/format';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
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
      }

      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  if (loading) return <Loader text="Loading product details..." />;
  if (error || !product) return <ErrorMessage message={error || 'Product not found'} />;

  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <img
          src={product.image_url || 'https://via.placeholder.com/600x400?text=Product'}
          alt={product.name}
          className="h-72 w-full rounded-xl object-cover"
        />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
          <p className="mt-4 text-slate-600">{product.description}</p>
          <p className="mt-4 text-xl font-semibold text-slate-900">{formatCurrency(product.price)}</p>
          <p className="mt-1 text-sm text-slate-500">Category: {product.category}</p>
          <p className="mt-1 text-sm text-slate-500">Stock: {product.stock}</p>
          <button
            type="button"
            onClick={() => addToCart(product.id)}
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-white"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </section>
  );
}
