import { Link } from 'react-router-dom';
import { useCart } from '../services/CartContext';
import { formatCurrency } from '../utils/format';
import Loader from '../components/Loader';

export default function CartPage() {
  const { items, updateQuantity, removeItem, loading } = useCart();

  const total = items.reduce(
    (sum, item) => sum + Number(item.products?.price || 0) * Number(item.quantity),
    0
  );

  if (loading) return <Loader text="Loading cart..." />;

  return (
    <div className="bg-[#020617] min-h-screen pt-64 pb-20 text-white">
      <section className="mx-auto max-w-5xl px-6 stagger-elite">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase inline-flex items-center gap-5">
              <span className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(79,70,229,0.3)]">🛒</span>
              Your Cart
            </h1>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Ready to checkout · {items.length} Items</p>
          </div>
          {items.length > 0 && (
            <div className="flex flex-col items-end">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Amount</p>
              <p className="text-3xl font-black text-indigo-400 tracking-tighter">{formatCurrency(total)}</p>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="glass-card p-20 text-center flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center text-5xl mb-8 animate-pulse">🧺</div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Your cart is empty</h2>
            <p className="text-slate-500 text-sm max-w-sm mb-10 leading-relaxed font-medium">Browse the shop to find items you need.</p>
            <Link to="/products" className="btn-elite px-10 py-5 text-[10px] tracking-[0.2em]">
              GO TO SHOP
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="glass-card p-8 flex flex-col md:flex-row items-center gap-8 group transition hover:bg-white/[0.04]">
                  {/* Thumb */}
                  <div className="h-20 w-20 rounded-2xl bg-white/5 flex-shrink-0 overflow-hidden border border-white/10">
                    {item.products?.image_url ? (
                      <img src={item.products.image_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl opacity-20">📦</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black uppercase tracking-tighter truncate text-white mb-1">{item.products?.name}</h3>
                    <p className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest">{item.products?.category}</p>
                    <p className="text-sm font-black text-slate-400 mt-4">{formatCurrency(item.products?.price)} / unit</p>
                  </div>

                  <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition text-slate-400 hover:text-white"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-black text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition text-slate-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right min-w-[120px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Subtotal</p>
                    <p className="text-lg font-black text-white">{formatCurrency(Number(item.products?.price || 0) * Number(item.quantity))}</p>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="h-12 w-12 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
              <Link to="/products" className="text-[10px] font-black text-slate-500 hover:text-white transition uppercase tracking-[0.2em]">
                ← Continue Shopping
              </Link>
              <Link to="/checkout" className="btn-elite px-12 py-6 text-[11px] tracking-[0.25em] w-full md:w-auto shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                PROCEED TO CHECKOUT
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

