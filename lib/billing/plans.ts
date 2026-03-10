/**
 * Plans Configuration
 * Definição centralizada de todos os planos e features
 *
 * ATUALIZADO: Março 2026
 * - Modelo BYOK: gerações ilimitadas (usuário usa sua chave Gemini gratuita)
 * - Monetização por armazenamento em nuvem + recursos premium + sem ads
 * - Planos: Blackline Free, Blackline Ink (R$29), Blackline Pro (R$69), Blackline Studio (R$199)
 */

import type { BillingCycle } from '../billing/types';

// Tipos de plano
export type PlanType = 'free' | 'ink' | 'pro' | 'studio';

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
    discount: 0
  },
  semiannual: {
    label: 'Semestral',
    discount: 0
  },
  yearly: {
    label: 'Anual',
    discount: 0
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
  ink: {
    monthly: 29.00,
    quarterly: 87.00,    // 3x R$ 29
    semiannual: 174.00,  // 6x R$ 29
    yearly: 348.00       // 12x R$ 29
  },
  pro: {
    monthly: 69.00,
    quarterly: 207.00,   // 3x R$ 69
    semiannual: 414.00,  // 6x R$ 69
    yearly: 828.00       // 12x R$ 69
  },
  studio: {
    monthly: 199.00,
    quarterly: 597.00,   // 3x R$ 199
    semiannual: 1194.00, // 6x R$ 199
    yearly: 2388.00      // 12x R$ 199
  }
};

// ============================================================================
// LIMITES POR PLANO (gerações por mês)
// ✅ FONTE ÚNICA DE VERDADE: Importado de limits.ts
// ============================================================================

// BYOK: Todos os planos têm gerações ilimitadas (null = sem limite)
export const PLAN_GENERATION_LIMITS: Record<PlanType, number | null> = {
  free: null,
  ink: null,
  pro: null,
  studio: null
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
  generationLimit: number | null; // mantido para compatibilidade; null = ilimitado (BYOK)
  storageGB: number | null;        // GB de armazenamento em nuvem; null = sem limite
  hasCloudStorage: boolean;        // armazenamento R2 incluído
  showAds: boolean;                // exibe anúncios Google AdSense
  hasWatermark: boolean;           // stencils gerados com marca d'água
  premiumTools: boolean;           // ferramentas premium (Split A4, Color Match, etc.)
  features: PlanFeature[];
  popular?: boolean;
  cta: string;
}

export const PLANS: Record<PlanType, PlanInfo> = {
  free: {
    name: 'Blackline Free',
    description: 'Gere stencils com sua chave Gemini gratuita',
    price: PLAN_PRICING.free,
    generationLimit: null,
    storageGB: 0,
    hasCloudStorage: false,
    showAds: true,
    hasWatermark: false,
    premiumTools: false,
    cta: 'Começar Grátis',
    features: [
      {
        name: 'Gerações ilimitadas (BYOK)',
        included: true,
        description: 'Use sua chave Gemini gratuita do Google'
      },
      {
        name: 'Editor e Generator completos',
        included: true,
        description: 'Acesso total às ferramentas de geração'
      },
      {
        name: 'Salvar somente local (IndexedDB)',
        included: true,
        description: 'Seus stencils ficam no seu navegador'
      },
      {
        name: 'Anúncios',
        included: true,
        description: 'Exibe anúncios Google AdSense'
      },
      {
        name: 'Armazenamento em nuvem',
        included: false,
        description: 'Disponível no Blackline Ink e acima'
      },
      {
        name: 'Ferramentas premium (Split A4, Color Match)',
        included: false,
        description: 'Disponível no Blackline Pro e acima'
      }
    ]
  },

  ink: {
    name: 'Blackline Ink',
    description: 'Nuvem + sem anúncios',
    price: PLAN_PRICING.ink,
    generationLimit: null,
    storageGB: 5,
    hasCloudStorage: true,
    showAds: false,
    hasWatermark: false,
    premiumTools: false,
    cta: 'Assinar Ink',
    features: [
      {
        name: 'Gerações ilimitadas (BYOK)',
        included: true,
        description: 'Use sua chave Gemini gratuita do Google'
      },
      {
        name: '5 GB de armazenamento em nuvem',
        included: true,
        description: 'Salve e acesse de qualquer dispositivo'
      },
      {
        name: 'Sem anúncios',
        included: true,
        description: 'Experiência limpa e profissional'
      },
      {
        name: 'Editor completo + modos avançados',
        included: true,
        description: 'Topográfico, Linhas Perfeitas, Anime'
      },
      {
        name: 'Ferramentas premium (Split A4, Color Match)',
        included: false,
        description: 'Disponível no Blackline Pro'
      }
    ]
  },

  pro: {
    name: 'Blackline Pro',
    description: 'Para tatuadores profissionais',
    price: PLAN_PRICING.pro,
    generationLimit: null,
    storageGB: 10,
    hasCloudStorage: true,
    showAds: false,
    hasWatermark: false,
    premiumTools: true,
    cta: 'Assinar Pro',
    popular: true,
    features: [
      {
        name: 'Gerações ilimitadas (BYOK)',
        included: true,
        description: 'Use sua chave Gemini gratuita do Google'
      },
      {
        name: '10 GB de armazenamento em nuvem',
        included: true,
        description: 'Galeria profissional completa'
      },
      {
        name: 'Sem anúncios',
        included: true,
        description: 'Experiência limpa e profissional'
      },
      {
        name: 'Todas as ferramentas premium',
        included: true,
        description: 'Split A4, Color Match IA, Aprimorar 4K'
      },
      {
        name: 'Generator de artes com IA',
        included: true,
        description: 'Crie designs do zero com IA'
      },
      {
        name: 'Suporte prioritário',
        included: true,
        description: 'Atendimento preferencial'
      }
    ]
  },

  studio: {
    name: 'Blackline Studio',
    description: 'Para estúdios e times',
    price: PLAN_PRICING.studio,
    generationLimit: null,
    storageGB: 25,
    hasCloudStorage: true,
    showAds: false,
    hasWatermark: false,
    premiumTools: true,
    cta: 'Assinar Studio',
    features: [
      {
        name: 'Tudo do Blackline Pro',
        included: true
      },
      {
        name: '25 GB de armazenamento em nuvem',
        included: true,
        description: 'Para toda a equipe do estúdio'
      },
      {
        name: 'Múltiplos usuários (team)',
        included: true,
        description: 'Compartilhe com toda a equipe'
      },
      {
        name: 'Suporte prioritário',
        included: true,
        description: 'Atendimento preferencial'
      },
      {
        name: 'Relatórios de uso',
        included: true,
        description: 'Acompanhe o consumo da equipe'
      }
    ]
  }
};

/**
 * Formata preço para exibição
 */
export function formatPrice(value: number, _locale?: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
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
