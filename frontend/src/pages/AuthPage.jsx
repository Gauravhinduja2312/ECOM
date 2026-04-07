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

async function sha1Hex(text) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-1', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

async function fetchPwnedCount(password) {
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);

  if (!response.ok) {
    throw new Error('Unable to verify password safety right now');
  }

  const body = await response.text();
  const match = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${suffix}:`));

  if (!match) {
    return 0;
  }

  const count = Number(match.split(':')[1] || 0);
  return Number.isNaN(count) ? 0 : count;
}

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, loading: authLoading, signIn, signUp } = useAuth();
  const [isSignup, setIsSignup] = useState(location.pathname === '/signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [breachChecking, setBreachChecking] = useState(false);
  const [breachCount, setBreachCount] = useState(0);
  const [breachError, setBreachError] = useState('');
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

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const checkBreach = async () => {
      if (!isSignup || !password) {
        setBreachCount(0);
        setBreachError('');
        setBreachChecking(false);
        return;
      }

      if (!isPasswordValid) {
        setBreachCount(0);
        setBreachError('');
        setBreachChecking(false);
        return;
      }

      setBreachChecking(true);
      setBreachError('');

      try {
        const count = await fetchPwnedCount(password);
        if (!cancelled) {
          setBreachCount(count);
        }
      } catch (checkError) {
        if (!cancelled) {
          setBreachError(checkError.message || 'Password safety check failed');
          setBreachCount(0);
        }
      } finally {
        if (!cancelled) {
          setBreachChecking(false);
        }
      }
    };

    timeoutId = window.setTimeout(checkBreach, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isSignup, password, isPasswordValid]);

  if (authLoading || (session && !profile)) {
    return <Loader text="Checking authentication..." />;
  }

  if (session && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/select-role'} replace />;
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

      if (breachCount > 0) {
        setError('This password appears in known breaches. Please choose a different password.');
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={10}
                className="form-input pr-24"
                placeholder="Create a strong password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
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
                {breachChecking && (
                  <p className="mt-2 text-slate-600">Checking breach database...</p>
                )}
                {!breachChecking && breachCount > 0 && (
                  <p className="mt-2 font-semibold text-rose-700">This password appears in known breaches ({breachCount} times).</p>
                )}
                {!breachChecking && !breachError && password && isPasswordValid && breachCount === 0 && (
                  <p className="mt-2 font-semibold text-emerald-700">No breach exposure found for this password hash.</p>
                )}
                {!breachChecking && breachError && (
                  <p className="mt-2 text-amber-700">{breachError}</p>
                )}
              </div>
            )}
          </div>

          {isSignup && (
            <div className="form-group">
              <label className="form-label">🔐 Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={10}
                  className="form-input pr-24"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
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
