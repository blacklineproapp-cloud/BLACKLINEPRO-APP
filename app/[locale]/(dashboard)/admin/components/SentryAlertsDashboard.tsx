'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  XCircle, 
  Clock, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  CreditCard,
  Wifi,
  Database,
  HelpCircle,
  Eye,
  Check
} from 'lucide-react';

interface TranslatedIssue {
  id: string;
  shortId: string;
  originalTitle: string;
  translation: {
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    suggestedAction: string;
    actionType: string;
    category: 'ai' | 'payment' | 'auth' | 'network' | 'storage' | 'unknown';
  };
  level: string;
  status: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
    function?: string;
  };
  culprit: string;
}

interface SentryStats {
  totalUnresolved: number;
  errors24h: number;
  warnings24h: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

interface SentryData {
  configured: boolean;
  message?: string;
  issues: TranslatedIssue[];
  stats: SentryStats | null;
  sentryOrg?: string;
  updatedAt: string;
}

// Ícones por categoria
const CATEGORY_ICONS = {
  ai: Zap,
  payment: CreditCard,
  auth: Shield,
  network: Wifi,
  storage: Database,
  unknown: HelpCircle,
};

// Cores por severidade
const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-900/20',
    border: 'border-red-800/50',
    text: 'text-red-400',
    badge: 'bg-red-600',
    icon: XCircle,
  },
  warning: {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-800/50',
    text: 'text-yellow-400',
    badge: 'bg-yellow-600',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-900/20',
    border: 'border-blue-800/50',
    text: 'text-blue-400',
    badge: 'bg-blue-600',
    icon: HelpCircle,
  },
};

// Labels de categoria
const CATEGORY_LABELS = {
  ai: 'IA',
  payment: 'Pagamento',
  auth: 'Autenticação',
  network: 'Rede',
  storage: 'Banco',
  unknown: 'Outros',
};

// Formata tempo relativo
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays} dias`;
  
  return date.toLocaleDateString('pt-BR');
}

export default function SentryAlertsDashboard() {
  const [data, setData] = useState<SentryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sentry');
      if (!res.ok) throw new Error('Erro ao carregar dados');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar dados e auto-refresh
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh a cada 60s
    return () => clearInterval(interval);
  }, [loadData]);

  // Resolver issue
  const handleResolve = async (issueId: string) => {
    setResolvingId(issueId);
    try {
      const res = await fetch('/api/admin/sentry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', issueId }),
      });
      const json = await res.json();
      if (json.success) {
        await loadData();
      } else {
        alert(json.message || 'Erro ao resolver');
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="animate-spin text-indigo-400 mr-2" size={20} />
          <span className="text-zinc-400">Carregando alertas...</span>
        </div>
      </div>
    );
  }

  // Erro ou não configurado
  if (error || !data?.configured) {
    return (
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <AlertTriangle size={24} className="text-zinc-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Alertas em Tempo Real</h3>
            <p className="text-xs text-zinc-400">Powered by Sentry</p>
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
          <p className="text-zinc-400 text-sm">
            {error || data?.message || 'Sentry não configurado'}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Configure SENTRY_AUTH_TOKEN, SENTRY_ORG e SENTRY_PROJECT no .env
          </p>
        </div>
      </div>
    );
  }

  const { issues, stats } = data;
  const displayedIssues = showAll ? issues : issues.slice(0, 5);
  const hasMore = issues.length > 5;

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 rounded-lg">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Alertas em Tempo Real</h3>
            <p className="text-xs text-zinc-400">
              Atualizado {data.updatedAt ? formatRelativeTime(data.updatedAt) : 'agora'}
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-white">{stats.totalUnresolved}</div>
            <div className="text-xs text-zinc-500">Não resolvidos</div>
          </div>
          <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-400">{stats.criticalCount}</div>
            <div className="text-xs text-red-400/70">Críticos</div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-400">{stats.warningCount}</div>
            <div className="text-xs text-yellow-400/70">Avisos</div>
          </div>
          <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-400">{stats.infoCount}</div>
            <div className="text-xs text-blue-400/70">Info</div>
          </div>
        </div>
      )}

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-6 text-center">
          <CheckCircle size={32} className="mx-auto mb-2 text-indigo-400" />
          <p className="text-indigo-400 font-medium">Tudo certo!</p>
          <p className="text-xs text-zinc-500 mt-1">Nenhum erro não resolvido</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedIssues.map((issue) => {
            const styles = SEVERITY_STYLES[issue.translation.severity];
            const CategoryIcon = CATEGORY_ICONS[issue.translation.category];
            const SeverityIcon = styles.icon;
            const isExpanded = expandedId === issue.id;

            return (
              <div
                key={issue.id}
                className={`${styles.bg} border ${styles.border} rounded-lg overflow-hidden transition-all`}
              >
                {/* Issue Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                >
                  <div className="flex items-start gap-3">
                    <SeverityIcon size={20} className={styles.text} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded ${styles.badge} text-white font-medium`}>
                          {issue.translation.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <CategoryIcon size={12} />
                          {CATEGORY_LABELS[issue.translation.category]}
                        </span>
                        <span className="text-xs text-zinc-400">•</span>
                        <span className="text-xs text-zinc-500">{issue.count}x</span>
                        <span className="text-xs text-zinc-400">•</span>
                        <span className="text-xs text-zinc-500">{formatRelativeTime(issue.lastSeen)}</span>
                      </div>
                      <h4 className="text-white font-medium mt-1">{issue.translation.description}</h4>
                      <p className="text-xs text-zinc-500 mt-1 truncate">{issue.culprit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-zinc-500" />
                      ) : (
                        <ChevronDown size={16} className="text-zinc-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-800/50 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Erro Original</p>
                        <p className="text-sm text-zinc-300 font-mono bg-zinc-900 p-2 rounded">
                          {issue.originalTitle}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Usuários Afetados</p>
                        <p className="text-sm text-zinc-300">{issue.userCount} usuário(s)</p>
                      </div>
                    </div>

                    {/* Suggested Action */}
                    <div className="bg-zinc-900/50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-zinc-500 mb-1">💡 Ação Sugerida</p>
                      <p className="text-sm text-indigo-400">{issue.translation.suggestedAction}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(issue.id);
                        }}
                        disabled={resolvingId === issue.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        {resolvingId === issue.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Marcar Resolvido
                      </button>
                      <a
                        href={`https://sentry.io/organizations/${data.sentryOrg || 'blacklinepro'}/issues/${issue.id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors"
                      >
                        <ExternalLink size={14} />
                        Ver no Sentry
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Show More */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-center text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {showAll ? 'Mostrar menos' : `Ver mais ${issues.length - 5} alertas`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
