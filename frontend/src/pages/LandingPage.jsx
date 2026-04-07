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

  return (
    <>
      <Helmet>
        <title>Student Marketplace | Elite Campus Commerce</title>
        <meta name="description" content="The premier destination for campus essentials, optimized for students." />
      </Helmet>

      <div className="relative overflow-hidden bg-slate-950 pb-20 pt-24 sm:pt-32">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-[30%] -left-[10%] h-[70%] w-[70%] rounded-full bg-indigo-600/20 blur-[120px] animate-float"></div>
          <div className="absolute top-[20%] -right-[10%] h-[60%] w-[60%] rounded-full bg-violet-600/10 blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center stagger-children">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Now Live at VES Institute
            </div>
            
            <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl">
              Elevate Your <span className="text-gradient">Campus Life.</span>
            </h1>
            
            <p className="mt-8 text-lg leading-8 text-slate-400 max-w-2xl mx-auto">
              The premium marketplace for student essentials. Buy quality gear from the store or sell your used items directly to us for instant earnings.
            </p>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="/products"
                onMouseEnter={preloadProductsPage}
                className="btn-elite text-lg px-8 py-4"
              >
                Enter Marketplace <span>→</span>
              </a>
              <a href="#how-it-works" className="text-sm font-bold leading-6 text-white hover:text-indigo-400 transition">
                Learn more <span aria-hidden="true">↓</span>
              </a>
            </div>

            {/* Trust Cloud */}
            <div className="mt-16 pt-16 border-t border-white/5">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-8">Trusted by Students From</p>
              <div className="flex flex-wrap justify-center gap-8 opacity-40 grayscale contrast-125">
                <span className="text-xl font-black text-white italic tracking-tighter">VESIT</span>
                <span className="text-xl font-black text-white italic tracking-tighter">VPT</span>
                <span className="text-xl font-black text-white italic tracking-tighter">VESIM</span>
                <span className="text-xl font-black text-white italic tracking-tighter">VESP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="how-it-works" className="py-24 bg-white relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover-lift group">
              <div className="icon-pill mb-6 group-hover:scale-110 transition">🛒</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Shop Essentials</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Browse a curated catalog of books, tech, and lifestyle items owned and verified by the Campus Store.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover-lift group">
              <div className="icon-pill mb-6 group-hover:scale-110 transition" style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(217, 70, 239, 0.1))', color: '#7c3aed' }}>📤</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Pitch Your Gear</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Don't wait for buyers. Pitch your used items directly to us. We buy your inventory so you get paid faster.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover-lift group">
              <div className="icon-pill mb-6 group-hover:scale-110 transition" style={{ background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.1), rgba(14, 165, 233, 0.1))', color: '#0891b2' }}>🏆</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Earn Rewards</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Every purchase earns loyalty points. Level up to Gold Tier for exclusive early access and special discounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative glass-panel rounded-[2.5rem] p-12 md:p-20 overflow-hidden border border-indigo-100 animate-glow">
            <div className="relative z-10 max-w-2xl stagger-children">
              <h2 className="text-4xl font-black text-slate-900 mb-6">Stay Ahead with <br /><span className="text-gradient">Campus Alerts.</span></h2>
              <p className="text-slate-600 mb-8">Join 1,000+ students receiving the best deals and restock alerts directly in their inbox.</p>
              
              <form onSubmit={handleLeadSubmit} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your college email"
                  className="form-input flex-1 py-4 px-6 text-lg"
                />
                <button type="submit" className="btn-elite px-10">
                  Join Waitlist
                </button>
              </form>
              <ErrorMessage message={error} />
              {status && <p className="mt-4 text-emerald-600 font-bold italic">{status}</p>}
            </div>
            
            <div className="hidden lg:block absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-50 to-transparent"></div>
          </div>
        </div>
      </section>
    </>
  );
}
