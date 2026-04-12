import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../services/AuthContext';
import { apiRequest } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../services/ToastContext';
import { formatCurrency } from '../utils/format';
import Loader from '../components/Loader';
import OrderTrackingCard from '../components/OrderTrackingCard';
import ListingWizard from '../components/ListingWizard';

export default function SingleHubPage() {
  const { profile, session } = useAuth();
  const { addToast } = useToast();
  
  const [activeMode, setActiveMode] = useState('buyer'); // 'buyer' or 'seller'
  const [activeTab, setActiveTab] = useState('activity');
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  
  // Data State
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  const fetchData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [ordersRes, listingsRes, notificationsRes] = await Promise.all([
        apiRequest('/api/payment/my-orders', 'GET', session.access_token),
        supabase.from('products').select('*').eq('seller_id', profile.id).order('created_at', { ascending: false }),
        apiRequest('/api/notifications', 'GET', session.access_token)
      ]);
      
      setOrders(ordersRes.orders || []);
      setListings(listingsRes.data || []);
      setNotifications(notificationsRes.notifications || []);
    } catch (err) {
      console.error('Hub Fetch Error:', err);
      addToast('Failed to sync your activity.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.id]);

  const stats = useMemo(() => {
    const spending = orders.reduce((sum, o) => sum + Number(o.total_price), 0);
    const activeOrders = orders.filter(o => o.status !== 'completed').length;
    const activeListings = listings.filter(l => l.verification_status === 'verified').length;
    const pendingReview = listings.filter(l => l.verification_status === 'pending').length;
    const earnings = listings
      .filter(l => l.price_offer_status === 'accepted')
      .reduce((sum, l) => sum + Number(l.price), 0);
      
    return { spending, activeOrders, activeListings, pendingReview, earnings };
  }, [orders, listings]);

  if (loading) return <Loader text="Syncing your Hub..." />;

  return (
    <div className="bg-[#020617] min-h-screen pb-20 stagger-elite">
      <div className="mx-auto max-w-6xl px-6">
        {/* Hub Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-black uppercase text-indigo-400 tracking-widest">
                Operational Command
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic">
              My <span className="text-indigo-500">Hub</span>
            </h1>
          </div>
          
          {/* Mode Switcher */}
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 self-start md:self-auto">
            <button 
              onClick={() => { setActiveMode('buyer'); setActiveTab('activity'); }}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'buyer' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              Buyer Mode
            </button>
            <button 
              onClick={() => { setActiveMode('seller'); setActiveTab('activity'); }}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'seller' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              Seller Mode
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {activeMode === 'buyer' ? (
            <>
              <HubStatCard label="Total Spent" value={formatCurrency(stats.spending)} icon="💰" color="text-emerald-400" />
              <HubStatCard label="Active Orders" value={stats.activeOrders} icon="📦" color="text-indigo-400" />
              <HubStatCard label="Loyalty Points" value={profile.loyalty_points || 0} icon="💎" color="text-amber-400" />
              <HubStatCard label="Cart Items" value={0} icon="🛒" color="text-slate-400" />
            </>
          ) : (
            <>
              <HubStatCard label="Total Earnings" value={formatCurrency(stats.earnings)} icon="📈" color="text-emerald-400" />
              <HubStatCard label="Active Listings" value={stats.activeListings} icon="🏷️" color="text-indigo-400" />
              <HubStatCard label="Pending Review" value={stats.pendingReview} icon="⏳" color="text-amber-400" />
              <HubStatCard label="Tier" value={profile.loyalty_tier || 'Bronze'} icon="🏆" color="text-slate-400" />
            </>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-10 border-b border-white/5 mb-10 overflow-x-auto pb-1 relative">
          {['activity', 'history', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative py-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all调节 whitespace-nowrap ${activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-white'}`}
            >
              {tab}
              {tab === 'activity' && notifications.filter(n => !n.is_read).length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-600 text-[8px] animate-pulse">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
              {activeTab === tab && <div className="absolute bottom-0 left-0 h-0.5 w-full bg-indigo-500"></div>}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="stagger-van">
          {activeMode === 'buyer' && activeTab === 'activity' && (
            <div className="space-y-6">
              {orders.length > 0 ? (
                orders.map(order => <OrderTrackingCard key={order.id} order={order} />)
              ) : (
                <EmptyHubState icon="📦" title="No active orders" link="/products" linkText="Start Shopping" />
              )}
            </div>
          )}

          {activeMode === 'seller' && activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your Sales Activity</h3>
                 <button 
                  onClick={() => setShowWizard(true)}
                  className="btn-elite px-6 py-2 text-[8px] tracking-widest"
                 >
                   LIST NEW PRODUCT
                 </button>
              </div>
              {listings.length > 0 ? (
                listings.map(listing => <HubListingCard key={listing.id} listing={listing} />)
              ) : (
                <EmptyHubState icon="📤" title="No active listings" link="#" linkText="Initialize First Listing" onClick={() => setShowWizard(true)} />
              )}
            </div>
          )}
          
          {activeTab === 'settings' && (
             <div className="glass-card p-10 max-w-2xl mx-auto">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">Profile Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Full Name</label>
                    <input className="elite-input bg-white/5" value={profile.full_name} disabled />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Email Address</label>
                    <input className="elite-input bg-white/5" value={profile.email} disabled />
                  </div>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Listing Wizard Overlay */}
      {showWizard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowWizard(false)}></div>
          <div className="relative w-full max-w-2xl z-20">
            <ListingWizard 
              onComplete={() => { setShowWizard(false); fetchData(); }} 
              onCancel={() => setShowWizard(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

function HubStatCard({ label, value, icon, color }) {
  return (
    <div className="glass-card p-6 border-white/5 hover:border-white/10 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <span className="text-xl group-hover:scale-125 transition-transform">{icon}</span>
      </div>
      <p className={`text-2xl font-black tracking-tighter uppercase italic ${color}`}>{value}</p>
    </div>
  );
}

function EmptyHubState({ icon, title, link, linkText, onClick }) {
  return (
    <div className="py-32 text-center glass-card border-dashed border-white/5 opacity-60">
      <div className="text-6xl mb-6">{icon}</div>
      <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4">{title}</h3>
      {onClick ? (
        <button onClick={onClick} className="btn-elite text-[9px] px-8 inline-block">{linkText}</button>
      ) : (
        <a href={link} className="btn-elite text-[9px] px-8 inline-block">{linkText}</a>
      )}
    </div>
  );
}

function HubListingCard({ listing }) {
  return (
    <div className="glass-card p-8 border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-indigo-500/20 transition-all">
      <div className="flex items-center gap-6">
        <div className="h-16 w-16 rounded-xl bg-white/5 flex items-center justify-center text-3xl overflow-hidden border border-white/5 group-hover:scale-105 transition-transform">
          {listing.image_url ? <img src={listing.image_url} className="h-full w-full object-cover" /> : '📦'}
        </div>
        <div>
          <h4 className="text-lg font-black text-white uppercase tracking-tighter">{listing.name}</h4>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
              listing.verification_status === 'verified' ? 'text-emerald-400 bg-emerald-400/10' :
              listing.verification_status === 'pending' ? 'text-amber-400 bg-amber-400/10' :
              'text-rose-400 bg-rose-400/10'
            }`}>
              {listing.verification_status}
            </span>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Valuation: ₹{listing.price}</span>
            {listing.handover_code && (
              <span className="px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest">
                Code: {listing.handover_code}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 w-full md:w-auto">
        {listing.handover_code && listing.handover_status !== 'confirmed' && (
          <div className="p-4 bg-indigo-600/10 rounded-xl border border-indigo-600/20 text-center animate-pulse">
            <p className="text-[8px] font-black uppercase text-indigo-400 mb-1">UNFINISHED HANDOVER</p>
            <p className="text-xs font-black text-white">Give Code {listing.handover_code} to Admin</p>
          </div>
        )}
        <button className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition">
          View Details
        </button>
      </div>
    </div>
  );
}
