'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Activity, ArrowLeft, Filter, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  Clock, FileJson, Image as ImageIcon, RefreshCw, Calendar
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';

interface UserLog {
  id: string;
  activity_type: string;
  details: Record<string, any>;
  success: boolean;
  error_message: string | null;
  error_stack: string | null;
  ip_address: string | null;
  user_agent: string | null;
  endpoint: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  plan: string;
  is_paid: boolean;
  created_at: string;
}

interface LogsResponse {
  user: UserInfo;
  logs: UserLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    totalLogs: number;
    totalErrors: number;
  };
}

export default function UserLogsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LogsResponse | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Filtros
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 50;

  const loadLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });

      if (filterType !== 'all') params.set('type', filterType);
      if (filterStatus === 'errors') params.set('errors', 'true');

      const res = await fetch(`/api/admin/users/${userId}/logs?${params.toString()}`);

      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }

      if (!res.ok) throw new Error('Erro ao carregar logs');

      const responseData = await res.json();
      setData(responseData);
    } catch (err: any) {
      console.error('Erro:', err);
      alert('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadLogs();
    }
  }, [userId, page, filterType, filterStatus]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-zinc-400">Erro ao carregar dados</div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'generation': return <ImageIcon size={16} className="text-purple-400" />;
      case 'error': return <AlertCircle size={16} className="text-red-400" />;
      case 'download': return <FileJson size={16} className="text-blue-400" />;
      case 'payment': return <CheckCircle2 size={16} className="text-green-400" />;
      default: return <Activity size={16} className="text-zinc-400" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'generation': return 'bg-purple-900/20 border-purple-800/30 text-purple-400';
      case 'error': return 'bg-red-900/20 border-red-800/30 text-red-400';
      case 'download': return 'bg-blue-900/20 border-blue-800/30 text-blue-400';
      case 'payment': return 'bg-green-900/20 border-green-800/30 text-green-400';
      default: return 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400';
    }
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      generation: 'Geração',
      error: 'Erro',
      download: 'Download',
      payment: 'Pagamento',
      login: 'Login',
      api_call: 'API Call',
      webhook: 'Webhook',
      admin_action: 'Ação Admin',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/users')}
          className="gap-2 mb-4"
        >
          <ArrowLeft size={20} />
          Voltar para Usuários
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Logs de Atividade</h1>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold">
                  {data.user.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{data.user.email}</div>
                  <div className="text-zinc-500 text-xs">
                    {data.user.name || 'Sem nome'} · {data.user.plan}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={loadLogs}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">Total de Logs</div>
          <div className="text-2xl font-bold">{data.stats.totalLogs}</div>
        </div>
        <div className="bg-zinc-900 border border-red-800/30 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">Erros</div>
          <div className="text-2xl font-bold text-red-400">{data.stats.totalErrors}</div>
        </div>
        <div className="bg-zinc-900 border border-indigo-800/30 rounded-lg p-4">
          <div className="text-sm text-zinc-400 mb-1">Taxa de Sucesso</div>
          <div className="text-2xl font-bold text-indigo-400">
            {data.stats.totalLogs > 0
              ? Math.round(((data.stats.totalLogs - data.stats.totalErrors) / data.stats.totalLogs) * 100)
              : 100}%
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-zinc-400" />
          <h2 className="text-lg font-bold">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-purple-500 outline-none transition"
          >
            <option value="all">Todos os tipos</option>
            <option value="generation">Gerações</option>
            <option value="error">Erros</option>
            <option value="download">Downloads</option>
            <option value="payment">Pagamentos</option>
            <option value="login">Logins</option>
            <option value="api_call">API Calls</option>
            <option value="webhook">Webhooks</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-purple-500 outline-none transition"
          >
            <option value="all">Todos os status</option>
            <option value="errors">Apenas Erros</option>
            <option value="success">Apenas Sucessos</option>
          </select>

          <Button
            variant="outline"
            onClick={() => {
              setFilterType('all');
              setFilterStatus('all');
              setPage(1);
            }}
          >
            Limpar Filtros
          </Button>
        </div>

        <p className="text-sm text-zinc-500 mt-3">
          Mostrando {data.logs.length} de {data.pagination.total} logs
        </p>
      </div>

      {/* Timeline de Logs */}
      <div className="max-w-7xl mx-auto bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold">Timeline de Atividades</h2>
        </div>

        {data.logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Activity size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {data.logs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-zinc-900/50 transition">
                {/* Log Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Icon */}
                    <div className="mt-0.5">
                      {getActivityIcon(log.activity_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${getActivityColor(log.activity_type)}`}>
                          {getActivityLabel(log.activity_type)}
                        </span>

                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle2 size={12} />
                            Sucesso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400">
                            <AlertCircle size={12} />
                            Falha
                          </span>
                        )}

                        {log.duration_ms && (
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                            <Clock size={12} />
                            {log.duration_ms}ms
                          </span>
                        )}
                      </div>

                      {/* Error Message */}
                      {log.error_message && (
                        <div className="text-sm text-red-400 mb-2 bg-red-900/10 border border-red-800/30 rounded p-2">
                          {log.error_message}
                        </div>
                      )}

                      {/* Endpoint */}
                      {log.endpoint && (
                        <div className="text-xs text-zinc-500 font-mono bg-zinc-950 rounded px-2 py-1 inline-block mb-2">
                          {log.endpoint}
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(log.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand Button */}
                  {Object.keys(log.details || {}).length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="gap-1 flex-shrink-0"
                    >
                      {expandedLog === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expandedLog === log.id ? 'Ocultar' : 'Detalhes'}
                    </Button>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedLog === log.id && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                      <FileJson size={14} />
                      Detalhes (JSON)
                    </div>
                    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-300 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>

                    {log.error_stack && (
                      <>
                        <div className="text-xs font-semibold text-red-400 mb-2 mt-4">Stack Trace</div>
                        <pre className="bg-red-950/20 border border-red-800/30 rounded-lg p-4 text-xs text-red-300 overflow-x-auto">
                          {log.error_stack}
                        </pre>
                      </>
                    )}

                    {log.user_agent && (
                      <>
                        <div className="text-xs font-semibold text-zinc-400 mb-2 mt-4">User Agent</div>
                        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 font-mono break-all">
                          {log.user_agent}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data.pagination.total > limit && (
          <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              Página {page} de {Math.ceil(data.pagination.total / limit)}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!data.pagination.hasMore}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
