import React from 'react';
import { formatCurrency } from '../utils/format';
import OrderStatusBadge from './OrderStatusBadge';
import OrderStatusTimeline from './OrderStatusTimeline';
import { apiRequest } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import SuccessMessage from './SuccessMessage';
import ErrorMessage from './ErrorMessage';

const PICKUP_STATUS_LABELS = {
  pending_pickup: 'Pending Confirmation',
  pickup_confirmed: 'Pickup Confirmed',
  picked_up: 'Picked Up',
  delivery_in_progress: 'Delivery In Progress',
  delivered: 'Delivered',
};

export default function OrderTrackingCard({ order, isExpandable = true }) {
  const { session } = useAuth();
  const { addToast } = useToast();
  const [isExpanded, setIsExpanded] = React.useState(!isExpandable);
  const [isRescheduling, setIsRescheduling] = React.useState(false);
  const [rescheduleData, setRescheduleData] = React.useState({
    location: order.pickup_location || 'Main Gate',
    time: order.pickup_time ? new Date(order.pickup_time).toISOString().slice(0, 16) : '',
    address: order.delivery_address || '',
  });
  const [isReturning, setIsReturning] = React.useState(false);
  const [returnReason, setReturnReason] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  if (!order) return null;

  const handleReschedule = async () => {
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/api/payment/orders/${order.id}/reschedule`, 'PATCH', session.access_token, {
        pickupLocation: rescheduleData.location,
        pickupTime: rescheduleData.time,
        deliveryAddress: rescheduleData.address,
      });
      setSuccess('Pickup details updated successfully!');
      setIsRescheduling(false);
      addToast('Order rescheduled.', 'success');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (orderItemId) => {
    setLoading(true);
    setError('');
    try {
      await apiRequest(`/api/payment/orders/return?orderId=${order.id}`, 'POST', session.access_token, {
        reason: returnReason,
        orderItemId,
      });
      setSuccess('Return request submitted!');
      setIsReturning(false);
      addToast('Return requested.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickupDateTime = order.pickup_time ? new Date(order.pickup_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';
  const pickupStatus = order.logistics?.status || null;

  return (
    <div className="group rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5">
      {/* Order Header */}
      <div
        className="cursor-pointer p-6 sm:p-8"
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">Order #{order.id}</span>
              <OrderStatusBadge status={order.status} showIcon={true} />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-indigo-600 tracking-tighter">{formatCurrency(order.total_price)}</p>
            {isExpandable && (
              <button className="mt-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition">
                {isExpanded ? 'Collapse' : 'Track Order'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-8 sm:px-8 stagger-children">
          {/* Status Timeline */}
          <div className="rounded-3xl bg-slate-50 border border-slate-100 p-6 mb-6">
            <h4 className="mb-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Order Status</h4>
            <OrderStatusTimeline currentStatus={order.status} statusUpdatedAt={order.status_updated_at} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Pickup Details */}
            <div className="rounded-3xl border border-slate-100 p-6 hover:bg-slate-50 transition">
              <h4 className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Delivery Info</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs">📍</div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Location</p>
                    <p className="text-sm font-bold text-slate-900">{order.pickup_location || 'To be confirmed'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-violet-50 flex items-center justify-center text-xs">⏰</div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Pickup Time</p>
                    <p className="text-sm font-bold text-slate-900">{pickupDateTime}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="rounded-3xl border border-slate-100 p-6 hover:bg-slate-50 transition">
              <h4 className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Items In Order</h4>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{item.quantity}x</div>
                      <p className="text-xs font-bold text-slate-700">{item.product_name}</p>
                    </div>
                    <p className="text-xs font-black text-slate-900">{formatCurrency(Number(item.price) * Number(item.quantity))}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {success && <SuccessMessage message={success} />}
          {error && <ErrorMessage message={error} />}

          {isRescheduling && (
            <div className="mt-8 p-6 rounded-3xl bg-indigo-600/5 border border-indigo-500/10 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Reschedule Fulfillment</h4>
              {order.pickup_location ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={rescheduleData.location}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, location: e.target.value })}
                    className="elite-input text-xs py-3"
                    placeholder="New Location..."
                  />
                  <input
                    type="datetime-local"
                    value={rescheduleData.time}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                    className="elite-input text-xs py-3"
                  />
                </div>
              ) : (
                <textarea
                  value={rescheduleData.address}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, address: e.target.value })}
                  className="elite-input text-xs py-3"
                  placeholder="New Delivery Address..."
                />
              )}
              <div className="flex gap-2">
                <button onClick={handleReschedule} disabled={loading} className="btn-elite flex-1 py-3 text-[9px]">{loading ? 'SAVING...' : 'CONFIRM CHANGES'}</button>
                <button onClick={() => setIsRescheduling(false)} className="px-6 py-3 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest">Cancel</button>
              </div>
            </div>
          )}

          {isReturning && (
            <div className="mt-8 p-6 rounded-3xl bg-rose-600/5 border border-rose-500/10 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">Request Return</h4>
               <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full rounded-2xl bg-white border-2 border-rose-100 p-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-rose-300 focus:outline-none transition-all"
                placeholder="Reason for return (e.g., Wrong size, Damaged)..."
                rows={3}
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => handleReturn(order.items[0]?.id)} 
                  disabled={loading} 
                  className="btn-elite flex-1 py-3 text-[9px] bg-rose-600 border-rose-500/20"
                >
                  {loading ? 'SUBMITTING...' : 'CONFIRM RETURN'}
                </button>
                <button onClick={() => setIsReturning(false)} className="px-6 py-3 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest">Cancel</button>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {!isRescheduling && !isReturning && order.status !== 'completed' && (
              <button
                onClick={() => setIsRescheduling(true)}
                className="flex-1 btn-elite py-4 text-[9px] tracking-widest uppercase"
              >
                Reschedule Fulfillment
              </button>
            )}
            
            {order.status === 'completed' && !isReturning && (
              <button
                onClick={() => setIsReturning(true)}
                className="flex-1 btn-elite py-4 text-[9px] tracking-widest uppercase bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)] border-rose-500/20"
              >
                Initiate Return
              </button>
            )}

            <button
              onClick={() => window.location.href = `/order/${order.id}`}
              className="flex-1 px-8 py-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition"
            >
              Need Help?
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
