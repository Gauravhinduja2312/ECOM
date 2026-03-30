import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { useCart } from '../services/CartContext';
import {
  preloadAddProductPage,
  preloadAdminDashboardPage,
  preloadAuthPage,
  preloadCartPage,
  preloadProductsPage,
  preloadSellProductPage,
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
    <header className="animate-fade-in sticky top-0 z-30 border-b border-indigo-100 bg-gradient-to-r from-white via-indigo-50/50 to-white backdrop-blur-md shadow-sm">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:py-4">
        {/* Brand */}
        <Link to="/" className="group inline-flex items-center gap-2 hover-lift">
          <div className="rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-1.5 text-white font-black text-sm shadow-lg group-hover:shadow-indigo-300/50 transition">
            SM
          </div>
          <span className="hidden text-lg font-black tracking-tight text-slate-900 sm:inline">Student Marketplace</span>
          <span className="inline text-lg font-black tracking-tighter text-slate-900 sm:hidden">SM</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex w-full flex-wrap items-center justify-end gap-1 text-xs font-medium sm:w-auto sm:gap-2 sm:text-sm">
          <Link
            to="/products"
            onMouseEnter={preloadProductsPage}
            onFocus={preloadProductsPage}
            onTouchStart={preloadProductsPage}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-slate-700 transition hover:bg-indigo-100/60 hover:text-indigo-900 hover-lift sm:px-3"
          >
            <span>🛍️</span>
            <span className="hidden sm:inline">Products</span>
          </Link>

          <Link
            to="/cart"
            onMouseEnter={preloadCartPage}
            onFocus={preloadCartPage}
            onTouchStart={preloadCartPage}
            className="group relative inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-slate-700 transition hover:bg-indigo-100/60 hover:text-indigo-900 hover-lift sm:px-3"
          >
            <span>🛒</span>
            <span className="hidden sm:inline">Cart</span>
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold shadow-lg">
                {items.length > 99 ? '99+' : items.length}
              </span>
            )}
          </Link>

          {profile?.role === 'admin' ? (
            <Link
              to="/admin"
              onMouseEnter={() => Promise.allSettled([preloadAdminDashboardPage(), preloadAddProductPage()])}
              onFocus={() => Promise.allSettled([preloadAdminDashboardPage(), preloadAddProductPage()])}
              onTouchStart={() => Promise.allSettled([preloadAdminDashboardPage(), preloadAddProductPage()])}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-slate-700 transition hover:bg-amber-100/60 hover:text-amber-900 hover-lift sm:px-3"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Admin</span>
            </Link>
          ) : profile ? (
            <>
              <Link
                to="/sell"
                onMouseEnter={preloadSellProductPage}
                onFocus={preloadSellProductPage}
                onTouchStart={preloadSellProductPage}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-slate-700 transition hover:bg-violet-100/60 hover:text-violet-900 hover-lift sm:px-3"
              >
                <span>📤</span>
                <span className="hidden sm:inline">Sell</span>
              </Link>
              <Link
                to="/dashboard"
                onMouseEnter={preloadUserDashboardPage}
                onFocus={preloadUserDashboardPage}
                onTouchStart={preloadUserDashboardPage}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-slate-700 transition hover:bg-green-100/60 hover:text-green-900 hover-lift sm:px-3"
              >
                <span>👤</span>
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </>
          ) : null}

          {/* Auth Button */}
          {!profile ? (
            <Link
              to="/login"
              onMouseEnter={preloadAuthPage}
              onFocus={preloadAuthPage}
              onTouchStart={preloadAuthPage}
              className="btn-gradient px-3 py-2 sm:px-4"
            >
              <span>🔐</span>
              <span className="hidden sm:inline">Login</span>
            </Link>
          ) : (
            <button
              type="button"
              className="btn-gradient-secondary px-3 py-2 sm:px-4"
              onClick={handleLogout}
            >
              <span>↪</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
