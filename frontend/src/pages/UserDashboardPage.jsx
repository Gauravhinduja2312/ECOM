import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { apiRequest } from '../services/api';
import Loader from '../components/Loader';
import OrderTrackingCard from '../components/OrderTrackingCard';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { formatCurrency } from '../utils/format';

export default function UserDashboardPage() {
  const { profile, session } = useAuth();
  const [orders, setOrders] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [myReturns, setMyReturns] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  
  // Modals / forms
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let refreshTimeoutId = null;

    const fetchDashboardData = async () => {
      try {
        const [ordersResult, notificationsResult, listingsResult, ticketsResult, returnsResult] = await Promise.all([
          apiRequest('/api/payment/my-orders', 'GET', session.access_token),
          apiRequest('/api/notifications', 'GET', session.access_token),
          supabase
            .from('products')
            .select('*')
            .eq('seller_id', profile.id)
            .order('id', { ascending: false }),
          supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('returns')
            .select('*, order_item:order_items(product:products(name))')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false }),
        ]);

        if (!isMounted) {
          return;
        }

        setOrders(ordersResult.orders || []);
        setNotifications(notificationsResult.notifications || []);
        setMyListings(listingsResult.data || []);
        setSupportTickets(ticketsResult.data || []);
        setMyReturns(returnsResult.data || []);
      } catch {
        if (!isMounted) {
          return;
        }

        setOrders([]);
        setMyListings([]);
        setNotifications([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimeoutId) {
        return;
      }

      refreshTimeoutId = window.setTimeout(() => {
        refreshTimeoutId = null;
        fetchDashboardData();
      }, 300);
    };

    if (profile?.id && session?.access_token) {
      fetchDashboardData();

      const channel = supabase
        .channel(`dashboard-updates-${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${profile.id}`,
          },
          scheduleRefresh
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`,
          },
          scheduleRefresh
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `seller_id=eq.${profile.id}`,
          },
          scheduleRefresh
        )
        .subscribe();

      const intervalId = window.setInterval(fetchDashboardData, 120000);
      const handleFocus = () => scheduleRefresh();

      window.addEventListener('focus', handleFocus);

      return () => {
        isMounted = false;
        window.clearInterval(intervalId);
        if (refreshTimeoutId) {
          window.clearTimeout(refreshTimeoutId);
          refreshTimeoutId = null;
        }
        supabase.removeChannel(channel);
        window.removeEventListener('focus', handleFocus);
      };
    }

    return () => {
      isMounted = false;
      if (refreshTimeoutId) {
        window.clearTimeout(refreshTimeoutId);
      }
    };
  }, [profile?.id, session?.access_token]);

  const totalSpending = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total_price), 0),
    [orders]
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const recentActivity = useMemo(() => {
    const orderEvents = orders.map((order) => ({
      id: `order-${order.id}-${order.status_updated_at || order.created_at}`,
      time: order.status_updated_at || order.created_at,
      text: `Order #${order.id} moved to ${String(order.status || '').replaceAll('_', ' ')}`,
      type: 'order',
    }));

    const notificationEvents = notifications.map((item) => ({
      id: `notification-${item.id}`,
      time: item.created_at,
      text: item.title,
      type: 'notification',
    }));

    return [...orderEvents, ...notificationEvents]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [orders, notifications]);

  const markNotificationRead = async (id) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, 'PATCH', session.access_token);
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    } catch {
      // Keep interaction silent for basic UX.
    }
  };

  const submitSupportTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDescription) return;
    
    setSubmittingTicket(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: profile.id,
          subject: ticketSubject,
          description: ticketDescription,
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setSupportTickets([data, ...supportTickets]);
      setShowTicketForm(false);
      setTicketSubject('');
      setTicketDescription('');
    } catch (error) {
      alert(error.message || 'Failed to create ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (loading) return <Loader text="Loading dashboard..." />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 animate-fade-in-up">
      <h1 className="page-title inline-flex items-center gap-2 text-slate-900">
        <span className="icon-pill">👤</span>
        User Dashboard
      </h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 stagger-children">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500">Profile</p>
              <p className="mt-1 font-semibold text-slate-900">{profile.email}</p>
              <p className="text-sm text-slate-600">Role: <span className="capitalize">{profile.role}</span></p>
            </div>
            {(profile.loyalty_tier || profile.loyalty_points > 0) && (
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  profile.loyalty_tier === 'gold' ? 'bg-amber-100 text-amber-600 border border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]' :
                  profile.loyalty_tier === 'silver' ? 'bg-slate-200 text-slate-600 border border-slate-300' :
                  'bg-orange-100 text-orange-800 border border-orange-300'
                }`}>
                  {profile.loyalty_tier || 'bronze'}
                </span>
                <p className="mt-1 text-xs text-slate-500 font-semibold">{profile.loyalty_points || 0} pts</p>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
          <p className="text-sm text-slate-500">Total Spending</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{formatCurrency(totalSpending)}</p>
          <p className="mt-2 text-xs text-slate-600">Unread notifications: {unreadCount}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm animate-fade-in-up hover-glow">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'orders'
                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('listings')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'listings'
                ? 'bg-violet-100 text-violet-900 border border-violet-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Listings ({myListings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'notifications'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Notifications ({unreadCount})
          </button>
            <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'activity'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('support')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'support'
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Support
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'returns'
                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Returns
          </button>
        </div>

        {activeTab === 'orders' ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">Your Orders</h2>
            <div className="mt-4 space-y-4">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <OrderTrackingCard key={order.id} order={order} isExpandable={true} />
                ))
              ) : (
                <p className="text-center text-sm text-slate-600 py-6">
                  No orders yet. Start shopping!
                </p>
              )}
            </div>
          </>
        ) : activeTab === 'listings' ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">My Listings</h2>
            <div className="mt-4 space-y-3">
              {myListings.map((listing) => (
                <div key={listing.id} className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm">
                  <p className="font-medium text-slate-900">{listing.name}</p>
                  <p className="text-sm text-slate-600">{formatCurrency(listing.price)} • Stock: {listing.stock}</p>
                  <p className="text-sm text-slate-600">Category: {listing.category || 'General'}</p>
                  <p className="text-sm text-slate-600">
                    Status: <span className="font-medium capitalize">{listing.verification_status}</span>
                  </p>
                </div>
              ))}
              {myListings.length === 0 && <p className="text-sm text-slate-600">No listings yet.</p>}
            </div>
          </>
        ) : activeTab === 'notifications' ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">Notifications</h2>
            <div className="mt-4 space-y-3">
              {notifications.map((item) => (
                <div key={item.id} className={`rounded-xl border p-3 ${item.is_read ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(item.id)}
                        className="rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-sm text-slate-600">No notifications yet.</p>}
            </div>
          </>
        ) : activeTab === 'activity' ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
            <div className="mt-4 space-y-3">
              {recentActivity.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="font-medium text-slate-900">{event.text}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(event.time).toLocaleString()}</p>
                </div>
              ))}
              {recentActivity.length === 0 && <p className="text-sm text-slate-600">No recent activity.</p>}
            </div>
          </>
        ) : activeTab === 'support' ? (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Support Tickets</h2>
              <button 
                onClick={() => setShowTicketForm(!showTicketForm)}
                className="btn-gradient px-4 py-2 text-sm"
              >
                {showTicketForm ? 'Cancel' : '+ New Ticket'}
              </button>
            </div>
            
            {showTicketForm && (
              <form onSubmit={submitSupportTicket} className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-xl space-y-3 animate-fade-in-up">
                <div>
                  <label className="form-label">Subject</label>
                  <input required placeholder="Brief description of the issue" value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} type="text" className="form-input w-full mt-1" />
                </div>
                <div>
                  <label className="form-label">Details</label>
                  <textarea required placeholder="Please provide details about your problem..." value={ticketDescription} onChange={e => setTicketDescription(e.target.value)} rows="3" className="form-input w-full mt-1"></textarea>
                </div>
                <button disabled={submittingTicket} type="submit" className="btn-gradient px-4 py-2 text-sm">
                  {submittingTicket ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </form>
            )}

            <div className="mt-4 space-y-3">
              {supportTickets.length > 0 ? supportTickets.map(ticket => (
                <div key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{ticket.subject}</p>
                      <p className="text-sm text-slate-600 mt-1">{ticket.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
                      ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                      ticket.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Ticket #{ticket.id} • Submitted on {new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
              )) : (
                 <p className="text-sm text-slate-600">No support tickets found.</p>
              )}
            </div>
          </>
        ) : activeTab === 'returns' ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">My Returns</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">View your return requests and their processing statuses.</p>
            <div className="space-y-4">
              {myReturns.length > 0 ? myReturns.map(ret => (
                <div key={ret.id} className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">Return #{ret.id}</p>
                      <p className="text-sm text-rose-800 mt-1 font-medium">{ret.order_item?.product?.name || `Order Item #${ret.order_item_id}`}</p>
                      <p className="text-sm text-slate-700 mt-1">Reason: <span className="italic">{ret.reason}</span></p>
                      {ret.admin_note && <p className="text-sm text-slate-600 mt-1 bg-white p-2 rounded border border-rose-100">Admin Note: {ret.admin_note}</p>}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                      ret.status === 'requested' ? 'bg-amber-200 text-amber-900' :
                      ret.status === 'approved' ? 'bg-emerald-200 text-emerald-900' :
                      ret.status === 'rejected' ? 'bg-red-200 text-red-900' :
                      'bg-blue-200 text-blue-900'
                    }`}>
                      {ret.status}
                    </span>
                  </div>
                </div>
              )) : (
                 <p className="text-sm text-slate-600">You haven't requested any returns.</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
