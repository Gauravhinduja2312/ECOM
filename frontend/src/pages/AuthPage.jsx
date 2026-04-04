import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../services/AuthContext';
import Loader from '../components/Loader';

function getPasswordChecks(password) {
  return {
    minLength: password.length >= 10,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password),
    noSpaces: !/\s/.test(password),
  };
}

function getPasswordStrengthLabel(passwordChecks) {
  const score = Object.values(passwordChecks).filter(Boolean).length;

  if (score <= 2) {
    return 'Weak';
  }

  if (score <= 4) {
    return 'Medium';
  }

  return 'Strong';
}

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, loading: authLoading, signIn, signUp } = useAuth();
  const [isSignup, setIsSignup] = useState(location.pathname === '/signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordChecks = getPasswordChecks(password);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordStrength = getPasswordStrengthLabel(passwordChecks);

  useEffect(() => {
    if (location.pathname === '/signup') {
      setIsSignup(true);
      return;
    }

    setIsSignup(false);
  }, [location.pathname]);

  if (authLoading || (session && !profile)) {
    return <Loader text="Checking authentication..." />;
  }

  if (session && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isSignup) {
      if (!isPasswordValid) {
        setError('Password does not meet the required security rules.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Password and confirm password do not match.');
        return;
      }
    }

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
              minLength={10}
              className="form-input"
              placeholder="Create a strong password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {isSignup && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">Password strength: {passwordStrength}</p>
                <ul className="mt-2 space-y-1">
                  <li className={passwordChecks.minLength ? 'text-emerald-700' : 'text-slate-600'}>At least 10 characters</li>
                  <li className={passwordChecks.lowercase ? 'text-emerald-700' : 'text-slate-600'}>At least 1 lowercase letter</li>
                  <li className={passwordChecks.uppercase ? 'text-emerald-700' : 'text-slate-600'}>At least 1 uppercase letter</li>
                  <li className={passwordChecks.number ? 'text-emerald-700' : 'text-slate-600'}>At least 1 number</li>
                  <li className={passwordChecks.specialChar ? 'text-emerald-700' : 'text-slate-600'}>At least 1 special character</li>
                  <li className={passwordChecks.noSpaces ? 'text-emerald-700' : 'text-slate-600'}>No spaces</li>
                </ul>
              </div>
            )}
          </div>

          {isSignup && (
            <div className="form-group">
              <label className="form-label">🔐 Confirm Password</label>
              <input
                type="password"
                required
                minLength={10}
                className="form-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          )}

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
            onClick={() => navigate(isSignup ? '/login' : '/signup')}
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
