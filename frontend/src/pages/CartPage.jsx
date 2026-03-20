import { Link } from 'react-router-dom';
import { useCart } from '../services/CartContext';
import { formatCurrency } from '../utils/format';

export default function CartPage() {
  const { items, updateQuantity, removeItem, loading } = useCart();

  const total = items.reduce(
    (sum, item) => sum + Number(item.products?.price || 0) * Number(item.quantity),
    0
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Your Cart</h1>

      {loading ? (
        <p className="mt-6 text-slate-600">Loading cart...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-slate-600">Your cart is empty.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{item.products?.name}</h3>
                  <p className="text-sm text-slate-600">{formatCurrency(item.products?.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-3 py-1"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-3 py-1"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="rounded border border-red-300 px-3 py-1 text-red-700"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-lg font-semibold text-slate-900">Total: {formatCurrency(total)}</p>
            <Link to="/checkout" className="mt-3 inline-block rounded-md bg-slate-900 px-4 py-2 text-white">
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
