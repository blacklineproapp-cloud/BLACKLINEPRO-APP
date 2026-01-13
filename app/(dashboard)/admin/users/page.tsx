'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Filter, RefreshCw, Ban, CheckCircle, X as XIcon, Eye, ChevronDown, ChevronUp,
  Activity, DollarSign, Sparkles, Calendar, CreditCard
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import UserGalleries from '../components/UserGalleries';

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

interface UserActivity {
  loading: boolean;
  data: any[] | null;
  stats: {
    totalCost: number;
    byType: {
      editor: number;
      ai: number;
      tools: number;
    };
  } | null;
}

export default function UsersManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, free: 0, blocked: 0 });
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Modais
  const [blockModal, setBlockModal] = useState<{ show: boolean; userId: string; email: string } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [planChangeModal, setPlanChangeModal] = useState<{ userId: string; email: string; currentPlan: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'starter' | 'pro' | 'studio' | 'enterprise' | 'legacy'>('starter');
  const [planChangeMode, setPlanChangeMode] = useState<'courtesy' | 'recurring'>('courtesy');
  const [sendEmail, setSendEmail] = useState(false);
  const [planChangeLoading, setPlanChangeLoading] = useState(false);

  // Usuário expandido
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userActivities, setUserActivities] = useState<Record<string, UserActivity>>({});

  const loadUsers = useCallback(async (searchQuery?: string, planFilter?: string, statusFilter?: string) => {
    try {
      setLoading(true);
      
      // Construir query params para busca server-side
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (planFilter && planFilter !== 'all') params.set('plan', planFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      
      const data = await res.json();
      setUsers(data.users || []);
      setStats(data.stats || { total: 0, paid: 0, free: 0, blocked: 0 });
    } catch (err: any) {
      console.error('Erro:', err);
      alert('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtrar usuários (busca local adicional para refinamento rápido)
  const filteredUsers = users.filter(u => {
    // Busca livre: email, nome, id, plano
    const searchLower = search.toLowerCase();
    const matchSearch = !search || 
      u.email?.toLowerCase().includes(searchLower) || 
      u.name?.toLowerCase().includes(searchLower) ||
      u.id?.toLowerCase().includes(searchLower) ||
      u.plan?.toLowerCase().includes(searchLower);
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan;
    const matchStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && !u.is_blocked) ||
      (filterStatus === 'blocked' && u.is_blocked);
    
    return matchSearch && matchPlan && matchStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Ações de usuário
  const handleUserAction = async (action: string, userId: string, data?: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          targetUserId: userId,
          ...data 
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro na ação');
      }

      await loadUsers();
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

  // Carregar atividades do usuário
  const loadUserActivity = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }

    setExpandedUser(userId);

    if (userActivities[userId]?.data) {
      return;
    }

    setUserActivities(prev => ({
      ...prev,
      [userId]: { loading: true, data: null, stats: null }
    }));

    try {
      const res = await fetch(`/api/admin/users/${userId}/activity`);
      if (!res.ok) throw new Error('Erro ao carregar atividades');
      
      const data = await res.json();
      
      setUserActivities(prev => ({
        ...prev,
        [userId]: { loading: false, data: data.activities, stats: data.stats }
      }));
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      setUserActivities(prev => ({
        ...prev,
        [userId]: { loading: false, data: null, stats: null }
      }));
    }
  };

  // Handler para mudança de plano
  const handlePlanChange = async () => {
    if (!planChangeModal) return;

    setPlanChangeLoading(true);

    try {
      if (selectedPlan === 'legacy') {
        const success = await handleUserAction('change_plan', planChangeModal.userId, {
          newPlan: 'legacy',
          isCourtesy: false
        });

        if (success) {
          alert(`✅ Plano Legacy atribuído!\n\n📱 O usuário verá um banner no dashboard para pagar R$ 25/mês.\n\n💡 Após o pagamento, o acesso será liberado automaticamente.`);
          setPlanChangeModal(null);
        }
      } else if (planChangeMode === 'courtesy') {
        const success = await handleUserAction('change_plan', planChangeModal.userId, {
          newPlan: selectedPlan,
          isCourtesy: true
        });

        if (success) {
          alert(`Plano ${selectedPlan} ativado como cortesia!`);
          setPlanChangeModal(null);
        }
      } else {
        const res = await fetch('/api/admin/create-payment-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: planChangeModal.userId,
            plan: selectedPlan,
            sendEmail
          })
        });

        const data = await res.json();

        if (data.success) {
          alert(`✅ Link de pagamento criado!\n\n${sendEmail ? '📧 Email enviado para o usuário' : '📋 Link copiado para área de transferência'}\n\n🔗 ${data.checkoutUrl}`);
          if (!sendEmail) {
            navigator.clipboard.writeText(data.checkoutUrl);
          }
          setPlanChangeModal(null);
        } else {
          alert(`❌ ${data.error}`);
        }
      }
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setPlanChangeLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando usuários..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Gerenciamento de Usuários</h1>
              <p className="text-zinc-400 text-sm">Gerenciar, bloquear e visualizar todos os usuários</p>
            </div>
          </div>
          <button
            onClick={() => loadUsers()}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
          >
            <RefreshCw size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Total</div>
            <div className="text-2xl font-bold">{loading ? '-' : stats.total}</div>
          </div>
          <div className="bg-zinc-950 border border-emerald-800/30 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Pagos</div>
            <div className="text-2xl font-bold text-emerald-400">{loading ? '-' : stats.paid}</div>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Gratuitos</div>
            <div className="text-2xl font-bold text-zinc-400">{loading ? '-' : stats.free}</div>
          </div>
          <div className="bg-zinc-950 border border-red-800/30 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Bloqueados</div>
            <div className="text-2xl font-bold text-red-400">{loading ? '-' : stats.blocked}</div>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold mb-4">Lista de Usuários</h2>

            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-zinc-500" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por email, nome, ID..."
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
                <option value="enterprise">Enterprise</option>
                <option value="legacy">Legacy</option>
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
                }}
                className="bg-zinc-950 border border-zinc-700 hover:bg-zinc-800 rounded-lg px-4 py-2.5 text-sm transition font-medium"
              >
                Limpar Filtros
              </button>
            </div>

            <p className="text-sm text-zinc-500 mt-3">
              Mostrando {filteredUsers.length} de {users.length} usuários
            </p>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-950 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Plano
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Uso Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Última Atividade
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {paginatedUsers.map((u) => (
                    <Fragment key={u.id}>
                      <tr className="hover:bg-zinc-900/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold">
                              {u.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{u.email}</div>
                              <div className="text-xs text-zinc-500">
                                {u.name || 'Sem nome'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              u.plan === 'enterprise'
                                ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                                : u.plan === 'studio'
                                ? 'bg-amber-900/30 text-amber-400 border border-amber-800/30'
                                : u.plan === 'pro'
                                ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30'
                                : u.plan === 'starter'
                                ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30'
                                : u.plan === 'legacy'
                                ? 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {u.plan === 'enterprise'
                              ? '🏢 Enterprise'
                              : u.plan === 'studio'
                              ? 'Studio'
                              : u.plan === 'pro'
                              ? 'Pro'
                              : u.plan === 'starter'
                              ? 'Starter'
                              : u.plan === 'legacy'
                              ? '🎁 Legacy'
                              : 'Free'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold">{u.total_requests || 0}</div>
                          <div className="text-xs text-zinc-500">total</div>
                        </td>
                        <td className="px-6 py-4">
                          {u.is_blocked ? (
                            <div className="flex items-center gap-2">
                              <Ban size={16} className="text-red-400" />
                              <div>
                                <div className="text-sm text-red-400 font-medium">Bloqueado</div>
                                {u.blocked_reason && (
                                  <div className="text-xs text-zinc-500 max-w-[150px] truncate">
                                    {u.blocked_reason}
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
                          {u.last_active_at
                            ? new Date(u.last_active_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            {u.is_blocked ? (
                              <button
                                onClick={() => handleUserAction('unblock', u.id)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium transition"
                              >
                                Desbloquear
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setBlockModal({ show: true, userId: u.id, email: u.email })
                                }
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-xs font-medium transition"
                              >
                                Bloquear
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setPlanChangeModal({
                                  userId: u.id,
                                  email: u.email,
                                  currentPlan: u.plan
                                });
                                setSelectedPlan(u.plan as any || 'starter');
                                setPlanChangeMode('courtesy');
                                setSendEmail(false);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium transition"
                            >
                              Mudar Plano
                            </button>

                            <button
                              onClick={() => loadUserActivity(u.id)}
                              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-medium transition flex items-center gap-1"
                            >
                              {expandedUser === u.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {expandedUser === u.id ? 'Ocultar' : 'Ver Detalhes'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Linha expandida com detalhes */}
                      {expandedUser === u.id && (
                        <tr>
                          <td colSpan={6} className="px-6 py-6 bg-zinc-950">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* COLUNA 1: Histórico de Atividades */}
                              <div className="space-y-4">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  <Activity size={16} className="text-blue-400" />
                                  Histórico de Atividades
                                </h4>

                                {/* Stats resumidas */}
                                {userActivities[u.id]?.stats && (
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <span className="flex items-center gap-1">
                                      <span className="text-blue-400">●</span>
                                      <span>Editor: {userActivities[u.id]?.stats?.byType.editor}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="text-purple-400">●</span>
                                      <span>IA: {userActivities[u.id]?.stats?.byType.ai}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="text-emerald-400">●</span>
                                      <span>Tools: {userActivities[u.id]?.stats?.byType.tools}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <DollarSign size={12} className="text-yellow-400" />
                                      <span>R$ {userActivities[u.id]?.stats?.totalCost.toFixed(2)}</span>
                                    </span>
                                  </div>
                                )}

                                {/* Loading */}
                                {userActivities[u.id]?.loading && (
                                  <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="animate-spin text-emerald-400" size={20} />
                                    <span className="ml-2 text-sm text-zinc-400">Carregando histórico...</span>
                                  </div>
                                )}

                                {/* Tabela de atividades */}
                                {(userActivities[u.id]?.data?.length ?? 0) > 0 && (
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                                          <th className="text-left py-2 px-3 font-medium">Data/Hora</th>
                                          <th className="text-left py-2 px-3 font-medium">Tipo</th>
                                          <th className="text-left py-2 px-3 font-medium">Operação</th>
                                          <th className="text-right py-2 px-3 font-medium">Custo</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {userActivities[u.id]?.data?.map((activity: any) => (
                                          <tr key={activity.id} className="text-sm border-b border-zinc-800/50 hover:bg-zinc-900/50 transition">
                                            <td className="py-2 px-3 text-zinc-400">
                                              {new Date(activity.created_at).toLocaleString('pt-BR', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </td>
                                            <td className="py-2 px-3">
                                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                activity.usage_type === 'editor_generation' 
                                                  ? 'bg-blue-500/20 text-blue-400'
                                                  : activity.usage_type === 'ai_request'
                                                  ? 'bg-purple-500/20 text-purple-400'
                                                  : 'bg-emerald-500/20 text-emerald-400'
                                              }`}>
                                                {activity.usage_type === 'editor_generation' ? 'Editor' :
                                                 activity.usage_type === 'ai_request' ? 'IA Gen' : 'Tool'}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 text-zinc-300 font-mono text-xs">
                                              {activity.operation_type}
                                            </td>
                                            <td className="py-2 px-3 text-right text-zinc-400 font-mono text-xs">
                                              R$ {(activity.cost || 0).toFixed(4)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Empty state */}
                                {userActivities[u.id]?.data?.length === 0 && (
                                  <div className="text-center py-8 text-zinc-500 text-sm">
                                    <Activity size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Nenhuma atividade registrada</p>
                                  </div>
                                )}
                              </div>

                              {/* COLUNA 2: Galerias de Imagens */}
                              <UserGalleries userId={u.id} userEmail={u.email} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CreditCard size={24} className="text-blue-500" />
                Mudar Plano
              </h3>
              <button
                onClick={() => setPlanChangeModal(null)}
                className="p-1 hover:bg-zinc-800 rounded-lg transition"
              >
                <XIcon size={20} />
              </button>
            </div>

            <p className="text-zinc-400 mb-4">
              Alterar plano de: <strong className="text-white">{planChangeModal.email}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-zinc-300">
                  Novo Plano
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="studio">Studio</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="legacy">Legacy</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-zinc-300">
                  Modo
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPlanChangeMode('courtesy')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      planChangeMode === 'courtesy'
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Cortesia
                  </button>
                  <button
                    onClick={() => setPlanChangeMode('recurring')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      planChangeMode === 'recurring'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    Recorrente
                  </button>
                </div>
              </div>

              {planChangeMode === 'recurring' && selectedPlan !== 'legacy' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="sendEmail" className="text-sm text-zinc-300">
                    Enviar email com link de pagamento
                  </label>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setPlanChangeModal(null)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePlanChange}
                  disabled={planChangeLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition"
                >
                  {planChangeLoading ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
