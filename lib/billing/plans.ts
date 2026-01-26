/**
 * Plans Configuration
 * Definição centralizada de todos os planos e features
 * 
 * ATUALIZADO: Dezembro 2025
 * - Removida terminologia de "créditos"
 * - Novos preços: Starter R$50, Pro R$100, Studio R$300
 * - Modelo: Assinatura mensal recorrente
 */

import type { BillingCycle } from '../stripe/types';

// Tipos de plano
export type PlanType = 'free' | 'starter' | 'pro' | 'studio' | 'enterprise' | 'legacy';

// ============================================================================
// CICLOS DE PAGAMENTO
// ============================================================================

export interface CycleInfo {
  label: string;
  discount: number; // Percentual de desconto
  badge?: string;
}

export const BILLING_CYCLES: Record<BillingCycle, CycleInfo> = {
  monthly: {
    label: 'Mensal',
    discount: 0
  },
  quarterly: {
    label: 'Trimestral',
    discount: 10,
    badge: 'Economize 10%'
  },
  semiannual: {
    label: 'Semestral',
    discount: 25,
    badge: 'Economize 25%'
  },
  yearly: {
    label: 'Anual',
    discount: 40,
    badge: 'Melhor Oferta! Economize 40%'
  }
};

// ============================================================================
// PLANOS E PREÇOS
// ============================================================================

export interface PlanPricing {
  monthly: number;
  quarterly: number;   // Total trimestral (3 meses)
  semiannual: number;  // Total semestral (6 meses)
  yearly: number;      // Total anual (12 meses)
}

export const PLAN_PRICING: Record<PlanType, PlanPricing> = {
  free: {
    monthly: 0,
    quarterly: 0,
    semiannual: 0,
    yearly: 0
  },
  legacy: {
    monthly: 25.00,      // 🎁 LEGACY: R$ 25/mês fixo
    quarterly: 75.00,    // R$ 25/mês (sem desconto)
    semiannual: 150.00,  // R$ 25/mês (sem desconto)
    yearly: 300.00       // R$ 25/mês (sem desconto)
  },
  starter: {
    monthly: 50.00,
    quarterly: 135.00,   // R$ 45/mês (10% off)
    semiannual: 225.00,  // R$ 37.50/mês (25% off)
    yearly: 360.00       // R$ 30/mês (40% off)
  },
  pro: {
    monthly: 100.00,
    quarterly: 270.00,   // R$ 90/mês (10% off)
    semiannual: 450.00,  // R$ 75/mês (25% off)
    yearly: 720.00       // R$ 60/mês (40% off)
  },
  studio: {
    monthly: 300.00,
    quarterly: 810.00,   // R$ 270/mês (10% off)
    semiannual: 1350.00, // R$ 225/mês (25% off)
    yearly: 2160.00      // R$ 180/mês (40% off)
  },
  enterprise: {
    monthly: 600.00,      // 🏢 ENTERPRISE: Verdadeiramente ilimitado
    quarterly: 1620.00,   // R$ 540/mês (10% off)
    semiannual: 2700.00,  // R$ 450/mês (25% off)
    yearly: 4320.00       // R$ 360/mês (40% off)
  }
};

// ============================================================================
// LIMITES POR PLANO (gerações por mês)
// ✅ FONTE ÚNICA DE VERDADE: Importado de limits.ts
// ============================================================================

// Importar limites reais de limits.ts para evitar inconsistências
// Os valores são: free=3, legacy=100, starter=95, pro=210, studio=680, enterprise=-1 (ilimitado)
export const PLAN_GENERATION_LIMITS: Record<PlanType, number | null> = {
  free: 3,         // 🎣 ISCA: 3 previews com blur
  legacy: 100,     // 🎁 LEGACY: Apenas editor
  starter: 95,     // 95 gerações/mês
  pro: 210,        // 210 gerações/mês
  studio: 680,     // 🛡️ Limite justo: 680 gerações/mês
  enterprise: 1400 // 🏢 ENTERPRISE: Limite alto para uso profissional
};

// ============================================================================
// FEATURES DOS PLANOS
// ============================================================================

export interface PlanFeature {
  name: string;
  included: boolean;
  description?: string;
}

export interface PlanInfo {
  name: string;
  description: string;
  price: PlanPricing;
  generationLimit: number | null;
  features: PlanFeature[];
  popular?: boolean;
  cta: string;
}

