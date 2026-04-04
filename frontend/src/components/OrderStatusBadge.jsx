import React from 'react';

const STATUS_CONFIG = {
  order_placed: {
    label: 'Order Placed',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-500',
    icon: '📋',
  },
  processing: {
    label: 'Processing',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    dotColor: 'bg-yellow-500',
    icon: '⚙️',
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    dotColor: 'bg-purple-500',
    icon: '📦',
  },
  shipped: {
    label: 'Shipped',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    dotColor: 'bg-indigo-500',
    icon: '🚚',
  },
  completed: {
    label: 'Completed',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    dotColor: 'bg-green-500',
    icon: '✅',
  },
};

export default function OrderStatusBadge({ status, showIcon = true }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.order_placed;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${config.bgColor} ${config.textColor}`}>
      {showIcon && <span className="text-base">{config.icon}</span>}
      {config.label}
    </span>
  );
}
