'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, DollarSign, Activity, TrendingUp, RefreshCw, Shield,
  AlertTriangle, Sparkles, Clock, Eye, Zap
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import SentryAlertsDashboard from './components/SentryAlertsDashboard';
import { StatCard } from './components/ui/StatCard';
import { ChartCard } from './components/ui/ChartCard';
import { RevenueChart } from './components/charts/RevenueChart';
import { PlanDistributionChart } from './components/charts/PlanDistributionChart';
import { PaymentMethodChart } from './components/charts/PaymentMethodChart';

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
    mrr: number;
  };
  revenueTimeline: Array<{ month: string; revenue: number }>;
  paymentMethods: Array<{ method: string; amount: number; count: number }>;
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

export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

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

  const conversionRate = metrics
    ? ((metrics.general.paidUsers / metrics.general.totalUsers) * 100)
    : 0;

  const formatBRL = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-zinc-400 text-sm">Visão geral da plataforma</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-zinc-500">
                {lastRefresh.toLocaleTimeString('pt-BR')}
              </span>
            )}
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-zinc-400">Live</span>
            </div>
            <button
              onClick={loadMetrics}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
            >
              <RefreshCw size={18} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {metrics && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="MRR (Asaas)"
                value={formatBRL(metrics.revenue.mrr)}
                icon={<DollarSign size={20} />}
                trend={{ value: metrics.revenue.thisMonth > 0 ? 100 : 0 }}
                subtitle="Receita recorrente mensal"
              />
              <StatCard
                title="Usuários Ativos (7d)"
                value={metrics.general.activeUsers}
                icon={<Users size={20} />}
                trend={{ value: metrics.general.totalUsers > 0 ? (metrics.general.activeUsers / metrics.general.totalUsers) * 100 : 0 }}
                subtitle={`de ${metrics.general.totalUsers} total`}
              />
              <StatCard
                title="Pagantes"
                value={metrics.general.paidUsers}
                icon={<TrendingUp size={20} />}
                trend={{ value: conversionRate }}
                subtitle={`${conversionRate.toFixed(1)}% de conversão`}
              />
              <StatCard
                title="Online Agora"
                value={metrics.general.onlineUsers}
                icon={<Eye size={20} />}
                subtitle="Últimos 5 minutos"
              />
            </div>

            {/* Charts Row 1: Revenue + Plan Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <ChartCard title="Receita (últimos 12 meses)">
                <RevenueChart data={metrics.revenueTimeline} />
              </ChartCard>
              <ChartCard title="Distribuição por Plano">
                <PlanDistributionChart data={metrics.plans} />
              </ChartCard>
            </div>

            {/* Charts Row 2: Payment Methods + AI Costs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <ChartCard title="Receita por Método de Pagamento">
                <PaymentMethodChart data={metrics.paymentMethods} />
              </ChartCard>

              {/* AI Costs mini cards */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-orange-400" />
                  Custos de IA (Gemini)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-1">Hoje</div>
                    <div className="text-lg font-bold text-orange-400">${metrics.aiCosts.today.toFixed(3)}</div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-1">Semana</div>
                    <div className="text-lg font-bold text-orange-400">${metrics.aiCosts.week.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-1">Mês</div>
                    <div className="text-lg font-bold text-orange-400">${metrics.aiCosts.month.toFixed(2)}</div>
                  </div>
                  <div className="bg-zinc-950 border border-orange-900/50 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-1">Total</div>
                    <div className="text-lg font-bold text-orange-300">${metrics.aiCosts.total.toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-zinc-500">
                  Valores em USD. Conversão aprox: R$ {(metrics.aiCosts.month * 5).toFixed(2)}/mês
                </div>
              </div>
            </div>

            {/* Row 3: Activity + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Activity */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <Activity size={16} className="text-blue-400" />
                  Atividade (24h)
                </h3>
                <div className="mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-yellow-500">{metrics.activity.peakHour}:00</span>
                    <span className="text-xs text-zinc-500">pico ({metrics.activity.peakCount} req)</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {metrics.general.onlineUsers} online agora | {metrics.aiUsage.todayRequests} gerações hoje
                  </div>
                </div>
                {/* Mini hourly chart */}
                <div className="flex items-end justify-between h-16 gap-0.5">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const count = metrics.activity.hourlyActivity[i] || 0;
                    const maxCount = Math.max(...Object.values(metrics.activity.hourlyActivity), 1);
                    const height = (count / maxCount) * 100;
                    const isPeak = i === metrics.activity.peakHour;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all ${isPeak ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${i}:00 — ${count} req`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                  <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                </div>

                {/* Top operations */}
                {Object.keys(metrics.aiUsage.operations).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="text-xs text-zinc-400 mb-2 flex items-center gap-1">
                      <Zap size={12} /> Top Operações (7d)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(metrics.aiUsage.operations)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 4)
                        .map(([op, count]) => (
                          <span key={op} className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                            {op.replace('_', ' ')} <span className="text-zinc-500">{count}</span>
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Alerts */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  Resumo Rápido
                </h3>
                <div className="space-y-3">
                  <AlertItem
                    label="Receita Total (Asaas + Stripe)"
                    value={formatBRL(metrics.revenue.total)}
                    color="emerald"
                  />
                  <AlertItem
                    label="Receita Stripe (histórico)"
                    value={formatBRL(metrics.revenue.stripeHistorical)}
                    color="blue"
                  />
                  <AlertItem
                    label="Receita Asaas (real)"
                    value={formatBRL(metrics.revenue.asaasReal)}
                    color="emerald"
                  />
                  <AlertItem
                    label="Receita este mês"
                    value={formatBRL(metrics.revenue.thisMonth)}
                    color="emerald"
                  />
                  <AlertItem
                    label="Usuários bloqueados"
                    value={String(metrics.general.blockedUsers)}
                    color={metrics.general.blockedUsers > 0 ? 'red' : 'zinc'}
                  />
                  <AlertItem
                    label="IA — Requisições hoje"
                    value={String(metrics.aiUsage.todayRequests)}
                    color="blue"
                  />
                </div>
              </div>
            </div>

            {/* Sentry Alerts */}
            <SentryAlertsDashboard />
          </>
        )}
      </div>
    </div>
  );
}

function AlertItem({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    zinc: 'text-zinc-400',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className={`text-sm font-medium ${colorClasses[color] || 'text-zinc-300'}`}>{value}</span>
    </div>
  );
}
