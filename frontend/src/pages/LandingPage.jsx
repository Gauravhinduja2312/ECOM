import { Link } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function LandingPage() {
  const { profile } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617]">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '4s' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>


      <main className="primary-container pt-80 pb-20 relative z-10">
        <section className="text-center stagger-standard">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-8">
            The Best Campus Marketplace
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] mb-10">
            <span className="text-gradient-primary">THE HUB FOR</span> <br />
            <span className="text-accent-primary">CAMPUS SHOPPING.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-16">
            The easiest way to buy and sell with other students. <br />
            List your items, track orders, and earn money.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/products" className="btn-primary py-5 px-12 group">
              Start Shopping 
              <span className="ml-3 transition-transform group-hover:translate-x-2">→</span>
            </Link>
            <Link to="/select-role" className="px-10 py-5 rounded-xl border border-white/10 hover:bg-white/5 transition font-black text-xs uppercase tracking-widest">
              Sell Items
            </Link>
          </div>
        </section>

        {/* Hero Bento Feature Section */}
        <section className="mt-40 grid gap-8 lg:grid-cols-12 stagger-standard">
          <div className="lg:col-span-8 glass-card p-12">
            <div className="mb-8 h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl">🏛️</div>
            <h3 className="text-4xl font-black text-white mb-6 tracking-tighter uppercase">Trusted Campus Hub</h3>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
              Buy and sell with fellow students you can trust. 
              Secure payments, verified users, and a safe campus community.
            </p>
          </div>
          <div className="lg:col-span-4 glass-card p-12 overflow-hidden flex flex-col justify-end group">
            <div className="absolute top-0 right-0 p-8 text-8xl opacity-10 group-hover:scale-125 transition-transform duration-700">💎</div>
            <h3 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">VIP Rewards</h3>
            <p className="text-slate-400 text-sm font-medium">Earn points for every sale and reach the Gold tier for more benefits.</p>
          </div>

          <div className="lg:col-span-4 glass-card p-12">
            <h3 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase">Safe & Secure</h3>
            <p className="text-slate-400 text-sm font-medium">Every deal is protected and payments are handled securely by the platform.</p>
          </div>
          <div className="lg:col-span-8 glass-primary p-12 flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Fast & Easy</h3>
              <p className="text-slate-400 text-sm font-medium">Buying and selling items has never been quicker.</p>
            </div>
            <div className="hidden sm:flex gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 w-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-xl animate-float-standard" style={{ animationDelay: `${i * 1.5}s` }}>
                  🚀
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-40 border-t border-white/5 pt-20 flex flex-wrap justify-between items-center gap-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-md">SM</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white">Student Marketplace</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Your Campus Hub</p>
            </div>
          </div>
          <div className="flex gap-10 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
            <a href="#" className="hover:text-white transition">Help</a>
            <a href="#" className="hover:text-white transition">Support</a>
            <a href="#" className="hover:text-white transition">Login</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
