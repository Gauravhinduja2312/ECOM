import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../services/supabaseClient';
import { apiRequest } from '../services/api';
import Loader from '../components/Loader';
import { formatCurrency } from '../utils/format';

export default function UserDashboardPage() {
  const { profile, session } = useAuth();
  const [orders, setOrders] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [ordersResult, listingsResult] = await Promise.all([
          apiRequest('/api/payment/my-orders', 'GET', session.access_token),
          supabase
            .from('products')
            .select('*')
            .eq('seller_id', profile.id)
            .order('id', { ascending: false }),
        ]);

        setOrders(ordersResult.orders || []);
        setMyListings(listingsResult.data || []);
      } catch (_error) {
        setOrders([]);
        setMyListings([]);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.id && session?.access_token) fetchDashboardData();
  }, [profile?.id, session?.access_token]);

  const totalSpending = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total_price), 0),
    [orders]
  );

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
        </div>

        {activeTab === 'orders' ? (
          <>
            <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm">
                  <p className="font-medium text-slate-900">Order #{order.id}</p>
                  <p className="text-sm text-slate-600">{new Date(order.created_at).toLocaleString()}</p>
                  <p className="text-sm text-slate-600">Status: <span className="font-medium capitalize">{order.status}</span></p>
                  <p className="text-sm font-semibold text-slate-800">{formatCurrency(order.total_price)}</p>

                  {(order.items || []).length > 0 && (
                    <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Pickup / Delivery Contact</p>
                      <div className="mt-2 space-y-2">
                        {[...new Map((order.items || [])
                          .filter((item) => item.seller_id)
                          .map((item) => [item.seller_id, item]))
                          .values()]
                          .map((sellerItem) => (
                            <div key={sellerItem.seller_id} className="text-sm text-slate-700">
                              <p>Seller: <span className="font-medium text-slate-900">{sellerItem.seller_email || sellerItem.seller_id}</span></p>
                              {sellerItem.seller_phone && (
                                <p>Phone: <span className="font-medium text-slate-900">{sellerItem.seller_phone}</span></p>
                              )}
                            </div>
                          ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        Contact the seller to coordinate campus pickup after payment.
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {orders.length === 0 && <p className="text-sm text-slate-600">No orders yet.</p>}
            </div>
          </>
        ) : (
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
        )}
      </div>
    </section>
  );
}
