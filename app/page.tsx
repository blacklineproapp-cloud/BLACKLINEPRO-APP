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
  console.log('🚀 Home component iniciou!');

  const { isSignedIn, isLoaded } = useAuth();
  console.log('📊 Auth hooks:', { isSignedIn, isLoaded });

  const router = useRouter();
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalProjects: 0,
    paidUsers: 0,
    conversionRate: 0,
  });

  // Debug logs
  useEffect(() => {
    console.log('🔍 Auth State:', { isLoaded, isSignedIn });
  }, [isLoaded, isSignedIn]);

  // Se já está logado, redireciona para dashboard
  // TEMPORARIAMENTE DESABILITADO PARA VER A LANDING PAGE
  // useEffect(() => {
  //   if (isLoaded && isSignedIn) {
  //     console.log('✅ Redirecionando para dashboard...');
  //     router.push('/dashboard');
  //   }
  // }, [isLoaded, isSignedIn, router]);

  // Buscar estatísticas (sempre, independente do login)
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Erro ao buscar stats:', error);
      }
    }

    // Sempre buscar stats quando a página carregar
    if (isLoaded) {
      fetchStats();
    }
  }, [isLoaded]);

  // Não renderizar nada enquanto verifica autenticação
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-pulse text-white">Carregando...</div>
      </div>
    );
  }

  // TEMPORARIAMENTE DESABILITADO - permitir ver landing mesmo logado
  // if (isSignedIn) {
  //   return null;
  // }

  console.log('✅ Renderizando landing page!');

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
