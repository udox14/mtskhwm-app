// Lokasi: app/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUser } from '@/utils/auth/server'
import { ArrowRight, LayoutDashboard, LogIn, Sparkles, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'MSS - Muhsin Smart System',
  description: 'Muhsin Smart System - Madrasah Management Application. Sistem Informasi Manajemen Terpadu MTs KH. A. Wahab Muhsin Sukahideng.',
}

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8FAFC] font-sans relative overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      
      {/* --- CUSTOM ANIMATIONS --- */}
      <style>{`
        @keyframes float-1 {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
          100% { transform: translateY(0px) scale(1); }
        }
        @keyframes float-2 {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(30px) scale(0.95); }
          100% { transform: translateY(0px) scale(1); }
        }
        @keyframes flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-float-1 { animation: float-1 12s ease-in-out infinite; }
        .animate-float-2 { animation: float-2 15s ease-in-out infinite; }
        .animate-gradient-flow { 
          background-size: 200% auto;
          animation: flow 5s linear infinite; 
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
      `}</style>

      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Soft Grid */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', 
          backgroundSize: '48px 48px', 
          opacity: 0.4 
        }}></div>
        
        {/* Animated Orbs */}
        <div className="absolute top-[-10%] left-[-5%] w-[60vw] h-[60vh] bg-blue-300/20 rounded-full blur-[120px] animate-float-1" />
        <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[70vh] bg-amber-300/15 rounded-full blur-[130px] animate-float-2" />
        <div className="absolute bottom-[-10%] left-[20%] w-[70vw] h-[50vh] bg-cyan-300/20 rounded-full blur-[100px] animate-float-1" style={{ animationDelay: '-5s' }} />
      </div>

      {/* --- FLOATING HEADER --- */}
      <header className="fixed top-0 w-full z-50 transition-all duration-300 mt-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto h-16 glass-panel rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between px-4 sm:px-6 border-b-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center p-1.5">
              <Image src="/logo-mss.png" alt="MSS Logo" width={40} height={40} className="w-full h-full object-contain drop-shadow-sm" priority />
            </div>
            <div className="flex flex-col justify-center hidden sm:flex">
              <span className="font-extrabold text-base tracking-tight text-slate-800 leading-none">
                MSS
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                 Management App
              </span>
            </div>
          </div>
          
          <div>
            {user ? (
               <Link href="/dashboard" className="group flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm border border-slate-200">
                <LayoutDashboard className="h-4 w-4 text-blue-600 transition-transform group-hover:scale-110" /> 
                <span className="hidden sm:inline">Buka Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Link>
            ) : (
              <Link href="/login" className="group flex items-center gap-2 bg-[#0F172A] hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> 
                <span className="hidden sm:inline">Masuk Sistem</span>
                <span className="sm:hidden">Masuk</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-32 pb-20">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-blue-100 shadow-sm text-xs font-bold text-blue-700 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
             <Sparkles className="h-4 w-4 text-amber-500" /> V2.0 Madrasah Management
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">
            Muhsin Smart System <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 animate-gradient-flow pb-2 inline-block">
              MTs KH. A. Wahab Muhsin
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl leading-relaxed mb-10 font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 ease-out">
            Sistem Informasi Manajemen Terpadu yang dirancang eksklusif untuk menyederhanakan operasional akademik dan memajukan kedisiplinan madrasah dalam satu klik.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 ease-out">
            {user ? (
              <Link href="/dashboard" className="h-14 px-8 rounded-2xl bg-[#0F172A] hover:bg-blue-600 text-white flex items-center justify-center gap-2 font-bold text-lg shadow-[0_8px_30px_rgba(15,23,42,0.2)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.3)] hover:-translate-y-1 transition-all duration-300">
                Lanjutkan ke Dashboard <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <Link href="/login" className="group h-14 px-10 rounded-2xl bg-gradient-to-r from-[#0F172A] to-slate-800 hover:from-blue-700 hover:to-blue-600 text-white flex items-center justify-center gap-2 font-bold text-lg shadow-[0_8px_30px_rgba(15,23,42,0.2)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.3)] hover:-translate-y-1 transition-all duration-300">
                Mulai Gunakan MSS <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>

          {/* Trust Value / Indicator */}
          <div className="mt-16 flex items-center justify-center gap-6 text-sm font-semibold text-slate-400 animate-in fade-in duration-1000 delay-500">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" /> SSL Terenkripsi
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>Resmi Sukahideng</span>
          </div>

        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 w-full py-8 text-center mt-auto border-t border-slate-200/50">
        <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wide">
          &copy; {new Date().getFullYear()} MSS. Hak Cipta Dilindungi <br className="sm:hidden mt-1" /> 
          <span className="hidden sm:inline"> &bull; </span>
          MTs KH. A. Wahab Muhsin Sukahideng
        </p>
      </footer>
    </div>
  )
}
