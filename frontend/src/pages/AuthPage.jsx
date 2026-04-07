import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../services/AuthContext';
import Loader from '../components/Loader';
import { useToast } from '../services/ToastContext';

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

  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Medium';
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
  if (!response.ok) throw new Error('Unable to verify password safety right now');

  const body = await response.text();
  const match = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${suffix}:`));

  if (!match) return 0;
  const count = Number(match.split(':')[1] || 0);
  return Number.isNaN(count) ? 0 : count;
}

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, loading: authLoading, signIn, signUp } = useAuth();
  const { addToast } = useToast();
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
    setIsSignup(location.pathname === '/signup');
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const checkBreach = async () => {
      if (!isSignup || !password || !isPasswordValid) {
        setBreachCount(0);
        setBreachError('');
        setBreachChecking(false);
        return;
      }

      setBreachChecking(true);
      setBreachError('');

      try {
        const count = await fetchPwnedCount(password);
        if (!cancelled) setBreachCount(count);
      } catch (checkError) {
        if (!cancelled) {
          setBreachError(checkError.message || 'Password safety check failed');
          setBreachCount(0);
        }
      } finally {
        if (!cancelled) setBreachChecking(false);
      }
    };

    timeoutId = window.setTimeout(checkBreach, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isSignup, password, isPasswordValid]);

  if (authLoading || (session && !profile)) return <Loader text="Loading account details..." />;
  if (session && profile) return <Navigate to={profile.role === 'admin' ? '/admin' : '/select-role'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isSignup) {
      if (!isPasswordValid) {
        setError('Password does not meet the technical requirements.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Password verification failed (no mismatch allowed).');
        return;
      }
      if (breachCount > 0) {
        setError('Password hash detected in known breaches. Protocol violation.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignup) {
        await signUp(email, password, { fullName, phone });
        addToast('Account created successfully.', 'success');
      } else {
        await signIn(email, password);
        addToast('Signed in successfully.', 'success');
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#020617] min-h-screen pt-64 pb-20 flex flex-col items-center justify-center px-4">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <section className="relative z-10 w-full max-w-xl animate-elite-reveal">
        <div className="glass-card p-10 md:p-16">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 text-3xl mb-6 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
              {isSignup ? '🧬' : '🔐'}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase mb-4">
              {isSignup ? 'Create Account' : 'Sign In'}
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">
              {isSignup ? 'Join the campus marketplace' : 'Sign in to your account'}
            </p>
            <div className="mt-8 p-3 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-indigo-400 uppercase tracking-widest italic">
              Note: Use your @ves.ac.in email address
            </div>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {isSignup && (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Full Name</label>
                  <input
                    type="text"
                    required
                    className="elite-input"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Phone Number</label>
                  <input
                    type="tel"
                    className="elite-input"
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Email Address</label>
              <input
                type="email"
                required
                className="elite-input"
                placeholder="name@ves.ac.in"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={10}
                  className="elite-input pr-20"
                  placeholder="At least 10 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {isSignup && (
                <div className="mt-4 p-5 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Strength: <span className={`ml-2 ${passwordStrength === 'Strong' ? 'text-emerald-400' : 'text-amber-400'}`}>{passwordStrength}</span></p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      { key: 'minLength', label: '10+ Chars' },
                      { key: 'lowercase', label: 'Lowercase' },
                      { key: 'uppercase', label: 'Uppercase' },
                      { key: 'number', label: 'Number' },
                      { key: 'specialChar', label: 'Special' },
                      { key: 'noSpaces', label: 'No Spaces' },
                    ].map((check) => (
                      <div key={check.key} className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${passwordChecks[check.key] ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`}></div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${passwordChecks[check.key] ? 'text-white' : 'text-slate-600'}`}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {breachChecking && <p className="mt-4 text-[9px] font-bold text-indigo-400 animate-pulse uppercase tracking-widest">Checking password safety...</p>}
                  {!breachChecking && breachCount > 0 && <p className="mt-4 text-[9px] font-black text-rose-500 uppercase tracking-widest">Safety Warning: {breachCount} known breaches</p>}
                </div>
              )}
            </div>

            {isSignup && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Verify Access Code</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={10}
                    className="elite-input pr-20"
                    placeholder="Enter password again"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest"
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
              className="btn-elite w-full py-5 text-[10px] tracking-[0.25em]"
            >
              {loading ? 'Working...' : isSignup ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <button
              type="button"
              className="text-[10px] font-black text-slate-500 hover:text-white transition uppercase tracking-[0.2em]"
              onClick={() => navigate(isSignup ? '/login' : '/signup')}
            >
              {isSignup ? '← Back to login' : '→ Create a new account'}
            </button>
          </div>
        </div>
        
        <p className="mt-8 text-center text-[9px] font-black text-slate-600 uppercase tracking-widest opacity-50">
          🔐 Secure Campus Marketplace v3.04
        </p>
      </section>
    </div>
  );
}

