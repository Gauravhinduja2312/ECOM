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
import { useToast } from '../services/ToastContext';
import Loader from '../components/Loader';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const { addToast } = useToast();
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
  const [activeTab, setActiveTab ] = useState('scm');
  const [productStatusTab, setProductStatusTab] = useState('pending');
  const [acquireDrafts, setAcquireDrafts] = useState({});
  const [acquireLoadingId, setAcquireLoadingId] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [sellerPayouts, setSellerPayouts] = useState([]);
  const [payoutReferenceDrafts, setPayoutReferenceDrafts] = useState({});
  const [payoutProcessingSellerId, setPayoutProcessingSellerId] = useState(null);
  const [orderStatusProcessingId, setOrderStatusProcessingId] = useState(null);
  const [handoverRescheduleDrafts, setHandoverRescheduleDrafts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    if (!session?.access_token) return;
    setLoading(true);

    try {
      const [analyticsResult, submissionsResult, payoutsResult, ordersResult, ticketsResult, returnsResult, logsResult] = await Promise.allSettled([
        apiRequest('/api/admin/analytics', 'GET', session.access_token),
        apiRequest('/api/admin/product-submissions', 'GET', session.access_token),
        apiRequest('/api/admin/seller-payouts', 'GET', session.access_token),
        apiRequest('/api/admin/orders', 'GET', session.access_token),
        supabase.from('support_tickets').select('*, user:users(email)').order('created_at', { ascending: false }),
        supabase.from('returns').select('*, user:users(email), order_item:order_items(product:products(name))').order('created_at', { ascending: false }),
        supabase.from('inventory_logs').select('*, product:products(name)').order('created_at', { ascending: false }),
      ]);

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value);
        setUsers(analyticsResult.value.crmUsers || []);
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
      }

      if (payoutsResult.status === 'fulfilled') {
        const nextPayouts = payoutsResult.value.payouts || [];
        setSellerPayouts(nextPayouts);
        const nextPayoutReferenceDrafts = {};
        nextPayouts.forEach((payout) => {
          nextPayoutReferenceDrafts[payout.seller_id] = '';
        });
        setPayoutReferenceDrafts(nextPayoutReferenceDrafts);
      }

      if (ordersResult.status === 'fulfilled') {
        const { orders: ordersData, orderItems: itemsMap } = ordersResult.value;
        setOrders(ordersData || []);
        setOrderItems(itemsMap || {});
      }

      if (ticketsResult.status === 'fulfilled') setSupportTickets(ticketsResult.value.data || []);
      if (returnsResult.status === 'fulfilled') setReturns(returnsResult.value.data || []);
      if (logsResult.status === 'fulfilled') setInventoryLogs(logsResult.value.data || []);

    } catch (error) {
      addToast('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
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
      addToast('Invoice generated and transmitted.', 'success');
    } catch (error) {
      addToast('Failed to generate invoice.', 'error');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      setOrderStatusProcessingId(orderId);
      await apiRequest(`/api/admin/orders/${orderId}/status`, 'PATCH', session.access_token, { status });
      addToast(`Order status updated to ${status.replace('_', ' ')}.`, 'success');
      await fetchAdminData();
    } catch (error) {
      addToast(error.message || 'Status update failed.', 'error');
    } finally {
      setOrderStatusProcessingId(null);
    }
  };

  const handleAcquire = async (submissionId, payoutPrice, payoutReference) => {
    try {
      setAcquireLoadingId(submissionId);
      const finalPrice = acquireDrafts[submissionId] || (payoutPrice * 1.1).toFixed(2);
      
      await apiRequest(`/api/admin/products/${submissionId}/acquire`, 'PATCH', session.access_token, {
        finalPrice: Number(finalPrice),
        payoutReference
      });
      
      addToast('Item purchased and listed with 10% markup! 🚀', 'success');
      await fetchAdminData();
    } catch (error) {
      addToast(error.message || 'Failed to acquire item.', 'error');
    } finally {
      setAcquireLoadingId(null);
    }
  };

  const handleMarkSellerPaid = async (sellerId, orderItemIds) => {
    try {
      setPayoutProcessingSellerId(sellerId);
      const payoutReference = (payoutReferenceDrafts[sellerId] || '').trim();
      await apiRequest(`/api/admin/seller-payouts/${sellerId}/mark-paid`, 'PATCH', session.access_token, {
        orderItemIds,
        payoutReference,
      });
      addToast('Payout record finalized.', 'success');
      await fetchAdminData();
    } catch (error) {
      addToast(error.message || 'Payout finalization failed.', 'error');
    } finally {
      setPayoutProcessingSellerId(null);
    }
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
      addToast(`Review completed: ${action}.`, 'success');
      await fetchAdminData();
    } catch (error) {
      addToast(error.message || 'Review failed.', 'error');
    } finally {
      setReviewLoadingId(null);
    }
  };

  const handleProcessReturn = async (returnId, action) => {
    try {
      await apiRequest('/api/admin/returns/process', 'POST', session.access_token, { returnId, action });
      addToast(`Return ${action} successfully.`, 'success');
      await fetchAdminData();
    } catch (error) {
      addToast(error.message || 'Operation failed.', 'error');
    }
  };

  const handleHandoverAction = async (productId, action, metadata = {}) => {
    try {
      if (action === 'confirm_handover') {
        await apiRequest(`/api/admin/handover/confirm`, 'POST', session.access_token, { productId });
        addToast('Handover confirmed!', 'success');
      } else if (action === 'reschedule_handover') {
        await apiRequest(`/api/admin/handover/reschedule`, 'POST', session.access_token, { productId, ...metadata });
        addToast('Reschedule proposal sent.', 'success');
      } else if (action === 'verify_code') {
        const { code } = metadata;
        await apiRequest(`/api/admin/handover/verify`, 'POST', session.access_token, { productId, code });
        addToast('Handover Code verified!', 'success');
      }
      await fetchAdminData();
    } catch (error) {
      addToast(error.message || 'Operation failed.', 'error');
    }
  };

  if (loading) return <Loader text="Loading Admin Dashboard..." />;

  const pendingProducts = submissions.filter((sub) => sub.verification_status === 'pending');
  const verifiedProducts = submissions.filter((sub) => sub.verification_status === 'verified');
  const rejectedProducts = submissions.filter((sub) => sub.verification_status === 'rejected');

  return (
    <div className="bg-[#020617] min-h-screen pt-48 pb-20 text-white font-['Outfit']">
      <div className="mx-auto max-w-7xl px-6 space-y-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="stagger-elite">
            <h1 className="text-5xl font-black tracking-tight uppercase inline-flex items-center gap-5">
              <span className="h-16 w-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-2xl shadow-[0_0_40px_rgba(79,70,229,0.3)]">⚡</span>
              Admin HUB
            </h1>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Logistics & CRM Pipeline</p>
          </div>
          
          <div className="flex gap-2 glass-elite p-1 rounded-2xl">
            {[
              { id: 'scm', label: 'SCM Pipeline', icon: '🚚' },
              { id: 'crm', label: 'Student CRM', icon: '👥' },
              { id: 'orders', label: 'Live Orders', icon: '🛒' },
              { id: 'analytics', label: 'Revenue', icon: '📊' },
              { id: 'payouts', label: 'Payouts', icon: '💰' },
              { id: 'returns', label: 'Returns', icon: '↩️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Global Analytics Overview */}
        {analytics && (
          <div className="grid gap-6 md:grid-cols-4 stagger-elite">
            {[
              { label: 'Gross Revenue', value: formatCurrency(analytics.totalRevenue), color: 'text-white' },
              { label: 'Platform Profit', value: formatCurrency((analytics.totalRevenue || 0) - (analytics.totalSellerPayout || 0)), color: 'text-indigo-400' },
              { label: 'Logistic Revenue', value: formatCurrency(analytics.totalLogisticsRevenue || 0), color: 'text-emerald-400' },
              { label: 'Registered Students', value: users.length, color: 'text-amber-400' },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-8 group">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{stat.label}</p>
                <p className={`text-3xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Content Domain */}
        <main className="glass-elite rounded-[2.5rem] overflow-hidden min-h-[600px] flex flex-col">
          <div className="flex-1 p-10 overflow-auto">
            
            {/* SCM KANBAN BOARD */}
            {activeTab === 'scm' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[600px]">
                {[
                  { id: 'pending', title: 'New Submissions', items: pendingProducts },
                  { id: 'logistics', title: 'Handover Pipeline', items: verifiedProducts.filter(p => p.handover_status !== 'confirmed') },
                  { id: 'warehouse', title: 'Active Inventory', items: verifiedProducts.filter(p => p.handover_status === 'confirmed') },
                  { id: 'rejected', title: 'Rejected Requests', items: rejectedProducts },
                ].map((column) => (
                  <div key={column.id} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{column.title}</h3>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-bold text-slate-500">{column.items.length}</span>
                    </div>
                    <div className="flex-1 space-y-4">
                      {column.items.map((sub) => {
                        const draft = reviewDrafts[sub.id] || {};
                        const isAcceptedByStudent = sub.verification_status === 'pending' && sub.price_offer_status === 'accepted';
                        
                        return (
                          <div key={sub.id} className="glass-card p-5 hover:border-indigo-500/30 transition-all border border-white/5">
                            <div className="flex gap-4 mb-4">
                              <div className="h-12 w-12 rounded-xl bg-white/5 overflow-hidden border border-white/5 flex-shrink-0">
                                {sub.image_url ? <img src={sub.image_url} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xl opacity-20">📦</div>}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-black uppercase tracking-tight truncate">{sub.name}</h4>
                                <p className="text-[9px] text-slate-500 font-bold truncate">{sub.seller_email}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <span>VALUATION:</span>
                                <span className="text-white">{formatCurrency(sub.price)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <span>LOCATION:</span>
                                <span className="text-white truncate max-w-[100px]">{sub.seller_pickup_location || 'TBD'}</span>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
                              {column.id === 'pending' && (
                                <div className="space-y-2">
                                  <input 
                                    type="number" 
                                    className="elite-input text-[10px] py-2" 
                                    placeholder="Offer ₹"
                                    value={draft.proposedPrice}
                                    onChange={(e) => setReviewDrafts({...reviewDrafts, [sub.id]: {...draft, proposedPrice: e.target.value}})}
                                  />
                                  <button onClick={() => handleReview(sub.id, 'verify')} className="btn-elite w-full py-2 text-[9px]">VERIFY & SEND CODE</button>
                                </div>
                              )}
                              
                              {column.id === 'logistics' && (
                                <div className="space-y-3">
                                   <div className="p-2 rounded-lg bg-indigo-600/10 border border-indigo-600/20 text-center">
                                      <p className="text-[8px] font-black uppercase text-indigo-400 mb-1">HANDOVER CODE</p>
                                      <p className="text-sm font-black tracking-[0.2em] text-white">{sub.handover_code || '---'}</p>
                                   </div>
                                    <div className="flex gap-2">
                                      <input type="text" id={`verify-${sub.id}`} placeholder="Enter Code..." className="elite-input py-2 text-[10px]" />
                                      <button 
                                        onClick={() => handleHandoverAction(sub.id, 'verify_code', { code: document.getElementById(`verify-${sub.id}`).value })}
                                        className="px-4 bg-indigo-600 rounded-lg text-[10px] font-black"
                                      >✅</button>
                                    </div>
                                </div>
                              )}

                              {isAcceptedByStudent && (
                                <button 
                                  onClick={() => handleAcquire(sub.id, (sub.proposed_price || sub.price), 'PHYSICAL_VERIFIED')} 
                                  className="btn-elite w-full py-3 text-[9px] bg-emerald-600 shadow-emerald-500/20"
                                >
                                  ACQUIRE & LIST LIVE
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CRM ACCOUNT HUB */}
            {activeTab === 'crm' && (
              <div className="space-y-8">
                <div className="flex justify-between items-end border-b border-white/5 pb-8">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Student CRM</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">{users.length} Registered Campus Users</p>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search Student..." 
                    className="elite-input w-96 shadow-[0_0_20px_rgba(255,255,255,0.02)]"
                  />
                </div>

                <div className="grid gap-4">
                  {users.map((user) => (
                    <div key={user.id} className="glass-card p-6 flex items-center justify-between hover:bg-white/[0.02] transition border border-white/5">
                      <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-full bg-indigo-600/20 flex items-center justify-center font-black text-lg text-indigo-400 border border-indigo-500/10">
                          {user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black tracking-tight">{user.email}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-slate-500">{user.role}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">Tier: {user.loyalty_tier || 'Bronze'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-8 items-center">
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Orders</p>
                          <p className="text-sm font-black">{user.orders_count || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Spent</p>
                          <p className="text-sm font-black text-emerald-400">{formatCurrency(user.total_spending || 0)}</p>
                        </div>
                        <button className="px-5 py-2 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition">Manage</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? <p className="text-center text-slate-500 font-black uppercase tracking-widest py-20">No orders found</p> : (
                  orders.map((order) => (
                    <div key={order.id} className="glass-card p-8 flex flex-col md:flex-row justify-between items-center gap-8 border border-white/5">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <h3 className="text-lg font-black uppercase tracking-tighter">Order #{order.id.slice(0,8)}</h3>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest">{order.status.replace('_', ' ')}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                          <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Volume</p>
                            <p className="text-sm font-black text-white">{formatCurrency(order.total_price)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Date</p>
                            <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Method / Location</p>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest truncate">
                              {order.pickup_location ? `📍 ${order.pickup_location} @ ${new Date(order.pickup_time).toLocaleString()}` : `🏠 ${order.delivery_address || 'Home'}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {order.status === 'order_placed' && <button onClick={() => handleUpdateOrderStatus(order.id, 'processing')} className="btn-elite px-6 py-3 text-[10px]">PROCESS</button>}
                        {order.status === 'processing' && <button onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')} className="btn-elite px-6 py-3 text-[10px] bg-amber-600">READY</button>}
                        {(order.status === 'shipped' || order.status === 'ready_for_pickup') && <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className="btn-elite px-6 py-3 text-[10px] bg-emerald-600">COMPLETE</button>}
                        <button onClick={() => handleDownloadInvoice(order)} className="px-6 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition">INVOICE</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'payouts' && (
              <div className="space-y-6">
                 {sellerPayouts.map((payout) => (
                  <div key={payout.seller_id} className="glass-card p-10 border border-white/5">
                    <div className="flex flex-wrap justify-between items-start gap-8 mb-10">
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-white">{payout.seller_email}</h3>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">UPI: {payout.seller_upi_id || 'Not Set'}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-right">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Unpaid</p>
                          <p className="text-sm font-black text-amber-400">{formatCurrency(payout.total_unpaid || 0)}</p>
                        </div>
                        <div className="px-6 py-4 rounded-2xl bg-emerald-600/5 border border-emerald-500/10 text-right">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Paid</p>
                          <p className="text-sm font-black text-emerald-400">{formatCurrency(payout.total_paid || 0)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-10 border-t border-white/5">
                      <input className="elite-input flex-1" placeholder="Transaction Reference..." value={payoutReferenceDrafts[payout.seller_id]} onChange={(e) => setPayoutReferenceDrafts({...payoutReferenceDrafts, [payout.seller_id]: e.target.value})} />
                      <button onClick={() => handleMarkSellerPaid(payout.seller_id, payout.items.filter(i => i.payout_status !== 'paid').map(i => i.order_item_id))} disabled={!payout.total_unpaid} className="btn-elite px-10 py-5 text-[10px] disabled:opacity-20">SET AS PAID</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-12">
                <div className="glass-card p-10 h-[500px] border border-white/5">
                  <Line
                    data={{
                      labels: analytics ? Object.keys(analytics.dailySales) : [],
                      datasets: [{
                        label: 'Gross Sales Velocity',
                        data: analytics ? Object.values(analytics.dailySales) : [],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4,
                      }],
                    }}
                    options={{ maintainAspectRatio: false, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'returns' && (
              <div className="space-y-6">
                <h2 className="text-xl font-black uppercase tracking-tighter">Reverse Logistics</h2>
                {returns.length === 0 ? <p className="text-slate-500 font-black uppercase tracking-widest py-10">No active returns</p> : (
                  returns.map(ret => (
                    <div key={ret.id} className="glass-card p-8 flex flex-col md:flex-row justify-between items-center gap-8 border border-white/5">
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">ID: #{ret.id.slice(0,8)}</p>
                        <h3 className="text-lg font-black uppercase tracking-tight">{ret.order_item?.product?.name}</h3>
                        <p className="text-xs text-slate-500">Reason: {ret.reason}</p>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => handleProcessReturn(ret.id, 'approved')} className="px-6 py-3 bg-indigo-600 rounded-xl text-[10px] font-black">APPROVE</button>
                        <button onClick={() => handleProcessReturn(ret.id, 'refunded')} className="px-6 py-3 bg-emerald-600 rounded-xl text-[10px] font-black">REFUNDED</button>
                        <button onClick={() => handleProcessReturn(ret.id, 'rejected')} className="px-6 py-3 bg-rose-600 rounded-xl text-[10px] font-black">REJECT</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
