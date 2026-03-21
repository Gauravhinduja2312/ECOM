import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../services/supabaseClient';
import ErrorMessage from '../components/ErrorMessage';
import { preloadProductsPage } from '../utils/preloadRoutes';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    const { error: insertError } = await supabase.from('leads').insert({ email });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setStatus('Thanks! We will share student deals with you soon.');
    setEmail('');
  };

  const features = [
    { title: 'Secure payments', icon: '🔒' },
    { title: 'Real-time inventory', icon: '📦' },
    { title: 'Fast student support', icon: '⚡' },
  ];

  return (
    <>
      <Helmet>
        <title>Student Marketplace | Affordable Student Essentials</title>
        <meta
          name="description"
          content="Buy and sell student essentials with trusted checkout and fast delivery."
        />
      </Helmet>

      <section className="mx-auto max-w-6xl px-4 py-10 animate-fade-in-up sm:py-16">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6 text-white shadow-2xl shadow-indigo-200/60 hover-glow shine-overlay sm:p-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-400/30 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
          <p className="relative inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
            Student First Platform
          </p>
          <h1 className="relative mt-4 text-3xl font-black leading-tight sm:text-5xl">
            Student Marketplace E-Commerce Platform
          </h1>
          <p className="relative mt-4 max-w-2xl text-indigo-100/95">
            Discover affordable books, gadgets, and daily essentials with secure checkout and smooth delivery made for campus life.
          </p>
          <div className="relative mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
            <a
              href="/products"
              onMouseEnter={preloadProductsPage}
              onFocus={preloadProductsPage}
              onTouchStart={preloadProductsPage}
              className="btn-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold sm:px-6 sm:py-3"
            >
              <span>🛍️</span>
              Start Shopping
            </a>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
              <span>⭐</span>
              Trusted by students
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3 stagger-children">
          {features.map((feature) => (
            <div key={feature.title} className="glass-panel soft-ring rounded-2xl p-6 hover-lift hover-glow">
              <div className="icon-pill">{feature.icon}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-1 text-sm text-slate-600">Built for a smooth student shopping experience.</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleLeadSubmit} className="glass-panel soft-ring mt-10 rounded-2xl p-5 animate-fade-in-up hover-glow sm:mt-12 sm:p-6">
          <h2 className="text-gradient text-xl font-black">Get campus offers</h2>
          <p className="mt-1 text-sm text-slate-600">Join our mailing list for launch discounts.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              className="form-input w-full"
            />
            <button type="submit" className="btn-gradient rounded-lg px-5 py-2">
              Join
            </button>
          </div>
          <ErrorMessage message={error} />
          {status && <p className="mt-3 text-sm text-emerald-700">{status}</p>}
        </form>
      </section>
    </>
  );
}
