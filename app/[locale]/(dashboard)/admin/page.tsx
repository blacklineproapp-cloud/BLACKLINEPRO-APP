'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, DollarSign, Activity, TrendingUp, Search, RefreshCw, Shield,
  Ban, CheckCircle, Clock, Zap, AlertTriangle, Filter, Eye, X as XIcon,
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Sparkles, HelpCircle,
  Mail, Send, Inbox, TrendingDown, CreditCard, Gift, Calendar
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';
import SentryAlertsDashboard from './components/SentryAlertsDashboard';
import IntegratedDashboard from './components/IntegratedDashboard';


interface Metrics {
  general: {
    totalUsers: number;
    paidUsers: number;
    activeUsers: number;
    onlineUsers: number;
    blockedUsers: number;
  };
  plans: {
    free: number;
    starter: number;
    pro: number;
    studio: number;
    enterprise: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    stripeHistorical: number;
    asaasReal: number;
    asaasTest: number;
    isSandbox: boolean;
  };
  migration: {
    total: number;
    migrated: number;
    pendingCpf: number;
    pendingAsaas: number;
    funnel: {
      total: number;
      activeOnStripe: number;
      completed: number;
    }
  };
  paymentDetails: {
    asaasCustomers: {
      count: number;
      users: Array<{
        id: string;
        email: string;
        name: string;
        plan: string;
        asaas_subscription_id: string;
        subscription_status: string;
        created_at: string;
      }>;
    };
    stripeMigrated: {
      count: number;
      users: Array<{
        id: string;
        email: string;
        name: string;
        plan: string;
      }>;
    };
    courtesyUsers: {
      count: number;
      users: Array<{
        id: string;
        email: string;
        name: string;
        plan: string;
        admin_courtesy_granted_at: string;
        admin_courtesy_granted_by: string;
      }>;
    };
    gracePeriod: {
      total: number;
      toReceiveLinkJan10: number;
      users: Array<{
        id: string;
        email: string;
        name: string;
        plan: string;
        grace_period_until: string;
        created_at: string;
      }>;
    };
  };
  aiUsage: {
    totalRequests: number;
    todayRequests: number;
    operations: Record<string, number>;
  };
  aiCosts: {
    today: number;
    week: number;
    month: number;
    year: number;
    total: number;
  };
  activity: {
    hourlyActivity: Record<number, number>;
    peakHour: number;
    peakCount: number;
  };
  recurrence?: {
    mrr: number;
    pendingCpf: number;
    upcomingRenewals: Array<{
      email?: string;
      id?: string;
      plan?: string;
      date: string;
      type: 'migration' | 'subscription';
    }>;
  };
}



interface RemarketingStats {
  totalFreeUsers: number;
  stats: {
    initial: {
      eligible: number;
      alreadySent: number;
      pending: number;
      daysRequired: number;
    };
    reminder: {
      eligible: number;
      alreadySent: number;
      pending: number;
      daysRequired: number;
    };
    final: {
      eligible: number;
      alreadySent: number;
      pending: number;
      daysRequired: number;
    };
  };
  recentCampaigns: Array<{
    id: string;
    campaign_type: string;
    email_status: string;
    created_at: string;
    users: {
      email: string;
      name: string;
    };
  }>;
  conversions: {
    total: number;
    rate: string;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);




  


  // Remarketing
  const [remarketingStats, setRemarketingStats] = useState<RemarketingStats | null>(null);
  const [remarketingLoading, setRemarketingLoading] = useState(false);
  const [remarketingModal, setRemarketingModal] = useState<{
    show: boolean;
    campaignType: 'initial' | 'reminder' | 'final';
  } | null>(null);
  const [sendingCampaign, setSendingCampaign] = useState(false);

  // Modais de detalhamento de pagantes
  const [userListModal, setUserListModal] = useState<{
    show: boolean;
    type: 'asaas' | 'courtesy' | 'grace' | 'stripe';
    title: string;
  } | null>(null);

