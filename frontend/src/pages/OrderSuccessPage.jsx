import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import Loader from '../components/Loader';
import OrderStatusTimeline from '../components/OrderStatusTimeline';
import OrderStatusBadge from '../components/OrderStatusBadge';
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
            Status: <OrderStatusBadge status={order.status} showIcon={true} />
          </p>
        </div>

        <p className="mt-4 text-sm text-slate-600">Total paid</p>
        <p className="text-gradient mt-1 text-3xl font-black">{formatCurrency(order.total_price)}</p>

        {/* Order Status Timeline */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Order Status Timeline</h3>
          <OrderStatusTimeline currentStatus={order.status} statusUpdatedAt={order.status_updated_at} />
        </div>

        {/* Pickup Details */}
        {order.pickup_location && (
          <div className="mt-5 rounded-xl border border-indigo-100 bg-white/70 p-4">
            <p className="text-sm font-semibold text-slate-900">📍 Pickup Information</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p><span className="font-medium">Location:</span> {order.pickup_location}</p>
              <p><span className="font-medium">Pickup Time:</span> {new Date(order.pickup_time).toLocaleString()}</p>
            </div>
          </div>
        )}

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
            className="btn-gradient rounded-lg px-4 py-2.5 flex items-center gap-2 group"
            onClick={() => {
              // Mock verification trigger
              alert('📸 Camera Verification Triggered!\n\nThis would normally open the camera to capture the student handover for audit and security purposes.');
            }}
          >
            <span>📸</span>
            Verify Handover Selfie
          </button>
          <button
            type="button"
            className="btn-gradient-secondary rounded-lg px-4 py-2.5"
            onClick={() => downloadInvoice(order, items, profile?.email || '')}
          >
            Download Invoice PDF
          </button>
          <Link to="/dashboard" className="btn-gradient-secondary rounded-lg px-4 py-2.5 font-semibold">
            View My Orders
          </Link>
          <Link to="/products" className="btn-gradient-secondary rounded-lg px-4 py-2.5 font-semibold">
            Continue Shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
