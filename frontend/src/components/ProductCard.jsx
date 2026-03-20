import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/format';

export default function ProductCard({ product, onAdd }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <img
        src={product.image_url || 'https://via.placeholder.com/400x220?text=Product'}
        alt={product.name}
        className="h-44 w-full rounded-lg object-cover"
      />
      <div className="mt-3 space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
        <p className="text-sm font-medium text-slate-800">{formatCurrency(product.price)}</p>
        <p className="text-xs text-slate-500">Stock: {product.stock}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          to={`/products/${product.id}`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
        >
          View
        </Link>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => onAdd(product.id)}
          disabled={Number(product.stock) <= 0}
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
}
