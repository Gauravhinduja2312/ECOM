import React, { useEffect, useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { apiRequest } from '../services/api';
import Loader from '../components/Loader';
import OrderStatusBadge from '../components/OrderStatusBadge';
import { formatCurrency } from '../utils/format';

const PICKUP_STATUS_CONFIG = {
  pending_pickup: {
    label: 'Pending Confirmation',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: '📍',
  },
  pickup_confirmed: {
    label: 'Confirmed',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: '✅',
  },
  picked_up: {
    label: 'Picked Up',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    icon: '🎉',
  },
};

export default function SellerPickupDashboard() {
  const { profile, session } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);

  useEffect(() => {
    const fetchSellerOrders = async () => {
      try {
        const response = await apiRequest('/api/payment/seller-orders', 'GET', session.access_token);
        setOrders(response.orders || []);
      } catch (err) {
        setError(err.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    if (session?.access_token) {
      fetchSellerOrders();
    }
  }, [session?.access_token]);

  const handleConfirmPickup = async (orderId, status) => {
    setConfirmingOrderId(orderId);
    try {
      await apiRequest(
        `/api/payment/orders/${orderId}/pickup/confirm`,
        'PATCH',
        session.access_token,
        { status }
      );

      // Refresh orders
      const response = await apiRequest('/api/payment/seller-orders', 'GET', session.access_token);
      setOrders(response.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to update pickup status');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  if (loading) return <Loader text="Loading seller orders..." />;

  const pendingOrders = orders.filter((o) => !o.logistics || o.logistics.status === 'pending_pickup');
  const confirmedOrders = orders.filter((o) => o.logistics?.status === 'pickup_confirmed');
  const pickedUpOrders = orders.filter((o) => o.logistics?.status === 'picked_up');

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 animate-fade-in-up">
      <h1 className="page-title inline-flex items-center gap-2 text-slate-900 mb-6">
        <span>📦</span>
        Pickup Management
      </h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 mb-6">
          ❌ {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">Pending Confirmation</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">{pendingOrders.length}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">Confirmed Pickups</p>
          <p className="mt-2 text-2xl font-bold text-green-900">{confirmedOrders.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Picked Up</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{pickedUpOrders.length}</p>
        </div>
      </div>

      {/* Pending Orders */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">⏳ Action Required</h2>
        <div className="space-y-4">
          {pendingOrders.length === 0 ? (
            <p className="text-slate-600 text-center py-6">No pending orders</p>
          ) : (
            pendingOrders.map((order) => (
              <div key={order.id} className="rounded-lg border border-blue-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Order #{order.id}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Buyer: {order.buyer?.full_name || order.buyer?.email || 'Unknown'}
                    </p>
                    {order.buyer?.phone && (
                      <p className="text-sm text-slate-600">📞 {order.buyer.phone}</p>
                    )}
                    <p className="text-sm text-slate-600 mt-2">
                      📍 {order.pickup_location}
                      <br />
                      🕐 {new Date(order.pickup_time).toLocaleString()}
                    </p>
                    <div className="mt-3">
                      <p className="text-xs font-medium text-slate-700 mb-2">Items ({order.items?.length || 0}):</p>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {(order.items || []).map((item, idx) => (
                          <li key={idx}>• Product #{item.product_id} × {item.quantity}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-700">{formatCurrency(order.total_price)}</p>
                    <OrderStatusBadge status={order.status} />
                    <button
                      onClick={() => handleConfirmPickup(order.id, 'pickup_confirmed')}
                      disabled={confirmingOrderId === order.id}
                      className="mt-3 w-full rounded-lg bg-green-600 text-white py-2 px-4 text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
                    >
                      {confirmingOrderId === order.id ? '✓ Confirming...' : '✓ Confirm Pickup'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmed Orders */}
      {confirmedOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">✅ Confirmed Pickups</h2>
          <div className="space-y-4">
            {confirmedOrders.map((order) => (
              <div key={order.id} className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Order #{order.id}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {order.buyer?.full_name || order.buyer?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleConfirmPickup(order.id, 'picked_up')}
                    disabled={confirmingOrderId === order.id}
                    className="rounded-lg bg-emerald-600 text-white py-2 px-4 text-sm font-semibold hover:bg-emerald-700 disabled:bg-gray-400 transition"
                  >
                    {confirmingOrderId === order.id ? 'Processing...' : 'Mark as Picked Up'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Orders */}
      {pickedUpOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">🎉 Completed Pickups</h2>
          <div className="space-y-2">
            {pickedUpOrders.map((order) => (
              <div key={order.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">Order #{order.id}</span>
                  <span className="text-emerald-700 font-medium">Picked up</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
