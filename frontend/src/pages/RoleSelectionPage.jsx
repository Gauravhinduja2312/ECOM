import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleSelect = (path) => {
    navigate(path);
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-6 pt-44 pb-20 bg-[#020617]">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 -z-10 group">
        <div className="absolute top-[10%] left-[20%] h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] animate-float"></div>
        <div className="absolute bottom-[10%] right-[20%] h-96 w-96 rounded-full bg-violet-500/10 blur-[120px] animate-float" style={{ animationDelay: '3s' }}></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="max-w-5xl w-full stagger-children">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
            Elite Navigation System
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl mb-6 uppercase">
            Choose Your <br /><span className="text-gradient-elite">Marketplace Path.</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-xl mx-auto text-lg leading-relaxed uppercase tracking-tight">
            Welcome, <span className="font-black text-white italic">{profile?.email?.split('@')[0]}</span>. 
            Select your specialized workspace to continue your campus commerce journey.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {/* Buyer Choice Card */}
          <button
            onClick={() => handleSelect('/dashboard')}
            className="group relative flex flex-col items-start text-left glass-elite rounded-[3rem] p-10 transition-all duration-500 hover:scale-[1.02]"
          >
            <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-indigo-500/20 text-4xl shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
              🛒
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Shop & Discover</h2>
            <p className="text-slate-400 font-medium mb-12 leading-relaxed">
              Explore the premium student catalog, manage your acquisitions, and track your loyalty progress.
            </p>
            <div className="mt-auto flex items-center gap-3 text-xs font-black uppercase tracking-widest text-indigo-400 group-hover:gap-5 transition-all">
              Initialize Buyer Mode <span>→</span>
            </div>
          </button>

          {/* Seller Choice Card */}
          <button
            onClick={() => handleSelect('/seller/dashboard')}
            className="group relative flex flex-col items-start text-left glass-elite rounded-[3rem] p-10 transition-all duration-500 hover:scale-[1.02]"
          >
            <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-violet-500/20 text-4xl shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white">
              📤
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Grow & Earn</h2>
            <p className="text-slate-400 font-medium mb-12 leading-relaxed">
              Scale your earnings by pitching inventory to the Campus Store and tracking acquisition deals.
            </p>
            <div className="mt-auto flex items-center gap-3 text-xs font-black uppercase tracking-widest text-violet-400 group-hover:gap-5 transition-all">
              Launch Seller Portal <span>→</span>
            </div>
          </button>
        </div>

        {/* Platform Command (Admin Only) */}
        {profile?.role === 'admin' && (
          <button
            onClick={() => handleSelect('/admin')}
            className="mt-12 group w-full relative flex flex-wrap items-center gap-8 bg-slate-950 rounded-[2.5rem] p-8 transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl border border-white/5"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl shadow-inner group-hover:bg-emerald-500 group-hover:scale-110 transition-all duration-500">
              ⚙️
            </div>
            <div className="flex-1 min-w-[240px]">
              <h2 className="text-xl font-black text-white tracking-tighter uppercase">Platform Master Terminal</h2>
              <p className="text-slate-400 text-sm font-medium mt-1">
                Oversee the complete B2C ecosystem, manage inventory, and analyze platform liquidity.
              </p>
            </div>
            <div className="font-black text-emerald-400 text-xs uppercase tracking-[0.25em] group-hover:translate-x-2 transition-transform">
              Admin Execute <span>→</span>
            </div>
          </button>
        )}

        <footer className="mt-16 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
          Student Marketplace Elite Commerce Terminal • Safe & Encrypted
        </footer>
      </div>
    </div>
  );
}
