import React from 'react';

const STATUS_SEQUENCE = ['order_placed', 'processing', 'ready_for_pickup', 'shipped', 'completed'];

const STATUS_CONFIG = {
  order_placed: { label: 'Placed', icon: '📋', color: 'indigo' },
  processing: { label: 'Processing', icon: '⚙️', color: 'amber' },
  ready_for_pickup: { label: 'Ready', icon: '📦', color: 'emerald' },
  shipped: { label: 'Shipped', icon: '🚚', color: 'violet' },
  completed: { label: 'Delivered', icon: '✅', color: 'emerald' },
};

export default function OrderStatusTimeline({ currentStatus, statusUpdatedAt }) {
  const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);

  return (
    <div className="w-full py-8 stagger-children">
      <div className="relative flex items-center justify-between">
        {/* Background Track */}
        <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-slate-100 rounded-full"></div>
        
        {/* Progress Track */}
        <div 
          className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-indigo-500 rounded-full transition-all duration-1000 ease-in-out"
          style={{ width: `${(currentIndex / (STATUS_SEQUENCE.length - 1)) * 100}%` }}
        ></div>

        {STATUS_SEQUENCE.map((status, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const config = STATUS_CONFIG[status];

          return (
            <div key={status} className="relative flex flex-col items-center group z-10">
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-bold border-2 transition-all duration-500
                  ${isCompleted ? 'bg-white border-indigo-500 text-indigo-600 shadow-lg shadow-indigo-100 scale-110' : 'bg-slate-50 border-slate-200 text-slate-300'}
                  ${isCurrent ? 'animate-pulse ring-4 ring-indigo-500/10' : ''}
                `}
              >
                {config.icon}
              </div>
              <div className={`mt-3 text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}>
                {config.label}
              </div>
              
              {isCurrent && statusUpdatedAt && (
                <div className="absolute -bottom-10 whitespace-nowrap text-[9px] font-bold text-slate-400 uppercase italic">
                  Updated {new Date(statusUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
