import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAuth } from '../services/AuthContext';
import { apiRequest } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../utils/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  const fetchAdminData = async () => {
    const analyticsData = await apiRequest('/api/admin/analytics', 'GET', session.access_token);
    setAnalytics(analyticsData);
    setUsers(analyticsData.crmUsers || []);

    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

    setOrders(ordersData || []);
  };

  useEffect(() => {
    if (session?.access_token) fetchAdminData();
  }, [session?.access_token]);

  const dailySalesLabels = analytics ? Object.keys(analytics.dailySales) : [];
  const dailySalesValues = analytics ? Object.values(analytics.dailySales) : [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <Link
          to="/admin/add-product"
          className="rounded-md bg-slate-900 px-4 py-2 text-white font-medium hover:bg-slate-800"
        >
          + Add Product
        </Link>
      </div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Revenue</p>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(analytics.totalRevenue)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="text-2xl font-semibold text-slate-900">{analytics.totalOrders}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Users</p>
            <p className="text-2xl font-semibold text-slate-900">{analytics.totalUsers}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-900">Daily Sales Analytics</h2>
        <div className="mt-4">
          <Line
            data={{
              labels: dailySalesLabels,
              datasets: [
                {
                  label: 'Daily Sales (INR)',
                  data: dailySalesValues,
                  borderColor: '#0f172a',
                  backgroundColor: '#1e293b',
                },
              ],
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">All Orders</h2>
          <div className="mt-3 space-y-3 max-h-80 overflow-auto">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium">Order #{order.id}</p>
                <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleString()}</p>
                <p className="text-sm text-slate-600">{order.status}</p>
                <p className="text-sm">{formatCurrency(order.total_price)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">Users (CRM)</h2>
          <div className="mt-3 space-y-3 max-h-80 overflow-auto">
            {users.map((user) => (
              <div key={user.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{user.email}</p>
                <p className="text-sm text-slate-600">Role: {user.role}</p>
                <p className="text-sm text-slate-600">Orders: {user.orders_count}</p>
                <p className="text-sm text-slate-700">Spend: {formatCurrency(user.total_spending)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
