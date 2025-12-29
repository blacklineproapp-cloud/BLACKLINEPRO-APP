'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  Crown, Zap, Sparkles, CreditCard, Calendar, 
  ExternalLink, Loader2, CheckCircle, XCircle,
  ArrowLeft, Settings
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface UserData {
  plan: string;
  is_paid: boolean;
  subscription_status: string;
  subscription_expires_at: string | null;
  admin_courtesy: boolean;
  stripe_customer_id: string | null;
}

export default function AssinaturaPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
      return;
    }

    if (isLoaded && isSignedIn) {
      loadUserData();
    }
  }, [isLoaded, isSignedIn]);

  const loadUserData = async () => {
    try {
      const res = await fetch('/api/user/me');
      if (!res.ok) throw new Error('Erro ao carregar dados');
      const data = await res.json();
      setUserData(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao abrir portal');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error: any) {
      alert(error.message || 'Erro ao abrir portal de pagamento');
      setPortalLoading(false);
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando assinatura..." />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Erro ao carregar dados</p>
      </div>
    );
  }

  const planDetails = {
    free: {
      name: 'Free',
      icon: Zap,
      color: 'zinc',
      price: 'R$ 0',
      features: ['Acesso básico', 'Gerações limitadas']
    },
    starter: {
      name: 'Starter',
      icon: Zap,
      color: 'emerald',
      price: 'R$ 50/mês',
      features: ['100 gerações/mês', 'Editor completo', 'Modo topográfico']
    },
    pro: {
      name: 'Pro',
      icon: Crown,
      color: 'purple',
      price: 'R$ 100/mês',
      features: ['500 gerações/mês', 'IA Generativa', 'Color Match + A4']
    },
    studio: {
      name: 'Studio',
      icon: Sparkles,
      color: 'amber',
      price: 'R$ 300/mês',
      features: ['1000 gerações/mês', 'Tudo do Pro', 'Suporte prioritário']
    }
  };

  const currentPlan = planDetails[userData.plan as keyof typeof planDetails] || planDetails.free;
  const isCourtesy = userData.admin_courtesy;
  const hasActiveSubscription = userData.is_paid && userData.subscription_status === 'active';
  
  // Mostrar botão de gerenciar para qualquer usuário pago que não seja cortesia
  // O Stripe vai criar o customer_id automaticamente se necessário
  const canManageSubscription = hasActiveSubscription && !isCourtesy;

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-4"
          >
            <ArrowLeft size={20} />
            Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-bold mb-2">Minha Assinatura</h1>
          <p className="text-zinc-400">Gerencie seu plano e pagamentos</p>
        </div>

        {/* Current Plan Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                currentPlan.color === 'emerald' ? 'bg-emerald-600/10 border border-emerald-500/30' :
                currentPlan.color === 'purple' ? 'bg-purple-600/10 border border-purple-500/30' :
                currentPlan.color === 'amber' ? 'bg-amber-600/10 border border-amber-500/30' :
                'bg-zinc-800 border border-zinc-700'
              }`}>
                <currentPlan.icon className={
                  currentPlan.color === 'emerald' ? 'text-emerald-500' :
                  currentPlan.color === 'purple' ? 'text-purple-500' :
                  currentPlan.color === 'amber' ? 'text-amber-500' :
                  'text-zinc-500'
                } size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{currentPlan.name}</h2>
                <p className="text-zinc-400">{currentPlan.price}</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isCourtesy ? 'bg-blue-900/20 border border-blue-800' :
              hasActiveSubscription ? 'bg-green-900/20 border border-green-800' :
              'bg-zinc-800 border border-zinc-700'
            }`}>
              {isCourtesy ? (
                <>
                  <Sparkles size={16} className="text-blue-400" />
                  <span className="text-blue-400 font-medium">Cortesia</span>
                </>
              ) : hasActiveSubscription ? (
                <>
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-green-400 font-medium">Ativo</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-zinc-500" />
                  <span className="text-zinc-500 font-medium">Inativo</span>
                </>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">Recursos incluídos:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-zinc-300">
                  <CheckCircle size={16} className={
                    currentPlan.color === 'emerald' ? 'text-emerald-500' :
                    currentPlan.color === 'purple' ? 'text-purple-500' :
                    currentPlan.color === 'amber' ? 'text-amber-500' :
                    'text-zinc-500'
                  } />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Info */}
          {hasActiveSubscription && userData.subscription_expires_at && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                <Calendar size={16} />
                Próxima cobrança
              </div>
              <p className="text-white font-medium">
                {new Date(userData.subscription_expires_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Courtesy Notice */}
          {isCourtesy && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-blue-400 text-sm flex items-center gap-2">
                <Sparkles size={16} />
                <strong>Plano Cortesia</strong>
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                Você tem acesso gratuito permanente concedido pela equipe StencilFlow.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {canManageSubscription && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                {portalLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Abrindo portal...
                  </>
                ) : (
                  <>
                    <Settings size={20} />
                    Gerenciar Assinatura
                    <ExternalLink size={16} />
                  </>
                )}
              </button>
            )}

            {!hasActiveSubscription && !isCourtesy && (
              <button
                onClick={() => router.push('/pricing')}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                <Crown size={20} />
                Assinar Agora
              </button>
            )}
          </div>
        </div>


        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payment Method */}
          {canManageSubscription && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                  <CreditCard size={20} className="text-zinc-400" />
                </div>
                <h3 className="font-semibold">Forma de Pagamento</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Gerencie seus métodos de pagamento e veja o histórico de faturas no portal Stripe.
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-sm text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
              >
                Abrir portal de pagamento
                <ExternalLink size={14} />
              </button>
            </div>
          )}

          {/* Support */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                <Sparkles size={20} className="text-zinc-400" />
              </div>
              <h3 className="font-semibold">Precisa de Ajuda?</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Entre em contato com nosso suporte para dúvidas sobre planos e pagamentos.
            </p>
            <a
              href="mailto:suporte@stencilflow.com"
              className="text-sm text-blue-400 hover:text-blue-300 transition"
            >
              suporte@stencilflow.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
