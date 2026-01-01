'use client';

import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, PenTool, Sparkles, Package, CreditCard, Menu, X, Rocket, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { InstallBanner } from '@/components/InstallBanner';

// Carregar UserButton apenas no cliente para evitar hydration mismatch
const UserButton = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.UserButton),
  { ssr: false }
);

// NavItem Component
const NavItem = ({
  href,
  active,
  icon,
  label,
  className
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) => (
  <Link
    href={href}
    className={[
      'p-2 md:p-3 rounded-2xl transition-all flex flex-col items-center justify-center gap-1.5 min-w-[64px] relative group',
      active
        ? 'bg-emerald-600/10 text-emerald-500'
        : 'text-zinc-500 hover:text-white',
      className
    ].filter(Boolean).join(' ')}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-tight transition-all ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
      {label}
    </span>
    {active && (
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full md:hidden" />
    )}
  </Link>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {/* 📱 Compact Mobile Menu - Popover Style */}
      {isMenuOpen && (
        <>
          {/* Backdrop invisível para fechar ao clicar fora */}
          <div className="md:hidden fixed inset-0 z-[55]" onClick={() => setIsMenuOpen(false)} />
          
          <div className="md:hidden fixed bottom-[88px] right-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/80 z-[60] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 origin-bottom-right">
            {/* Profile Section */}
            <div className="p-3 border-b border-zinc-800/50 bg-zinc-800/30 flex items-center gap-3">
               {user && (
                 <div className="scale-90">
                   <UserButton afterSignOutUrl="/" />
                 </div>
               )}
               <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{user?.firstName || 'Usuário'}</p>
                  <p className="text-[10px] text-zinc-500 truncate">Configurações</p>
               </div>
            </div>

            {/* Menu Links */}
            <div className="p-1.5 flex flex-col gap-0.5">
               <Link 
                 href="/assinatura" 
                 onClick={() => setIsMenuOpen(false)} 
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
               >
                  <CreditCard size={16} className="text-zinc-400" />
                  <span className="text-xs text-zinc-300 font-medium">Minha Assinatura</span>
               </Link>
               
               <Link 
                 href="/suporte" 
                 onClick={() => setIsMenuOpen(false)} 
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
               >
                  <HelpCircle size={16} className="text-zinc-400" />
                  <span className="text-xs text-zinc-300 font-medium">Suporte</span>
               </Link>
               
               <Link 
                 href="/pricing" 
                 onClick={() => setIsMenuOpen(false)} 
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-500/10"
               >
                  <Rocket size={16} className="text-emerald-500" />
                  <span className="text-xs text-emerald-400 font-bold">Fazer Upgrade</span>
               </Link>
            </div>
          </div>
        </>
      )}

      {/* Sidebar / Nav (Mobile bottom, Desktop left) */}
      <nav className="fixed bottom-0 left-0 w-full md:w-20 md:h-screen bg-zinc-900/80 backdrop-blur-xl border-t md:border-t-0 md:border-r border-zinc-800/50 z-50 flex md:flex-col items-center justify-between px-2 md:px-0 pb-safe md:pt-10 md:gap-10">
        
        {/* Logo - Desktop only */}
        <div className="hidden md:flex items-center justify-center w-12 h-12 bg-emerald-600 rounded-xl mb-4 shadow-lg shadow-emerald-900/50">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>

        <NavItem 
          href="/dashboard"
          active={pathname === '/dashboard'} 
          icon={<LayoutGrid size={24} />} 
          label="Home" 
        />
        <NavItem 
          href="/editor"
          active={pathname === '/editor'} 
          icon={<PenTool size={24} />} 
          label="Editor" 
        />
        <NavItem 
          href="/generator"
          active={pathname === '/generator'} 
          icon={<Sparkles size={24} />} 
          label="IA Gen" 
        />
        <NavItem
          href="/tools"
          active={pathname === '/tools'}
          icon={<Package size={24} />}
          label="Ferramentas"
        />

        {/*Desktop Only Items */}
        <NavItem
          href="/suporte"
          active={pathname?.startsWith('/suporte')}
          icon={<HelpCircle size={24} />}
          label="Suporte"
          className="hidden md:flex"
        />
        <NavItem
          href="/assinatura"
          active={pathname === '/assinatura'}
          icon={<CreditCard size={24} />}
          label="Assinatura"
          className="hidden md:flex"
        />

        <div className="hidden md:block md:mt-auto md:mb-8">
          <NavItem
            href="/pricing"
            active={pathname === '/pricing'}
            icon={<Rocket size={24} />}
            label="Upgrade"
            className="!bg-gradient-to-r !from-emerald-600 !to-emerald-500 !text-white hover:!from-emerald-500 hover:!to-emerald-400"
          />
        </div>

        {/* 📱 Mobile Menu Button - THE SMART WAY */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`md:hidden p-2 md:p-3 rounded-2xl transition-all flex flex-col items-center justify-center gap-1.5 min-w-[64px] relative group ${
            isMenuOpen ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <div className={`transition-transform duration-300 ${isMenuOpen ? 'scale-110' : 'group-hover:scale-110'}`}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-tight">Menu</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="md:pl-20 min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      <InstallBanner delay={5000} />
    </div>
  );
}

