import { useEffect, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { supabase } from '../services/supabaseClient';
import { useCart } from '../services/CartContext';

export default function ProductsPage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

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

  const categories = useMemo(
    () => ['all', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || product.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={addToCart} />
        ))}
      </div>

      {!filteredProducts.length && !error && (
        <div className="glass-panel mt-8 rounded-2xl border border-dashed border-indigo-200 p-8 text-center text-slate-600">
          <p className="text-2xl">🔎</p>
          <p className="mt-2 font-semibold text-slate-800">No products match your search.</p>
          <p className="mt-1 text-sm">Try a different keyword or category.</p>
        </div>
      )}
    </section>
  );
}