export const PLANS: Record<PlanType, PlanInfo> = {
  free: {
    name: 'Free',
    description: 'Acesso limitado',
    price: PLAN_PRICING.free,
    generationLimit: 3,
    cta: 'Começar Grátis',
    features: [
      {
        name: 'Visualizar exemplos',
        included: true,
        description: 'Explore a plataforma'
      },
      {
        name: 'Editor de Stencil',
        included: false,
        description: 'Apenas para assinantes'
      },
      {
        name: 'Ferramentas IA',
        included: false,
        description: 'Apenas para assinantes'
      }
    ]
  },

  legacy: {
    name: 'Legacy',
    description: 'Apenas Editor - Plano especial',
    price: PLAN_PRICING.legacy,
    generationLimit: 100,
    cta: 'Assinar Legacy',
    features: [
      {
        name: 'Editor de Stencil completo',
        included: true,
        description: 'Edição profissional de stencils'
      },
      {
        name: 'Modo Topográfico',
        included: true,
        description: 'Visualize camadas de profundidade'
      },
      {
        name: 'Linhas Perfeitas',
        included: true,
        description: 'Ajuste automático de contornos'
      },
      {
        name: 'Download PNG',
        included: true,
        description: 'Exporte em alta qualidade'
      },
      {
        name: 'Ferramentas Premium',
        included: false,
        description: 'Não incluídas (upgrade para Starter)'
      },
      {
        name: 'IA Generativa',
        included: false,
        description: 'Não incluída (upgrade para Pro)'
      }
    ]
  },

  starter: {
    name: 'Starter',
    description: 'Ideal para começar',
    price: PLAN_PRICING.starter,
    generationLimit: 95,
    cta: 'Assinar Starter',
    features: [
      {
        name: 'Editor de Stencil completo',
        included: true,
        description: 'Edição profissional de stencils'
      },
      {
        name: 'Modo Topográfico',
        included: true,
        description: 'Visualize camadas de profundidade'
      },
      {
        name: 'Linhas Perfeitas',
        included: true,
        description: 'Ajuste automático de contornos'
      },
      {
        name: 'Controle de intensidade',
        included: true,
        description: 'Ajuste fino das linhas'
      },
      {
        name: 'Download PNG/SVG',
        included: true,
        description: 'Exporte em alta qualidade'
      },
      {
        name: 'Ferramentas IA avançadas',
        included: false,
        description: 'Apenas no plano Pro'
      }
    ]
  },

  pro: {
    name: 'Pro',
    description: 'Para tatuadores profissionais',
    price: PLAN_PRICING.pro,
    generationLimit: 210,
    cta: 'Assinar Pro',
    popular: true,
    features: [
      {
        name: 'Tudo do Starter',
        included: true
      },
      {
        name: 'Geração IA de designs',
        included: true,
        description: 'Crie stencils do zero com IA'
      },
      {
        name: 'Aprimorar imagem (4K)',
        included: true,
        description: 'Melhore qualidade automaticamente'
      },
      {
        name: 'Color Match IA',
        included: true,
        description: 'Paleta de cores inteligente'
      },
      {
        name: 'Dividir A4',
        included: true,
        description: 'Otimize para impressão'
      },
      {
        name: 'Preview interativo',
        included: true,
        description: 'Visualize antes de exportar'
      }
    ]
  },

  studio: {
    name: 'Studio',
    description: 'Para estúdios e uso intensivo',
    price: PLAN_PRICING.studio,
    generationLimit: 680, // 🛡️ Limite justo
    cta: 'Assinar Studio',
    features: [
      {
        name: 'Tudo do Pro',
        included: true
      },
      {
        name: 'Até 680 gerações/mês',
        included: true,
        description: 'Limite justo para uso profissional'
      },
      {
        name: 'Suporte prioritário',
        included: true,
        description: 'Atendimento preferencial'
      },
      {
        name: 'Ideal para estúdios',
        included: true,
        description: 'Múltiplos tatuadores'
      },
      {
        name: 'Relatórios de uso',
        included: true,
        description: 'Acompanhe o consumo'
      }
    ]
  },

  enterprise: {
    name: 'Enterprise',
    description: 'Para grandes operações',
    price: PLAN_PRICING.enterprise,
    generationLimit: 1400, // 🏢 ENTERPRISE: Limite alto
    cta: 'Assinar Enterprise',
    features: [
      {
        name: 'Tudo do Studio',
        included: true
      },
      {
        name: 'Até 1.400 gerações/mês',
        included: true,
        description: 'Limite alto para grandes operações'
      },
      {
        name: 'Suporte dedicado',
        included: true,
        description: 'Atendimento exclusivo 24/7'
      },
      {
        name: 'SLA garantido',
        included: true,
        description: '99.9% de uptime'
      },
      {
        name: 'Onboarding personalizado',
        included: true,
        description: 'Setup e treinamento incluídos'
      },
      {
        name: 'API access',
        included: true,
        description: 'Integração com seus sistemas'
      }
    ]
  }
};

// ============================================================================
// PRICE IDs DO STRIPE
// ============================================================================

export interface StripePriceIds {
  monthly: string;
  quarterly: string;
  semiannual: string;
  yearly: string;
}

/**
 * Obtém os Price IDs do Stripe para um plano
 */
export function getStripePriceIds(plan: PlanType): StripePriceIds {
  const prefixMap: Record<PlanType, string> = {
    free: 'FREE',
    legacy: 'LEGACY',
    starter: 'STARTER',
    pro: 'PRO',
    studio: 'STUDIO',
    enterprise: 'ENTERPRISE'
  };
  const prefix = prefixMap[plan];

  return {
    monthly: process.env[`STRIPE_PRICE_${prefix}_MONTHLY`] || '',
    quarterly: process.env[`STRIPE_PRICE_${prefix}_QUARTERLY`] || '',
    semiannual: process.env[`STRIPE_PRICE_${prefix}_SEMIANNUAL`] || '',
    yearly: process.env[`STRIPE_PRICE_${prefix}_YEARLY`] || ''
  };
}

/**
 * Formata preço para exibição
 */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Calcula preço mensal equivalente
 */
export function getMonthlyEquivalent(
  plan: PlanType,
  cycle: BillingCycle
): number {
  const pricing = PLAN_PRICING[plan];

  switch (cycle) {
    case 'monthly':
      return pricing.monthly;
    case 'quarterly':
      return pricing.quarterly / 3;
    case 'semiannual':
      return pricing.semiannual / 6;
    case 'yearly':
      return pricing.yearly / 12;
  }
}

/**
 * Verifica se plano tem feature
 */
export function hasFeature(plan: PlanType, featureName: string): boolean {
  const planInfo = PLANS[plan];
  const feature = planInfo.features.find(f => f.name === featureName);
  return feature?.included || false;
}

/**
 * Obtém o limite de gerações do plano
 */
export function getGenerationLimit(plan: PlanType): number | null {
  return PLAN_GENERATION_LIMITS[plan];
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { BillingCycle };
