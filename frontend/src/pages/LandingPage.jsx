import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../services/supabaseClient';
import ErrorMessage from '../components/ErrorMessage';

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

  return (
    <>
      <Helmet>
        <title>Student Marketplace | Affordable Student Essentials</title>
        <meta
          name="description"
          content="Buy and sell student essentials with trusted checkout and fast delivery."
        />
      </Helmet>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-slate-900 p-10 text-white">
          <h1 className="text-4xl font-bold">Student Marketplace E-Commerce Platform</h1>
          <p className="mt-4 max-w-2xl text-slate-200">
            Shop affordable books, gadgets, and supplies curated for students.
          </p>
          <a
            href="/products"
            className="mt-8 inline-block rounded-lg bg-white px-6 py-3 font-medium text-slate-900"
          >
            Start Shopping
          </a>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {['Secure payments', 'Real-time inventory', 'Fast student support'].map((feature) => (
            <div key={feature} className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">{feature}</h3>
            </div>
          ))}
        </div>

        <form onSubmit={handleLeadSubmit} className="mt-12 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900">Get campus offers</h2>
          <p className="mt-1 text-sm text-slate-600">Join our mailing list for launch discounts.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-white">
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
