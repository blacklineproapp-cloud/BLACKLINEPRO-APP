'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Activity, TrendingUp, AlertTriangle, CheckCircle, 
  XCircle, Clock, Eye, RefreshCw, Shield, Database 
} from 'lucide-react';

interface ConsolidatedData {
  clerk: {
    totalUsers: number;
    activeUsers: number;
    lastWeekLogins: number;
    lastMonthLogins: number;
    retention: {
      day1: number;
      day7: number;
      day30: number;
    };
  };
  payments: {
    stripe: {
      totalHistorical: number;
      users: number;
    };
    asaas: {
      activeSubscriptions: number;
      mrr: number;
      totalRevenue: number;
      users: number;
    };
  };
  migration: {
    total: number;
    migrated: number;
    withPayment: number;
    withoutPayment: number;
    pendingCpf: number;
    blocked: number;
  };
  validation: {
    usersUsingAppWithoutPayment: number;
    usersBlockedIncorrectly: number;
    criticalIssues: number;
  };
  summary: {
    revenue: {
      stripe: {
        historical: number;
        period: string;
        users: number;
      };
      asaas: {
        received: number;
        mrr: number;
        projected: number;
        period: string;
        users: number;
        activeSubscriptions: number;
      };
      combined: {
        total: number;
        note: string;
      };
    };
    totalPaidUsers: number;
    conversionRate: string;
  };
}

interface ValidationData {
  stats: {
    totalClerkUsers: number;
    totalSupabaseUsers: number;
    activeClerkUsers: number;
    paidSupabaseUsers: number;
    blockedSupabaseUsers: number;
  };
  issues: {
    usersUsingAppWithoutPayment: {
      count: number;
      severity: string;
      users: any[];
    };
    usersBlockedIncorrectly: {
      count: number;
      severity: string;
      users: any[];
    };
    migratedWithoutAsaasPayment: {
      count: number;
      severity: string;
      users: any[];
    };
    discrepancies: {
      count: number;
      severity: string;
      users: any[];
    };
  };
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highPriorityIssues: number;
    systemHealthScore: number;
  };
}

interface MigrationDetailedData {
  total: number;
  summary: {
    migrated: number;
    pending: number;
    withAsaasPayment: number;
    withoutAsaasPayment: number;
    activeInApp: number;
    blocked: number;
    shouldBeBlocked: number;
    avgMigrationToPaymentGap: number;
  };
  alerts: {
    migratedButNotPaying: { count: number; severity: string; users: any[] };
    usingAppWithoutPayment: { count: number; severity: string; users: any[] };
    blockedButPaying: { count: number; severity: string; users: any[] };
    pendingCpf: { count: number; severity: string; users: any[] };
  };
  users: any[];
}

