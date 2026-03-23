import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../services/AuthContext';
import Loader from '../components/Loader';

export default function AuthPage() {
  const { session, profile, loading: authLoading, signIn, signUp } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading || (session && !profile)) {
    return <Loader text="Checking authentication..." />;
  }

  if (session && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signUp(email, password, { fullName, phone });
      } else {
        await signIn(email, password);
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16 animate-fade-in-up">
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 p-6 shadow-xl shadow-indigo-200/40 hover-glow">
        {/* Header */}
        <div className="mb-6">
          <p className="inline-flex items-center gap-2">
            <span className="icon-pill">🔑</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Secure Access</span>
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="mt-2 text-sm text-slate-600">{isSignup ? 'Join our community today' : 'Sign in to continue shopping'}</p>
          <p className="mt-1 text-xs font-medium text-indigo-700">Only @ves.ac.in email IDs are allowed (except configured admin email).</p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <div className="form-group">
                <label className="form-label">👤 Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">📱 Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="10-digit phone number"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">📧 Email Address</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="you@ves.ac.in"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">🔐 Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="form-input"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <ErrorMessage message={error} />

          <button
            type="submit"
            disabled={loading}
            className="btn-gradient w-full rounded-lg px-4 py-2.5 font-medium uppercase tracking-wide disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-indigo-200"></div>
                <span>Processing...</span>
              </>
            ) : (
              isSignup ? 'Create Account' : 'Login'
            )}
          </button>
        </form>

        {/* Toggle Auth Mode */}
        <div className="mt-6 border-t border-slate-200 pt-6">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-700 hover:underline underline-offset-4"
            onClick={() => setIsSignup((prev) => !prev)}
          >
            {isSignup ? '← Already have an account? Login' : '→ New user? Create account'}
          </button>
        </div>
      </div>

      {/* Social Proof Text */}
      <p className="mt-6 text-center text-xs text-slate-500">🔒 Your data is encrypted and secure</p>
    </section>
  );
}
