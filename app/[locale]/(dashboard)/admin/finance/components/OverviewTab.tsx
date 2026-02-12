'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Sparkles, Calculator } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { ChartCard } from '../../components/ui/ChartCard';
import { RevenueChart } from '../../components/charts/RevenueChart';

interface OverviewData {
  general: {
    paidUsers: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    stripeHistorical: number;
    asaasReal: number;
    mrr: number;
  };
  revenueTimeline: Array<{ month: string; revenue: number }>;
  aiCosts: {
    today: number;
    week: number;
    month: number;
    year: number;
    total: number;
  };
}

export function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatBRL = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const aiCostBRL = data ? data.aiCosts.month * 5 : 0;
  const estimatedProfit = data ? data.revenue.thisMonth - aiCostBRL : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receita Total"
          value={data ? formatBRL(data.revenue.total) : '...'}
          icon={<DollarSign size={20} />}
          subtitle="Asaas + Stripe histórico"
          loading={loading}
        />
        <StatCard
          title="MRR"
          value={data ? formatBRL(data.revenue.mrr) : '...'}
          icon={<TrendingUp size={20} />}
          subtitle="Receita recorrente mensal"
          loading={loading}
        />
        <StatCard
          title="Custos IA (mês)"
          value={data ? `$${data.aiCosts.month.toFixed(2)}` : '...'}
          icon={<Sparkles size={20} />}
          subtitle={data ? `~ ${formatBRL(aiCostBRL)}` : ''}
          loading={loading}
        />
        <StatCard
          title="Lucro Estimado (mês)"
          value={data ? formatBRL(estimatedProfit) : '...'}
          icon={<Calculator size={20} />}
          subtitle="Receita mês - Custos IA"
          loading={loading}
        />
      </div>

      {/* Revenue Chart */}
      <ChartCard title="Receita ao longo do tempo" loading={loading}>
        {data && <RevenueChart data={data.revenueTimeline} />}
      </ChartCard>

      {/* Summary Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300">Resumo Financeiro</h3>
        </div>
        <div className="divide-y divide-zinc-800">
          <SummaryRow label="Receita Asaas (real)" value={data ? formatBRL(data.revenue.asaasReal) : '...'} loading={loading} />
          <SummaryRow label="Receita Stripe (histórico)" value={data ? formatBRL(data.revenue.stripeHistorical) : '...'} loading={loading} />
          <SummaryRow label="Receita Total" value={data ? formatBRL(data.revenue.total) : '...'} loading={loading} highlight />
          <SummaryRow label="Custos IA (mês)" value={data ? formatBRL(aiCostBRL) : '...'} loading={loading} negative />
          <SummaryRow label="Lucro Estimado (mês)" value={data ? formatBRL(estimatedProfit) : '...'} loading={loading} highlight />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, loading, highlight, negative }: {
  label: string;
  value: string;
  loading: boolean;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${highlight ? 'bg-zinc-950' : ''}`}>
      <span className={`text-sm ${highlight ? 'font-semibold text-zinc-200' : 'text-zinc-400'}`}>{label}</span>
      {loading ? (
        <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
      ) : (
        <span className={`text-sm font-medium ${
          negative ? 'text-red-400' : highlight ? 'text-emerald-400' : 'text-zinc-300'
        }`}>
          {value}
        </span>
      )}
    </div>
  );
}