export default function IntegratedDashboard() {
  const [consolidated, setConsolidated] = useState<ConsolidatedData | null>(null);
  const [validation, setValidation] = useState<ValidationData | null>(null);
  const [migrationDetailed, setMigrationDetailed] = useState<MigrationDetailedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'migration'>('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const [consolidatedRes, validationRes, migrationRes] = await Promise.all([
        fetch('/api/admin/dashboard/consolidated'),
        fetch('/api/admin/validation/access-control'),
        fetch('/api/admin/migration/detailed'),
      ]);

      if (consolidatedRes.ok) {
        const data = await consolidatedRes.json();
        setConsolidated(data);
      }

      if (validationRes.ok) {
        const data = await validationRes.json();
        setValidation(data);
      }

      if (migrationRes.ok) {
        const data = await migrationRes.json();
        setMigrationDetailed(data);
      }
    } catch (error) {
      console.error('[IntegratedDashboard] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <RefreshCw className="animate-spin mx-auto mb-4 text-blue-400" size={32} />
        <p className="text-zinc-400">Carregando dados integrados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-800/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 rounded-xl">
              <Database size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Painel Integrado</h2>
              <p className="text-sm text-zinc-400">Clerk + Supabase + Asaas + Stripe</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
          >
            <RefreshCw size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'validation'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Validação de Bloqueio
            {validation && validation.summary.criticalIssues > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {validation.summary.criticalIssues}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('migration')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'migration'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Status de Migração
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && consolidated && (
        <div className="space-y-6">
          {/* Métricas Clerk */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users size={20} className="text-blue-400" />
              <h3 className="text-lg font-semibold">Métricas Clerk (Usuários & Login)</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Usuários" value={consolidated.clerk.totalUsers} color="blue" />
              <StatCard label="Ativos (7d)" value={consolidated.clerk.activeUsers} color="green" />
              <StatCard label="Logins Semana" value={consolidated.clerk.lastWeekLogins} color="purple" />
              <StatCard label="Logins Mês" value={consolidated.clerk.lastMonthLogins} color="amber" />
            </div>
          </div>

          {/* Métricas de Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-green-400" />
                Stripe (Histórico)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Receita Total</span>
                  <span className="font-bold text-green-400">
                    R$ {consolidated.payments.stripe.totalHistorical.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Usuários</span>
                  <span className="font-bold">{consolidated.payments.stripe.users}</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity size={20} className="text-blue-400" />
                Asaas (Ativo)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">MRR</span>
                  <span className="font-bold text-blue-400">
                    R$ {consolidated.payments.asaas.mrr.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Assinaturas</span>
                  <span className="font-bold">{consolidated.payments.asaas.activeSubscriptions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Usuários</span>
                  <span className="font-bold">{consolidated.payments.asaas.users}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status de Migração */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Status de Migração</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Total" value={consolidated.migration.total} color="zinc" />
              <StatCard label="Migrados" value={consolidated.migration.migrated} color="green" />
              <StatCard label="Com Pagamento" value={consolidated.migration.withPayment} color="blue" />
              <StatCard label="Sem Pagamento" value={consolidated.migration.withoutPayment} color="red" />
              <StatCard label="Pendente CPF" value={consolidated.migration.pendingCpf} color="amber" />
              <StatCard label="Bloqueados" value={consolidated.migration.blocked} color="zinc" />
            </div>
          </div>

          {/* Alertas de Validação */}
          {consolidated.validation.criticalIssues > 0 && (
            <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-red-400" />
                <div>
                  <h3 className="text-lg font-semibold text-red-400">Problemas Críticos Detectados</h3>
                  <p className="text-sm text-zinc-400">Requer atenção imediata</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-red-800/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    {consolidated.validation.usersUsingAppWithoutPayment}
                  </div>
                  <div className="text-sm text-zinc-400">Usando app sem pagamento</div>
                </div>
                <div className="bg-zinc-950 border border-amber-800/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-amber-400 mb-1">
                    {consolidated.validation.usersBlockedIncorrectly}
                  </div>
                  <div className="text-sm text-zinc-400">Bloqueados incorretamente</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Tab */}
      {activeTab === 'validation' && validation && (
        <ValidationTab data={validation} />
      )}

      {/* Migration Tab */}
      {activeTab === 'migration' && migrationDetailed && (
        <MigrationTab data={migrationDetailed} />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    zinc: 'text-zinc-400',
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
      <div className={`text-2xl font-bold mb-1 ${colorClasses[color as keyof typeof colorClasses]}`}>
        {value}
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function ValidationTab({ data }: { data: ValidationData }) {
  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Score de Saúde do Sistema</h3>
          <div className="text-3xl font-bold" style={{
            color: data.summary.systemHealthScore >= 90 ? '#10b981' :
                   data.summary.systemHealthScore >= 70 ? '#f59e0b' : '#ef4444'
          }}>
            {data.summary.systemHealthScore}%
          </div>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${data.summary.systemHealthScore}%`,
              backgroundColor: data.summary.systemHealthScore >= 90 ? '#10b981' :
                             data.summary.systemHealthScore >= 70 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
      </div>

      {/* Issues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IssueCard
          title="Usando App Sem Pagamento"
          count={data.issues.usersUsingAppWithoutPayment.count}
          severity={data.issues.usersUsingAppWithoutPayment.severity}
          users={data.issues.usersUsingAppWithoutPayment.users}
          icon={<XCircle size={20} />}
        />
        <IssueCard
          title="Bloqueados Incorretamente"
          count={data.issues.usersBlockedIncorrectly.count}
          severity={data.issues.usersBlockedIncorrectly.severity}
          users={data.issues.usersBlockedIncorrectly.users}
          icon={<Shield size={20} />}
        />
        <IssueCard
          title="Migrados Sem Pagamento Asaas"
          count={data.issues.migratedWithoutAsaasPayment.count}
          severity={data.issues.migratedWithoutAsaasPayment.severity}
          users={data.issues.migratedWithoutAsaasPayment.users}
          icon={<AlertTriangle size={20} />}
        />
        <IssueCard
          title="Discrepâncias Clerk/Supabase"
          count={data.issues.discrepancies.count}
          severity={data.issues.discrepancies.severity}
          users={data.issues.discrepancies.users}
          icon={<Eye size={20} />}
        />
      </div>
    </div>
  );
}

function IssueCard({ title, count, severity, users, icon }: any) {
  const [expanded, setExpanded] = useState(false);

  const severityColors = {
    CRITICAL: 'border-red-800/30 bg-red-900/10',
    HIGH: 'border-amber-800/30 bg-amber-900/10',
    MEDIUM: 'border-yellow-800/30 bg-yellow-900/10',
    LOW: 'border-zinc-800 bg-zinc-900/50',
  };

  return (
    <div className={`border rounded-xl p-6 ${severityColors[severity as keyof typeof severityColors]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-xs text-zinc-500">{severity}</p>
          </div>
        </div>
        <div className="text-2xl font-bold">{count}</div>
      </div>
      {count > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-400 hover:text-blue-300 transition"
        >
          {expanded ? 'Ocultar' : 'Ver'} detalhes
        </button>
      )}
      {expanded && users && (
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {users.slice(0, 10).map((user: any, i: number) => (
            <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm">
              <div className="font-medium">{user.email}</div>
              {user.lastLogin && (
                <div className="text-xs text-zinc-500">
                  Último login: {new Date(user.lastLogin).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          ))}
          {users.length > 10 && (
            <div className="text-xs text-zinc-500 text-center">
              +{users.length - 10} mais...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MigrationTab({ data }: { data: MigrationDetailedData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredUsers = data.users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.currentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={data.total} color="zinc" />
        <StatCard label="Migrados" value={data.summary.migrated} color="green" />
        <StatCard label="Com Pagamento Asaas" value={data.summary.withAsaasPayment} color="blue" />
        <StatCard label="Ativos no App" value={data.summary.activeInApp} color="purple" />
      </div>

      {/* Alerts */}
      {data.alerts.migratedButNotPaying.count > 0 && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={20} />
            <span className="font-semibold">
              {data.alerts.migratedButNotPaying.count} usuários migrados usando o app sem pagar
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="blocked">Bloqueado</option>
            <option value="pending">Pendente</option>
            <option value="migrated_no_payment">Migrado sem pagamento</option>
          </select>
        </div>
      </div>

      {/* User List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Último Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Stripe 1º Pag</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Asaas 1º Pag</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400">Gap (dias)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredUsers.slice(0, 50).map((user, i) => (
                <tr key={i} className="hover:bg-zinc-950 transition">
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.currentStatus} />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {user.stripeFirstPayment ? new Date(user.stripeFirstPayment).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {user.asaasFirstPayment ? new Date(user.asaasFirstPayment).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {user.migrationToPaymentGapDays !== null ? user.migrationToPaymentGapDays : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length > 50 && (
          <div className="p-4 text-center text-sm text-zinc-500">
            Mostrando 50 de {filteredUsers.length} resultados
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    active: { label: 'Ativo', color: 'bg-green-900/30 text-green-400 border-green-800/30' },
    blocked: { label: 'Bloqueado', color: 'bg-red-900/30 text-red-400 border-red-800/30' },
    pending: { label: 'Pendente', color: 'bg-amber-900/30 text-amber-400 border-amber-800/30' },
    migrated_no_payment: { label: 'Sem Pag', color: 'bg-red-900/30 text-red-400 border-red-800/30' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <span className={`px-2 py-1 text-xs rounded border ${config.color}`}>
      {config.label}
    </span>
  );
}
