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
  };
  paymentDetails: {
    stripeCustomers: {
      count: number;
      users: Array<{
        id: string;
        email: string;
        name: string;
        plan: string;
        subscription_id: string;
        subscription_status: string;
        created_at: string;
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
}

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  is_paid: boolean;
  is_blocked: boolean;
  blocked_reason: string;
  subscription_status: string;
  tools_unlocked: boolean;
  created_at: string;
  last_active_at: string;
  total_requests: number;
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modais
  const [blockModal, setBlockModal] = useState<{ show: boolean; userId: string; email: string } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Modal de mudança de plano
  const [planChangeModal, setPlanChangeModal] = useState<{ userId: string; email: string; currentPlan: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'starter' | 'pro' | 'studio' | 'enterprise' | 'legacy'>('starter');
  const [planChangeMode, setPlanChangeMode] = useState<'courtesy' | 'recurring'>('courtesy');
  const [sendEmail, setSendEmail] = useState(false);
  const [planChangeLoading, setPlanChangeLoading] = useState(false);

  // Modal de link de pagamento
  const [paymentLinkModal, setPaymentLinkModal] = useState<{ url: string; email: string } | null>(null);

  // Limpeza de duplicados
  const [duplicatesInfo, setDuplicatesInfo] = useState<any>(null);
  const [cleanupLog, setCleanupLog] = useState<string[]>([]);
  
  // Tickets de suporte
  const [ticketCount, setTicketCount] = useState<number>(0);

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
    type: 'stripe' | 'courtesy' | 'grace';
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
      
      // Carregar contagem de tickets pendentes
      try {
        const ticketRes = await fetch('/api/admin/support?status=open&limit=1');
        if (ticketRes.ok) {
          const ticketData = await ticketRes.json();
          setTicketCount((ticketData.counts?.open || 0) + (ticketData.counts?.in_progress || 0));
        }
      } catch (e) { /* ignore */ }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(filterPlan !== 'all' && { plan: filterPlan }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [page, search, filterPlan, filterStatus, router]);

  // Auto-refresh métricas a cada 30s
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      // loadUsers será chamado pelo useEffect acima quando o estado mudar
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUserAction = async (action: string, userId: string, extra?: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          targetUserId: userId,
          ...extra,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao executar ação');
      }

      await loadUsers();
      await loadMetrics();
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  const handleBlock = async () => {
    if (!blockModal || !blockReason.trim()) {
      alert('Digite o motivo do bloqueio');
      return;
    }

    const success = await handleUserAction('block', blockModal.userId, {
      reason: blockReason,
    });

    if (success) {
      setBlockModal(null);
      setBlockReason('');
    }
  };

  // Handler para mudança de plano
  const handlePlanChange = async () => {
    if (!planChangeModal) return;

    setPlanChangeLoading(true);

    try {
      // Legacy: Atribuir diretamente (usuário paga via banner no dashboard)
      if (selectedPlan === 'legacy') {
        const success = await handleUserAction('change_plan', planChangeModal.userId, {
          newPlan: 'legacy',
          isCourtesy: false // Não é cortesia, mas não gera link aqui
        });

        if (success) {
          alert(`✅ Plano Legacy atribuído!\n\n📱 O usuário verá um banner no dashboard para pagar R$ 25/mês.\n\n💡 Após o pagamento, o acesso será liberado automaticamente.`);
          setPlanChangeModal(null);
        }
      } else if (planChangeMode === 'courtesy') {
        // Modo cortesia - ativar plano diretamente
        const success = await handleUserAction('change_plan', planChangeModal.userId, {
          newPlan: selectedPlan,
          isCourtesy: true
        });

        if (success) {
          alert(`Plano ${selectedPlan} ativado como cortesia!`);
          setPlanChangeModal(null);
        }
      } else {
        // Modo recorrente - gerar link de pagamento
        const res = await fetch('/api/admin/create-payment-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: planChangeModal.userId,
            planType: selectedPlan,
            sendEmail: sendEmail
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Erro ao gerar link');
        }

        // Mostrar modal com link
        setPaymentLinkModal({
          url: data.checkoutUrl,
          email: planChangeModal.email
        });
        setPlanChangeModal(null);
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao processar mudança de plano');
    } finally {
      setPlanChangeLoading(false);
    }
  };

  // Copiar link para clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado para a área de transferência!');
  };

  // Funções de limpeza de duplicados
  const addCleanupLog = (msg: string) => {
    setCleanupLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const checkDuplicates = async () => {
    addCleanupLog('🔍 Verificando duplicados...');
    try {
      const res = await fetch('/api/admin/cleanup-duplicates');
      const data = await res.json();
      setDuplicatesInfo(data);

      if (data.duplicates?.length > 0) {
        addCleanupLog(`⚠️  Encontrados ${data.duplicates.length} emails duplicados`);
        data.duplicates.forEach((dup: any) => {
          addCleanupLog(`   ${dup.email} - ${dup.count} usuários`);
        });
      } else {
        addCleanupLog('✅ Nenhum duplicado encontrado!');
      }
    } catch (err: any) {
      addCleanupLog(`❌ Erro: ${err.message}`);
    }
  };

  const activateUser = async (userId: string) => {
    addCleanupLog(`⚡ Ativando usuário ${userId.substring(0, 8)}...`);
    try {
      const res = await fetch('/api/admin/activate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();

      if (data.success) {
        addCleanupLog(`✅ Usuário ativado: ${data.user.email}`);
        await loadMetrics();
        await loadUsers();
      } else {
        addCleanupLog(`❌ Erro: ${data.error}`);
      }
    } catch (err: any) {
      addCleanupLog(`❌ Erro: ${err.message}`);
    }
  };

  const deleteUser = async (userId: string) => {
    addCleanupLog(`🗑️  Deletando usuário ${userId.substring(0, 8)}...`);
    try {
      const res = await fetch(`/api/admin/delete-user?userId=${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        addCleanupLog(`✅ Deletado: ${data.deleted.email}`);
        await loadMetrics();
        await loadUsers();
        await checkDuplicates(); // Verificar novamente
      } else {
        addCleanupLog(`❌ Erro: ${data.error}`);
      }
    } catch (err: any) {
      addCleanupLog(`❌ Erro: ${err.message}`);
    }
  };

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
        body: JSON.stringify({ dryRun: false })
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
              onClick={() => { loadMetrics(); loadUsers(); }}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
            >
              <RefreshCw size={18} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Cards de Métricas Principais */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <MetricCard
              icon={<Users size={20} />}
              title="Total Usuários"
              value={metrics.general.totalUsers}
              subtitle={`${metrics.general.activeUsers} ativos (7d)`}
              trend={`+${Math.round((metrics.general.activeUsers / metrics.general.totalUsers) * 100)}%`}
              color="blue"
            />
            <MetricCard
              icon={<CheckCircle size={20} />}
              title="Pagantes"
              value={metrics.general.paidUsers}
              subtitle={`${conversionRate}% conversão`}
              trend={`${conversionRate}%`}
              color="green"
            />
            <MetricCard
              icon={<Eye size={20} />}
              title="Online Agora"
              value={metrics.general.onlineUsers}
              subtitle="Últimos 5 minutos"
              trend="live"
              color="purple"
            />
            <MetricCard
              icon={<Activity size={20} />}
              title="Requisições IA"
              value={metrics.aiUsage.totalRequests}
              subtitle={`${metrics.aiUsage.todayRequests} hoje`}
              trend={`${metrics.aiUsage.todayRequests}`}
              color="pink"
            />
            <MetricCard
              icon={<DollarSign size={20} />}
              title="Receita Total"
              value={`R$ ${metrics.revenue.total.toFixed(0)}`}
              subtitle={`R$ ${metrics.revenue.thisMonth.toFixed(0)} mês`}
              trend={`R$ ${metrics.revenue.thisMonth.toFixed(0)}`}
              color="yellow"
            />
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
                <p className="text-xs text-zinc-400">Stripe vs Cortesia vs Grace Period</p>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Pagantes REAIS do Stripe */}
              <button
                onClick={() => setUserListModal({ show: true, type: 'stripe', title: 'Pagantes Stripe (Receita Recorrente)' })}
                className="bg-zinc-950 border border-emerald-800/30 hover:border-emerald-600/50 rounded-lg p-5 text-left transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={18} className="text-emerald-400" />
                  <h4 className="font-semibold text-sm">Pagantes Stripe</h4>
                  <Eye size={14} className="text-emerald-600 ml-auto" />
                </div>
                <div className="text-3xl font-bold text-emerald-400 mb-2">
                  {metrics.paymentDetails.stripeCustomers.count}
                </div>
                <p className="text-xs text-zinc-500 mb-3">Assinaturas ativas no Stripe</p>
                <div className="text-xs text-zinc-400">
                  💳 Receita recorrente real
                </div>
              </button>

              {/* Cortesia Permanente */}
              <button
                onClick={() => setUserListModal({ show: true, type: 'courtesy', title: 'Cortesias Permanentes (Migração)' })}
                className="bg-zinc-950 border border-purple-800/30 hover:border-purple-600/50 rounded-lg p-5 text-left transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={18} className="text-purple-400" />
                  <h4 className="font-semibold text-sm">Cortesia Permanente</h4>
                  <Eye size={14} className="text-purple-600 ml-auto" />
                </div>
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {metrics.paymentDetails.courtesyUsers.count}
                </div>
                <p className="text-xs text-zinc-500 mb-3">Acesso gratuito concedido</p>
                <div className="text-xs text-zinc-400">
                  🎁 Precisam receber link Stripe
                </div>
              </button>

              {/* Grace Period - Link dia 10/01 */}
              <button
                onClick={() => setUserListModal({ show: true, type: 'grace', title: 'Grace Period - Link 10/01' })}
                className="bg-zinc-950 border border-amber-800/30 hover:border-amber-600/50 rounded-lg p-5 text-left transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={18} className="text-amber-400" />
                  <h4 className="font-semibold text-sm">Migração (Link 10/01)</h4>
                  <Eye size={14} className="text-amber-600 ml-auto" />
                </div>
                <div className="text-3xl font-bold text-amber-400 mb-2">
                  {metrics.paymentDetails.gracePeriod.toReceiveLinkJan10}
                </div>
                <p className="text-xs text-zinc-500 mb-3">Vão receber link de pagamento</p>
                <div className="text-xs text-zinc-400">
                  📅 Acesso até 10 de janeiro
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
        {ticketCount > 0 && (
          <Link href="/admin/suporte" className="block mb-4">
            <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between hover:border-orange-500/50 transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <HelpCircle size={24} className="text-orange-400" />
                </div>
                <div>
                  <p className="font-semibold text-orange-400">{ticketCount} Ticket(s) Pendente(s)</p>
                  <p className="text-sm text-zinc-400">Clique para gerenciar</p>
                </div>
              </div>
              <ArrowUpRight size={20} className="text-orange-400" />
            </div>
          </Link>
        )}

        {/* Card de IP Abuse Stats */}
        <Link href="/admin/ip-abuse" className="block mb-8">
          <div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/30 rounded-xl p-4 flex items-center justify-between hover:border-red-500/50 transition">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Shield size={24} className="text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-red-400">Sistema Anti-Abuso por IP</p>
                <p className="text-sm text-zinc-400">Monitorar múltiplas contas e trials</p>
              </div>
            </div>
            <ArrowUpRight size={20} className="text-red-400" />
          </div>
        </Link>

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

        {/* CORREÇÃO DE DUPLICADOS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-400" />
            Correção de Usuários Duplicados
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Botões de ação */}
            <div className="space-y-3">
              <button
                onClick={checkDuplicates}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Search size={18} />
                Verificar Duplicados
              </button>

              {duplicatesInfo?.duplicates?.[0] && duplicatesInfo.duplicates[0].users && (
                <>
                  {/* Usar dinamicamente os usuários duplicados encontrados */}
                  {duplicatesInfo.duplicates[0].users.length >= 2 && (
                    <>
                      <button
                        onClick={() => activateUser(duplicatesInfo.duplicates[0].users[0].id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={18} />
                        Ativar: {duplicatesInfo.duplicates[0].users[0].email?.substring(0, 20)}...
                      </button>

                      <button
                        onClick={() => deleteUser(duplicatesInfo.duplicates[0].users[1].id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Ban size={18} />
                        Deletar Duplicado
                      </button>
                    </>
                  )}
                </>
              )}

              <button
                onClick={() => setCleanupLog([])}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Limpar Log
              </button>
            </div>

            {/* Log */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
              {cleanupLog.length === 0 ? (
                <p className="text-zinc-600 text-sm">Clique em &quot;Verificar Duplicados&quot; para começar...</p>
              ) : (
                <div className="space-y-1 font-mono text-xs">
                  {cleanupLog.map((line, i) => (
                    <div
                      key={i}
                      className={`${
                        line.includes('✅') ? 'text-emerald-400' :
                        line.includes('❌') ? 'text-red-400' :
                        line.includes('⚠️') ? 'text-amber-400' :
                        'text-zinc-400'
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold mb-4">Gerenciamento de Usuários</h2>

            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 outline-none transition"
                />
              </div>

              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition"
              >
                <option value="all">Todos os planos</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="studio">Studio</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none transition"
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="blocked">Bloqueados</option>
              </select>

              <button
                onClick={() => {
                  setSearch('');
                  setFilterPlan('all');
                  setFilterStatus('all');
                  setPage(1);
                }}
                className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-lg text-sm transition font-medium"
              >
                Limpar Filtros
              </button>
            </div>

            {metrics && (
              <div className="mt-4 flex items-center gap-6 text-sm text-zinc-400">
                <span>Total: {metrics.general.totalUsers}</span>
                <span className="text-green-400">{metrics.general.paidUsers} pagantes</span>
                <span className="text-red-400">{metrics.general.blockedUsers} bloqueados</span>
              </div>
            )}
          </div>

          {/* Tabela */}
          {loadingUsers ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner text="Carregando usuários..." />
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              Nenhum usuário encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-left bg-zinc-950">
                    <th className="px-6 py-4 text-sm font-semibold text-zinc-400">Usuário</th>
                    <th className="px-6 py-4 text-sm font-semibold text-zinc-400">Plano</th>
                    <th className="px-6 py-4 text-sm font-semibold text-zinc-400">Requisições</th>
                    <th className="px-6 py-4 text-sm font-semibold text-zinc-400">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-zinc-400">Último Acesso</th>
                    <th className="px-6 py-4 text-sm font-semibold text-zinc-400 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800/30 transition"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-sm">{user.email}</div>
                          <div className="text-xs text-zinc-500">
                            {user.name || 'Sem nome'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            user.plan === 'enterprise'
                              ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                              : user.plan === 'studio'
                              ? 'bg-amber-900/30 text-amber-400 border border-amber-800/30'
                              : user.plan === 'pro'
                              ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30'
                              : user.plan === 'starter'
                              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30'
                              : user.plan === 'legacy'
                              ? 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {user.plan === 'enterprise'
                            ? '🏢 Enterprise'
                            : user.plan === 'studio'
                            ? 'Studio'
                            : user.plan === 'pro'
                            ? 'Pro'
                            : user.plan === 'starter'
                            ? 'Starter'
                            : user.plan === 'legacy'
                            ? '🎁 Legacy'
                            : 'Free'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold">{user.total_requests || 0}</div>
                        <div className="text-xs text-zinc-500">total</div>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_blocked ? (
                          <div className="flex items-center gap-2">
                            <Ban size={16} className="text-red-400" />
                            <div>
                              <div className="text-sm text-red-400 font-medium">Bloqueado</div>
                              {user.blocked_reason && (
                                <div className="text-xs text-zinc-500 max-w-[150px] truncate">
                                  {user.blocked_reason}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle size={16} />
                            <span className="text-sm font-medium">Ativo</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {user.last_active_at
                          ? new Date(user.last_active_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {user.is_blocked ? (
                            <button
                              onClick={() => handleUserAction('unblock', user.id)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium transition"
                            >
                              Desbloquear
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setBlockModal({ show: true, userId: user.id, email: user.email })
                              }
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-medium transition"
                            >
                              Bloquear
                            </button>
                          )}


                          <button
                            onClick={() => {
                              setPlanChangeModal({
                                userId: user.id,
                                email: user.email,
                                currentPlan: user.plan
                              });
                              setSelectedPlan(user.plan as any || 'starter');
                              setPlanChangeMode('courtesy');
                              setSendEmail(false);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium transition"
                          >
                            Alterar Plano
                          </button>


                          <button
                            onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                          >
                            {expandedUser === user.id ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition font-medium"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition font-medium"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Bloqueio */}
      {blockModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Ban size={24} className="text-red-500" />
                Bloquear Usuário
              </h3>
              <button
                onClick={() => {
                  setBlockModal(null);
                  setBlockReason('');
                }}
                className="p-1 hover:bg-zinc-800 rounded-lg transition"
              >
                <XIcon size={20} />
              </button>
            </div>

            <p className="text-zinc-400 mb-4">
              Você está prestes a bloquear: <strong className="text-white">{blockModal.email}</strong>
            </p>

            <label className="block mb-2 text-sm font-medium text-zinc-300">
              Motivo do bloqueio *
            </label>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Ex: Violação dos termos de uso..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm focus:border-red-500 outline-none resize-none"
              rows={3}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setBlockModal(null);
                  setBlockReason('');
                }}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBlock}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition"
              >
                Bloquear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mudança de Plano */}
      {planChangeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Alterar Plano</h3>
              <button
                onClick={() => setPlanChangeModal(null)}
                className="p-1 hover:bg-zinc-800 rounded-lg transition"
              >
                <XIcon size={20} />
              </button>
            </div>

            <p className="text-zinc-400 mb-4">
              Usuário: <strong className="text-white">{planChangeModal.email}</strong>
            </p>

            {/* Seletor de Plano */}
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-zinc-300">
                Selecione o Plano
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
              >
                <option value="free">Free (Gratuito)</option>
                <option value="legacy">🎁 Legacy (R$ 25/mês) - APENAS EDITOR</option>
                <option value="starter">Starter (R$ 50/mês)</option>
                <option value="pro">Pro (R$ 100/mês)</option>
                <option value="studio">Studio (R$ 300/mês) - Multi-usuário (3 usuários)</option>
                <option value="enterprise">Enterprise (R$ 600/mês) - Multi-usuário (5 usuários)</option>
              </select>
            </div>

            {/* Aviso especial para plano Legacy */}
            {selectedPlan === 'legacy' && (
              <div className="mb-4 p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-400">
                    <strong>Plano Legacy:</strong> Apenas EDITOR (sem ferramentas premium). 
                    Usuário deve pagar IMEDIATAMENTE (sem cortesia). 
                    Plano secreto para usuários do app anterior.
                  </div>
                </div>
              </div>
            )}

            {/* Modo de Ativação */}
            {selectedPlan !== 'free' && selectedPlan !== 'legacy' && (
              <div className="mb-4">
                <label className="block mb-3 text-sm font-medium text-zinc-300">
                  Modo de Ativação
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-600 transition">
                    <input
                      type="radio"
                      name="mode"
                      value="courtesy"
                      checked={planChangeMode === 'courtesy'}
                      onChange={(e) => setPlanChangeMode(e.target.value as any)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        🎁 Cortesia (Grátis Permanente)
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        O usuário terá acesso sem cobrança
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-600 transition">
                    <input
                      type="radio"
                      name="mode"
                      value="recurring"
                      checked={planChangeMode === 'recurring'}
                      onChange={(e) => setPlanChangeMode(e.target.value as any)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        💳 Cobrança Recorrente
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Gerar link de pagamento Stripe
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Legacy: Apenas modo recorrente (sem cortesia) */}
            {selectedPlan === 'legacy' && (
              <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={18} className="text-emerald-400" />
                  <h4 className="font-semibold text-emerald-400">Modo: Pagamento Imediato</h4>
                </div>
                <p className="text-xs text-zinc-300">
                  Plano Legacy requer <strong>pagamento imediato</strong>. 
                  Ao confirmar, o usuário verá um banner no dashboard com botão para pagar R$ 25/mês via Stripe.
                </p>
              </div>
            )}

            {/* Opção de Email (apenas para modo recorrente) */}
            {planChangeMode === 'recurring' && selectedPlan !== 'free' && (
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded"
                  />
                  📧 Enviar email automático com link de pagamento
                </label>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPlanChangeModal(null)}
                disabled={planChangeLoading}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handlePlanChange}
                disabled={planChangeLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {planChangeLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {selectedPlan === 'free' 
                      ? 'Reverter para Free' 
                      : planChangeMode === 'courtesy' 
                      ? 'Ativar Cortesia' 
                      : 'Gerar Link de Pagamento'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Link de Pagamento */}
      {paymentLinkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle size={24} className="text-green-500" />
                Link de Pagamento Gerado
              </h3>
              <button
                onClick={() => setPaymentLinkModal(null)}
                className="p-1 hover:bg-zinc-800 rounded-lg transition"
              >
                <XIcon size={20} />
              </button>
            </div>

            <p className="text-zinc-400 mb-4">
              Envie este link para: <strong className="text-white">{paymentLinkModal.email}</strong>
            </p>

            <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-4 mb-4">
              <code className="text-xs text-blue-400 break-all">
                {paymentLinkModal.url}
              </code>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(paymentLinkModal.url)}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                📋 Copiar Link
              </button>
              <button
                onClick={() => setPaymentLinkModal(null)}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition"
              >
                Fechar
              </button>
            </div>
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
                {userListModal.type === 'stripe' && <CreditCard size={24} className="text-emerald-500" />}
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
                {userListModal.type === 'stripe' && metrics.paymentDetails.stripeCustomers.users.map((user) => (
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
                          {user.subscription_status}
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
