import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
});

// ============================================================================
// PRICE IDs DO STRIPE
// ============================================================================

export const PRICES = {
  // Planos atuais (DEZEMBRO 2025)
  STARTER: process.env.STRIPE_PRICE_STARTER_MONTHLY!,   // R$ 50/mês
  PRO: process.env.STRIPE_PRICE_PRO_MONTHLY!,           // R$ 100/mês
  STUDIO: process.env.STRIPE_PRICE_STUDIO_MONTHLY!,     // R$ 300/mês
};

// ============================================================================
// TIPOS DE PLANOS
// ============================================================================

export type PlanType = 'free' | 'starter' | 'pro' | 'studio';

// ============================================================================
// FEATURES DOS PLANOS
// ============================================================================

export const PLAN_FEATURES = {
  free: {
    name: 'Gratuito',
    price: 0,
    features: ['Visualização básica', 'Galeria limitada'],
  },
  starter: {
    name: 'Starter',
    price: 50,
    priceId: PRICES.STARTER,
    generationLimit: 100,
    features: [
      'Editor de Stencil completo',
      'Modo Topográfico',
      'Modo Linhas Perfeitas',
      'Salvar projetos ilimitados',
      '100 gerações/mês',
    ],
  },
  pro: {
    name: 'Pro',
    price: 100,
    priceId: PRICES.PRO,
    generationLimit: 500,
    features: [
      'Tudo do plano Starter',
      'IA GEN (geração de imagens)',
      'Aprimorar imagem (4K)',
      'Color Match (análise de tintas)',
      'Dividir em A4 (tattoos grandes)',
      '500 gerações/mês',
    ],
  },
  studio: {
    name: 'Studio',
    price: 300,
    priceId: PRICES.STUDIO,
    generationLimit: null, // Ilimitado
    features: [
      'Tudo do plano Pro',
      'Uso ilimitado',
      'Suporte prioritário',
      'Ideal para estúdios',
    ],
  },
};

// Re-exportar serviços da nova estrutura
export { CustomerService } from './stripe/customer-service';
export { SubscriptionService } from './stripe/subscription-service';
export { CheckoutService } from './stripe/checkout-service';
