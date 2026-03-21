import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/format';

export default function ProductCard({ product, onAdd }) {
  const inStock = Number(product.stock) > 0;

  return (
    <article className="group animate-fade-in-up glass-panel soft-ring rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-lg hover-glow">
      <div className="relative overflow-hidden rounded-xl">
        <img
          src={product.image_url || 'https://via.placeholder.com/400x220?text=Product'}
          alt={product.name}
          className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold ${inStock ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
          {inStock ? 'In stock' : 'Sold out'}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <h3 className="line-clamp-1 text-lg font-black tracking-tight text-slate-900">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
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
