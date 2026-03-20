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
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Products</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
        >
          {categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <ErrorMessage message={error} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={addToCart} />
        ))}
      </div>
    </section>
  );
}
