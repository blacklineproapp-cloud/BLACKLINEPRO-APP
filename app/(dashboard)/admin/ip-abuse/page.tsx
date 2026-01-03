'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, Activity, Ban, TrendingUp, Search, ChevronDown, ChevronUp, Lock, Unlock, X, Eye } from 'lucide-react';

interface AbuseStats {
  totalSignups: number;
  blockedIPs: number;
  suspiciousIPs: number;
  totalTrialUsage: number;
  topAbusers: Array<{
    ip: string;
    accountsCount: number;
    trialUsageCount: number;
    isBlocked: boolean;
  }>;
}

interface IPDetails {
  ipAddress: string;
  isBlocked: boolean;
  accountsCount: number;
  trialUsageCount: number;
  accounts: Array<{
    email: string;
    clerkId: string;
    userId: string | null;
    createdAt: string;
    isBlocked: boolean;
  }>;
  trials: Array<{
    actionType: string;
    createdAt: string;
    metadata: Record<string, any>;
  }>;
  blockReason?: string;
  blockedAt?: string;
}

export default function IPAbuseStatsPage() {
  const [stats, setStats] = useState<AbuseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIP, setExpandedIP] = useState<string | null>(null);
  const [ipDetails, setIPDetails] = useState<Record<string, IPDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ip-abuse');
      
      if (!res.ok) {
        throw new Error('Erro ao carregar estatísticas');
      }

      const data = await res.json();
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIPDetails = async (ip: string) => {
    if (ipDetails[ip]) {
      // Já tem os detalhes, apenas expandir/colapsar
      setExpandedIP(expandedIP === ip ? null : ip);
      return;
    }

    try {
      setLoadingDetails(ip);
      const res = await fetch(`/api/admin/ip-abuse/details?ip=${encodeURIComponent(ip)}`);
      
      if (!res.ok) {
        throw new Error('Erro ao carregar detalhes');
      }

      const data = await res.json();
      setIPDetails(prev => ({ ...prev, [ip]: data.details }));
      setExpandedIP(ip);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setLoadingDetails(null);
    }
  };

  const handleBlockUnblock = async (ip: string, action: 'block' | 'unblock') => {
    const reason = action === 'block' 
      ? prompt('Motivo do bloqueio:')
      : null;

    if (action === 'block' && !reason) {
      return; // Cancelou
    }

    try {
      setActionLoading(ip);
      const res = await fetch('/api/admin/ip-abuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ipAddress: ip, reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao executar ação');
      }

      // Recarregar stats e detalhes
      await fetchStats();
      if (ipDetails[ip]) {
        delete ipDetails[ip]; // Forçar reload dos detalhes
        await fetchIPDetails(ip);
      }

      alert(`IP ${ip} ${action === 'block' ? 'bloqueado' : 'desbloqueado'} com sucesso!`);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredAbusers = stats?.topAbusers.filter(abuser => 
    abuser.ip.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-400">Carregando estatísticas...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <p className="text-red-400">❌ {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="text-emerald-500" size={32} />
              Sistema Anti-Abuso por IP
            </h1>
            <p className="text-zinc-400 mt-2">
              Monitoramento de múltiplas contas e uso de trials
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Activity size={16} />
            Atualizar
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="text-blue-500" size={24} />
              <span className="text-xs text-zinc-500">Últimos 30 dias</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalSignups}</p>
            <p className="text-sm text-zinc-400 mt-1">Total de Signups</p>
          </div>

          <div className="bg-zinc-900 border border-red-900/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Ban className="text-red-500" size={24} />
              <span className="text-xs text-zinc-500">Bloqueados</span>
            </div>
            <p className="text-3xl font-bold text-red-400">{stats.blockedIPs}</p>
            <p className="text-sm text-zinc-400 mt-1">IPs Bloqueados</p>
          </div>

          <div className="bg-zinc-900 border border-yellow-900/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="text-yellow-500" size={24} />
              <span className="text-xs text-zinc-500">Atenção</span>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{stats.suspiciousIPs}</p>
            <p className="text-sm text-zinc-400 mt-1">IPs Suspeitos (2+ contas)</p>
          </div>

          <div className="bg-zinc-900 border border-emerald-900/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-emerald-500" size={24} />
              <span className="text-xs text-zinc-500">Uso Free</span>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{stats.totalTrialUsage}</p>
            <p className="text-sm text-zinc-400 mt-1">Trials Usados</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:border-emerald-500 outline-none transition text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Top Abusers Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" size={20} />
              Top IPs com Mais Contas
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {filteredAbusers.length} IPs encontrados
            </p>
          </div>

          {filteredAbusers.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="mx-auto text-zinc-700 mb-3" size={48} />
              <p className="text-zinc-500">
                {searchQuery ? 'Nenhum IP encontrado' : 'Nenhum abuso detectado ainda! 🎉'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-zinc-400 w-12"></th>
                    <th className="text-left p-4 text-sm font-medium text-zinc-400">Endereço IP</th>
                    <th className="text-center p-4 text-sm font-medium text-zinc-400">Contas</th>
                    <th className="text-center p-4 text-sm font-medium text-zinc-400">Trials</th>
                    <th className="text-center p-4 text-sm font-medium text-zinc-400">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-zinc-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredAbusers.map((abuser, index) => (
                    <>
                      <tr 
                        key={abuser.ip}
                        className={`hover:bg-zinc-800/50 transition-colors cursor-pointer ${
                          abuser.isBlocked ? 'bg-red-950/20' : ''
                        }`}
                        onClick={() => fetchIPDetails(abuser.ip)}
                      >
                        <td className="p-4">
                          {loadingDetails === abuser.ip ? (
                            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            expandedIP === abuser.ip ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />
                          )}
                        </td>
                        <td className="p-4">
                          <code className="text-sm text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded">
                            {abuser.ip}
                          </code>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            abuser.accountsCount > 3 ? 'bg-red-500/20 text-red-400' :
                            abuser.accountsCount > 1 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            <Users size={14} />
                            {abuser.accountsCount}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-zinc-400">
                            {abuser.trialUsageCount || '—'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {abuser.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                              <Ban size={12} />
                              Bloqueado
                            </span>
                          ) : abuser.accountsCount > 2 ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                              <AlertTriangle size={12} />
                              Suspeito
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                              <Shield size={12} />
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {abuser.isBlocked ? (
                            <button
                              onClick={() => handleBlockUnblock(abuser.ip, 'unblock')}
                              disabled={actionLoading === abuser.ip}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition disabled:opacity-50"
                            >
                              {actionLoading === abuser.ip ? (
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Unlock size={12} />
                              )}
                              Desbloquear
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlockUnblock(abuser.ip, 'block')}
                              disabled={actionLoading === abuser.ip}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition disabled:opacity-50"
                            >
                              {actionLoading === abuser.ip ? (
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Lock size={12} />
                              )}
                              Bloquear
                            </button>
                          )}
                        </td>
                      </tr>
                      
                      {/* Detalhes Expandidos */}
                      {expandedIP === abuser.ip && ipDetails[abuser.ip] && (
                        <tr>
                          <td colSpan={6} className="p-0 bg-zinc-950/50">
                            <div className="p-6 space-y-4">
                              {/* Contas */}
                              <div>
                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                  <Users size={16} className="text-blue-400" />
                                  Contas Criadas ({ipDetails[abuser.ip].accounts.length})
                                </h4>
                                <div className="space-y-2">
                                  {ipDetails[abuser.ip].accounts.map((account) => (
                                    <div key={account.clerkId} className="bg-zinc-900 border border-zinc-800 rounded p-3 flex items-center justify-between">
                                      <div>
                                        <p className="text-sm text-white font-medium">{account.email}</p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                          {new Date(account.createdAt).toLocaleString('pt-BR')}
                                        </p>
                                      </div>
                                      {account.isBlocked && (
                                        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                                          Bloqueado
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Trials */}
                              {ipDetails[abuser.ip].trials.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    <Activity size={16} className="text-emerald-400" />
                                    Uso de Trials ({ipDetails[abuser.ip].trials.length})
                                  </h4>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {ipDetails[abuser.ip].trials.map((trial, idx) => (
                                      <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded p-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm text-zinc-300 capitalize">
                                            {trial.actionType.replace('_', ' ')}
                                          </span>
                                          <span className="text-xs text-zinc-500">
                                            {new Date(trial.createdAt).toLocaleString('pt-BR')}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Info de Bloqueio */}
                              {ipDetails[abuser.ip].isBlocked && ipDetails[abuser.ip].blockReason && (
                                <div className="bg-red-950/30 border border-red-900/50 rounded p-4">
                                  <p className="text-sm text-red-400">
                                    <strong>Motivo do bloqueio:</strong> {ipDetails[abuser.ip].blockReason}
                                  </p>
                                  {ipDetails[abuser.ip].blockedAt && (
                                    <p className="text-xs text-red-400/70 mt-1">
                                      Bloqueado em: {new Date(ipDetails[abuser.ip].blockedAt!).toLocaleString('pt-BR')}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-6">
          <div className="flex gap-3">
            <Shield className="text-blue-400 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-white font-medium mb-2">Como funciona o sistema anti-abuso</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• <strong>Máximo 3 contas por IP</strong> - Após isso, novos signups são bloqueados automaticamente</li>
                <li>• <strong>Janela de 30 dias</strong> - Análise considera apenas contas criadas nos últimos 30 dias</li>
                <li>• <strong>Bloqueio automático</strong> - Conta é deletada via Clerk API se abuso detectado</li>
                <li>• <strong>Rastreamento de trials</strong> - Monitora uso de recursos gratuitos por IP</li>
                <li>• <strong>Ações manuais</strong> - Admin pode bloquear/desbloquear IPs manualmente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
