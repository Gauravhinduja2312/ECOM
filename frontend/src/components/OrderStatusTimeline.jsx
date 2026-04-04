import React from 'react';

const STATUS_SEQUENCE = ['order_placed', 'processing', 'ready_for_pickup', 'shipped', 'completed'];

const STATUS_CONFIG = {
  order_placed: {
    label: 'Order Placed',
    icon: '📋',
  },
  processing: {
    label: 'Processing',
    icon: '⚙️',
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    icon: '📦',
  },
  shipped: {
    label: 'Shipped',
    icon: '🚚',
  },
  completed: {
    label: 'Completed',
    icon: '✅',
  },
};

function getStatusIndex(status) {
  return STATUS_SEQUENCE.indexOf(status);
}

export default function OrderStatusTimeline({ currentStatus, statusUpdatedAt }) {
  const currentIndex = getStatusIndex(currentStatus);

  return (
    <div className="w-full py-6">
      <div className="space-y-4">
        {/* Timeline visualization */}
        <div className="flex items-center justify-between gap-2">
          {STATUS_SEQUENCE.map((status, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <React.Fragment key={status}>
                {/* Status dot */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`
                      flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold
                      ${isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                      ${isCurrent ? 'ring-2 ring-green-400 ring-offset-2' : ''}
                    `}
                  >
                    {STATUS_CONFIG[status].icon}
                  </div>
                  <div className="text-center text-xs font-medium text-gray-700">
                    {STATUS_CONFIG[status].label}
                  </div>
                </div>

                {/* Connector line */}
                {index < STATUS_SEQUENCE.length - 1 && (
                  <div
                    className={`
                      h-1 flex-1 rounded-full
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Update timestamp */}
        {statusUpdatedAt && (
          <div className="mt-4 text-center text-xs text-gray-500">
            Last updated: {new Date(statusUpdatedAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
