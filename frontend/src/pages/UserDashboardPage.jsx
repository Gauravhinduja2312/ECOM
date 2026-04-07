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

  if (loading) return <Loader text="Synchronizing Vanguard Workspace..." />;

  return (
    <div className="van-container pt-32 pb-40 stagger-van">
      {/* Editorial Header */}
      <header className="mb-20 grid lg:grid-cols-12 gap-10 items-end">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-md text-[9px] font-black uppercase tracking-widest text-slate-500">
              Terminal Identifier: {profile.id?.slice(0, 8)}
            </div>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.8] mb-6">
            <span className="text-white">COMMANDER</span> <br />
            <span className="text-accent-van">{profile.email?.split('@')[0].toUpperCase()}</span>
          </h1>
          <p className="max-w-xl text-lg text-slate-500 font-medium leading-relaxed">
            Welcome to your primary Vanguard Acquisition Workspace. <br />
            Track, analyze and scale your institutional commerce activities.
          </p>
        </div>

        {/* Tactical Identity Card */}
        <div className="lg:col-span-4 self-stretch">
          <div className="glass-card h-full p-8 flex flex-col justify-between group overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Status Tier</p>
                <h3 className="text-3xl font-black tracking-tighter uppercase italic text-white">{stats.tier}</h3>
              </div>
              <div className="h-10 w-10 border border-white/10 rounded-xl flex items-center justify-center text-xl bg-white/5">
                {stats.tier === 'gold' ? '💎' : stats.tier === 'silver' ? '🥈' : '🎖️'}
              </div>
            </div>

            <div className="relative z-10 mt-12">
              <div className="flex justify-between items-end mb-3">
                <div className="text-3xl font-black text-white">{stats.points} <span className="text-sm font-bold opacity-40">EXP</span></div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">To {stats.nextTier}</div>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${stats.progress}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Bento Workspace */}
      <div className="grid lg:grid-cols-12 gap-8 mb-20">
        {/* Quick Stats Bento */}
        <div className="lg:col-span-3 glass-card p-8 group">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Network Liquidity</p>
          <h3 className="text-3xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform">{formatCurrency(stats.spending)}</h3>
          <p className="mt-8 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Total Acquisitions</p>
        </div>
        <div className="lg:col-span-3 glass-card p-8 group">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Active Logistics</p>
          <h3 className="text-3xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform">{stats.pending} Parcel</h3>
          <p className="mt-8 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Live Transmissions</p>
        </div>

        {/* Main Task List Navigation */}
        <div className="lg:col-span-6 glass-card px-8 flex items-center gap-10">
          {['orders', 'notifications', 'support'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative py-8 text-[11px] font-black uppercase tracking-[0.3em] transition-all ${
                activeTab === tab ? 'text-white' : 'text-slate-600 hover:text-slate-400'
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

      {/* Dynamic Content Panel */}
      <section className="stagger-van">
        {activeTab === 'orders' && (
          <div className="space-y-8">
            {orders.length > 0 ? (
              orders.map(order => <OrderTrackingCard key={order.id} order={order} />)
            ) : (
              <div className="py-40 text-center glass-card border-dashed border-white/5 opacity-60">
                <div className="text-6xl mb-8">🛰️</div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">No Active Transmissions</h3>
                <p className="text-slate-500 text-sm mb-10 max-w-xs mx-auto uppercase tracking-widest font-black font-jakarta">Initialize your first acquisition deal from the catalog.</p>
                <a href="/products" className="btn-vanguard text-[9px]">Enter Catalog</a>
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-4">{n.type?.replace('_', ' ') || 'SYSTEM OVERRIDE'}</p>
                    <h4 className="text-2xl font-black text-white tracking-tighter mb-2">{n.title}</h4>
                    <p className="text-slate-400 font-medium leading-relaxed">{n.message}</p>
                    <p className="mt-8 text-[9px] font-black text-slate-600 uppercase tracking-widest">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && (
                    <button 
                      onClick={() => apiRequest(`/api/notifications/${n.id}/read`, 'PATCH', session.access_token)} 
                      className="px-6 py-2 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
            {notifications.length === 0 && <div className="py-20 text-center text-slate-700 font-black uppercase tracking-widest text-[9px]">Zero Network Alerts</div>}
          </div>
        )}

        {activeTab === 'support' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4">
              <h3 className="text-4xl font-black text-white tracking-tighter uppercase mb-6">Service Protocol</h3>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed uppercase text-sm tracking-widest">Open a direct line to our fulfillment engineers.</p>
              <button 
                onClick={() => setShowTicketForm(!showTicketForm)} 
                className="w-full btn-vanguard py-5 uppercase text-[10px]"
              >
                {showTicketForm ? 'Abort Request' : 'Initialize Request'}
              </button>
            </div>
            
            <div className="lg:col-span-8 flex flex-col gap-6">
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
                  className="glass-card p-12 bg-white/5 border-2 border-indigo-500/20"
                >
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Request Subject</label>
                      <input required value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} className="van-input" placeholder="e.g. Identity verification issue" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Detailed Directive</label>
                      <textarea required value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} rows="4" className="van-input" placeholder="Describe the protocol error..." />
                    </div>
                    <button disabled={submittingTicket} className="btn-vanguard w-full py-5 text-[10px] tracking-[0.2em]">{submittingTicket ? 'Transmitting...' : 'Send Request'}</button>
                  </div>
                </form>
              )}

              {supportTickets.map(ticket => (
                <div key={ticket.id} className="glass-card p-10 flex justify-between items-start border-l-4 border-slate-700">
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Protocol Ticket #{ticket.id.slice(0, 6)}</p>
                    <h4 className="text-xl font-black text-white tracking-tighter mb-2 uppercase">{ticket.subject}</h4>
                    <p className="text-slate-500 font-medium text-sm">{ticket.description}</p>
                  </div>
                  <div className="px-4 py-1.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-[#7c3aed]">
                    {ticket.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
