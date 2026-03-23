import { useEffect, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import SuccessMessage from '../components/SuccessMessage';
import { supabase } from '../services/supabaseClient';
import { useCart } from '../services/CartContext';
import { useAuth } from '../services/AuthContext';

export default function ProductsPage() {
  const { addToCart } = useCart();
  const { profile } = useAuth();
  const [products, setProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const sortBySponsoredPriority = (items) => {
    const now = Date.now();

    return [...items].sort((first, second) => {
      const firstSponsored = Boolean(
        first.is_sponsored
        && (!first.sponsored_until || new Date(first.sponsored_until).getTime() > now)
      );
      const secondSponsored = Boolean(
        second.is_sponsored
        && (!second.sponsored_until || new Date(second.sponsored_until).getTime() > now)
      );

      if (firstSponsored !== secondSponsored) {
        return firstSponsored ? -1 : 1;
      }

      return Number(second.id) - Number(first.id);
    });
  };

  const handleAddToCart = async (productId) => {
    setError('');
    setSuccessMessage('');

    try {
      await addToCart(productId);
      setSuccessMessage('Added to cart successfully.');
      window.setTimeout(() => setSuccessMessage(''), 2000);
    } catch (addError) {
      setError(addError.message || 'Failed to add product to cart.');
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProducts(data || []);
      }

      setLoading(false);
    };

    fetchProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    const inStockProducts = products.filter((product) => Number(product.stock || 0) > 0);

    if (!profile?.id) {
      return inStockProducts;
    }

    return inStockProducts.filter((product) => String(product.seller_id) !== String(profile.id));
  }, [products, profile?.id]);

  const categories = useMemo(
    () => ['all', ...new Set(visibleProducts.map((product) => product.category).filter(Boolean))],
    [visibleProducts]
  );

  const filteredProducts = useMemo(() => {
    const list = visibleProducts.filter((product) => {
      const matchesSearch = (product.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || product.category === category;
      return matchesSearch && matchesCategory;
    });

    return sortBySponsoredPriority(list);
  }, [visibleProducts, search, category]);

  const allProductsList = filteredProducts;

  useEffect(() => {
    let cancelled = false;

    const fetchRecommendations = async () => {
      if (!visibleProducts.length) {
        if (!cancelled) {
          setRecommendedProducts([]);
        }
        return;
      }

      if (!profile?.id) {
        if (!cancelled) {
          setRecommendedProducts(sortBySponsoredPriority(visibleProducts).slice(0, 3));
        }
        return;
      }

      const { data: ordersData } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      const orderIds = (ordersData || []).map((order) => order.id);

      if (!orderIds.length) {
        if (!cancelled) {
          setRecommendedProducts(sortBySponsoredPriority(visibleProducts).slice(0, 3));
        }
        return;
      }

      const { data: orderedItems } = await supabase
        .from('order_items')
        .select('product_id, product:products(category)')
        .in('order_id', orderIds);

      const purchasedProductIds = new Set((orderedItems || []).map((item) => Number(item.product_id)));
      const categoryScore = {};

      (orderedItems || []).forEach((item) => {
        const category = item.product?.category;
        if (!category) return;
        categoryScore[category] = (categoryScore[category] || 0) + 1;
      });

      const preferredCategories = Object.entries(categoryScore)
        .sort((a, b) => b[1] - a[1])
        .map(([categoryName]) => categoryName)
        .slice(0, 3);

      const preferredRecommendations = visibleProducts.filter(
        (product) =>
          preferredCategories.includes(product.category) &&
          !purchasedProductIds.has(Number(product.id))
      );

      const fallbackRecommendations = visibleProducts.filter(
        (product) => !purchasedProductIds.has(Number(product.id))
      );

      const finalRecommendations = sortBySponsoredPriority((preferredRecommendations.length
        ? preferredRecommendations
        : fallbackRecommendations
      )).slice(0, 3);

      if (!cancelled) {
        setRecommendedProducts(finalRecommendations);
      }
    };

    fetchRecommendations();

    return () => {
      cancelled = true;
    };
  }, [profile?.id, visibleProducts]);

  if (loading) return <Loader text="Loading products..." />;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 animate-fade-in-up sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-gradient text-2xl font-black tracking-tight sm:text-3xl">Products</h1>
        <p className="text-sm text-slate-600">{filteredProducts.length} item(s) available</p>
      </div>

      <div className="glass-panel soft-ring mt-6 grid gap-3 rounded-2xl p-4 sm:grid-cols-2 hover-glow">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
          className="form-input"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="form-input"
        >
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={successMessage} />

      {recommendedProducts.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recommended for You</h2>
            <p className="text-xs text-slate-500">Based on your shopping activity</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedProducts.map((product) => (
              <ProductCard key={`rec-${product.id}`} product={product} onAdd={handleAddToCart} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold text-slate-900">All Products</h2>
          <p className="text-xs text-slate-500">Browse the full marketplace catalog</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {allProductsList.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
          ))}
        </div>
      </div>

      {!allProductsList.length && !recommendedProducts.length && !error && (
        <div className="glass-panel mt-8 rounded-2xl border border-dashed border-indigo-200 p-8 text-center text-slate-600">
          <p className="text-2xl">🔎</p>
          <p className="mt-2 font-semibold text-slate-800">No products match your search.</p>
          <p className="mt-1 text-sm">Try a different keyword or category.</p>
        </div>
      )}
    </section>
  );
}
