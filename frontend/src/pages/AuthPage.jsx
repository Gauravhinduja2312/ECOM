import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../services/AuthContext';

export default function AuthPage() {
  const { profile, session, signIn, signUp } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signUp(email, password);
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
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-900">{isSignup ? 'Create account' : 'Login'}</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <ErrorMessage message={error} />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-white"
          >
            {loading ? 'Please wait...' : isSignup ? 'Sign up' : 'Login'}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm text-slate-700 underline"
          onClick={() => setIsSignup((prev) => !prev)}
        >
          {isSignup ? 'Already have an account? Login' : 'New user? Create account'}
        </button>
      </div>
    </section>
  );
}
