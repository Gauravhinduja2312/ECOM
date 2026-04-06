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
  const [supportTickets, setSupportTickets] = useState([]);
  const [returns, setReturns] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [productStatusTab, setProductStatusTab] = useState('pending');
  const [acquireDrafts, setAcquireDrafts] = useState({});
  const [acquireLoadingId, setAcquireLoadingId] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [sellerPayouts, setSellerPayouts] = useState([]);
  const [payoutReferenceDrafts, setPayoutReferenceDrafts] = useState({});
  const [payoutProcessingSellerId, setPayoutProcessingSellerId] = useState(null);
  const [orderStatusProcessingId, setOrderStatusProcessingId] = useState(null);
  const [dataLoadError, setDataLoadError] = useState('');
  const [upiActionMessage, setUpiActionMessage] = useState('');

  const fetchAdminData = async () => {
    if (!session?.access_token) {
      return;
    }

    setDataLoadError('');

    const [analyticsResult, submissionsResult, payoutsResult, ordersResult, ticketsResult, returnsResult, logsResult] = await Promise.allSettled([
      apiRequest('/api/admin/analytics', 'GET', session.access_token),
      apiRequest('/api/admin/product-submissions', 'GET', session.access_token),
      apiRequest('/api/admin/seller-payouts', 'GET', session.access_token),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('support_tickets').select('*, user:users(email)').order('created_at', { ascending: false }),
      supabase.from('returns').select('*, user:users(email), order_item:order_items(product:products(name))').order('created_at', { ascending: false }),
      supabase.from('inventory_logs').select('*, product:products(name)').order('created_at', { ascending: false }),
    ]);

    const loadErrors = [];
    const loadErrorDetails = [];

    if (analyticsResult.status === 'fulfilled') {
      setAnalytics(analyticsResult.value);
      setUsers(analyticsResult.value.crmUsers || []);
    } else {
      loadErrors.push('analytics');
      loadErrorDetails.push(`analytics: ${analyticsResult.reason?.message || 'failed'}`);
    }

    if (submissionsResult.status === 'fulfilled') {
      const nextSubmissions = submissionsResult.value.submissions || [];
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
    } else {
      loadErrors.push('products');
      loadErrorDetails.push(`products: ${submissionsResult.reason?.message || 'failed'}`);
    }

    if (payoutsResult.status === 'fulfilled') {
      const nextPayouts = payoutsResult.value.payouts || [];
      setSellerPayouts(nextPayouts);

      const nextPayoutReferenceDrafts = {};
      nextPayouts.forEach((payout) => {
        nextPayoutReferenceDrafts[payout.seller_id] = '';
      });
      setPayoutReferenceDrafts(nextPayoutReferenceDrafts);
    } else {
      setSellerPayouts([]);
      loadErrors.push('payouts');
      loadErrorDetails.push(`payouts: ${payoutsResult.reason?.message || 'failed'}`);
    }

    if (ordersResult.status === 'fulfilled') {
      const { data: ordersData, error: ordersError } = ordersResult.value;
      if (ordersError) {
        loadErrors.push('orders');
        loadErrorDetails.push(`orders: ${ordersError.message || 'failed'}`);
      } else {
        setOrders(ordersData || []);

        const itemsMap = {};
        if (ordersData && ordersData.length > 0) {
          for (const order of ordersData) {
            const { data: items } = await supabase
              .from('order_items')
              .select('*, product:products(name)')
              .eq('order_id', order.id);

            itemsMap[order.id] = items || [];
          }
        }
        setOrderItems(itemsMap);
      }
    } else {
      loadErrors.push('orders');
      loadErrorDetails.push(`orders: ${ordersResult.reason?.message || 'failed'}`);
    }

    if (ticketsResult.status === 'fulfilled') {
      setSupportTickets(ticketsResult.value.data || []);
    }
    
    if (returnsResult.status === 'fulfilled') {
      setReturns(returnsResult.value.data || []);
    }
    
    if (logsResult.status === 'fulfilled') {
      setInventoryLogs(logsResult.value.data || []);
    }

    if (loadErrors.length) {
      const detailsText = loadErrorDetails.length ? ` Details: ${loadErrorDetails.join(' | ')}` : '';
      setDataLoadError(`Some sections failed to load: ${loadErrors.join(', ')}. Check backend/Supabase connectivity and try again.${detailsText}`);
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

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      setOrderStatusProcessingId(orderId);
      await apiRequest(`/api/admin/orders/${orderId}/status`, 'PATCH', session.access_token, { status });
      await fetchAdminData();
    } catch (error) {
      alert(error.message || 'Failed to update order status');
    } finally {
      setOrderStatusProcessingId(null);
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

  const createUpiPaymentLink = ({ upiId, amount, sellerName }) => {
    if (!upiId) {
      return null;
    }

    const params = new URLSearchParams({
      pa: upiId,
      pn: sellerName || 'Student Seller',
      am: Number(amount || 0).toFixed(2),
      cu: 'INR',
      tn: 'Marketplace seller payout',
    });

    return `upi://pay?${params.toString()}`;
  };

  const handlePayViaUpiApp = async ({ upiId, amount, sellerName, qrUrl }) => {
    const upiLink = createUpiPaymentLink({ upiId, amount, sellerName });

    if (!upiLink) {
      setUpiActionMessage('UPI ID not found for this seller.');
      return;
    }

    setUpiActionMessage('');

    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent || '');

    if (!isMobileDevice) {
      try {
        await navigator.clipboard.writeText(upiLink);
        setUpiActionMessage('Desktop detected: UPI link copied. Open it on your phone UPI app, or use Open UPI QR.');
      } catch (_error) {
        setUpiActionMessage('Desktop detected: use Open UPI QR to complete payment.');
      }
      return;
    }

    try {
      window.location.href = upiLink;
      setTimeout(() => {
        setUpiActionMessage('If UPI app did not open, use Open UPI QR and then mark payout as paid.');
      }, 1200);
    } catch (_error) {
      if (qrUrl) {
        window.open(qrUrl, '_blank', 'noopener,noreferrer');
        setUpiActionMessage('Could not open UPI app directly. Opened QR as fallback.');
      } else {
        setUpiActionMessage('Could not open UPI app. Use payout reference and mark paid manually after transfer.');
      }
    }
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
  const verifiedProducts = getProductsByStatus('verified'); // Now represents "Platform Live Inventory"
  const rejectedProducts = getProductsByStatus('rejected');

  const setAcquireDraftValue = (submissionId, value) => {
    setAcquireDrafts((prev) => ({
      ...prev,
      [submissionId]: value,
    }));
  };

  const handleAcquire = async (submissionId) => {
    try {
      setAcquireLoadingId(submissionId);
      const finalPrice = acquireDrafts[submissionId];

      if (!finalPrice || isNaN(finalPrice)) {
        alert("Please enter a valid retail price");
        return;
      }

      await apiRequest(`/api/products/admin/${submissionId}/acquire`, 'PATCH', session.access_token, {
        finalPrice: Number(finalPrice)
      });

      await fetchAdminData();
    } catch (error) {
      alert(error.message || 'Failed to acquire product');
    } finally {
      setAcquireLoadingId(null);
    }
  };
  const outOfStockProducts = submissions.filter((sub) => Number(sub.stock || 0) <= 0);
  const lowStockProducts = submissions.filter((sub) => {
    const stock = Number(sub.stock || 0);
    return stock > 0 && stock < 3;
  });
  const highStockProducts = submissions.filter((sub) => Number(sub.stock || 0) >= 10);

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
            <p className="text-sm text-slate-500">Listing Fees</p>
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(analytics.totalListingFees || 0)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
            <p className="text-sm text-slate-500">Sponsored Fees</p>
            <p className="text-2xl font-bold text-fuchsia-700">{formatCurrency(analytics.totalSponsoredFees || 0)}</p>
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

      {dataLoadError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>{dataLoadError}</p>
            <button
              type="button"
              onClick={fetchAdminData}
              className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100"
            >
              Retry
            </button>
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
          <button
            onClick={() => setActiveTab('support')}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === 'support'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            🎧 Support
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === 'returns'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ↩️ Returns
          </button>
          <button
            onClick={() => setActiveTab('inventoryLogs')}
            className={`px-6 py-3 font-medium transition border-b-2 ${
              activeTab === 'inventoryLogs'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Inventory
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
                const isAwaitingStudent = isPending && submission.price_offer_status === 'pending_student_response';
                const isAcceptedByStudent = isPending && submission.price_offer_status === 'accepted';

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
                            isAcceptedByStudent ? 'bg-blue-200 text-blue-900' :
                            'bg-amber-200 text-amber-900'
                          }`}>{isVerified ? 'Live Inventory' : submission.verification_status}</span> • Offer: {submission.price_offer_status}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        ID #{submission.id}
                      </span>
                    </div>

                    {isPending ? (
                      <>
                        {isAcceptedByStudent ? (
                          <div className="mt-4 rounded-lg bg-indigo-50 p-3 border border-indigo-200">
                            <p className="text-sm font-semibold text-indigo-900 mb-2">Student Accepted! Pay externally, then set Final Retail Price to Acquire.</p>
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={acquireDrafts[submission.id] ?? submission.price ?? ''}
                                onChange={(event) => setAcquireDraftValue(submission.id, event.target.value)}
                                className="form-input max-w-48"
                                placeholder="Retail Price"
                              />
                              <button
                                type="button"
                                disabled={acquireLoadingId === submission.id}
                                onClick={() => handleAcquire(submission.id)}
                                className="btn-gradient px-4 py-2 text-sm"
                              >
                                {acquireLoadingId === submission.id ? 'Acquiring...' : 'Take Ownership & Make Live'}
                              </button>
                            </div>
                          </div>
                        ) : isAwaitingStudent ? (
                           <div className="mt-3">
                             <p className="text-sm font-medium text-violet-700">Counter offer sent: {formatCurrency(submission.proposed_price)}. Awaiting student response.</p>
                           </div>
                        ) : (
                          <>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={draft.proposedPrice ?? ''}
                                onChange={(event) => setDraftValue(submission.id, 'proposedPrice', event.target.value)}
                                className="form-input"
                                placeholder="Buyout price offer to student"
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
                                onClick={() => handleReview(submission.id, 'counter')}
                                className="btn-gradient px-3 py-2 text-sm"
                              >
                                Send Buyout Offer
                              </button>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleReview(submission.id, 'reject')}
                                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                              >
                                Reject Submission
                              </button>
                            </div>
                          </>
                        )}
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
                        <p className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 capitalize">
                          {String(order.status || '').replaceAll('_', ' ')}
                        </p>
                        <p className="mt-2 text-xs text-slate-600">
                          Pickup: {order.pickup_location || 'N/A'}
                          {order.pickup_time ? ` • ${new Date(order.pickup_time).toLocaleString()}` : ''}
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

                        {order.status === 'order_placed' && (
                          <button
                            type="button"
                            disabled={orderStatusProcessingId === order.id}
                            onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-60"
                          >
                            {orderStatusProcessingId === order.id ? '⏳ Updating...' : 'Mark Processing'}
                          </button>
                        )}

                        {order.status === 'processing' && (
                          <button
                            type="button"
                            disabled={orderStatusProcessingId === order.id}
                            onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition disabled:opacity-60"
                          >
                            {orderStatusProcessingId === order.id ? '⏳ Updating...' : 'Ready for Pickup'}
                          </button>
                        )}

                        {order.status === 'processing' && (
                          <button
                            type="button"
                            disabled={orderStatusProcessingId === order.id}
                            onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-60"
                          >
                            {orderStatusProcessingId === order.id ? '⏳ Updating...' : 'Mark Shipped'}
                          </button>
                        )}

                        {(order.status === 'shipped' || order.status === 'ready_for_pickup') && (
                          <button
                            type="button"
                            disabled={orderStatusProcessingId === order.id}
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-60"
                          >
                            {orderStatusProcessingId === order.id ? '⏳ Updating...' : 'Mark Completed'}
                          </button>
                        )}
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
              {upiActionMessage && (
                <div className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                  {upiActionMessage}
                </div>
              )}

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
                        {payout.seller_upi_id ? (
                          <button
                            type="button"
                            onClick={() => handlePayViaUpiApp({
                              upiId: payout.seller_upi_id,
                              amount: payout.total_unpaid || 0,
                              sellerName: payout.seller_email || payout.seller_id,
                              qrUrl: payout.seller_upi_qr_url,
                            })}
                            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            📲 Pay via UPI App
                          </button>
                        ) : null}

                        {payout.seller_upi_qr_url ? (
                          <a
                            href={payout.seller_upi_qr_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                          >
                            🧾 Open UPI QR
                          </a>
                        ) : null}

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

                      {(payout.seller_upi_id || payout.seller_upi_qr_url) && (
                        <div className="mt-2 text-xs text-slate-600">
                          {payout.seller_upi_id ? `UPI: ${payout.seller_upi_id}` : 'UPI ID not provided'}
                          {payout.seller_upi_qr_url ? ' • QR available' : ' • QR not provided'}
                        </div>
                      )}

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

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs text-red-700">Out of Stock</p>
                <p className="mt-1 text-2xl font-bold text-red-900">{outOfStockProducts.length}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs text-amber-700">Low Stock (1-3)</p>
                <p className="mt-1 text-2xl font-bold text-amber-900">{lowStockProducts.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">High Stock (10+)</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">{highStockProducts.length}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">Low Stock Alerts</h3>
                <div className="mt-3 space-y-2">
                  {lowStockProducts.slice(0, 6).map((product) => (
                    <div key={`low-${product.id}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-600">Stock: {product.stock}</p>
                    </div>
                  ))}
                  {lowStockProducts.length === 0 && <p className="text-sm text-slate-600">No low-stock products.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold text-slate-900">High Stock Products</h3>
                <div className="mt-3 space-y-2">
                  {highStockProducts.slice(0, 6).map((product) => (
                    <div key={`high-${product.id}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-600">Stock: {product.stock}</p>
                    </div>
                  ))}
                  {highStockProducts.length === 0 && <p className="text-sm text-slate-600">No high-stock products.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Support Tickets Tab */}
        {activeTab === 'support' && (
          <div className="p-5 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Support Tickets (Helpdesk)</h2>
            <div className="space-y-4">
              {supportTickets.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-4">No support tickets found.</p>
              ) : (
                supportTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{ticket.subject}</p>
                        <p className="text-sm text-slate-600 mt-1">{ticket.description}</p>
                        <p className="text-xs text-slate-500 mt-2">By: {ticket.user?.email || ticket.user_id}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase ${
                          ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          ticket.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <p className="text-xs text-slate-500 mt-2">{new Date(ticket.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Returns Tab */}
        {activeTab === 'returns' && (
          <div className="p-5 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Returns Management</h2>
            <div className="space-y-4">
              {returns.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-4">No Returns found.</p>
              ) : (
                returns.map((ret) => (
                  <div key={ret.id} className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-900">Return #{ret.id}</p>
                        <p className="text-sm font-medium text-rose-800">{ret.order_item?.product?.name || `Product ID ${ret.order_item?.product_id}`}</p>
                        <p className="text-sm text-slate-700 mt-1">Reason: {ret.reason}</p>
                        <p className="text-xs text-slate-500 mt-1">Requested by: {ret.user?.email || ret.user_id}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        ret.status === 'requested' ? 'bg-amber-200 text-amber-900' :
                        ret.status === 'approved' ? 'bg-emerald-200 text-emerald-900' :
                        'bg-red-200 text-red-900'
                      }`}>
                        {ret.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Inventory Logs Tab */}
        {activeTab === 'inventoryLogs' && (
          <div className="p-5 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Inventory Logs</h2>
            <div className="space-y-2">
              {inventoryLogs.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-4">No inventory logs found.</p>
              ) : (
                inventoryLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{log.product?.name || `Product ID ${log.product_id}`}</p>
                      <p className="text-xs text-slate-600">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                      <span className="capitalize text-slate-700">{log.change_type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{log.previous_stock}</span>
                        <span>&rarr;</span>
                        <span className={`font-bold ${log.quantity_changed > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {log.new_stock}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
