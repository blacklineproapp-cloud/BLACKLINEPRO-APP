'use client';

import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, PenTool, Sparkles, Package, CreditCard } from 'lucide-react';
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
      'p-3 rounded-xl transition-all flex flex-col items-center gap-1 relative',
      active
        ? 'bg-emerald-600/10 text-emerald-500'
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50',
      className
    ].filter(Boolean).join(' ')}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </Link>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar / Nav (Mobile bottom, Desktop left) */}
      <nav className="fixed bottom-0 left-0 w-full md:w-20 md:h-screen bg-zinc-900 border-t md:border-t-0 md:border-r border-zinc-800 z-50 flex md:flex-col items-center justify-around md:justify-start md:pt-8 md:gap-8">
        
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
        <NavItem
          href="/assinatura"
          active={pathname === '/assinatura'}
          icon={<CreditCard size={24} />}
          label="Assinatura"
        />

        {/* Botão Upgrade - Destacado */}
        <div className="md:mt-auto md:mb-8">
          <NavItem
            href="/pricing"
            active={pathname === '/pricing'}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            label="Upgrade"
            className="!bg-gradient-to-r !from-emerald-600 !to-emerald-500 !text-white hover:!from-emerald-500 hover:!to-emerald-400"
          />
        </div>

        {/* Mobile: User Profile Button */}
        <div className="md:hidden">
          {user && (
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10 rounded-full border-2 border-zinc-700",
                  userButtonPopoverCard: "bg-zinc-900 border border-zinc-800",
                  userButtonPopoverActionButton: "text-zinc-300 hover:text-white hover:bg-zinc-800",
                  userButtonPopoverActionButtonIcon: "text-zinc-500",
                  userButtonPopoverFooter: "hidden"
                }
              }}
            />
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="md:pl-20 min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* PWA Install Banner */}
      <InstallBanner delay={5000} />
    </div>
  );
}

