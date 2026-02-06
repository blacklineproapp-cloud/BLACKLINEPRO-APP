'use client';

import { redirect } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, Gift, Zap, HelpCircle, LayoutGrid, Menu, X, CreditCard, Image as ImageIcon, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

// Carregar UserButton apenas no cliente
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verificar se é admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/admin/metrics');
        setIsAdmin(res.ok);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, []);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await signOut({ redirectUrl: '/' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {/* 📱 Mobile Menu - Expanded Drawer */}
      {isMenuOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-[55]" onClick={() => setIsMenuOpen(false)} />
          
          <div className="md:hidden fixed bottom-[88px] right-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/80 z-[60] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 origin-bottom-right">
            <div className="p-3 border-b border-zinc-800/50 bg-zinc-800/30 flex items-center gap-3">
               {user && (
                 <div className="scale-90">
                   <UserButton afterSignOutUrl="/" />
                 </div>
               )}
               <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{user?.firstName || 'Admin'}</p>
                  <p className="text-[10px] text-zinc-500 truncate">Administrador</p>
               </div>
            </div>

            <div className="p-1.5 flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto">
               <Link 
                 href="/dashboard" 
                 onClick={() => setIsMenuOpen(false)} 
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
               >
                  <LayoutGrid size={16} className="text-zinc-400" />
                  <span className="text-xs text-zinc-300 font-medium">Meu Dashboard</span>
               </Link>

               <div className="h-px bg-zinc-800 my-1" />

               {/* Mobile Only Menu Items */}
               <Link 
                 href="/admin/courtesy" 
                 onClick={() => setIsMenuOpen(false)} 
                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${pathname?.startsWith('/admin/courtesy') ? 'bg-emerald-900/20 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
               >
                  <Gift size={16} className={pathname?.startsWith('/admin/courtesy') ? 'text-emerald-500' : 'text-zinc-400'} />
                  <span className="text-xs font-medium">Cortesia</span>
               </Link>

               <Link 
                 href="/admin/audit" 
                 onClick={() => setIsMenuOpen(false)} 
                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${pathname?.startsWith('/admin/audit') ? 'bg-emerald-900/20 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
               >
                  <Shield size={16} className={pathname?.startsWith('/admin/audit') ? 'text-emerald-500' : 'text-zinc-400'} />
                  <span className="text-xs font-medium">Auditoria</span>
               </Link>

               <Link 
                 href="/admin/generations" 
                 onClick={() => setIsMenuOpen(false)} 
                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${pathname?.startsWith('/admin/generations') ? 'bg-emerald-900/20 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
               >
                  <ImageIcon size={16} className={pathname?.startsWith('/admin/generations') ? 'text-emerald-500' : 'text-zinc-400'} />
                  <span className="text-xs font-medium">Galeria</span>
               </Link>

               <Link 
                 href="/admin/settings" 
                 onClick={() => setIsMenuOpen(false)} 
                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${pathname?.startsWith('/admin/settings') ? 'bg-emerald-900/20 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
               >
                  <Settings size={16} className={pathname?.startsWith('/admin/settings') ? 'text-emerald-500' : 'text-zinc-400'} />
                  <span className="text-xs font-medium">Configurações</span>
               </Link>

               <Link 
                 href="/admin/suporte" 
                 onClick={() => setIsMenuOpen(false)} 
                 className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${pathname?.startsWith('/admin/suporte') ? 'bg-emerald-900/20 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
               >
                  <HelpCircle size={16} className={pathname?.startsWith('/admin/suporte') ? 'text-emerald-500' : 'text-zinc-400'} />
                  <span className="text-xs font-medium">Suporte</span>
               </Link>

               <div className="h-px bg-zinc-800 my-1" />

               <button
                 onClick={handleLogout}
                 className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors text-left w-full"
               >
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-xs text-red-400 font-medium">Sair da Conta</span>
               </button>
            </div>
          </div>
        </>
      )}

      {/* Sidebar / Nav */}
      <nav className="fixed bottom-0 left-0 w-full md:w-20 md:h-screen bg-zinc-900/80 backdrop-blur-xl border-t md:border-t-0 md:border-r border-zinc-800/50 z-50 flex md:flex-col items-center justify-around md:justify-start px-2 md:px-0 pb-safe md:pt-10 md:gap-2">
        
        {/* Logo - Desktop only */}
        <div className="hidden md:flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl mb-4 shadow-lg shadow-purple-900/50">
          <Shield size={28} className="text-white" />
        </div>

        {/* MOBILE: Only show Home, Users, Finance, Menu */}
        <NavItem 
          href="/admin"
          active={pathname === '/admin'} 
          icon={<LayoutGrid size={24} />} 
          label="Home" 
        />
        <NavItem 
          href="/admin/users"
          active={pathname?.startsWith('/admin/users')} 
          icon={<Users size={24} />} 
          label="Usuários" 
        />
        <NavItem
          href="/admin/finance"
          active={pathname?.startsWith('/admin/finance')}
          icon={<CreditCard size={24} />}
          label="Financeiro"
        />

        {/* Desktop Only Items - Hidden on Mobile */}
        <NavItem 
          href="/admin/courtesy"
          active={pathname?.startsWith('/admin/courtesy')} 
          icon={<Gift size={24} />} 
          label="Cortesia"
          className="hidden md:flex"
        />
        <NavItem
          href="/admin/audit"
          active={pathname?.startsWith('/admin/audit')}
          icon={<Shield size={24} />}
          label="Auditoria"
          className="hidden md:flex"
        />
        <NavItem
          href="/admin/generations"
          active={pathname?.startsWith('/admin/generations')}
          icon={<ImageIcon size={24} />}
          label="Galeria"
          className="hidden md:flex"
        />
        <NavItem
          href="/admin/settings"
          active={pathname?.startsWith('/admin/settings')}
          icon={<Settings size={24} />}
          label="Config"
          className="hidden md:flex"
        />
        <NavItem
          href="/admin/suporte"
          active={pathname?.startsWith('/admin/suporte')}
          icon={<HelpCircle size={24} />}
          label="Suporte"
          className="hidden md:flex"
        />

        {/* Desktop User Section */}
        <div className="hidden md:flex md:flex-col md:items-center md:gap-3 md:mb-4 md:mt-auto">
          {user && (
            <div className="scale-90">
              <UserButton afterSignOutUrl="/" />
            </div>
          )}

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-red-500/10 transition-colors group"
            title="Sair da Conta"
          >
            <svg className="w-5 h-5 text-zinc-500 group-hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu Button */}
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
    </div>
  );
}
