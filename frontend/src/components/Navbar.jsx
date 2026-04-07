import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { useCart } from '../services/CartContext';
import {
  preloadAddProductPage,
  preloadAdminDashboardPage,
  preloadAuthPage,
  preloadCartPage,
  preloadProductsPage,
  preloadSellerPortalPage,
  preloadUserDashboardPage,
} from '../utils/preloadRoutes';

export default function Navbar() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { items } = useCart();

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl">
      <nav className="glass-panel rounded-[2rem] border border-white/20 px-6 py-3 flex items-center justify-between shadow-2xl backdrop-blur-2xl">
        {/* Brand */}
        <Link to="/" className="group flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-all">
            SM
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-black tracking-tighter text-slate-900 uppercase">Student</span>
            <span className="block text-[10px] font-black tracking-[0.3em] text-indigo-500 uppercase -mt-1">Marketplace</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="flex items-center gap-2">
          <Link
            to="/products"
            onMouseEnter={preloadProductsPage}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition"
          >
            Explore
          </Link>

          <Link
            to="/cart"
            onMouseEnter={preloadCartPage}
            className="group relative flex items-center justify-center h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 transition"
          >
            <span className="text-lg">🛒</span>
            {items.length > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg animate-pulse">
                {items.length}
              </span>
            )}
          </Link>

          {profile ? (
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-slate-100">
              {profile.role === 'admin' ? (
                <Link
                  to="/admin"
                  onMouseEnter={() => Promise.allSettled([preloadAdminDashboardPage(), preloadAddProductPage()])}
                  className="hidden sm:flex btn-elite px-4 py-2 text-[10px]"
                >
                  Workspace
                </Link>
              ) : (
                <>
                  <Link
                    to="/select-role"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-200 transition"
                    title="Switch Mode"
                  >
                    <span>🔄</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    onMouseEnter={preloadUserDashboardPage}
                    className="group flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition"
                  >
                    <div className="hidden lg:block text-right">
                      <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Member</p>
                      <p className="text-[11px] font-bold text-slate-900 -mt-0.5">{profile.email?.split('@')[0]}</p>
                    </div>
                    <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-sm group-hover:scale-110 transition">
                      {profile.loyalty_tier === 'gold' ? '💎' : profile.loyalty_tier === 'silver' ? '🥈' : '👤'}
                    </div>
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
              >
                <span>↪</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onMouseEnter={preloadAuthPage}
              className="btn-elite px-6 py-2.5 text-[10px]"
            >
              Initialize Identity
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
