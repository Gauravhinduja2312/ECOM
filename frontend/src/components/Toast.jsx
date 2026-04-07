import { useToast } from '../services/ToastContext';
import { useEffect, useState } from 'react';

function Toast({ toast }) {
  const { removeToast } = useToast();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 10);

    return () => clearInterval(interval);
  }, [toast.duration]);

  const typeStyles = {
    success: 'border-emerald-500/30 text-emerald-400',
    error: 'border-rose-500/30 text-rose-400',
    info: 'border-indigo-500/30 text-indigo-400',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div className={`glass-elite relative flex items-center justify-between gap-4 py-4 px-6 rounded-2xl min-w-[300px] border transform transition-all duration-500 animate-elite-reveal ${typeStyles[toast.type] || typeStyles.info}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-current/10 font-black text-sm">
          {typeIcons[toast.type] || typeIcons.info}
        </span>
        <p className="text-[10px] font-black uppercase tracking-widest text-white">{toast.message}</p>
      </div>
      <button 
        onClick={() => removeToast(toast.id)}
        className="text-slate-500 hover:text-white transition-colors"
      >
        ✕
      </button>
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all duration-100 ease-linear rounded-b-2xl" style={{ width: `${progress}%` }}></div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-10 right-10 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} />
        </div>
      ))}
    </div>
  );
}
