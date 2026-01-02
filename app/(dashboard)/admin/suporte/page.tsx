'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, Filter, Search, RefreshCw, AlertCircle,
  Clock, CheckCircle, User, ChevronRight, AlertTriangle
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface TicketUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  is_paid: boolean;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: {
    message: string;
    sender_type: string;
    created_at: string;
  } | null;
  user: TicketUser;
}

interface Counts {
  open: number;
  in_progress: number;
  waiting_user: number;
  resolved: number;
  closed: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Aberto', color: 'text-blue-400', bg: 'bg-blue-900/30' },
  in_progress: { label: 'Em Atendimento', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  waiting_user: { label: 'Aguardando', color: 'text-orange-400', bg: 'bg-orange-900/30' },
  resolved: { label: 'Resolvido', color: 'text-green-400', bg: 'bg-green-900/30' },
  closed: { label: 'Fechado', color: 'text-zinc-400', bg: 'bg-zinc-800' }
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-zinc-400' },
  normal: { label: 'Normal', color: 'text-blue-400' },
  high: { label: 'Alta', color: 'text-orange-400' },
  urgent: { label: 'Urgente', color: 'text-red-400' }
};

const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Pagamento',
  technical: 'Técnico',
  account: 'Conta',
  feature: 'Sugestão',
  general: 'Geral'
};

export default function AdminSuportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtros
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [search, setSearch] = useState('');

  const loadTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(status !== 'all' && { status }),
        ...(priority !== 'all' && { priority }),
        ...(search && { search }),
      });

      const res = await fetch(`/api/admin/support?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar tickets');
      
      const data = await res.json();
      setTickets(data.tickets || []);
      setCounts(data.counts || null);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  }, [page, status, priority, search]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const pendingCount = (counts?.open || 0) + (counts?.in_progress || 0);
  const urgentCount = tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando tickets..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
              <MessageSquare size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Suporte</h1>
              <p className="text-zinc-400 text-sm">Gerenciamento de tickets</p>
            </div>
          </div>
          
          <button
            onClick={() => loadTickets()}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition"
          >
            <RefreshCw size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatusCard 
            label="Abertos" 
            count={counts?.open || 0} 
            color="blue"
            active={status === 'open'}
            onClick={() => setStatus(status === 'open' ? 'all' : 'open')}
          />
          <StatusCard 
            label="Em Atendimento" 
            count={counts?.in_progress || 0} 
            color="yellow"
            active={status === 'in_progress'}
            onClick={() => setStatus(status === 'in_progress' ? 'all' : 'in_progress')}
          />
          <StatusCard 
            label="Aguardando" 
            count={counts?.waiting_user || 0} 
            color="orange"
            active={status === 'waiting_user'}
            onClick={() => setStatus(status === 'waiting_user' ? 'all' : 'waiting_user')}
          />
          <StatusCard 
            label="Resolvidos" 
            count={counts?.resolved || 0} 
            color="green"
            active={status === 'resolved'}
            onClick={() => setStatus(status === 'resolved' ? 'all' : 'resolved')}
          />
          <StatusCard 
            label="Fechados" 
            count={counts?.closed || 0} 
            color="zinc"
            active={status === 'closed'}
            onClick={() => setStatus(status === 'closed' ? 'all' : 'closed')}
          />
        </div>

        {/* Alerta Urgentes */}
        {urgentCount > 0 && (
          <div className="bg-red-900/30 border border-red-800/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={20} />
            <span className="text-red-400">
              {urgentCount} ticket(s) urgente(s) aguardando atendimento
            </span>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por assunto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 outline-none"
              />
            </div>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:border-blue-500 outline-none"
            >
              <option value="all">Todas prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="normal">Normal</option>
              <option value="low">Baixa</option>
            </select>

            <button
              onClick={() => {
                setSearch('');
                setStatus('all');
                setPriority('all');
              }}
              className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-lg text-sm font-medium transition"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Lista de Tickets */}
        {tickets.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={48} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">Nenhum ticket encontrado</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 text-left bg-zinc-950">
                  <th className="px-4 py-3 text-sm font-semibold text-zinc-400">Ticket</th>
                  <th className="px-4 py-3 text-sm font-semibold text-zinc-400">Usuário</th>
                  <th className="px-4 py-3 text-sm font-semibold text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-sm font-semibold text-zinc-400">Prioridade</th>
                  <th className="px-4 py-3 text-sm font-semibold text-zinc-400">Atualizado</th>
                  <th className="px-4 py-3 text-sm font-semibold text-zinc-400"></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => {
                  const statusConf = STATUS_CONFIG[ticket.status];
                  const priorityConf = PRIORITY_CONFIG[ticket.priority];

                  return (
                    <tr key={ticket.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition">
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{ticket.subject}</p>
                          <p className="text-xs text-zinc-500">
                            {CATEGORY_LABELS[ticket.category]} • {ticket.message_count} msgs
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm">{ticket.user?.email}</p>
                          <p className="text-xs text-zinc-500">
                            {ticket.user?.plan || 'free'}
                            {ticket.user?.is_paid && ' • Pago'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusConf.bg} ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${priorityConf.color}`}>
                          {priorityConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {new Date(ticket.updated_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/suporte/${ticket.id}`}
                          className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg inline-flex transition"
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
                <p className="text-sm text-zinc-400">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded text-sm transition"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded text-sm transition"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de card de status
function StatusCard({ 
  label, 
  count, 
  color, 
  active,
  onClick 
}: { 
  label: string; 
  count: number; 
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500 bg-blue-900/20',
    yellow: 'border-yellow-500 bg-yellow-900/20',
    orange: 'border-orange-500 bg-orange-900/20',
    green: 'border-green-500 bg-green-900/20',
    zinc: 'border-zinc-600 bg-zinc-800/50'
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl border transition ${
        active 
          ? colorClasses[color] 
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
      }`}
    >
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </button>
  );
}
