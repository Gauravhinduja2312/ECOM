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
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">User Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Profile</p>
          <p className="mt-1 font-semibold text-slate-900">{profile.email}</p>
          <p className="text-sm text-slate-600">Role: {profile.role}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Spending</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(totalSpending)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-slate-200 p-3">
              <p className="font-medium text-slate-900">Order #{order.id}</p>
              <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleString()}</p>
              <p className="text-sm text-slate-600">Status: {order.status}</p>
              <p className="text-sm text-slate-800">{formatCurrency(order.total_price)}</p>
            </div>
          ))}
          {orders.length === 0 && <p className="text-sm text-slate-600">No orders yet.</p>}
        </div>
      </div>
    </section>
  );
}
