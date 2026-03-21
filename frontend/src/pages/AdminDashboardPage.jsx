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
import { generateAndDownloadInvoice } from '../utils/invoiceGenerator';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState({});
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [productStatusTab, setProductStatusTab] = useState('pending');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [sellerPayouts, setSellerPayouts] = useState([]);
  const [payoutReferenceDrafts, setPayoutReferenceDrafts] = useState({});
  const [payoutProcessingSellerId, setPayoutProcessingSellerId] = useState(null);

  const fetchAdminData = async () => {
    const analyticsData = await apiRequest('/api/admin/analytics', 'GET', session.access_token);
    setAnalytics(analyticsData);
    setUsers(analyticsData.crmUsers || []);

    const submissionsData = await apiRequest('/api/admin/product-submissions', 'GET', session.access_token);
    const nextSubmissions = submissionsData.submissions || [];
    setSubmissions(nextSubmissions);

    try {
      const payoutsData = await apiRequest('/api/admin/seller-payouts', 'GET', session.access_token);
      const nextPayouts = payoutsData.payouts || [];
      setSellerPayouts(nextPayouts);

      const nextPayoutReferenceDrafts = {};
      nextPayouts.forEach((payout) => {
        nextPayoutReferenceDrafts[payout.seller_id] = '';
      });
      setPayoutReferenceDrafts(nextPayoutReferenceDrafts);
    } catch (error) {
      setSellerPayouts([]);
    }

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

    // Fetch order items for each order
    if (ordersData && ordersData.length > 0) {
      const itemsMap = {};
      for (const order of ordersData) {
        const { data: items } = await supabase
          .from('order_items')
          .select('*, product:products(name)')
          .eq('order_id', order.id);
        
        itemsMap[order.id] = items || [];
      }
      setOrderItems(itemsMap);
    }
  };

  useEffect(() => {
    if (session?.access_token) fetchAdminData();
  }, [session?.access_token]);

  const handleDownloadInvoice = async (order) => {
    setDownloadingInvoiceId(order.id);
    try {
      const items = (orderItems[order.id] || []).map((item) => ({
        product_name: item.product?.name || item.product_id,
        quantity: item.quantity,
        price: item.price,
      }));
      await generateAndDownloadInvoice(order, items);
    } catch (error) {
      console.error('Error downloading invoice:', error);
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const setPayoutReferenceValue = (sellerId, value) => {
    setPayoutReferenceDrafts((prev) => ({
      ...prev,
      [sellerId]: value,
    }));
  };

  const handleMarkSellerPaid = async (sellerId, orderItemIds) => {
    try {
      setPayoutProcessingSellerId(sellerId);
      const payoutReference = (payoutReferenceDrafts[sellerId] || '').trim();

      await apiRequest(`/api/admin/seller-payouts/${sellerId}/mark-paid`, 'PATCH', session.access_token, {
        orderItemIds,
        payoutReference,
      });

      await fetchAdminData();
    } catch (error) {
      alert(error.message || 'Failed to mark payout as paid');
    } finally {
      setPayoutProcessingSellerId(null);
    }
  };

  const handleDownloadPayoutReport = () => {
    const header = [
      'Seller Email',
      'Seller ID',
      'Total Earning',
      'Total Paid',
      'Total Unpaid',
      'Order Item ID',
      'Order ID',
      'Product Name',
      'Order Status',
      'Seller Earning',
      'Payout Status',
      'Payout Paid At',
      'Payout Reference',
    ];

    const escapeCsv = (value) => {
      const text = value === null || value === undefined ? '' : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = [];
    sellerPayouts.forEach((payout) => {
      const items = payout.items || [];

      if (!items.length) {
        rows.push([
          payout.seller_email || '',
          payout.seller_id,
          Number(payout.total_earning || 0).toFixed(2),
          Number(payout.total_paid || 0).toFixed(2),
          Number(payout.total_unpaid || 0).toFixed(2),
          '', '', '', '', '', '', '', '',
        ]);
        return;
      }

      items.forEach((item) => {
        rows.push([
          payout.seller_email || '',
          payout.seller_id,
          Number(payout.total_earning || 0).toFixed(2),
          Number(payout.total_paid || 0).toFixed(2),
          Number(payout.total_unpaid || 0).toFixed(2),
          item.order_item_id,
          item.order_id,
          item.product_name || '',
          item.order_status || '',
          Number(item.seller_earning || 0).toFixed(2),
          item.payout_status || 'unpaid',
          item.payout_paid_at ? new Date(item.payout_paid_at).toISOString() : '',
          item.payout_reference || '',
        ]);
      });
    });

    const csvContent = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seller-payout-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  // Helper to filter products by status
  const getProductsByStatus = (status) => {
    return submissions.filter((sub) => sub.verification_status === status);
  };

  const pendingProducts = getProductsByStatus('pending');
  const verifiedProducts = getProductsByStatus('verified');
  const rejectedProducts = getProductsByStatus('rejected');

  const displayedProducts = {
    pending: pendingProducts,
    verified: verifiedProducts,
    rejected: rejectedProducts,
  }[productStatusTab] || [];

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

      {/* Main Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-0 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📦 Products
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === 'orders'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            🛒 Orders
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === 'payouts'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            💸 Payouts
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Users (CRM)
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === 'analytics'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Analytics
          </button>
        </div>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Student Product Reviews</h2>
              <p className="mt-1 text-sm text-slate-600">Review all student product submissions across all statuses.</p>
            </div>

            {/* Product Status Sub-tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              <button
                onClick={() => setProductStatusTab('pending')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  productStatusTab === 'pending'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ⏳ Pending ({pendingProducts.length})
              </button>
              <button
                onClick={() => setProductStatusTab('verified')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  productStatusTab === 'verified'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ✓ Verified ({verifiedProducts.length})
              </button>
              <button
                onClick={() => setProductStatusTab('rejected')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  productStatusTab === 'rejected'
                    ? 'bg-red-100 text-red-900 border border-red-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ✗ Rejected ({rejectedProducts.length})
              </button>
            </div>

            {/* Products List */}
            <div className="space-y-4 max-h-[40rem] overflow-auto pr-2">
              {displayedProducts.length === 0 && (
                <p className="text-sm text-slate-600 text-center py-8">No products in this status.</p>
              )}
              {displayedProducts.map((submission) => {
                const draft = reviewDrafts[submission.id] || {};
                const isLoading = reviewLoadingId === submission.id;
                const isPending = submission.verification_status === 'pending';
                const isVerified = submission.verification_status === 'verified';
                const isRejected = submission.verification_status === 'rejected';

                return (
                  <div key={submission.id} className={`rounded-xl border p-4 ${
                    isVerified ? 'border-emerald-300 bg-emerald-50' :
                    isRejected ? 'border-red-300 bg-red-50' :
                    'border-slate-200 bg-white'
                  }`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{submission.name}</p>
                        <p className="text-xs text-slate-500">Seller: {submission.seller_email || submission.seller_id}</p>
                        <p className="mt-1 text-sm text-slate-600">Current Price: {formatCurrency(submission.price)}</p>
                        <p className="text-xs text-slate-500">
                          Status: <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            isVerified ? 'bg-emerald-200 text-emerald-900' :
                            isRejected ? 'bg-red-200 text-red-900' :
                            'bg-amber-200 text-amber-900'
                          }`}>{submission.verification_status}</span> • Offer: {submission.price_offer_status}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        ID #{submission.id}
                      </span>
                    </div>

                    {isPending ? (
                      <>
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
                      </>
                    ) : (
                      <div className="mt-3">
                        <p className="text-xs text-slate-600">
                          {isVerified && `✓ Verified on ${new Date(submission.updated_at).toLocaleDateString()}`}
                          {isRejected && `✗ Rejected on ${new Date(submission.updated_at).toLocaleDateString()}`}
                        </p>
                        {submission.admin_review_note && (
                          <p className="text-xs text-slate-600 mt-1">Note: {submission.admin_review_note}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="p-5 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">All Orders</h2>
            <div className="space-y-3 max-h-96 overflow-auto">
              {orders.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">No orders found.</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">Order #{order.id}</p>
                        <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                        <p className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900">
                          {order.status}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(order.total_price)}</p>
                        <button
                          type="button"
                          disabled={downloadingInvoiceId === order.id}
                          onClick={() => handleDownloadInvoice(order)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 transition disabled:opacity-60 flex items-center gap-1"
                        >
                          {downloadingInvoiceId === order.id ? '⏳ Generating...' : '📥 Download Invoice'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
              <h2 className="text-xl font-semibold text-slate-900">Seller Payout Report</h2>
              <p className="mt-1 text-sm text-slate-600">Track unpaid seller earnings and mark payouts as settled.</p>
              </div>
              <button
                type="button"
                disabled={sellerPayouts.length === 0}
                onClick={handleDownloadPayoutReport}
                className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
              >
                ⬇️ Download Payout CSV
              </button>
            </div>

            <div className="space-y-4 max-h-[36rem] overflow-auto pr-2">
              {sellerPayouts.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">No seller payout data found.</p>
              ) : (
                sellerPayouts.map((payout) => {
                  const unpaidItems = (payout.items || []).filter((item) => item.payout_status !== 'paid');
                  const isProcessing = payoutProcessingSellerId === payout.seller_id;

                  return (
                    <div key={payout.seller_id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{payout.seller_email || payout.seller_id}</p>
                          <p className="text-xs text-slate-500">Seller ID: {payout.seller_id}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-right">
                          <div className="rounded-lg bg-slate-100 px-3 py-2">
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(payout.total_earning || 0)}</p>
                          </div>
                          <div className="rounded-lg bg-emerald-100 px-3 py-2">
                            <p className="text-xs text-emerald-700">Paid</p>
                            <p className="text-sm font-semibold text-emerald-900">{formatCurrency(payout.total_paid || 0)}</p>
                          </div>
                          <div className="rounded-lg bg-amber-100 px-3 py-2">
                            <p className="text-xs text-amber-700">Unpaid</p>
                            <p className="text-sm font-semibold text-amber-900">{formatCurrency(payout.total_unpaid || 0)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={payoutReferenceDrafts[payout.seller_id] || ''}
                          onChange={(event) => setPayoutReferenceValue(payout.seller_id, event.target.value)}
                          className="form-input max-w-xs"
                          placeholder="Payout reference (UTR / txn id)"
                        />
                        <button
                          type="button"
                          disabled={isProcessing || unpaidItems.length === 0}
                          onClick={() => handleMarkSellerPaid(payout.seller_id, unpaidItems.map((item) => item.order_item_id))}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          {isProcessing ? 'Marking...' : `Mark Unpaid (${unpaidItems.length}) as Paid`}
                        </button>
                      </div>

                      <div className="mt-3 space-y-2">
                        {(payout.items || []).slice(0, 8).map((item) => (
                          <div key={item.order_item_id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-slate-800">Order #{item.order_id} · {item.product_name}</p>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                item.payout_status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.payout_status === 'paid' ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                              <p>Earning: {formatCurrency(item.seller_earning || 0)}</p>
                              <p>{item.payout_paid_at ? `Paid on ${new Date(item.payout_paid_at).toLocaleDateString()}` : 'Not paid yet'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Users (CRM) Tab */}
        {activeTab === 'users' && (
          <div className="p-5 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Users (CRM)</h2>
            <div className="space-y-3 max-h-96 overflow-auto">
              {users.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">No users found.</p>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{user.email}</p>
                        <p className="text-sm text-slate-600 mt-1">Role: <span className="font-medium">{user.role}</span></p>
                        <p className="text-sm text-slate-600">Orders: <span className="font-medium">{user.orders_count}</span></p>
                      </div>
                      <p className="text-right">
                        <p className="text-xs text-slate-500">Total Spend</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(user.total_spending)}</p>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="p-5 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Daily Sales Analytics</h2>
            <div style={{ height: '400px' }}>
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
                options={{
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
