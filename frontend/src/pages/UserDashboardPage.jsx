import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import Loader from '../components/Loader';
import { formatCurrency } from '../utils/format';

export default function UserDashboardPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      setOrders(data || []);
      setLoading(false);
    };

    if (profile?.id) fetchOrders();
  }, [profile?.id]);

  const totalSpending = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total_price), 0),
    [orders]
  );

  if (loading) return <Loader text="Loading dashboard..." />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 animate-fade-in-up">
      <h1 className="page-title inline-flex items-center gap-2 text-slate-900">
        <span className="icon-pill">👤</span>
        User Dashboard
      </h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 stagger-children">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
          <p className="text-sm text-slate-500">Profile</p>
          <p className="mt-1 font-semibold text-slate-900">{profile.email}</p>
          <p className="text-sm text-slate-600">Role: {profile.role}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
          <p className="text-sm text-slate-500">Total Spending</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{formatCurrency(totalSpending)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm animate-fade-in-up hover-glow">
        <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm">
              <p className="font-medium text-slate-900">Order #{order.id}</p>
              <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleString()}</p>
              <p className="text-sm text-slate-600">Status: <span className="font-medium capitalize">{order.status}</span></p>
              <p className="text-sm font-semibold text-slate-800">{formatCurrency(order.total_price)}</p>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-slate-600">No orders yet.</p>}
        </div>
      </div>
    </section>
  );
}
