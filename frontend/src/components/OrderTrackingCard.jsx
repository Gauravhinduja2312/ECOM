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

  if (!order) {
    return null;
  }

  const pickupDateTime = order.pickup_time ? new Date(order.pickup_time).toLocaleString() : 'Not scheduled';
  const pickupStatus = order.logistics?.status || null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm hover-lift hover-glow">
      {/* Order Header */}
      <div
        className="cursor-pointer px-6 py-4"
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Order #{order.id}</h3>
              <OrderStatusBadge status={order.status} showIcon={true} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-700">{formatCurrency(order.total_price)}</p>
            {isExpandable && (
              <p className="text-sm text-slate-500 mt-2">
                {isExpanded ? '▼ Hide details' : '▶ Show details'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 px-6 py-4 space-y-6">
          {/* Status Timeline */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-slate-700">Order Progress</h4>
            <OrderStatusTimeline currentStatus={order.status} statusUpdatedAt={order.status_updated_at} />
          </div>

          {/* Pickup Details */}
          <div className="rounded-lg bg-slate-50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Pickup Information</h4>
            <div className="space-y-2 text-sm text-slate-600">
              <div>
                <span className="font-medium text-slate-700">Location:</span>
                <p className="mt-1 text-slate-600">{order.pickup_location || 'TBD'}</p>
              </div>
              <div>
                <span className="font-medium text-slate-700">Pickup Time:</span>
                <p className="mt-1 text-slate-600">{pickupDateTime}</p>
              </div>
              <div>
                <span className="font-medium text-slate-700">Pickup Status:</span>
                <p className="mt-1 text-slate-600">
                  {pickupStatus ? PICKUP_STATUS_LABELS[pickupStatus] || pickupStatus : 'Not updated yet'}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items Summary */}
          {order.items && order.items.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-700">Items Ordered</h4>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{item.product_name}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(Number(item.price) * Number(item.quantity))}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Actions */}
          <div className="flex gap-3">
            <button
              className="flex-1 rounded-lg bg-indigo-600 text-white py-2 px-4 text-sm font-medium hover:bg-indigo-700 transition-colors"
              onClick={() => {
                // Navigate to order details
                window.location.href = `/order/${order.id}`;
              }}
            >
              View Full Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
