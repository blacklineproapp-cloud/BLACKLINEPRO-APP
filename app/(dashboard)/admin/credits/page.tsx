'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Search, Plus, Minus, RefreshCw, X, TrendingUp, Calendar, History
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface UserStats {
  user: {
    id: string;
    email: string;
    name: string;
    plan: string;
    is_paid: boolean;
    admin_courtesy: boolean;
    admin_courtesy_expires_at: string | null;
  };
  credits: {
    balance: number;
  };
  usage: {
    editor: { used: number; limit: number; percentage: number };
    ai: { used: number; limit: number; percentage: number };
    tools: { used: number; limit: number; percentage: number };
  };
  nextReset: string;
}

export default function CreditsPage() {
  const router = useRouter();
  const [searchEmail, setSearchEmail] = useState('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Modais
  const [addModal, setAddModal] = useState(false);
  const [removeModal, setRemoveModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);

  // Form states
  const [addAmount, setAddAmount] = useState('');
  const [addReason, setAddReason] = useState('');
  const [removeAmount, setRemoveAmount] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [history, setHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadUserStats = async () => {
    if (!searchEmail.trim()) {
      alert('Digite um email para buscar');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/credits/user-stats?userEmail=${encodeURIComponent(searchEmail)}`);
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao carregar estatísticas');
      }
      
      const data = await res.json();
      setUserStats(data);
    } catch (err: any) {
      alert(`❌ ${err.message}`);
      setUserStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async () => {
    if (!addAmount || parseInt(addAmount) <= 0 || !addReason.trim()) {
      alert('Preencha quantidade e motivo');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/credits/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: searchEmail,
          amount: parseInt(addAmount),
          reason: addReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar créditos');

      alert(`✅ ${data.message}`);
      setAddModal(false);
      setAddAmount('');
      setAddReason('');
      loadUserStats();
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveCredits = async () => {
    if (!removeAmount || parseInt(removeAmount) <= 0 || !removeReason.trim()) {
      alert('Preencha quantidade e motivo');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/credits/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: searchEmail,
          amount: parseInt(removeAmount),
          reason: removeReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover créditos');

      alert(`✅ ${data.message}`);
      setRemoveModal(false);
      setRemoveAmount('');
      setRemoveReason('');
      loadUserStats();
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetUsage = async () => {
    if (!resetReason.trim() || resetReason.length < 10) {
      alert('Digite um motivo com no mínimo 10 caracteres');
      return;
    }

    if (!confirm('⚠️ Tem certeza que deseja resetar o uso mensal? Esta ação não pode ser desfeita!')) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/credits/reset-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: searchEmail,
          reason: resetReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao resetar uso');

      alert(`✅ ${data.message}`);
      setResetModal(false);
      setResetReason('');
      loadUserStats();
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/credits/history?userEmail=${encodeURIComponent(searchEmail)}`);
      if (!res.ok) throw new Error('Erro ao carregar histórico');
      
      const data = await res.json();
      setHistory(data);
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl">
              <Zap size={24} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Gestão de Créditos</h1>
              <p className="text-zinc-400 text-sm">Adicionar, remover e gerenciar créditos de usuários</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                placeholder="Digite o email do usuário..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadUserStats()}
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <button
              onClick={loadUserStats}
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center gap-2"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
              Buscar
            </button>
          </div>
        </div>

        {/* User Stats */}
        {userStats && (
          <>
            {/* User Info Card */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{userStats.user.email}</h3>
                  <p className="text-sm text-zinc-400">{userStats.user.name || 'Sem nome'}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  userStats.user.plan === 'pro' ? 'bg-purple-900/30 text-purple-400' :
                  userStats.user.plan === 'studio' ? 'bg-blue-900/30 text-blue-400' :
                  userStats.user.plan === 'starter' ? 'bg-emerald-900/30 text-emerald-400' :
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  {userStats.user.plan.toUpperCase()}
                </span>
              </div>

              {/* Credits Balance */}
              <div className="bg-zinc-950 border border-emerald-800/30 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Saldo de Créditos</p>
                    <p className="text-3xl font-bold text-emerald-400">{userStats.credits.balance}</p>
                  </div>
                  <Zap size={32} className="text-emerald-400" />
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => setAddModal(true)}
                  className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Adicionar
                </button>
                <button
                  onClick={() => setRemoveModal(true)}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <Minus size={16} />
                  Remover
                </button>
                <button
                  onClick={() => setResetModal(true)}
                  className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Resetar Uso
                </button>
                <button
                  onClick={() => { setHistoryModal(true); loadHistory(); }}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <History size={16} />
                  Histórico
                </button>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Editor</span>
                  <span className="text-xs text-zinc-500">{userStats.usage.editor.percentage}%</span>
                </div>
                <div className="mb-2">
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(userStats.usage.editor.percentage, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-zinc-400">
                  {userStats.usage.editor.used} / {userStats.usage.editor.limit || '∞'}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">IA</span>
                  <span className="text-xs text-zinc-500">{userStats.usage.ai.percentage}%</span>
                </div>
                <div className="mb-2">
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(userStats.usage.ai.percentage, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-zinc-400">
                  {userStats.usage.ai.used} / {userStats.usage.ai.limit || '∞'}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Ferramentas</span>
                  <span className="text-xs text-zinc-500">{userStats.usage.tools.percentage}%</span>
                </div>
                <div className="mb-2">
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(userStats.usage.tools.percentage, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-zinc-400">
                  {userStats.usage.tools.used} / {userStats.usage.tools.limit || '∞'}
                </p>
              </div>
            </div>

            {/* Next Reset */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex items-center gap-3">
              <Calendar size={20} className="text-zinc-400" />
              <div>
                <p className="text-sm text-zinc-400">Próximo reset de limites</p>
                <p className="text-sm font-medium">{new Date(userStats.nextReset).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </>
        )}

        {/* Add Credits Modal */}
        {addModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Adicionar Créditos</h3>
                <button onClick={() => setAddModal(false)} className="text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-emerald-600 focus:outline-none"
                    placeholder="Ex: 100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Motivo (mínimo 10 caracteres)</label>
                  <textarea
                    value={addReason}
                    onChange={(e) => setAddReason(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-emerald-600 focus:outline-none"
                    rows={3}
                    maxLength={500}
                    placeholder="Ex: Compensação por problema técnico..."
                  />
                </div>
                <button
                  onClick={handleAddCredits}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium transition"
                >
                  {actionLoading ? 'Adicionando...' : 'Adicionar Créditos'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Credits Modal */}
        {removeModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Remover Créditos</h3>
                <button onClick={() => setRemoveModal(false)} className="text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Saldo atual: <strong className="text-emerald-400">{userStats?.credits.balance}</strong> créditos
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    max={userStats?.credits.balance || 10000}
                    value={removeAmount}
                    onChange={(e) => setRemoveAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-emerald-600 focus:outline-none"
                    placeholder="Ex: 50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Motivo (mínimo 10 caracteres)</label>
                  <textarea
                    value={removeReason}
                    onChange={(e) => setRemoveReason(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-emerald-600 focus:outline-none"
                    rows={3}
                    maxLength={500}
                    placeholder="Ex: Ajuste por erro de cobrança..."
                  />
                </div>
                <button
                  onClick={handleRemoveCredits}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg font-medium transition"
                >
                  {actionLoading ? 'Removendo...' : 'Remover Créditos'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Usage Modal */}
        {resetModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Resetar Uso Mensal</h3>
                <button onClick={() => setResetModal(false)} className="text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-orange-400 mb-4">
                ⚠️ Esta ação resetará todo o uso mensal do usuário. Use apenas em emergências!
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Motivo (mínimo 10 caracteres)</label>
                  <textarea
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-emerald-600 focus:outline-none"
                    rows={3}
                    maxLength={500}
                    placeholder="Ex: Reset emergencial por problema no sistema..."
                  />
                </div>
                <button
                  onClick={handleResetUsage}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg font-medium transition"
                >
                  {actionLoading ? 'Resetando...' : 'Resetar Uso'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {historyModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-4xl w-full my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Histórico Completo</h3>
                <button onClick={() => setHistoryModal(false)} className="text-zinc-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              {historyLoading ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner text="Carregando histórico..." />
                </div>
              ) : history ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  <h4 className="font-semibold text-sm text-zinc-400">Transações de Créditos</h4>
                  {history.transactions?.length > 0 ? (
                    <div className="space-y-2">
                      {history.transactions.map((tx: any) => (
                        <div key={tx.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{tx.type}</p>
                              <p className="text-xs text-zinc-500">{new Date(tx.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                            <span className={`text-lg font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">Nenhuma transação encontrada</p>
                  )}

                  <h4 className="font-semibold text-sm text-zinc-400 mt-6">Histórico de Uso (Últimas 100)</h4>
                  {history.usageHistory?.length > 0 ? (
                    <div className="space-y-2">
                      {history.usageHistory.slice(0, 20).map((usage: any) => (
                        <div key={usage.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{usage.operation_type}</p>
                              <p className="text-xs text-zinc-500">{new Date(usage.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                            <span className="text-xs text-zinc-400">{usage.usage_type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">Nenhum uso registrado</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
