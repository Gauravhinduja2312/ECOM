import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
    <section className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-emerald-700">Payment Successful</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-700">Order ID: {order.id}</p>
        <p className="text-slate-700">Status: {order.status}</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">
          Total Paid: {formatCurrency(order.total_price)}
        </p>

        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <p key={index} className="text-sm text-slate-700">
              {item.name} × {item.quantity} = {formatCurrency(item.quantity * item.price)}
            </p>
          ))}
        </div>

        <button
          type="button"
          className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-white"
          onClick={() => downloadInvoice(order, items, profile?.email || '')}
        >
          Download Invoice PDF
        </button>
      </div>
    </section>
  );
}
