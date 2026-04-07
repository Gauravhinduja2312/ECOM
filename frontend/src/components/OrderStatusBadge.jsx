import React from 'react';

const STATUS_CONFIG = {
  order_placed: {
    label: 'Order Placed',
    style: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]',
    icon: '📋',
  },
  processing: {
    label: 'Processing',
    style: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.5)]',
    icon: '⚙️',
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.5)]',
    icon: '📦',
  },
  shipped: {
    label: 'Shipped',
    style: 'bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-[0_0_15px_-5px_rgba(124,58,237,0.5)]',
    icon: '🚚',
  },
  completed: {
    label: 'Completed',
    style: 'bg-emerald-500 text-white border-emerald-600 shadow-[0_0_15px_-2px_rgba(16,185,129,0.4)]',
    icon: '✅',
  },
};

export default function OrderStatusBadge({ status, showIcon = true }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.order_placed;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest backdrop-blur-md transition-all hover:scale-105 ${config.style}`}>
      {showIcon && <span className="text-sm">{config.icon}</span>}
      {config.label}
    </span>
  );
}
