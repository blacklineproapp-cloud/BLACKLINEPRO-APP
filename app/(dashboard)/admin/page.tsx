'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, DollarSign, Activity, TrendingUp, Search, RefreshCw, Shield,
  Ban, CheckCircle, Clock, Zap, AlertTriangle, Filter, Eye, X as XIcon,
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

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
    editor_only: number;
    full_access: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
  };
  aiUsage: {
    totalRequests: number;
    todayRequests: number;
    operations: Record<string, number>;
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

  // Auto-refresh métricas a cada 30s
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, filterPlan, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) throw new Error('Erro ao carregar métricas');
      const data = await res.json();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
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
  };

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
                <PlanBar name="Editor (R$ 50)" count={metrics.plans.editor_only} total={metrics.general.totalUsers} color="blue" />
                <PlanBar name="Full Access (R$ 100)" count={metrics.plans.full_access} total={metrics.general.totalUsers} color="purple" />
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
                <option value="editor_only">Editor</option>
                <option value="full_access">Full Access</option>
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
                            user.plan === 'full_access'
                              ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30'
                              : user.plan === 'editor_only'
                              ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {user.plan === 'full_access'
                            ? 'Full Access'
                            : user.plan === 'editor_only'
                            ? 'Editor'
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

                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUserAction('change_plan', user.id, {
                                  newPlan: e.target.value,
                                });
                                e.target.value = '';
                              }
                            }}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition outline-none cursor-pointer"
                          >
                            <option value="">Alterar Plano</option>
                            <option value="free">→ Free</option>
                            <option value="editor_only">→ Editor</option>
                            <option value="full_access">→ Full Access</option>
                          </select>

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
