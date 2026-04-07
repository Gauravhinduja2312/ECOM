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
  const [activeTab, setActiveTab] = useState('products');
  const [productStatusTab, setProductStatusTab] = useState('pending');
  const [acquireDrafts, setAcquireDrafts] = useState({});
  const [acquireLoadingId, setAcquireLoadingId] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [sellerPayouts, setSellerPayouts] = useState([]);
  const [payoutReferenceDrafts, setPayoutReferenceDrafts] = useState({});
  const [payoutProcessingSellerId, setPayoutProcessingSellerId] = useState(null);
  const [orderStatusProcessingId, setOrderStatusProcessingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    if (!session?.access_token) return;
    setLoading(true);

    try {
      const [analyticsResult, submissionsResult, payoutsResult, ordersResult, ticketsResult, returnsResult, logsResult] = await Promise.allSettled([
        apiRequest('/api/admin/analytics', 'GET', session.access_token),
        apiRequest('/api/admin/product-submissions', 'GET', session.access_token),
        apiRequest('/api/admin/seller-payouts', 'GET', session.access_token),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
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
        const { data: ordersData } = ordersResult.value;
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

      if (ticketsResult.status === 'fulfilled') setSupportTickets(ticketsResult.value.data || []);
      if (returnsResult.status === 'fulfilled') setReturns(returnsResult.value.data || []);
      if (logsResult.status === 'fulfilled') setInventoryLogs(logsResult.value.data || []);

    } catch (error) {
      addToast('Terminal data synchronization failed.', 'error');
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
      addToast('Invoice generation protocol failed.', 'error');
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
      addToast(error.message || 'Review protocol failed.', 'error');
    } finally {
      setReviewLoadingId(null);
    }
  };

  const handleAcquire = async (submissionId, defaultPrice) => {
    try {
      setAcquireLoadingId(submissionId);
      const finalPrice = acquireDrafts[submissionId] ?? defaultPrice;
      if (!finalPrice || isNaN(finalPrice)) {
        addToast('Invalid retail valuation.', 'error');
        return;
      }
      await apiRequest(`/api/admin/products/${submissionId}/acquire`, 'PATCH', session.access_token, {
        finalPrice: Number(finalPrice)
      });
      addToast('Asset acquired and moved to live inventory.', 'success');
      await fetchAdminData();
    } catch (error) {
      addToast(error.message || 'Acquisition protocol failed.', 'error');
    } finally {
      setAcquireLoadingId(null);
    }
  };

  if (loading) return <Loader text="Synchronizing Admin Terminal..." />;

  const pendingProducts = submissions.filter((sub) => sub.verification_status === 'pending');
  const verifiedProducts = submissions.filter((sub) => sub.verification_status === 'verified');
  const rejectedProducts = submissions.filter((sub) => sub.verification_status === 'rejected');

  const displayedProducts = {
    pending: pendingProducts,
    verified: verifiedProducts,
    rejected: rejectedProducts,
  }[productStatusTab] || [];

  return (
    <div className="bg-[#020617] min-h-screen pt-64 pb-20 text-white">
      <div className="mx-auto max-w-7xl px-6 space-y-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="stagger-elite">
            <h1 className="text-5xl font-black tracking-tight uppercase inline-flex items-center gap-5">
              <span className="h-16 w-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-2xl shadow-[0_0_40px_rgba(79,70,229,0.3)]">⚡</span>
              Elite Terminal
            </h1>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Marketplace Executive Control Domain</p>
          </div>
          
          <div className="flex gap-2 glass-elite p-1 rounded-2xl">
            {[
              { id: 'products', label: 'Assets', icon: '📦' },
              { id: 'orders', label: 'Orders', icon: '🛒' },
              { id: 'payouts', label: 'Revenue', icon: '💰' },
              { id: 'analytics', label: 'Insights', icon: '📊' },
              { id: 'support', label: 'Domain Support', icon: '🎧' },
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
              { label: 'Platform Liquidity', value: formatCurrency((analytics.totalRevenue || 0) - (analytics.totalSellerPayout || 0)), color: 'text-indigo-400' },
              { label: 'Outlay (Seller Payout)', value: formatCurrency(analytics.totalSellerPayout || 0), color: 'text-emerald-400' },
              { label: 'Active Personnel', value: users.length, color: 'text-amber-400' },
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
          {/* Internal Tab Navigation (Contextual) */}
          {activeTab === 'products' && (
            <div className="px-10 h-20 border-b border-white/5 flex items-center gap-10 bg-white/5">
              {[
                { id: 'pending', label: 'Pending Terminal', count: pendingProducts.length },
                { id: 'verified', label: 'Live Inventory', count: verifiedProducts.length },
                { id: 'rejected', label: 'Quarantined', count: rejectedProducts.length },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setProductStatusTab(subTab.id)}
                  className={`relative h-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                    productStatusTab === subTab.id ? 'text-white' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {subTab.label} <span className="ml-2 opacity-50">[{subTab.count}]</span>
                  {productStatusTab === subTab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)]"></div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 p-10 overflow-auto">
            {/* Contextual Render Logic */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                {displayedProducts.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl opacity-50">
                    <p className="text-4xl mb-4">📂</p>
                    <p className="text-[10px] font-black uppercase tracking-widest">Null domain data</p>
                  </div>
                ) : (
                  displayedProducts.map((sub) => {
                    const draft = reviewDrafts[sub.id] || {};
                    const isAcceptedByStudent = sub.verification_status === 'pending' && sub.price_offer_status === 'accepted';
                    
                    return (
                      <div key={sub.id} className="glass-card flex flex-col md:flex-row items-center gap-8 p-8 transition hover:bg-white/[0.04]">
                        <div className="h-24 w-24 rounded-2xl bg-white/5 flex-shrink-0 overflow-hidden border border-white/10">
                          {sub.image_url ? <img src={sub.image_url} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-2xl opacity-20">📦</div>}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="text-xl font-black uppercase tracking-tighter truncate">{sub.name}</h3>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                              sub.verification_status === 'verified' ? 'bg-emerald-500/10 text-emerald-400' :
                              sub.verification_status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>{sub.verification_status}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium truncate mb-4">Origin: {sub.seller_email}</p>
                          <div className="flex gap-6">
                            <div>
                              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Valuation</p>
                              <p className="text-sm font-black text-white">{formatCurrency(sub.price)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Buyout Offer</p>
                              <p className="text-sm font-black text-indigo-400">{sub.proposed_price ? formatCurrency(sub.proposed_price) : 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="w-full md:w-auto flex flex-col gap-3">
                          {sub.verification_status === 'pending' && (
                            <>
                              {isAcceptedByStudent ? (
                                <div className="flex gap-3">
                                  <input 
                                    type="number" 
                                    className="elite-input w-32 py-3" 
                                    placeholder="Retail ₹"
                                    value={acquireDrafts[sub.id] ?? sub.proposed_price ?? ''}
                                    onChange={(e) => setAcquireDrafts({...acquireDrafts, [sub.id]: e.target.value})}
                                  />
                                  <button onClick={() => handleAcquire(sub.id, sub.proposed_price)} className="btn-elite px-6 py-3 text-[10px]">EXECUTE ACQUISITION</button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3">
                                  <div className="flex gap-3">
                                    <input 
                                      type="number" 
                                      className="elite-input w-32 py-3" 
                                      placeholder="Offer ₹"
                                      value={draft.proposedPrice}
                                      onChange={(e) => setReviewDrafts({...reviewDrafts, [sub.id]: {...draft, proposedPrice: e.target.value}})}
                                    />
                                    <button onClick={() => handleReview(sub.id, 'counter')} className="btn-elite px-6 py-3 text-[10px]">TRANSMIT OFFER</button>
                                  </div>
                                  <button onClick={() => handleReview(sub.id, 'reject')} className="text-[9px] font-black text-slate-600 hover:text-rose-500 uppercase tracking-widest transition">Quarantine Domain</button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? <p className="text-center text-slate-500 font-black uppercase tracking-widest py-20">Null order domain</p> : (
                  orders.map((order) => (
                    <div key={order.id} className="glass-card p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                          <h3 className="text-lg font-black uppercase tracking-tighter">Order #{order.id.slice(0,8)}</h3>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest">{order.status.replace('_', ' ')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Volume</p>
                            <p className="text-sm font-black text-white">{formatCurrency(order.total_price)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Timestamp</p>
                            <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        {order.status === 'order_placed' && <button onClick={() => handleUpdateOrderStatus(order.id, 'processing')} className="btn-elite px-6 py-3 text-[10px]">INITIALIZE PROCESSING</button>}
                        {order.status === 'processing' && (
                          <>
                            <button onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')} className="btn-elite px-6 py-3 text-[10px] bg-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.3)] border-amber-500/20">READY FOR PICKUP</button>
                            <button onClick={() => handleUpdateOrderStatus(order.id, 'shipped')} className="btn-elite px-6 py-3 text-[10px]">DISPATCH SHIPMENT</button>
                          </>
                        )}
                        {(order.status === 'shipped' || order.status === 'ready_for_pickup') && <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className="btn-elite px-6 py-3 text-[10px] bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-emerald-500/20">COMPLETE PROTOCOL</button>}
                        <button onClick={() => handleDownloadInvoice(order)} className="px-6 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition">INVOICE</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'payouts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-black uppercase tracking-tighter">Acquisition Liquidation</h2>
                  <button onClick={fetchAdminData} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition">Synchronize Ledger</button>
                </div>
                
                {sellerPayouts.map((payout) => (
                  <div key={payout.seller_id} className="glass-card p-10">
                    <div className="flex flex-wrap justify-between items-start gap-8 mb-10">
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-white">{payout.seller_email}</h3>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Personnel ID: {payout.seller_id}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-right">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Liquidation</p>
                          <p className="text-sm font-black text-amber-400">{formatCurrency(payout.total_unpaid || 0)}</p>
                        </div>
                        <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-right">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Disbursed</p>
                          <p className="text-sm font-black text-emerald-400">{formatCurrency(payout.total_paid || 0)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-10 border-t border-white/5">
                      <input 
                        className="elite-input flex-1" 
                        placeholder="Transaction Token (UTR/ID)..." 
                        value={payoutReferenceDrafts[payout.seller_id]}
                        onChange={(e) => setPayoutReferenceDrafts({...payoutReferenceDrafts, [payout.seller_id]: e.target.value})}
                      />
                      <button 
                        onClick={() => handleMarkSellerPaid(payout.seller_id, payout.items.filter(i => i.payout_status !== 'paid').map(i => i.order_item_id))}
                        disabled={!payout.total_unpaid}
                        className="btn-elite px-10 py-5 text-[10px] disabled:opacity-20"
                      >
                        FINALIZE LIQUIDATION
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-12">
                <div className="glass-card p-10 h-[500px]">
                  <Line
                    data={{
                      labels: analytics ? Object.keys(analytics.dailySales) : [],
                      datasets: [{
                        label: 'Sales Velocity (INR)',
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

            {activeTab === 'support' && (
              <div className="space-y-4">
                {supportTickets.map(ticket => (
                  <div key={ticket.id} className="glass-card p-8">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-black uppercase tracking-tighter">{ticket.subject}</h3>
                      <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest">{ticket.status}</span>
                    </div>
                    <p className="text-slate-400 text-sm mb-6">{ticket.description}</p>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Origin Node: {ticket.user?.email}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
