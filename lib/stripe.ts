import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
});

// Novos planos
export const PRICES = {
  EDITOR_ONLY: process.env.STRIPE_PRICE_EDITOR!, // R$ 50/mês
  FULL_ACCESS: process.env.STRIPE_PRICE_FULL!, // R$ 100/mês

  // Manter compatibilidade (deprecated)
  SUBSCRIPTION: process.env.STRIPE_PRICE_SUBSCRIPTION || process.env.STRIPE_PRICE_EDITOR!,
  TOOLS: process.env.STRIPE_PRICE_TOOLS || process.env.STRIPE_PRICE_FULL!,
};

export type PlanType = 'free' | 'editor_only' | 'full_access';

export const PLAN_FEATURES = {
  free: {
    name: 'Gratuito',
    price: 0,
    features: ['Visualização básica', 'Galeria limitada'],
  },
  editor_only: {
    name: 'Editor',
    price: 50,
    priceId: PRICES.EDITOR_ONLY,
    features: [
      'Editor de Stencil completo',
      'Modo Topográfico',
      'Modo Linhas Perfeitas',
      'Salvar projetos ilimitados',
    ],
  },
  full_access: {
    name: 'Full Access',
    price: 100,
    priceId: PRICES.FULL_ACCESS,
    features: [
      'Tudo do plano Editor',
      'IA GEN (geração de imagens)',
      'Aprimorar imagem (4K)',
      'Color Match (análise de tintas)',
      'Dividir em A4 (tattoos grandes)',
      'Prioridade no suporte',
    ],
  },
};

// Re-exportar serviços da nova estrutura
export { CustomerService } from './stripe/customer-service';
export { SubscriptionService } from './stripe/subscription-service';
export { CheckoutService } from './stripe/checkout-service';
