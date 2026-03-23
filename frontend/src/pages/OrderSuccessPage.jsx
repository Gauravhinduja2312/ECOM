import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import Loader from '../components/Loader';
import { downloadInvoice } from '../utils/invoice';
import { formatCurrency } from '../utils/format';

export default function OrderSuccessPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      const { data: itemData } = await supabase
        .from('order_items')
        .select('quantity, price, products(name)')
        .eq('order_id', id);

      setOrder(orderData);
      setItems(
        (itemData || []).map((item) => ({
          quantity: item.quantity,
          price: item.price,
          name: item.products?.name || 'Product',
        }))
      );
      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  if (loading) return <Loader text="Loading order summary..." />;
  if (!order) return <p className="px-4 py-10">Order not found.</p>;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 animate-fade-in-up sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-emerald-700 sm:text-3xl">
          <span className="icon-pill">✅</span>
          Payment Successful
        </h1>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Order Confirmed
        </span>
      </div>

      <div className="glass-panel soft-ring mt-6 rounded-2xl p-5 sm:p-6">
        <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            Order ID: <span className="font-semibold text-slate-900">{order.id}</span>
          </p>
          <p>
            Status: <span className="font-semibold capitalize text-slate-900">{order.status}</span>
          </p>
        </div>

        <p className="mt-4 text-sm text-slate-600">Total paid</p>
        <p className="text-gradient mt-1 text-3xl font-black">{formatCurrency(order.total_price)}</p>

        <div className="mt-5 rounded-xl border border-indigo-100 bg-white/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Items purchased</p>
          <div className="mt-2 space-y-2">
          {items.map((item, index) => (
              <p key={index} className="text-sm text-slate-700">
                {item.name} × {item.quantity} = {formatCurrency(item.quantity * item.price)}
              </p>
          ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-gradient rounded-lg px-4 py-2.5"
            onClick={() => downloadInvoice(order, items, profile?.email || '')}
          >
            Download Invoice PDF
          </button>
          <Link to="/dashboard" className="btn-gradient-secondary rounded-lg px-4 py-2.5 font-semibold">
            View Pickup Details
          </Link>
          <Link to="/products" className="btn-gradient-secondary rounded-lg px-4 py-2.5 font-semibold">
            Continue Shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
