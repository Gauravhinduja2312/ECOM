import { Link } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function LandingPage() {
  const { profile } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Vanguard Ambience Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '4s' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <nav className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl">
        <div className="glass-card px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-xs">SM</div>
            <span className="text-sm font-black tracking-widest uppercase text-white">Vanguard</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/products" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition">Catalog</Link>
            {profile ? (
              <Link to="/select-role" className="btn-vanguard py-2 px-6 text-[9px]">Workspace</Link>
            ) : (
              <Link to="/login" className="btn-vanguard py-2 px-6 text-[9px]">Identity</Link>
            )}
          </div>
        </div>
      </nav>

      <main className="van-container pt-40 pb-20 relative z-10">
        <section className="text-center stagger-van">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-8">
            The World's Elite Student Commerce
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.8] mb-10">
            <span className="text-gradient-van">DESIGNED FOR</span> <br />
            <span className="text-accent-van">THE CAMPUS ELITE.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-16">
            A hyper-professional acquisition engine for the university ecosystem. <br />
            Pitch inventory, track logistics, and scale your student earnings.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/products" className="btn-vanguard py-5 px-12 group">
              Initialize Access 
              <span className="ml-3 transition-transform group-hover:translate-x-2">→</span>
            </Link>
            <Link to="/select-role" className="px-10 py-5 rounded-xl border border-white/10 hover:bg-white/5 transition font-black text-xs uppercase tracking-widest">
              Portal Overview
            </Link>
          </div>
        </section>

        {/* Hero Bento Feature Section */}
        <section className="mt-40 grid gap-8 lg:grid-cols-12 stagger-van">
          <div className="lg:col-span-8 glass-card p-12">
            <div className="mb-8 h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl">🏛️</div>
            <h3 className="text-4xl font-black text-white mb-6 tracking-tighter uppercase">Direct Institutional Hub</h3>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
              We've partnered with major campus councils to create a centralized, high-liquidity marketplace. 
              Secure transactions, verified logistics, and instant institutional trust.
            </p>
          </div>
          <div className="lg:col-span-4 glass-card p-12 overflow-hidden flex flex-col justify-end group">
            <div className="absolute top-0 right-0 p-8 text-8xl opacity-10 group-hover:scale-125 transition-transform duration-700">💎</div>
            <h3 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Prestige Rewards</h3>
            <p className="text-slate-400 text-sm font-medium">Earn point multipliers for every verified sale and climb to the Gold Elite tier.</p>
          </div>

          <div className="lg:col-span-4 glass-card p-12">
            <h3 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase">0% Seller Risk</h3>
            <p className="text-slate-400 text-sm font-medium">Platform-backed security ensures every acquisition deal is protected and paid instantly.</p>
          </div>
          <div className="lg:col-span-8 glass-card p-12 flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">99.9% Fluidity</h3>
              <p className="text-slate-400 text-sm font-medium">The fastest inventory acquisition engine on campus.</p>
            </div>
            <div className="hidden sm:flex gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 w-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-xl animate-float-van" style={{ animationDelay: `${i * 1.5}s` }}>
                  🚀
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-40 border-t border-white/5 pt-20 flex flex-wrap justify-between items-center gap-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-md">S</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white">Student Marketplace</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Vanguard Terminal v3.0</p>
            </div>
          </div>
          <div className="flex gap-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
            <a href="#" className="hover:text-white transition">Protocol</a>
            <a href="#" className="hover:text-white transition">Network</a>
            <a href="#" className="hover:text-white transition">Auth</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
