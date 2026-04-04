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
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const [ordersResult, notificationsResult, listingsResult] = await Promise.all([
          apiRequest('/api/payment/my-orders', 'GET', session.access_token),
          apiRequest('/api/notifications', 'GET', session.access_token),
          supabase
            .from('products')
            .select('*')
            .eq('seller_id', profile.id)
            .order('id', { ascending: false }),
        ]);

        if (!isMounted) {
          return;
        }

        setOrders(ordersResult.orders || []);
        setNotifications(notificationsResult.notifications || []);
        setMyListings(listingsResult.data || []);
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

    if (profile?.id && session?.access_token) {
      fetchDashboardData();

      const intervalId = window.setInterval(fetchDashboardData, 30000);
      const handleFocus = () => fetchDashboardData();

      window.addEventListener('focus', handleFocus);

      return () => {
        isMounted = false;
        window.clearInterval(intervalId);
        window.removeEventListener('focus', handleFocus);
      };
    }

    return () => {
      isMounted = false;
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

  if (loading) return <Loader text="Loading dashboard..." />;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 animate-fade-in-up">
      <h1 className="page-title inline-flex items-center gap-2 text-slate-900">
        <span className="icon-pill">👤</span>
        User Dashboard
      </h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 stagger-children">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm hover-lift hover-glow">
          <p className="text-sm text-slate-500">Profile</p>
          <p className="mt-1 font-semibold text-slate-900">{profile.email}</p>
          <p className="text-sm text-slate-600">Role: {profile.role}</p>
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
            Recent Activity
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
        ) : (
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
        )}
      </div>
    </section>
  );
}
