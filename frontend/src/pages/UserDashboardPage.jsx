import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { apiRequest } from '../services/api';
import Loader from '../components/Loader';
import OrderTrackingCard from '../components/OrderTrackingCard';
import { formatCurrency } from '../utils/format';
import { useToast } from '../services/ToastContext';

export default function UserDashboardPage() {
  const { profile, session } = useAuth();
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [ordersRes, notificationsRes, ticketsRes] = await Promise.all([
          apiRequest('/api/payment/my-orders', 'GET', session.access_token),
          apiRequest('/api/notifications', 'GET', session.access_token),
          supabase.from('support_tickets').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
        ]);
        if (isMounted) {
          setOrders(ordersRes.orders || []);
          setNotifications(notificationsRes.notifications || []);
          setSupportTickets(ticketsRes.data || []);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (profile?.id) fetchData();
    return () => { isMounted = false; };
  }, [profile?.id, session?.access_token]);

  const stats = useMemo(() => {
    const spending = orders.reduce((sum, o) => sum + Number(o.total_price), 0);
    const pending = orders.filter(o => o.status !== 'completed').length;
    const points = profile.loyalty_points || 0;
    const tier = profile.loyalty_tier || 'bronze';
    
    const tiers = { bronze: 500, silver: 2000, gold: 5000 };
    const nextTier = tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : 'max';
    const pointsNeeded = nextTier !== 'max' ? tiers[nextTier] : 10000;
    const progress = Math.min((points / pointsNeeded) * 100, 100);

    return { spending, pending, points, tier, nextTier, pointsNeeded, progress };
  }, [orders, profile]);

  const handleAcknowledgeNotification = async (id) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, 'PATCH', session.access_token);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      addToast('Notification marked as read.', 'success');
    } catch (err) {
      addToast('Failed to update.', 'error');
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setSubmittingTicket(true);
    try {
       const { data, error } = await supabase.from('support_tickets').insert({ 
         user_id: profile.id, 
         subject: ticketSubject, 
         description: ticketDescription 
       }).select().single();
       
       if (error) throw error;
       
       setSupportTickets([data, ...supportTickets]);
       setShowTicketForm(false);
       setTicketSubject('');
       setTicketDescription('');
       addToast('Support request sent.', 'success');
    } catch (err) {
      addToast('Failed to send request.', 'error');
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (loading) return <Loader text="Loading your dashboard..." />;

  return (
    <div className="bg-[#020617] min-h-screen pt-64 pb-20 stagger-standard">
      <div className="mx-auto max-w-6xl px-6">
      {/* Editorial Header */}
      <header className="mb-20 grid lg:grid-cols-12 gap-10 items-end">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-md text-[9px] font-black uppercase tracking-widest text-slate-500">
              User ID: {profile.id?.slice(0, 8)}
            </div>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.8] mb-6 text-white truncate uppercase">
            {profile.role === 'admin' ? 'Administrator' : 'Welcome back,'} <br />
            <span className="text-indigo-400">{profile.email?.split('@')[0]}</span>
          </h1>
          <p className="max-w-xl text-lg text-slate-500 font-medium leading-relaxed">
            Welcome to your dashboard. <br />
            Manage your orders, track items, and view your points.
          </p>
        </div>

        {/* Tactical Identity Card */}
        <div className="lg:col-span-4 self-stretch">
          <div className="glass-card h-full p-8 flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Membership Tier</p>
                <h3 className="text-3xl font-black tracking-tighter uppercase italic text-white">{stats.tier}</h3>
              </div>
              <div className="h-10 w-10 border border-white/10 rounded-xl flex items-center justify-center text-xl bg-white/5">
                {stats.tier === 'gold' ? '💎' : stats.tier === 'silver' ? '🥈' : '🎖️'}
              </div>
            </div>

            <div className="relative z-10 mt-12">
              <div className="flex justify-between items-end mb-3">
                <div className="text-3xl font-black text-white">{stats.points} <span className="text-sm font-bold opacity-40">Points</span></div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">To {stats.nextTier}</div>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${stats.progress}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Overview */}
      <div className="grid lg:grid-cols-12 gap-8 mb-20">
        <div className="lg:col-span-3 glass-card p-8 group">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Spent</p>
          <h3 className="text-3xl font-black text-white tracking-tighter group-hover:translate-x-2 transition-transform">{formatCurrency(stats.spending)}</h3>
          <p className="mt-8 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Total purchases</p>
        </div>
        <div className="lg:col-span-3 glass-card p-8 group">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Active Orders</p>
          <h3 className="text-3xl font-black text-white tracking-tighter group-hover:translate-x-2 transition-transform">{stats.pending} Items</h3>
          <p className="mt-8 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Ongoing orders</p>
        </div>

        <div className="lg:col-span-6 glass-card px-8 flex items-center gap-10">
          {['orders', 'notifications', 'support'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative py-8 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${
                activeTab === tab ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.toUpperCase()}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 h-1 w-full bg-indigo-600"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      <section className="stagger-van">
        {activeTab === 'orders' && (
          <div className="space-y-8">
            {orders.length > 0 ? (
              orders.map(order => <OrderTrackingCard key={order.id} order={order} />)
            ) : (
              <div className="py-40 text-center glass-card border-dashed border-white/5 opacity-60">
                <div className="text-6xl mb-8">📦</div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">No active orders</h3>
                <p className="text-slate-500 text-sm mb-10 max-w-xs mx-auto uppercase tracking-widest font-black">Browse the shop to place your first order.</p>
                <a href="/products" className="btn-primary text-[9px] inline-block px-10">Shop Now</a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {notifications.map(n => (
              <div key={n.id} className={`glass-card p-10 group border-l-4 transition-all ${n.is_read ? 'border-transparent' : 'border-indigo-600 bg-white/[0.02]'}`}>
                <div className="flex justify-between items-start gap-10">
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-4">{n.type?.replace('_', ' ') || 'SYSTEM NOTIFICATION'}</p>
                    <h4 className="text-2xl font-black text-white tracking-tighter mb-2">{n.title}</h4>
                    <p className="text-slate-400 font-medium leading-relaxed">{n.message}</p>
                    <p className="mt-8 text-[9px] font-black text-slate-600 uppercase tracking-widest">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && (
                    <button 
                      onClick={() => handleAcknowledgeNotification(n.id)} 
                      className="px-6 py-2 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ))}
            {notifications.length === 0 && <div className="py-20 text-center text-slate-700 font-black uppercase tracking-widest text-[11px]">No notifications</div>}
          </div>
        )}

        {activeTab === 'support' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4">
              <h3 className="text-4xl font-black text-white tracking-tighter uppercase mb-6">Support</h3>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed uppercase text-sm tracking-widest">Message our team for any issues or help.</p>
              <button 
                onClick={() => setShowTicketForm(!showTicketForm)} 
                className="w-full btn-primary py-5 uppercase text-[10px]"
              >
                {showTicketForm ? 'Cancel' : 'Create Request'}
              </button>
            </div>
            
            <div className="lg:col-span-8 flex flex-col gap-6">
              {showTicketForm && (
                <form onSubmit={handleTicketSubmit} className="glass-card p-12 bg-white/5 border-2 border-indigo-500/20">
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Request Subject</label>
                      <input required value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} className="standard-input" placeholder="e.g. Question about order" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Problem Details</label>
                      <textarea required value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} rows="4" className="standard-input" placeholder="Explain the issue..." />
                    </div>
                    <button disabled={submittingTicket} className="btn-primary w-full py-5 text-[10px] tracking-[0.2em]">{submittingTicket ? 'Sending...' : 'Send Request'}</button>
                  </div>
                </form>
              )}

              {supportTickets.map(ticket => (
                <div key={ticket.id} className="glass-card p-10 flex justify-between items-start border-l-4 border-slate-700">
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Support Ticket #{ticket.id.slice(0, 6)}</p>
                    <h4 className="text-xl font-black text-white tracking-tighter mb-2 uppercase">{ticket.subject}</h4>
                    <p className="text-slate-500 font-medium text-sm">{ticket.description}</p>
                  </div>
                  <div className="px-4 py-1.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                    {ticket.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