  // Estado para envio de links de cortesia
  const [sendingCourtesyLinks, setSendingCourtesyLinks] = useState(false);
  const [courtesyLinksResult, setCourtesyLinksResult] = useState<{
    success: boolean;
    message: string;
    sent?: number;
    failed?: number;
  } | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) throw new Error('Erro ao carregar métricas');
      const data = await res.json();
      setMetrics(data);
      
      /* Ticket logic removed */
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);



  // Auto-refresh métricas a cada 30s
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [loadMetrics]);









  // Funções de Remarketing
  const loadRemarketingStats = async () => {
    setRemarketingLoading(true);
    try {
      const res = await fetch('/api/admin/remarketing');
      if (res.ok) {
        const data = await res.json();
        setRemarketingStats(data);
      }
    } catch (err: any) {
      console.error('[Remarketing] Erro ao carregar estatísticas:', err);
    } finally {
      setRemarketingLoading(false);
    }
  };

  const sendCampaign = async (campaignType: 'initial' | 'reminder' | 'final') => {
    setSendingCampaign(true);
    try {
      const res = await fetch('/api/admin/remarketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignType, dryRun: false })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Campanha enviada!\n\n✉️  Enviados: ${data.sent}\n❌ Erros: ${data.errors}\n📊 Total: ${data.total}`);
        await loadRemarketingStats(); // Recarregar estatísticas
        await loadMetrics(); // Atualizar métricas gerais
      } else {
        alert(`❌ Erro ao enviar campanha: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ Erro: ${err.message}`);
    } finally {
      setSendingCampaign(false);
      setRemarketingModal(null);
    }
  };

  // Enviar links de pagamento para usuários de cortesia
  const sendCourtesyLinks = async () => {
    if (!confirm('🚀 Enviar links de pagamento Stripe para TODOS os usuários de cortesia?\n\nIsso irá:\n• Gerar checkout sessions no Stripe\n• Enviar emails personalizados\n• Registrar envios no sistema\n\nConfirmar?')) {
      return;
    }

    setSendingCourtesyLinks(true);
    setCourtesyLinksResult(null);

    try {
      const res = await fetch('/api/admin/send-courtesy-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dryRun: false,
          forceResend: true // Permitir reenvio conforme solicitado
        })
      });

      const data = await res.json();

      if (data.success) {
        setCourtesyLinksResult({
          success: true,
          message: data.message,
          sent: data.sent,
          failed: data.failed
        });

        alert(`✅ Links enviados!\n\n✉️  Enviados: ${data.sent}\n❌ Falhas: ${data.failed}\n📊 Total: ${data.total}`);

        // Recarregar métricas
        await loadMetrics();
      } else {
        setCourtesyLinksResult({
          success: false,
          message: data.error || 'Erro desconhecido'
        });
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (err: any) {
      setCourtesyLinksResult({
        success: false,
        message: err.message
      });
      alert(`❌ Erro: ${err.message}`);
    } finally {
      setSendingCourtesyLinks(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando painel admin..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-400 text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const conversionRate = metrics ? ((metrics.general.paidUsers / metrics.general.totalUsers) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Painel Administrativo</h1>
              <p className="text-zinc-400 text-sm">Controle total da plataforma</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-zinc-400">Live</span>
            </div>
            <button
              onClick={() => { loadMetrics(); }}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
            >
              <RefreshCw size={18} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Painel Integrado - Clerk + Supabase + Asaas + Stripe */}
        <IntegratedDashboard />

        {/* Cards de Métricas Principais */}
        {metrics && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <MetricCard
                icon={<Users size={20} />}
                title="Total Usuários"
                value={metrics.general.totalUsers}
                subtitle={`${metrics.general.activeUsers} ativos (7d)`}
                trend={`+${Math.round((metrics.general.activeUsers / metrics.general.totalUsers) * 100)}%`}
                color="blue"
              />
              <MetricCard
                icon={<TrendingDown size={20} />}
                title="Stripe (Histórico)"
                value={`R$ ${metrics.revenue.stripeHistorical.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subtitle="Mês passado (encerrado)"
                trend="Histórico"
                color="purple"
              />
              <MetricCard
                icon={<DollarSign size={20} />}
                title="Asaas (Projeção Mensal)"
                value={`R$ ${metrics.revenue.asaasReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subtitle="MRR - Receita recorrente mensal"
                trend="Projeção"
                color="green"
              />
              <MetricCard
                icon={<Activity size={20} />}
                title="MRR Projetado (Asaas)"
                value={`R$ ${metrics.recurrence?.mrr.toFixed(0) || '0'}`}
                subtitle="Próximo mês (projeção)"
                trend="Recorrência"
                color="blue"
              />
            </div>

            {/* Fila de Métricas Secundárias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                icon={<Eye size={20} />}
                title="Online Agora"
                value={metrics.general.onlineUsers}
                subtitle="Últimos 5 minutos"
                trend="live"
                color="blue"
              />
               <MetricCard
                icon={<AlertTriangle size={20} />}
                title="Asaas Testes (Inflado)"
                value={`R$ ${metrics.revenue.asaasTest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subtitle={metrics.revenue.isSandbox ? "Ambiente: SANDBOX" : "Ambiente: PRODUÇÃO"}
                trend="Ignorado no Real"
                color="yellow"
              />
              <MetricCard
                icon={<CheckCircle size={20} />}
                title="Pagantes Totais"
                value={metrics.general.paidUsers}
                subtitle={`${((metrics.general.paidUsers / metrics.general.totalUsers) * 100).toFixed(1)}% conversão`}
                trend="Total"
                color="green"
              />
              <MetricCard
                icon={<Sparkles size={20} />}
                title="Uso de IA"
                value={metrics.aiUsage.todayRequests}
                subtitle="Requisições hoje"
                trend="IA Gen"
                color="pink"
              />
            </div>
          </>
        )}

        {/* FUNIL DE MIGRAÇÃO STRIPE -> ASAAS */}
        {metrics && (
          <div className="mb-8 bg-zinc-900 border border-blue-900/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <TrendingUp size={24} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Funil de Migração (Stripe → Asaas)</h3>
                <p className="text-xs text-zinc-400">Total de 154 usuários que pagavam no Stripe</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center p-4 bg-zinc-950 rounded-lg border border-zinc-800 relative">
                <div className="text-3xl font-bold text-white mb-1">{metrics.migration.total}</div>
                <div className="text-xs text-zinc-500 uppercase font-bold">Total a Migrar</div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 hidden md:block">
                  <ArrowUpRight className="text-zinc-700" rotate={90} />
                </div>
              </div>

              <div className="flex flex-col items-center p-4 bg-zinc-950 rounded-lg border border-amber-800/30 relative">
                <div className="text-3xl font-bold text-amber-400 mb-1">{metrics.migration.pendingCpf}</div>
                <div className="text-xs text-zinc-500 uppercase font-bold">Pendente CPF</div>
                <div className="text-[10px] text-amber-600 mt-1">Acesso liberado (Legacy/Grace)</div>
              </div>

              <div className="flex flex-col items-center p-4 bg-zinc-950 rounded-lg border border-emerald-800/30">
                <div className="text-3xl font-bold text-emerald-400 mb-1">{metrics.migration.migrated}</div>
                <div className="text-xs text-zinc-500 uppercase font-bold">Migrados p/ Asaas</div>
                <div className="text-[10px] text-emerald-600 mt-1">
                  {((metrics.migration.migrated / metrics.migration.total) * 100).toFixed(1)}% concluído
                </div>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="mt-8">
              <div className="flex justify-between text-xs text-zinc-500 mb-2">
                <span>Progresso da Migração</span>
                <span>{metrics.migration.migrated} de {metrics.migration.total}</span>
              </div>
              <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-1000"
                  style={{ width: `${(metrics.migration.migrated / metrics.migration.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* DETALHAMENTO DE PAGANTES */}
        {metrics && metrics.paymentDetails && (
          <div className="mb-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <CreditCard size={24} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Detalhamento de Pagantes</h3>
                <p className="text-xs text-zinc-400">Asaas vs Cortesia vs Grace Period</p>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Pagantes REAIS do Asaas */}
              <button
                onClick={() => setUserListModal({ show: true, type: 'asaas', title: 'Pagantes Asaas (Receita Recorrente)' })}
                className="bg-zinc-950 border border-emerald-800/30 hover:border-emerald-600/50 rounded-lg p-5 text-left transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={18} className="text-emerald-400" />
                  <h4 className="font-semibold text-sm">Novo Asaas</h4>
                  <Eye size={14} className="text-emerald-600 ml-auto" />
                </div>
                <div className="text-3xl font-bold text-emerald-400 mb-2">
                  {metrics.paymentDetails.asaasCustomers.count}
                </div>
                <p className="text-xs text-zinc-500 mb-3">Assinaturas no Asaas</p>
                <div className="text-[10px] text-zinc-400">
                  💳 Receita recorrente real
                </div>
              </button>

              {/* Stripe Migrated (Aguardando Asaas) */}
              <button
                onClick={() => setUserListModal({ show: true, type: 'stripe', title: 'Ativos Stripe (Aguardando Migração CPF)' })}
                className="bg-zinc-950 border border-blue-800/30 hover:border-blue-600/50 rounded-lg p-5 text-left transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={18} className="text-blue-400" />
                  <h4 className="font-semibold text-sm">Ativos Stripe</h4>
                  <Eye size={14} className="text-blue-600 ml-auto" />
                </div>
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {metrics.paymentDetails.stripeMigrated.count}
                </div>
                <p className="text-xs text-zinc-500 mb-3">Migração pendente (CPF)</p>
                <div className="text-[10px] text-zinc-400">
                  🔄 Acesso liberado (Legacy)
                </div>
              </button>

              {/* Cortesia Temporária (3 dias) */}
              <button
                onClick={() => setUserListModal({ show: true, type: 'courtesy', title: 'Cortesias Temporárias (Prazo: 3 dias)' })}
                className="bg-zinc-950 border border-purple-800/30 hover:border-purple-600/50 rounded-lg p-5 text-left transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={18} className="text-purple-400" />
                  <h4 className="font-semibold text-sm">Cortesia</h4>
                  <Eye size={14} className="text-purple-600 ml-auto" />
                </div>
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {metrics.paymentDetails.courtesyUsers.count}
                </div>
                <p className="text-xs text-zinc-500 mb-3">Aguardando pagamento</p>
                <div className="text-[10px] text-zinc-400">
                  🎁 Temporário (3 dias)
                </div>
              </button>

              {/* Grace Period - Link dia 10/01 */}
              <button
                onClick={() => setUserListModal({ show: true, type: 'grace', title: 'Grace Period - Link 10/01' })}
                className="bg-zinc-950 border border-amber-800/30 hover:border-amber-600/50 rounded-lg p-5 text-left transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={18} className="text-amber-400" />
                  <h4 className="font-semibold text-sm">Grace Period</h4>
                  <Eye size={14} className="text-amber-600 ml-auto" />
                </div>
                <div className="text-3xl font-bold text-amber-400 mb-2">
                  {metrics.paymentDetails.gracePeriod.toReceiveLinkJan10}
                </div>
                <p className="text-xs text-zinc-500 mb-3">Vão receber link pagto</p>
                <div className="text-[10px] text-zinc-400">
                  📅 Acesso até 10/01
                </div>
              </button>
            </div>

            {/* Lista Detalhada de Usuários em Grace Period */}
            {metrics.paymentDetails.gracePeriod.users.length > 0 && (
              <div className="bg-zinc-950 border border-amber-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" />
                    Usuários que vão receber link dia 10/01 ({metrics.paymentDetails.gracePeriod.toReceiveLinkJan10})
                  </h4>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {metrics.paymentDetails.gracePeriod.users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-amber-600/50 transition"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{user.email}</div>
                        <div className="text-xs text-zinc-500">{user.name || 'Sem nome'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded ${
                            user.plan === 'pro' ? 'bg-purple-900/30 text-purple-400' :
                            user.plan === 'starter' ? 'bg-blue-900/30 text-blue-400' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {user.plan.toUpperCase()}
                          </div>
                          <div className="text-[10px] text-zinc-600 mt-1">
                            Grace: {new Date(user.grace_period_until).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5" />
                    <p className="text-xs text-amber-400">
                      <strong>Ação necessária:</strong> Esses usuários precisam receber um link de pagamento via Stripe no dia 10/01/2025.
                      Configure um script para enviar automaticamente ou gere os links manualmente.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* RENOVAÇÕES E PENDÊNCIAS MIGRACÃO */}
        {metrics && metrics.recurrence && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-600/20 rounded-lg">
                  <AlertTriangle size={20} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Pendências de Migração</h3>
                  <p className="text-xs text-zinc-400">Usuários que travam a receita recorrente</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield size={24} className="text-amber-500" />
                  <div>
                    <div className="text-sm font-medium text-white">Usuários sem CPF/CNPJ</div>
                    <div className="text-xs text-zinc-500">Migração incompleta no Asaas</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-500">{metrics.recurrence.pendingCpf}</div>
              </div>
              <p className="mt-4 text-xs text-zinc-500 italic">
                * Estes usuários não podem ser cobrados pelo Asaas até fornecerem o CPF.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Clock size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Próximas Renovações (7 dias)</h3>
                  <p className="text-xs text-zinc-400">Garantia de retenção e faturamento</p>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {metrics.recurrence.upcomingRenewals.length === 0 ? (
                  <div className="text-center py-4 text-zinc-500 text-sm">Nenhuma renovação crítica esta semana</div>
                ) : (
                  metrics.recurrence.upcomingRenewals.map((ren, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-300">{ren.email || ren.id?.slice(0, 10) + '...'}</span>
                        <span className="text-[10px] text-zinc-500">{ren.type === 'migration' ? 'Migração' : 'Assinatura'}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-blue-400">
                          {new Date(ren.date).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-zinc-600 uppercase">{ren.plan}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card de Custos de IA */}
        {metrics && metrics.aiCosts && (
          <div className="mb-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-600/20 rounded-lg">
                <DollarSign size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Custos de IA (Gemini)</h3>
                <p className="text-xs text-zinc-400">Custo real das requisições à API Gemini</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-400 mb-1">Hoje</div>
                <div className="text-2xl font-bold text-orange-400">
                  ${metrics.aiCosts.today.toFixed(3)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  ≈ R$ {(metrics.aiCosts.today * 5).toFixed(2)}
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-400 mb-1">Últimos 7 dias</div>
                <div className="text-2xl font-bold text-orange-400">
                  ${metrics.aiCosts.week.toFixed(2)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  ≈ R$ {(metrics.aiCosts.week * 5).toFixed(2)}
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-400 mb-1">Este mês</div>
                <div className="text-2xl font-bold text-orange-400">
                  ${metrics.aiCosts.month.toFixed(2)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  ≈ R$ {(metrics.aiCosts.month * 5).toFixed(2)}
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="text-xs text-zinc-400 mb-1">Este ano</div>
                <div className="text-2xl font-bold text-orange-400">
                  ${metrics.aiCosts.year.toFixed(2)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  ≈ R$ {(metrics.aiCosts.year * 5).toFixed(2)}
                </div>
              </div>

              <div className="bg-zinc-950 border border-orange-900/50 rounded-lg p-4">
                <div className="text-xs text-zinc-400 mb-1">Total (all time)</div>
                <div className="text-2xl font-bold text-orange-300">
                  ${metrics.aiCosts.total.toFixed(2)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  ≈ R$ {(metrics.aiCosts.total * 5).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-orange-400 mt-0.5" />
                <div className="text-xs text-zinc-400">
                  <strong className="text-zinc-300">Nota:</strong> Valores em USD baseados no custo real da API Gemini 2.5 Flash Image ($0.039/requisição).
                  Conversão para BRL aproximada (dólar a R$ 5,00).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card de Tickets Pendentes */}


        {/* Card de IP Abuse Stats */}


        {/* SISTEMA DE REMARKETING */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Mail size={24} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Sistema de Remarketing</h3>
                <p className="text-xs text-zinc-400">Converter usuários FREE em pagantes</p>
              </div>
            </div>
            <button
              onClick={loadRemarketingStats}
              disabled={remarketingLoading}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={18} className={`text-zinc-400 ${remarketingLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {!remarketingStats && !remarketingLoading && (
            <button
              onClick={loadRemarketingStats}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Inbox size={18} />
              Carregar Estatísticas
            </button>
          )}

          {remarketingLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="Carregando estatísticas..." />
            </div>
          )}

          {remarketingStats && !remarketingLoading && (
            <>
              {/* Estatísticas Gerais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400 mb-1">Usuários FREE</div>
                  <div className="text-2xl font-bold text-blue-400">{remarketingStats.totalFreeUsers}</div>
                  <div className="text-xs text-zinc-500 mt-1">Potenciais clientes</div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400 mb-1">Total Enviados</div>
                  <div className="text-2xl font-bold text-green-400">
                    {remarketingStats.stats.initial.alreadySent +
                     remarketingStats.stats.reminder.alreadySent +
                     remarketingStats.stats.final.alreadySent}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Todas as campanhas</div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs text-zinc-400 mb-1">Total Pendentes</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {remarketingStats.stats.initial.pending +
                     remarketingStats.stats.reminder.pending +
                     remarketingStats.stats.final.pending}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">Prontos para enviar</div>
                </div>

                <div className="bg-zinc-950 border border-emerald-900/50 rounded-lg p-4">
                  <div className="text-xs text-zinc-400 mb-1">Taxa de Conversão</div>
                  <div className="text-2xl font-bold text-emerald-400">{remarketingStats.conversions.rate}%</div>
                  <div className="text-xs text-zinc-500 mt-1">{remarketingStats.conversions.total} conversões</div>
                </div>
              </div>

              {/* Campanhas */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Campanha Initial */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Send size={16} className="text-blue-400" />
                    <h4 className="font-semibold text-sm">Campanha Initial</h4>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Elegíveis ({remarketingStats.stats.initial.daysRequired}+ dias):</span>
                      <span className="text-white font-medium">{remarketingStats.stats.initial.eligible}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Já enviados:</span>
                      <span className="text-green-400 font-medium">{remarketingStats.stats.initial.alreadySent}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Pendentes:</span>
                      <span className="text-amber-400 font-medium font-bold">{remarketingStats.stats.initial.pending}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setRemarketingModal({ show: true, campaignType: 'initial' })}
                    disabled={remarketingStats.stats.initial.pending === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                  >
                    {remarketingStats.stats.initial.pending > 0
                      ? `Enviar (${remarketingStats.stats.initial.pending})`
                      : 'Nenhum pendente'}
                  </button>
                </div>

                {/* Campanha Reminder */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Send size={16} className="text-purple-400" />
                    <h4 className="font-semibold text-sm">Campanha Reminder</h4>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Elegíveis ({remarketingStats.stats.reminder.daysRequired}+ dias):</span>
                      <span className="text-white font-medium">{remarketingStats.stats.reminder.eligible}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Já enviados:</span>
                      <span className="text-green-400 font-medium">{remarketingStats.stats.reminder.alreadySent}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Pendentes:</span>
                      <span className="text-amber-400 font-medium font-bold">{remarketingStats.stats.reminder.pending}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setRemarketingModal({ show: true, campaignType: 'reminder' })}
                    disabled={remarketingStats.stats.reminder.pending === 0}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                  >
                    {remarketingStats.stats.reminder.pending > 0
                      ? `Enviar (${remarketingStats.stats.reminder.pending})`
                      : 'Nenhum pendente'}
                  </button>
                </div>

                {/* Campanha Final */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Send size={16} className="text-red-400" />
                    <h4 className="font-semibold text-sm">Campanha Final</h4>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Elegíveis ({remarketingStats.stats.final.daysRequired}+ dias):</span>
                      <span className="text-white font-medium">{remarketingStats.stats.final.eligible}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Já enviados:</span>
                      <span className="text-green-400 font-medium">{remarketingStats.stats.final.alreadySent}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Pendentes:</span>
                      <span className="text-amber-400 font-medium font-bold">{remarketingStats.stats.final.pending}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setRemarketingModal({ show: true, campaignType: 'final' })}
                    disabled={remarketingStats.stats.final.pending === 0}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                  >
                    {remarketingStats.stats.final.pending > 0
                      ? `Enviar (${remarketingStats.stats.final.pending})`
                      : 'Nenhum pendente'}
                  </button>
                </div>
              </div>

              {/* Histórico Recente */}
              {remarketingStats.recentCampaigns.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Clock size={16} className="text-zinc-400" />
                    Últimos Envios
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {remarketingStats.recentCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between text-xs py-2 border-b border-zinc-800 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-[10px] font-medium ${
                            campaign.campaign_type === 'initial' ? 'bg-blue-900/30 text-blue-400' :
                            campaign.campaign_type === 'reminder' ? 'bg-purple-900/30 text-purple-400' :
                            'bg-red-900/30 text-red-400'
                          }`}>
                            {campaign.campaign_type}
                          </span>
                          <span className="text-zinc-400">→</span>
                          <span className="text-zinc-300">{(campaign.users as any)?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            campaign.email_status === 'sent' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                          }`}>
                            {campaign.email_status}
                          </span>
                          <span className="text-zinc-500">
                            {new Date(campaign.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles size={14} className="text-blue-400 mt-0.5" />
                  <div className="text-xs text-zinc-400">
                    <strong className="text-zinc-300">Cronograma:</strong> Initial (1 dia após cadastro), Reminder (7 dias), Final (14 dias).
                    O sistema evita duplicatas automaticamente.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Distribuição de Planos + Horário de Pico */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Planos */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-400" />
                Distribuição de Planos
              </h3>
              <div className="space-y-3">
                <PlanBar name="Free" count={metrics.plans.free} total={metrics.general.totalUsers} color="zinc" />
                <PlanBar name="Starter (R$ 50)" count={metrics.plans.starter} total={metrics.general.totalUsers} color="blue" />
                <PlanBar name="Pro (R$ 100)" count={metrics.plans.pro} total={metrics.general.totalUsers} color="purple" />
                <PlanBar name="Studio (R$ 300)" count={metrics.plans.studio || 0} total={metrics.general.totalUsers} color="yellow" />
              </div>
            </div>

            {/* Horário de Pico */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock size={20} className="text-yellow-500" />
                Horário de Pico (24h)
              </h3>
              <div className="mb-4">
                <div className="text-3xl font-bold text-yellow-500">
                  {metrics.activity.peakHour}:00 - {metrics.activity.peakHour + 1}:00
                </div>
                <p className="text-zinc-400 text-sm mt-1">
                  {metrics.activity.peakCount} requisições nesse horário
                </p>
              </div>
              {/* Mini gráfico */}
              <div className="flex items-end justify-between h-20 gap-1">
                {Array.from({ length: 24 }).map((_, i) => {
                  const count = metrics.activity.hourlyActivity[i] || 0;
                  const maxCount = Math.max(...Object.values(metrics.activity.hourlyActivity));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const isPeak = i === metrics.activity.peakHour;

                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all ${
                        isPeak ? 'bg-yellow-500' : 'bg-zinc-700'
                      }`}
                      style={{ height: `${height}%` }}
                      title={`${i}:00 - ${count} requisições`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>0h</span>
                <span>6h</span>
                <span>12h</span>
                <span>18h</span>
                <span>24h</span>
              </div>
            </div>
          </div>
        )}

        {/* Operações Mais Usadas */}
        {metrics && Object.keys(metrics.aiUsage.operations).length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap size={20} className="text-orange-400" />
              Operações Mais Usadas (7 dias)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics.aiUsage.operations)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([operation, count]) => (
                  <div key={operation} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <div className="text-2xl font-bold mb-1">{count}</div>
                    <div className="text-sm text-zinc-400 capitalize">{operation.replace('_', ' ')}</div>
                  </div>
                ))}
            </div>
          </div>
        )}




      {/* Modal de Confirmação de Envio de Remarketing */}
      {remarketingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Mail size={24} className={
                  remarketingModal.campaignType === 'initial' ? 'text-blue-500' :
                  remarketingModal.campaignType === 'reminder' ? 'text-purple-500' :
                  'text-red-500'
                } />
                Enviar Campanha {remarketingModal.campaignType === 'initial' ? 'Initial' : remarketingModal.campaignType === 'reminder' ? 'Reminder' : 'Final'}
              </h3>
              <button
                onClick={() => setRemarketingModal(null)}
                disabled={sendingCampaign}
                className="p-1 hover:bg-zinc-800 rounded-lg transition disabled:opacity-50"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-zinc-400 mb-3">
                Você está prestes a enviar emails de remarketing para usuários FREE que ainda não receberam esta campanha.
              </p>

              {remarketingStats && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Emails a enviar:</span>
                    <span className="text-white font-bold">
                      {remarketingStats.stats[remarketingModal.campaignType].pending}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Tipo de campanha:</span>
                    <span className={`font-medium ${
                      remarketingModal.campaignType === 'initial' ? 'text-blue-400' :
                      remarketingModal.campaignType === 'reminder' ? 'text-purple-400' :
                      'text-red-400'
                    }`}>
                      {remarketingModal.campaignType.charAt(0).toUpperCase() + remarketingModal.campaignType.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Critério:</span>
                    <span className="text-zinc-300">
                      Cadastrados há {remarketingStats.stats[remarketingModal.campaignType].daysRequired}+ dias
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5" />
                  <p className="text-xs text-amber-400">
                    <strong>Atenção:</strong> Esta ação enviará emails reais para os usuários.
                    O sistema já filtra automaticamente quem já recebeu esta campanha.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRemarketingModal(null)}
                disabled={sendingCampaign}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => sendCampaign(remarketingModal.campaignType)}
                disabled={sendingCampaign}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                  remarketingModal.campaignType === 'initial' ? 'bg-blue-600 hover:bg-blue-500' :
                  remarketingModal.campaignType === 'reminder' ? 'bg-purple-600 hover:bg-purple-500' :
                  'bg-red-600 hover:bg-red-500'
                }`}
              >
                {sendingCampaign ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Enviar Agora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Lista de Usuários (Stripe/Cortesia/Grace) */}
      {userListModal && metrics && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-4xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {userListModal.type === 'asaas' && <CreditCard size={24} className="text-emerald-500" />}
                {userListModal.type === 'stripe' && <RefreshCw size={24} className="text-blue-500" />}
                {userListModal.type === 'courtesy' && <Gift size={24} className="text-purple-500" />}
                {userListModal.type === 'grace' && <Calendar size={24} className="text-amber-500" />}
                {userListModal.title}
              </h3>
              <button
                onClick={() => setUserListModal(null)}
                className="p-1 hover:bg-zinc-800 rounded-lg transition"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Lista de usuários com scroll */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {userListModal.type === 'asaas' && metrics.paymentDetails.asaasCustomers.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-zinc-950 border border-emerald-800/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{user.email}</div>
                      <div className="text-xs text-zinc-500">{user.name || 'Sem nome'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          user.plan === 'pro' ? 'bg-purple-900/30 text-purple-400' :
                          user.plan === 'starter' ? 'bg-blue-900/30 text-blue-400' :
                          user.plan === 'studio' ? 'bg-amber-900/30 text-amber-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {user.plan.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1">
                          Asaas: {user.subscription_status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {userListModal.type === 'stripe' && metrics.paymentDetails.stripeMigrated.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-zinc-950 border border-blue-800/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{user.email}</div>
                      <div className="text-xs text-zinc-500">{user.name || 'Sem nome'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          user.plan === 'pro' ? 'bg-purple-900/30 text-purple-400' :
                          user.plan === 'starter' ? 'bg-blue-900/30 text-blue-400' :
                          user.plan === 'studio' ? 'bg-amber-900/30 text-amber-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {user.plan.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-blue-600 mt-1 uppercase font-bold">
                          Migração Pendente
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {userListModal.type === 'courtesy' && metrics.paymentDetails.courtesyUsers.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-zinc-950 border border-purple-800/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{user.email}</div>
                      <div className="text-xs text-zinc-500">{user.name || 'Sem nome'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          user.plan === 'pro' ? 'bg-purple-900/30 text-purple-400' :
                          user.plan === 'starter' ? 'bg-blue-900/30 text-blue-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {user.plan.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1">
                          {user.admin_courtesy_granted_at
                            ? new Date(user.admin_courtesy_granted_at).toLocaleDateString('pt-BR')
                            : 'Migração'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {userListModal.type === 'grace' && metrics.paymentDetails.gracePeriod.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-zinc-950 border border-amber-800/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{user.email}</div>
                      <div className="text-xs text-zinc-500">{user.name || 'Sem nome'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          user.plan === 'pro' ? 'bg-purple-900/30 text-purple-400' :
                          user.plan === 'starter' ? 'bg-blue-900/30 text-blue-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {user.plan.toUpperCase()}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1">
                          Grace: {new Date(user.grace_period_until).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer com ação para cortesias */}
            {userListModal.type === 'courtesy' && metrics.paymentDetails.courtesyUsers.count > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">
                    {metrics.paymentDetails.courtesyUsers.count} usuário(s) precisam receber link de pagamento
                  </div>
                  <button
                    onClick={() => {
                      setUserListModal(null);
                      sendCourtesyLinks();
                    }}
                    disabled={sendingCourtesyLinks}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
                  >
                    <Mail size={16} />
                    {sendingCourtesyLinks ? 'Enviando...' : 'Enviar Links em Massa'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🚨 ALERTAS EM TEMPO REAL - SENTRY (no final do dashboard) */}
      <SentryAlertsDashboard />

      </div>
    </div>
  );
}

// Componente de Card de Métrica
function MetricCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  trend: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-900/20 text-blue-400 border-blue-800/30',
    green: 'bg-green-900/20 text-green-400 border-green-800/30',
    purple: 'bg-purple-900/20 text-purple-400 border-purple-800/30',
    pink: 'bg-pink-900/20 text-pink-400 border-pink-800/30',
    yellow: 'bg-yellow-900/20 text-yellow-400 border-yellow-800/30',
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        {trend === 'live' ? (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live
          </div>
        ) : (
          <div className="text-xs text-zinc-500">{trend}</div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>
    </div>
  );
}

// Componente de Barra de Plano
function PlanBar({
  name,
  count,
  total,
  color,
}: {
  name: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  const colorClasses = {
    zinc: 'bg-zinc-700',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    yellow: 'bg-amber-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-zinc-300">{name}</span>
        <span className="text-zinc-400 font-medium">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            colorClasses[color as keyof typeof colorClasses]
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
