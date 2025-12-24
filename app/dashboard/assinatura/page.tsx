'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface SubscriptionInfo {
  isSubscribed: boolean;
  subscriptionStatus: string | null;
  plan: string;
  currentPeriodEnd: string | null;
  toolsUnlocked: boolean;
}

export default function AssinaturaPage() {
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);

  // Carregar status da assinatura
  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  async function loadSubscriptionStatus() {
    try {
      const res = await fetch('/api/user/status');
      const data = await res.json();
      setSubscriptionInfo(data);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleManageSubscription() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // Redirecionar para o portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Erro ao abrir portal:', error);
      alert('Erro ao abrir portal de gerenciamento');
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string | null) {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Ativa</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500"><Calendar className="w-3 h-3 mr-1" /> Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Pagamento Atrasado</Badge>;
      case 'canceled':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Cancelada</Badge>;
      default:
        return <Badge variant="outline">Sem assinatura</Badge>;
    }
  }

  function getPlanName(plan: string) {
    switch (plan) {
      case 'editor_only':
        return 'Editor Only';
      case 'full_access':
        return 'Full Access';
      default:
        return 'Free';
    }
  }

  if (loadingStatus) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Gerenciar Assinatura</h1>

      {/* Card de Status Atual */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status da Assinatura</span>
            {subscriptionInfo && getStatusBadge(subscriptionInfo.subscriptionStatus)}
          </CardTitle>
          <CardDescription>
            Informações sobre seu plano atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionInfo && (
            <>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Plano:</span>
                <span className="font-semibold">{getPlanName(subscriptionInfo.plan)}</span>
              </div>

              {subscriptionInfo.isSubscribed && subscriptionInfo.currentPeriodEnd && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Próxima cobrança:</span>
                  <span className="font-semibold">
                    {new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Ferramentas Premium:</span>
                <span className="font-semibold">
                  {subscriptionInfo.toolsUnlocked ? (
                    <Badge className="bg-green-500">Desbloqueadas</Badge>
                  ) : (
                    <Badge variant="secondary">Bloqueadas</Badge>
                  )}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card do Portal do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Portal do Cliente
          </CardTitle>
          <CardDescription>
            Gerencie sua assinatura, pagamentos e métodos de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No portal do cliente você pode:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Cancelar ou reativar sua assinatura</li>
            <li>Atualizar método de pagamento</li>
            <li>Ver histórico de pagamentos</li>
            <li>Baixar invoices e recibos</li>
            <li>Atualizar informações de cobrança</li>
          </ul>

          <Button
            onClick={handleManageSubscription}
            disabled={loading || !subscriptionInfo?.isSubscribed}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Abrindo portal...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Abrir Portal do Cliente
              </>
            )}
          </Button>

          {!subscriptionInfo?.isSubscribed && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Você precisa ter uma assinatura ativa para acessar o portal.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Link para Pricing */}
      {!subscriptionInfo?.isSubscribed && (
        <Card className="mt-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <p className="text-center mb-4">
              Ainda não tem uma assinatura? Confira nossos planos!
            </p>
            <Button
              asChild
              variant="default"
              className="w-full"
              size="lg"
            >
              <a href="/pricing">Ver Planos e Preços</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
