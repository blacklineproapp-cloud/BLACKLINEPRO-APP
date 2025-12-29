'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Componentes da landing
import HeroSection from '@/components/landing/HeroSection';
import StatsSection from '@/components/landing/StatsSection';
import FeaturesShowcase from '@/components/landing/FeaturesShowcase';
import ComparisonTable from '@/components/landing/ComparisonTable';
import HowItWorks from '@/components/landing/HowItWorks';
import PricingCTA from '@/components/landing/PricingCTA';
import FinalCTA from '@/components/landing/FinalCTA';

interface StatsData {
  totalUsers: number;
  totalProjects: number;
  paidUsers: number;
  conversionRate: number;
}

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalProjects: 0,
    paidUsers: 0,
    conversionRate: 0,
  });

  // ✅ RE-HABILITADO: Redireciona usuários logados para dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  // Buscar estatísticas
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        // Falha silenciosa - stats não são críticas
      }
    }

    if (isLoaded) {
      fetchStats();
    }
  }, [isLoaded]);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-pulse text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <main className="bg-black">
      <HeroSection />
      <StatsSection stats={stats} />
      <FeaturesShowcase />
      <ComparisonTable />
      <HowItWorks />
      <PricingCTA />
      <FinalCTA totalUsers={stats.totalUsers} />
    </main>
  );
}
