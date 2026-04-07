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
    <header className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-6xl animate-elite-reveal">
      <nav className="bg-slate-950/80 backdrop-blur-2xl rounded-3xl px-8 py-4 flex items-center justify-between border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-4 transition-all hover:scale-105">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)] group-hover:rotate-12 transition-transform">
            SM
          </div>
          <div className="hidden lg:block">
            <span className="text-sm font-black tracking-widest text-white uppercase italic">Campus Shop</span>
          </div>
        </Link>

        {/* Menu */}
        <div className="flex items-center gap-2">
          <Link
            to="/products"
            onMouseEnter={preloadProductsPage}
            className="hidden md:flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-white transition group"
          >
            Shop <span className="text-indigo-500 transition-transform group-hover:translate-x-1">→</span>
          </Link>

          <Link
            to="/cart"
            onMouseEnter={preloadCartPage}
            className="group relative flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition shadow-inner"
          >
            <span className="text-lg">🛒</span>
            {items.length > 0 && (
              <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-indigo-600 text-[9px] font-black flex items-center justify-center text-white shadow-lg animate-pulse">
                {items.length}
              </span>
            )}
          </Link>

          {profile ? (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/5">
              {profile.role === 'admin' ? (
                <Link
                  to="/admin"
                  onMouseEnter={() => Promise.allSettled([preloadAdminDashboardPage(), preloadAddProductPage()])}
                  className="hidden sm:flex btn-elite px-6 py-2.5 text-[9px] tracking-[0.2em]"
                >
                  Admin
                </Link>
              ) : (
                <>
                  <Link
                    to="/select-role"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-violet-500/30 transition"
                    title="Switch Mode"
                  >
                    <span>🔄</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    onMouseEnter={preloadUserDashboardPage}
                    className="group flex items-center gap-4 pl-3 pr-2 py-1.5 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/20 transition-all hover:bg-white/[0.08]"
                  >
                    <div className="hidden lg:block text-right">
                      <p className="text-[8px] font-black text-slate-500 tracking-widest uppercase">Account</p>
                      <p className="text-[10px] font-black text-white tracking-tighter uppercase -mt-1">{profile.full_name || profile.email?.split('@')[0]}</p>
                    </div>
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-sm border-2 transition-all group-hover:scale-110 ${
                      profile.loyalty_tier === 'gold' ? 'border-amber-400 bg-amber-400/10 text-amber-400' :
                      profile.loyalty_tier === 'silver' ? 'border-slate-300 bg-slate-300/10 text-slate-300' :
                      'border-indigo-500/20 bg-indigo-500/10 text-white'
                    }`}>
                      {profile.loyalty_tier === 'gold' ? '💎' : profile.loyalty_tier === 'silver' ? '🥈' : '👤'}
                    </div>
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition group"
                title="Sign Out"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">↪</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onMouseEnter={preloadAuthPage}
              className="btn-elite px-6 py-2.5 text-[9px] tracking-[0.2em]"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
