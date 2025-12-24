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
export type PlanType = 'starter' | 'pro' | 'studio';

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
  yearly: {
    label: 'Anual',
    discount: 40,
    badge: 'Economize 40%'
  }
};

// ============================================================================
// PLANOS E PREÇOS
// ============================================================================

export interface PlanPricing {
  monthly: number;
  quarterly: number;   // Total trimestral
  yearly: number;      // Total anual
}

export const PLAN_PRICING: Record<PlanType, PlanPricing> = {
  starter: {
    monthly: 50.00,
    quarterly: 135.00,  // R$ 45/mês (10% off)
    yearly: 360.00      // R$ 30/mês (40% off)
  },
  pro: {
    monthly: 100.00,
    quarterly: 270.00,  // R$ 90/mês (10% off)
    yearly: 720.00      // R$ 60/mês (40% off)
  },
  studio: {
    monthly: 300.00,
    quarterly: 810.00,  // R$ 270/mês (10% off)
    yearly: 2160.00     // R$ 180/mês (40% off)
  }
};

// ============================================================================
// LIMITES POR PLANO (gerações por mês)
// ============================================================================

export const PLAN_GENERATION_LIMITS: Record<PlanType, number | null> = {
  starter: 100,   // 100 gerações/mês
  pro: 500,       // 500 gerações/mês
  studio: null,   // Ilimitado
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
  starter: {
    name: 'Starter',
    description: 'Ideal para começar',
    price: PLAN_PRICING.starter,
    generationLimit: 100,
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
    generationLimit: 500,
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
    generationLimit: null, // Ilimitado
    cta: 'Assinar Studio',
    features: [
      {
        name: 'Tudo do Pro',
        included: true
      },
      {
        name: 'Uso ilimitado',
        included: true,
        description: 'Sem limites mensais'
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
  }
};

// ============================================================================
// PRICE IDs DO STRIPE
// ============================================================================

export interface StripePriceIds {
  monthly: string;
  quarterly: string;
  yearly: string;
}

/**
 * Obtém os Price IDs do Stripe para um plano
 */
export function getStripePriceIds(plan: PlanType): StripePriceIds {
  const prefixMap: Record<PlanType, string> = {
    starter: 'STARTER',
    pro: 'PRO',
    studio: 'STUDIO'
  };
  const prefix = prefixMap[plan];

  return {
    monthly: process.env[`STRIPE_PRICE_${prefix}_MONTHLY`] || '',
    quarterly: process.env[`STRIPE_PRICE_${prefix}_QUARTERLY`] || '',
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
