import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { apiRequest } from '../services/api';
import Loader from '../components/Loader';
import OrderTrackingCard from '../components/OrderTrackingCard';
import { formatCurrency } from '../utils/format';

export default function UserDashboardPage() {
  const { profile, session } = useAuth();
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [myReturns, setMyReturns] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        const [ordersResult, notificationsResult, ticketsResult, returnsResult] = await Promise.all([
          apiRequest('/api/payment/my-orders', 'GET', session.access_token),
          apiRequest('/api/notifications', 'GET', session.access_token),
          supabase.from('support_tickets').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
          supabase.from('returns').select('*, order_item:order_items(product:products(name))').eq('user_id', profile.id).order('created_at', { ascending: false }),
        ]);
        if (isMounted) {
          setOrders(ordersResult.orders || []);
          setNotifications(notificationsResult.notifications || []);
          setSupportTickets(ticketsResult.data || []);
          setMyReturns(returnsResult.data || []);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (profile?.id) fetchDashboardData();
    return () => { isMounted = false; };
  }, [profile?.id, session?.access_token]);

  const stats = useMemo(() => {
    const spending = orders.reduce((sum, o) => sum + Number(o.total_price), 0);
    const unread = notifications.filter(n => !n.is_read).length;
    const points = profile.loyalty_points || 0;
    const tier = profile.loyalty_tier || 'bronze';
    
    // Loyalty Logic
    const tiers = { bronze: 500, silver: 2000, gold: 5000 };
    const nextTier = tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : 'max';
    const pointsNeeded = nextTier !== 'max' ? tiers[nextTier] : 0;
    const progress = nextTier !== 'max' ? Math.min((points / pointsNeeded) * 100, 100) : 100;

    return { spending, unread, points, tier, nextTier, pointsNeeded, progress };
  }, [orders, notifications, profile]);

  if (loading) return <Loader text="Preparing your workspace..." />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20 animate-fade-in-up">
      {/* Prestige Header */}
      <header className="grid gap-8 lg:grid-cols-5 items-start mb-16">
        <div className="lg:col-span-3 stagger-children">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-widest mb-6">
            Verified Student Member
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl mb-4">
            Welcome back, <br /><span className="text-gradient">{profile.email?.split('@')[0]}</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-md">
            Manage your purchases, track logistics, and redeem your loyalty points in your professional buyer workspace.
          </p>
          
          <div className="mt-8 flex items-center gap-6">
            <div className="border-l-2 border-slate-100 pl-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spending</p>
              <p className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(stats.spending)}</p>
            </div>
            <div className="border-l-2 border-slate-100 pl-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Orders</p>
              <p className="text-xl font-black text-slate-900 tracking-tighter">{orders.filter(o => o.status !== 'completed').length}</p>
            </div>
          </div>
        </div>

        {/* Loyalty Card Card */}
        <div className="lg:col-span-2">
          <div className={`relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500 hover:scale-[1.02] ${
            stats.tier === 'gold' ? 'bg-slate-950 text-white' : 
            stats.tier === 'silver' ? 'bg-indigo-900 text-white' : 
            'bg-indigo-600 text-white'
          }`}>
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl"></div>
            
            <div className="relative z-10 flex justify-between items-start mb-12">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Member Status</p>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">{stats.tier} Tier</h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <span className="text-xl">{stats.tier === 'gold' ? '🏆' : stats.tier === 'silver' ? '🥈' : '🎖️'}</span>
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between items-end mb-2">
                <p className="text-3xl font-black tracking-tighter">{stats.points} <span className="text-sm font-bold opacity-60">Points</span></p>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  {stats.nextTier !== 'max' ? `${stats.pointsNeeded - stats.points} to ${stats.nextTier}` : 'Diamond Elite'}
                </p>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000" 
                  style={{ width: `${stats.progress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between items-center text-[8px] font-bold uppercase tracking-[0.3em] opacity-40">
              <span>CARD ID: {profile.id?.slice(0, 8)}</span>
              <span>EST. 2026</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Tabs */}
      <main>
        <div className="mb-10 flex flex-wrap gap-4 border-b border-slate-100 pb-2 overflow-x-auto no-scrollbar">
          {['orders', 'notifications', 'support', 'returns'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full bg-indigo-600 rounded-full"></div>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="stagger-children">
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length > 0 ? (
                orders.map(order => <OrderTrackingCard key={order.id} order={order} />)
              ) : (
                <div className="py-20 text-center glass-panel rounded-[2rem] border-dashed border-2">
                  <div className="text-4xl mb-4">🛍️</div>
                  <h3 className="text-lg font-bold text-slate-900">No active acquisitions</h3>
                  <p className="text-slate-500 mb-6 max-w-xs mx-auto">Your purchases and tracking will appear as soon as you shop.</p>
                  <a href="/products" className="btn-elite">Start Shopping</a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {notifications.map(n => (
                <div key={n.id} className={`rounded-3xl border p-6 transition ${n.is_read ? 'border-slate-100 bg-white' : 'border-indigo-100 bg-indigo-50/50 shadow-sm'}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-1">{n.type || 'Alert'}</p>
                      <h4 className="font-bold text-slate-900">{n.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {!n.is_read && (
                      <button onClick={() => apiRequest(`/api/notifications/${n.id}/read`, 'PATCH', session.access_token)} className="text-[10px] font-black text-indigo-600 uppercase border border-indigo-200 px-3 py-1 rounded-full hover:bg-indigo-50 transition">Mark Seen</button>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest">Inbox Zero</div>}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black tracking-tight text-slate-900">Service Tickets</h3>
                <button onClick={() => setShowTicketForm(!showTicketForm)} className="btn-elite text-[10px] px-6 py-2">
                  {showTicketForm ? 'Close' : 'Open Ticket'}
                </button>
              </div>
              
              {showTicketForm && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSubmittingTicket(true);
                    const { data } = await supabase.from('support_tickets').insert({ user_id: profile.id, subject: ticketSubject, description: ticketDescription }).select().single();
                    setSupportTickets([data, ...supportTickets]);
                    setShowTicketForm(false);
                    setSubmittingTicket(false);
                  }} 
                  className="p-8 rounded-[2rem] bg-slate-950 text-white mb-8"
                >
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Issue Subject</label>
                      <input required value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-2 focus:border-indigo-500 outline-none" placeholder="e.g., Damaged item upon pickup" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Detailed Description</label>
                      <textarea required value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} rows="4" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-2 focus:border-indigo-500 outline-none" placeholder="Explain the situation..." />
                    </div>
                    <button disabled={submittingTicket} className="btn-elite w-full py-4 uppercase text-xs tracking-[0.2em]">Submit to Support</button>
                  </div>
                </form>
              )}

              {supportTickets.map(ticket => (
                <div key={ticket.id} className="rounded-3xl border border-slate-100 bg-white p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900">{ticket.subject}</h4>
                      <p className="text-sm text-slate-600 mt-1">{ticket.description}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-500 rounded-md">{ticket.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
