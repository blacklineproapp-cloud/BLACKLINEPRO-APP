'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gift, Search, Filter, Plus, RefreshCw, X, Calendar,
  AlertTriangle, CheckCircle, Clock, Mail
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';

interface CourtesyUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  admin_courtesy_expires_at: string;
  admin_courtesy_granted_at: string;
  created_at: string;
}

export default function CourtesyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [courtesies, setCourtesies] = useState<CourtesyUser[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0 });
  
  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modais
  const [grantModal, setGrantModal] = useState(false);
  const [revokeModal, setRevokeModal] = useState<{ userId: string; email: string } | null>(null);
  const [renewModal, setRenewModal] = useState<{ userId: string; email: string; currentExpiry: string } | null>(null);

  // Form states
  const [grantForm, setGrantForm] = useState({
    userEmail: '',
    plan: 'ink' as 'ink' | 'pro' | 'studio',
    expirationDate: '',
    sendEmail: false,
    notes: ''
  });
  const [revokeReason, setRevokeReason] = useState('');
  const [renewDate, setRenewDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadCourtesies = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
        plan: planFilter,
        ...(search && { search })
      });

      const res = await fetch(`/api/admin/courtesy/list?${params}`);
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) throw new Error('Erro ao carregar cortesias');
      
      const data = await res.json();
      setCourtesies(data.courtesies || []);
      setStats(data.stats || { total: 0, active: 0, expired: 0 });
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Erro:', err);
      alert('Erro ao carregar cortesias');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, planFilter, search, router]);

  useEffect(() => {
    loadCourtesies();
  }, [loadCourtesies]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleGrant = async () => {
    if (!grantForm.userEmail || !grantForm.expirationDate) {
      alert('Preencha email e data de expiração');
      return;
    }

    setActionLoading(true);
    try {
      // Converter datetime-local para ISO 8601 com timezone
      const isoDate = new Date(grantForm.expirationDate).toISOString();
      
      const res = await fetch('/api/admin/courtesy/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...grantForm,
          expirationDate: isoDate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao conceder cortesia');

      alert(`✅ Cortesia concedida para ${data.user.email}!`);
      setGrantModal(false);
      setGrantForm({ userEmail: '', plan: 'ink', expirationDate: '', sendEmail: false, notes: '' });
      loadCourtesies();
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeModal || !revokeReason.trim() || revokeReason.length < 10) {
      alert('Digite um motivo com no mínimo 10 caracteres');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/courtesy/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: revokeModal.userId, reason: revokeReason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao revogar');

      alert(`✅ Cortesia revogada!`);
      setRevokeModal(null);
      setRevokeReason('');
      loadCourtesies();
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    if (!renewModal || !renewDate) {
      alert('Selecione uma nova data');
      return;
    }

    setActionLoading(true);
    try {
      // Converter datetime-local para ISO 8601 com timezone
      const isoDate = new Date(renewDate).toISOString();
      
      const res = await fetch('/api/admin/courtesy/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: renewModal.userId, newExpirationDate: isoDate })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao renovar');

      alert(`✅ Cortesia renovada!`);
      setRenewModal(null);
      setRenewDate('');
      loadCourtesies();
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const isExpired = (date: string) => new Date(date) <= new Date();

  if (loading && courtesies.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando cortesias..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
              <Gift size={24} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Gestão de Cortesias</h1>
              <p className="text-zinc-400 text-sm">Conceder, renovar e revogar acessos temporários</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadCourtesies}
            >
              <RefreshCw size={18} className="text-zinc-400" />
            </Button>
            <Button
              onClick={() => setGrantModal(true)}
              className="gap-2"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Conceder Cortesia</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={16} className="text-purple-400" />
              <span className="text-sm text-zinc-400">Total</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-zinc-950 border border-indigo-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-indigo-400" />
              <span className="text-sm text-zinc-400">Ativas</span>
            </div>
            <div className="text-2xl font-bold text-indigo-400">{stats.active}</div>
          </div>
          <div className="bg-zinc-950 border border-red-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm text-zinc-400">Expiradas</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{stats.expired}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="expired">Expiradas</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">Todos os planos</option>
              <option value="ink">Blackline Ink</option>
              <option value="pro">Blackline Pro</option>
              <option value="studio">Blackline Studio</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Plano</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Expira em</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {courtesies.map((courtesy) => {
                  const expired = isExpired(courtesy.admin_courtesy_expires_at);
                  return (
                    <tr key={courtesy.id} className="hover:bg-zinc-900/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium">{courtesy.email}</div>
                        <div className="text-xs text-zinc-500">{courtesy.name || 'Sem nome'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          courtesy.plan === 'pro' ? 'bg-purple-900/30 text-purple-400' :
                          courtesy.plan === 'studio' ? 'bg-blue-900/30 text-blue-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {courtesy.plan.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-zinc-500" />
                          <span className="text-sm">{new Date(courtesy.admin_courtesy_expires_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs font-medium">Expirada</span>
                        ) : (
                          <span className="px-2 py-1 bg-indigo-900/30 text-indigo-400 rounded text-xs font-medium">Ativa</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRenewModal({ userId: courtesy.id, email: courtesy.email, currentExpiry: courtesy.admin_courtesy_expires_at })}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400"
                          >
                            Renovar
                          </Button>
                          <Button
                            variant="danger-subtle"
                            size="sm"
                            onClick={() => setRevokeModal({ userId: courtesy.id, email: courtesy.email })}
                          >
                            Revogar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-zinc-400">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>

        {/* Grant Modal */}
        {grantModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Conceder Cortesia</h3>
                <Button variant="ghost" size="icon" onClick={() => setGrantModal(false)} aria-label="Fechar">
                  <X size={20} />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email do usuário</label>
                  <input
                    type="email"
                    value={grantForm.userEmail}
                    onChange={(e) => setGrantForm({ ...grantForm, userEmail: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-600 focus:outline-none"
                    placeholder="usuario@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Plano</label>
                  <select
                    value={grantForm.plan}
                    onChange={(e) => setGrantForm({ ...grantForm, plan: e.target.value as any })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="ink">Blackline Ink</option>
                    <option value="pro">Blackline Pro</option>
                    <option value="studio">Blackline Studio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Data de expiração</label>
                  <input
                    type="datetime-local"
                    value={grantForm.expirationDate}
                    onChange={(e) => setGrantForm({ ...grantForm, expirationDate: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={grantForm.sendEmail}
                      onChange={(e) => setGrantForm({ ...grantForm, sendEmail: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Enviar email de notificação</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notas (opcional)</label>
                  <textarea
                    value={grantForm.notes}
                    onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-600 focus:outline-none"
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <Button
                  onClick={handleGrant}
                  disabled={actionLoading}
                  className="w-full"
                >
                  {actionLoading ? 'Concedendo...' : 'Conceder Cortesia'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Revoke Modal */}
        {revokeModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Revogar Cortesia</h3>
                <Button variant="ghost" size="icon" onClick={() => setRevokeModal(null)} aria-label="Fechar">
                  <X size={20} />
                </Button>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Tem certeza que deseja revogar a cortesia de <strong>{revokeModal.email}</strong>?
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Motivo (mínimo 10 caracteres)</label>
                  <textarea
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-600 focus:outline-none"
                    rows={3}
                    maxLength={500}
                    placeholder="Ex: Violação dos termos de uso..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setRevokeModal(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRevoke}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    {actionLoading ? 'Revogando...' : 'Revogar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Renew Modal */}
        {renewModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Renovar Cortesia</h3>
                <Button variant="ghost" size="icon" onClick={() => setRenewModal(null)} aria-label="Fechar">
                  <X size={20} />
                </Button>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Renovar cortesia de <strong>{renewModal.email}</strong>
              </p>
              <p className="text-xs text-zinc-500 mb-4">
                Expira atualmente em: {new Date(renewModal.currentExpiry).toLocaleDateString('pt-BR')}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nova data de expiração</label>
                  <input
                    type="datetime-local"
                    value={renewDate}
                    onChange={(e) => setRenewDate(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setRenewModal(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleRenew}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                  >
                    {actionLoading ? 'Renovando...' : 'Renovar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
