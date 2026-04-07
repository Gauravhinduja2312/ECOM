import { useEffect, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { supabase } from '../services/supabaseClient';
import { useCart } from '../services/CartContext';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';

export default function ProductsPage() {
  const { addToCart } = useCart();
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [products, setProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

    try {
      await addToCart(productId);
      addToast('Item added to cart!', 'success');
    } catch (addError) {
      setError(addError.message || 'Failed to add product to cart.');
      addToast(addError.message || 'Failed to add to cart.', 'error');
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

  if (loading) return <Loader text="Loading shop..." />;

  return (
    <div className="bg-[#020617] min-h-screen pt-64 pb-20 stagger-standard text-white">
      <section className="mx-auto max-w-7xl px-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
        <div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase inline-flex items-center gap-5">
            <span className="h-16 w-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-3xl shadow-[0_0_40px_rgba(79,70,229,0.3)]">📦</span>
            Browse Shop
          </h1>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">All Campus Items · Safe & Verified</p>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Available</p>
          <p className="text-3xl font-black text-indigo-400 tracking-tighter">{filteredProducts.length} <span className="text-sm opacity-40">ITEMS</span></p>
        </div>
      </div>

      <div className="glass-primary grid gap-8 rounded-[2.5rem] p-10 lg:grid-cols-2 mb-20 border border-white/5 shadow-2xl">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4 block">Search</label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search for items, books, or electronics..."
            className="standard-input px-8 py-5"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4 block">Category</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="standard-input px-8 py-5"
          >
            {categories.map((option) => (
              <option key={option} value={option}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ErrorMessage message={error} />

      {recommendedProducts.length > 0 && (
        <div className="mb-24 space-y-12">
          <div className="flex items-center gap-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Recommended for You</h2>
            <div className="h-px flex-1 bg-white/5"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Based on your interest</p>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedProducts.map((product) => (
              <ProductCard key={`rec-${product.id}`} product={product} onAdd={handleAddToCart} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-12">
        <div className="flex items-center gap-8">
          <h2 className="text-3xl font-black uppercase tracking-tighter">All Products</h2>
          <div className="h-px flex-1 bg-white/5"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full list</p>
        </div>

        {allProductsList.length > 0 ? (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 stagger-standard">
            {allProductsList.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
            ))}
          </div>
        ) : (
          <div className="glass-card flex flex-col items-center justify-center p-20 text-center border-dashed border-white/5 opacity-50">
            <p className="text-6xl mb-8 animate-pulse">📡</p>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-white">No items found</h3>
            <p className="text-slate-500 text-sm max-w-sm font-medium leading-relaxed">We couldn't find any items matching your search or the shop is currently empty.</p>
          </div>
        )}
      </div>
      </section>
    </div>
  );
}

