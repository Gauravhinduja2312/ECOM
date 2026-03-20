import { Link } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { useCart } from '../services/CartContext';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const { items } = useCart();

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-bold text-slate-900">
          Student Marketplace
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link to="/products" className="text-slate-700 hover:text-slate-900">
            Products
          </Link>
          <Link to="/cart" className="text-slate-700 hover:text-slate-900">
            Cart ({items.length})
          </Link>
          {profile?.role === 'admin' ? (
            <Link to="/admin" className="text-slate-700 hover:text-slate-900">
              Admin
            </Link>
          ) : profile ? (
            <Link to="/dashboard" className="text-slate-700 hover:text-slate-900">
              Dashboard
            </Link>
          ) : null}
          {!profile ? (
            <Link to="/auth" className="rounded-md bg-slate-900 px-3 py-2 text-white">
              Login
            </Link>
          ) : (
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-800"
              onClick={signOut}
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
