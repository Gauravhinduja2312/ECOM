import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleSelect = (path) => {
    navigate(path);
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-20 flex flex-col items-center animate-fade-in-up">
      <div className="text-center mb-12">
        <p className="inline-flex items-center gap-2 mb-4">
          <span className="icon-pill">🎯</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Select Mode</span>
        </p>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Choose Your <span className="text-gradient">Marketplace Path</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl">
          Welcome, <span className="font-bold text-slate-900">{profile?.email?.split('@')[0]}</span>. 
          How would you like to use the Student Marketplace today?
        </p>
      </div>

      <div className="grid gap-6 w-full sm:grid-cols-2 stagger-children">
        {/* Buyer Card */}
        <button
          onClick={() => handleSelect('/dashboard')}
          className="group relative flex flex-col items-center text-center glass-panel soft-ring rounded-3xl p-8 transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-indigo-400/50"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100 text-4xl shadow-inner transition-transform group-hover:scale-110">
            🛒
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Shop & Discover</h2>
          <p className="text-slate-600 mb-6">
            Browse campus essentials, track your orders, and manage your student loyalty rewards.
          </p>
          <div className="mt-auto inline-flex items-center gap-2 font-bold text-indigo-600 group-hover:text-indigo-700">
            Enter Buyer Mode <span>→</span>
          </div>
          <div className="absolute inset-0 rounded-3xl bg-indigo-600/0 transition-colors group-hover:bg-indigo-600/5 -z-10"></div>
        </button>

        {/* Seller Card */}
        <button
          onClick={() => handleSelect('/seller/dashboard')}
          className="group relative flex flex-col items-center text-center glass-panel soft-ring rounded-3xl p-8 transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-violet-400/50"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-100 text-4xl shadow-inner transition-transform group-hover:scale-110">
            📤
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Grow & Earn</h2>
          <p className="text-slate-600 mb-6">
            Pitch your products to the Campus Store and earn money by selling used items directly to us.
          </p>
          <div className="mt-auto inline-flex items-center gap-2 font-bold text-violet-600 group-hover:text-violet-700">
            Enter Seller Mode <span>→</span>
          </div>
          <div className="absolute inset-0 rounded-3xl bg-violet-600/0 transition-colors group-hover:bg-violet-600/5 -z-10"></div>
        </button>

        {/* Admin Card (Conditional) */}
        {profile?.role === 'admin' && (
          <button
            onClick={() => handleSelect('/admin')}
            className="sm:col-span-2 group relative flex items-center gap-6 glass-panel soft-ring rounded-3xl p-6 transition-all hover:scale-[1.01] hover:shadow-xl hover:border-emerald-400/50 text-left w-full"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl shadow-inner">
              ⚙️
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Platform Workspace</h2>
              <p className="text-slate-600 text-sm">
                Control center for inventory acquisition, revenue analytics, and order fulfillment.
              </p>
            </div>
            <div className="ml-auto font-bold text-emerald-600">
              Admin Access <span>→</span>
            </div>
          </button>
        )}
      </div>

      <p className="mt-12 text-sm text-slate-500 italic">
        Tip: You can always switch between modes from your profile menu.
      </p>
    </section>
  );
}
