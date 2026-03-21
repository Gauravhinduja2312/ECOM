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
  const [submissions, setSubmissions] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewLoadingId, setReviewLoadingId] = useState(null);

  const fetchAdminData = async () => {
    const analyticsData = await apiRequest('/api/admin/analytics', 'GET', session.access_token);
    setAnalytics(analyticsData);
    setUsers(analyticsData.crmUsers || []);

    const submissionsData = await apiRequest('/api/admin/product-submissions', 'GET', session.access_token);
    const nextSubmissions = submissionsData.submissions || [];
    setSubmissions(nextSubmissions);

    const nextDrafts = {};
    nextSubmissions.forEach((submission) => {
      nextDrafts[submission.id] = {
        proposedPrice: submission.proposed_price || submission.price || '',
        commissionRate: submission.commission_rate ?? 10,
        note: submission.admin_review_note || '',
      };
    });
    setReviewDrafts(nextDrafts);

    const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

    setOrders(ordersData || []);
  };

  useEffect(() => {
    if (session?.access_token) fetchAdminData();
  }, [session?.access_token]);

  const dailySalesLabels = analytics ? Object.keys(analytics.dailySales) : [];
  const dailySalesValues = analytics ? Object.values(analytics.dailySales) : [];

  const setDraftValue = (submissionId, key, value) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || {}),
        [key]: value,
      },
    }));
  };

  const handleReview = async (submissionId, action) => {
    try {
      setReviewLoadingId(submissionId);
      const draft = reviewDrafts[submissionId] || {};

      await apiRequest(`/api/admin/product-submissions/${submissionId}/review`, 'PATCH', session.access_token, {
        action,
        proposedPrice: action === 'counter' || action === 'verify' ? Number(draft.proposedPrice) : undefined,
        commissionRate: Number(draft.commissionRate),
        note: draft.note,
      });

      await fetchAdminData();
    } catch (error) {
      alert(error.message || 'Failed to review product');
    } finally {
      setReviewLoadingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 space-y-8 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title inline-flex items-center gap-2 text-slate-900">
          <span className="icon-pill">⚙️</span>
          Admin Dashboard
        </h1>
        <Link
          to="/admin/add-product"
          className="btn-gradient rounded-lg px-4 py-2 font-medium"
        >
          + Add Product
        </Link>
      </div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-3 stagger-children">
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
            <p className="text-sm text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold text-indigo-700">{formatCurrency(analytics.totalRevenue)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
            <p className="text-sm text-slate-500">Total Commission</p>
            <p className="text-2xl font-bold text-violet-700">{formatCurrency(analytics.totalCommission || 0)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
            <p className="text-sm text-slate-500">Seller Payout</p>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(analytics.totalSellerPayout || 0)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
            <p className="text-sm text-slate-500">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900">{analytics.totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
            <p className="text-sm text-slate-500">Total Users</p>
            <p className="text-2xl font-bold text-slate-900">{analytics.totalUsers}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-glow">
        <h2 className="text-xl font-semibold text-slate-900">Student Product Reviews</h2>
        <p className="mt-1 text-sm text-slate-600">Verify products, counter the price, and set commission.</p>
        <div className="mt-4 space-y-4 max-h-[28rem] overflow-auto pr-1">
          {submissions.map((submission) => {
            const draft = reviewDrafts[submission.id] || {};
            const isLoading = reviewLoadingId === submission.id;

            return (
              <div key={submission.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{submission.name}</p>
                    <p className="text-xs text-slate-500">Seller: {submission.seller_email || submission.seller_id}</p>
                    <p className="mt-1 text-sm text-slate-600">Current Price: {formatCurrency(submission.price)}</p>
                    <p className="text-xs text-slate-500">Status: {submission.verification_status} • Offer: {submission.price_offer_status}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    ID #{submission.id}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.proposedPrice ?? ''}
                    onChange={(event) => setDraftValue(submission.id, 'proposedPrice', event.target.value)}
                    className="form-input"
                    placeholder="Counter / approved price"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={draft.commissionRate ?? 10}
                    onChange={(event) => setDraftValue(submission.id, 'commissionRate', event.target.value)}
                    className="form-input"
                    placeholder="Commission %"
                  />
                  <input
                    type="text"
                    value={draft.note ?? ''}
                    onChange={(event) => setDraftValue(submission.id, 'note', event.target.value)}
                    className="form-input"
                    placeholder="Admin note"
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleReview(submission.id, 'verify')}
                    className="btn-gradient px-3 py-2 text-sm"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleReview(submission.id, 'counter')}
                    className="btn-gradient-secondary px-3 py-2 text-sm"
                  >
                    Send Counter Price
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleReview(submission.id, 'reject')}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}

          {!submissions.length && (
            <p className="text-sm text-slate-600">No student submissions found.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm animate-fade-in-up hover-glow">
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
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-glow">
          <h2 className="text-xl font-semibold text-slate-900">All Orders</h2>
          <div className="mt-3 space-y-3 max-h-80 overflow-auto">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm">
                <p className="font-medium">Order #{order.id}</p>
                <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleString()}</p>
                <p className="text-sm text-slate-600">{order.status}</p>
                <p className="text-sm">{formatCurrency(order.total_price)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-glow">
          <h2 className="text-xl font-semibold text-slate-900">Users (CRM)</h2>
          <div className="mt-3 space-y-3 max-h-80 overflow-auto">
            {users.map((user) => (
              <div key={user.id} className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm">
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
