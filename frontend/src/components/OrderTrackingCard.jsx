import React from 'react';
import { formatCurrency } from '../utils/format';
import OrderStatusBadge from './OrderStatusBadge';
import OrderStatusTimeline from './OrderStatusTimeline';

const PICKUP_STATUS_LABELS = {
  pending_pickup: 'Pending Confirmation',
  pickup_confirmed: 'Pickup Confirmed',
  picked_up: 'Picked Up',
  delivery_in_progress: 'Delivery In Progress',
  delivered: 'Delivered',
};

export default function OrderTrackingCard({ order, isExpandable = true }) {
  const [isExpanded, setIsExpanded] = React.useState(!isExpandable);

  if (!order) return null;

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

          <div className="mt-8">
            <button
              onClick={() => window.location.href = `/order/${order.id}`}
              className="w-full btn-elite py-4 text-xs tracking-widest uppercase"
            >
              Need Help with this Order?
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
