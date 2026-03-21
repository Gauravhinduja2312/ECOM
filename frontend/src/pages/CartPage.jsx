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
    <section className="mx-auto max-w-5xl px-4 py-8 animate-fade-in-up sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          <span className="icon-pill">🛒</span>
          Your Cart
        </h1>
        <p className="text-sm text-slate-600">{items.length} item(s)</p>
      </div>

      {loading ? (
        <div className="glass-panel mt-6 rounded-2xl p-6 text-center text-slate-600">Loading cart...</div>
      ) : items.length === 0 ? (
        <div className="glass-panel mt-6 rounded-2xl p-8 text-center">
          <p className="text-3xl">🧺</p>
          <p className="mt-2 font-semibold text-slate-900">Your cart is empty</p>
          <p className="mt-1 text-sm text-slate-600">Explore products and add your favorites.</p>
          <Link to="/products" className="btn-gradient mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2">
            <span>🛍️</span>
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="glass-panel soft-ring rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{item.products?.name}</h3>
                  <p className="text-sm text-slate-600">{formatCurrency(item.products?.price)} each</p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span className="min-w-8 rounded-md bg-indigo-50 px-2 py-1 text-center font-semibold text-indigo-700">{item.quantity}</span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">
                Subtotal: {formatCurrency(Number(item.products?.price || 0) * Number(item.quantity))}
              </p>
            </div>
          ))}

          <div className="glass-panel soft-ring rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-semibold text-slate-900">Order Total</p>
              <p className="text-2xl font-black text-gradient">{formatCurrency(total)}</p>
            </div>
            <Link to="/checkout" className="btn-gradient mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold">
              <span>💳</span>
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
