'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, PenTool, Sparkles, Package, CreditCard, Menu, X, Rocket, HelpCircle, LogIn, Key } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { InstallBanner } from '@/components/InstallBanner';
import { SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

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
        ? 'bg-indigo-600/10 text-indigo-400'
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
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full md:hidden" />
    )}
  </Link>
);

import { useTranslations } from 'next-intl';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const t = useTranslations('dashboard.nav');

  // Buscar status do usuário para saber se é pago
  useEffect(() => {
    if (!isSignedIn) return;
    fetch('/api/user/status')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setIsPaid(!!d.isSubscribed))
      .catch(() => setIsPaid(false));
  }, [isSignedIn]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await signOut({ redirectUrl: '/' });
  };

  // 🛡️ Se estiver na área de admin, não renderizar o layout do dashboard (evita toolbar duplicada)
  // Suporta tanto /admin quanto /pt/admin, /en/admin, etc.
  const isExcludedFromLayout = pathname?.startsWith('/admin') || pathname?.includes('/admin/');
  
  if (isExcludedFromLayout || pathname?.split('/').includes('admin')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-indigo-500/25">
      
      {/* 📱 Compact Mobile Menu - Popover Style */}
      {isMenuOpen && (
        <>
          {/* Backdrop invisível para fechar ao clicar fora */}
          <div className="md:hidden fixed inset-0 z-[55]" onClick={() => setIsMenuOpen(false)} />
          
          <div className="md:hidden fixed bottom-[88px] right-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/80 z-[60] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 origin-bottom-right">
            {/* Profile Section */}
            <div className="p-3 border-b border-zinc-800/50 bg-zinc-800/30 flex items-center gap-3">
               {user ? (
                 <>
                   <div className="scale-90">
                     <UserButton afterSignOutUrl="/" />
                   </div>
                   <div className="overflow-hidden">
                     <p className="text-xs font-bold text-white truncate">{user.firstName || t('user')}</p>
                     <p className="text-[10px] text-zinc-500 truncate">{t('settings')}</p>
                   </div>
                 </>
               ) : (
                 <SignInButton mode="modal">
                   <Button variant="link" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 font-bold text-sm">
                     <LogIn size={16} />
                     {t('signInCreate')}
                   </Button>
                 </SignInButton>
               )}
            </div>

            {/* Menu Links */}
            <div className="p-1.5 flex flex-col gap-0.5">
               <Link
                 href="/minha-api"
                 onClick={() => setIsMenuOpen(false)}
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
               >
                  <Key size={16} className="text-zinc-400" />
                  <span className="text-xs text-zinc-300 font-medium">{t('apiKey')}</span>
               </Link>

               <Link 
                 href="/assinatura" 
                 onClick={() => setIsMenuOpen(false)} 
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
               >
                  <CreditCard size={16} className="text-zinc-400" />
                  <span className="text-xs text-zinc-300 font-medium">{t('mySubscription')}</span>
               </Link>
               
               <Link 
                 href="/suporte" 
                 onClick={() => setIsMenuOpen(false)} 
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
               >
                  <HelpCircle size={16} className="text-zinc-400" />
                  <span className="text-xs text-zinc-300 font-medium">{t('support')}</span>
               </Link>
               
               <Link 
                 href="/pricing" 
                 onClick={() => setIsMenuOpen(false)} 
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors border border-indigo-500/15"
               >
                  <Rocket size={16} className="text-indigo-400" />
                  <span className="text-xs text-indigo-300 font-bold">{t('upgrade')}</span>
               </Link>

               {/* Divider */}
               <div className="h-px bg-zinc-800 my-1" />

               {/* Logout Button - Visível e claro */}
               <Button
                 variant="ghost"
                 onClick={handleLogout}
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-left w-full justify-start h-auto"
               >
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-xs text-red-400 font-medium">{t('logout')}</span>
               </Button>
            </div>
          </div>
        </>
      )}

      {/* Sidebar / Nav (Mobile bottom, Desktop left) */}
      <nav className="fixed bottom-0 left-0 w-full md:w-20 md:h-screen bg-zinc-900/80 backdrop-blur-xl border-t md:border-t-0 md:border-r border-zinc-800/50 z-40 flex md:flex-col items-center justify-between px-2 md:px-0 pb-safe md:pt-6 md:pb-4 md:gap-4 md:overflow-y-auto md:overflow-x-hidden">
        
        {/* Logo - Desktop only */}
        <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-xl mb-4 shadow-lg shadow-indigo-900/50 overflow-hidden">
          <Image
            src="/models/blackline-logo-oficial.png"
            alt="BlacklinePRO"
            width={48}
            height={48}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        {isPaid && (
          <NavItem
            href="/dashboard"
            active={pathname === '/dashboard'}
            icon={<LayoutGrid size={24} />}
            label={t('home')}
          />
        )}
        <NavItem
          href="/editor"
          active={pathname === '/editor'} 
          icon={<PenTool size={24} />} 
          label={t('editor')} 
        />
        <NavItem 
          href="/generator"
          active={pathname === '/generator'} 
          icon={<Sparkles size={24} />} 
          label={t('generator')} 
        />
        <NavItem
          href="/tools"
          active={pathname === '/tools'}
          icon={<Package size={24} />}
          label={t('tools')}
        />

        {/*Desktop Only Items */}
        <NavItem
          href="/suporte"
          active={pathname?.startsWith('/suporte')}
          icon={<HelpCircle size={24} />}
          label={t('support')}
          className="hidden md:flex"
        />
        <NavItem
          href="/assinatura"
          active={pathname === '/assinatura'}
          icon={<CreditCard size={24} />}
          label={t('subscription')}
          className="hidden md:flex"
        />
        <NavItem
          href="/minha-api"
          active={pathname === '/minha-api'}
          icon={<Key size={24} />}
          label={t('apiKey')}
          className="hidden md:flex"
        />

        <div className="hidden md:block md:mt-auto md:mb-8">
          <NavItem
            href="/pricing"
            active={pathname === '/pricing'}
            icon={<Rocket size={24} />}
            label={t('upgrade')}
            className="!bg-gradient-to-br !from-indigo-600 !to-indigo-500 !text-white hover:!from-indigo-500 hover:!to-indigo-400"
          />
        </div>

        {/* 🖥️ Desktop User Section - Photo + Logout / Sign In */}
        <div className="hidden md:flex md:flex-col md:items-center md:gap-3 md:mb-4">
          {user ? (
            <>
              <div className="scale-90">
                <UserButton afterSignOutUrl="/" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="rounded-xl hover:bg-red-500/10 group"
                title={t('logout')}
              >
                <svg className="w-5 h-5 text-zinc-500 group-hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Button>
            </>
          ) : (
            <SignInButton mode="modal">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-indigo-500/10 group" title={t('signIn')}>
                <LogIn size={20} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
              </Button>
            </SignInButton>
          )}
        </div>

        {/* 📱 Mobile Menu Button - THE SMART WAY */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`md:hidden p-2 md:p-3 rounded-2xl transition-all flex flex-col items-center justify-center gap-1.5 min-w-[64px] relative group ${
            isMenuOpen ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <div className={`transition-transform duration-300 ${isMenuOpen ? 'scale-110' : 'group-hover:scale-110'}`}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-tight">{t('settings').split(' ')[0]}</span>
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

