'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, Search, Filter, RefreshCw, Calendar, 
  User, Database, Terminal, AlertTriangle 
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AuditLog {
  id: string;
  action: string;
  admin: {
    email: string;
    name: string | null;
  };
  target: {
    email: string;
  } | null;
  details: any;
  created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtros
  const [filterAction, setFilterAction] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/audit?page=${page}&limit=20`;
      if (filterAction) url += `&action=${filterAction}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao carregar logs');
      
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, filterAction]);

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-xl">
              <ShieldAlert size={24} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Auditoria de Segurança</h1>
              <p className="text-zinc-400 text-sm">Registro de ações administrativas e alterações sensíveis</p>
            </div>
          </div>
          <button
            onClick={loadLogs}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition"
          >
            <RefreshCw size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg flex-1">
            <Filter size={16} className="text-zinc-500" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm w-full text-zinc-300"
            >
              <option value="">Todas as Ações</option>
              <option value="ADD_CREDITS">Adicionar Créditos</option>
              <option value="REMOVE_CREDITS">Remover Créditos</option>
              <option value="RESET_USAGE">Resetar Uso</option>
              <option value="BLOCK_USER">Bloquear Usuário</option>
              <option value="UNBLOCK_USER">Desbloquear Usuário</option>
              <option value="CHANGE_PLAN">Mudar Plano</option>
              <option value="DELETE_USER">Deletar Usuário</option>
              <option value="SEND_COURTESY_LINK">Link Cortesia</option>
            </select>
          </div>
        </div>

        {/* Tabela de Logs */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Carregando logs..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
            <Database size={48} className="mx-auto text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400">Nenhum registro encontrado</h3>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                   <tr>
                     <th className="p-4 font-medium">Data/Hora</th>
                     <th className="p-4 font-medium">Admin</th>
                     <th className="p-4 font-medium">Ação</th>
                     <th className="p-4 font-medium">Alvo (Usuário)</th>
                     <th className="p-4 font-medium">Detalhes</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800">
                   {logs.map((log) => (
                     <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors group">
                       <td className="p-4 whitespace-nowrap text-zinc-500 font-mono text-xs">
                         {new Date(log.created_at).toLocaleString('pt-BR')}
                       </td>
                       <td className="p-4">
                         <div className="flex items-center gap-2">
                           <ShieldAlert size={14} className="text-emerald-500" />
                           <span className="font-medium text-zinc-300">{log.admin?.email || 'Sistema'}</span>
                         </div>
                       </td>
                       <td className="p-4">
                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                           log.action.includes('DELETE') || log.action.includes('BLOCK') ? 'bg-red-900/20 text-red-400 border-red-800/30' :
                           log.action.includes('ADD') ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/30' :
                           'bg-zinc-800 text-zinc-400 border-zinc-700'
                         }`}>
                           {log.action}
                         </span>
                       </td>
                       <td className="p-4 text-zinc-400">
                         {log.target?.email || '-'}
                       </td>
                       <td className="p-4">
                         <div className="max-w-xs truncate text-xs text-zinc-500 font-mono bg-black/30 p-1.5 rounded border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                           {JSON.stringify(log.details)}
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>

            {/* Paginação */}
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-800 transition"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-500">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-800 transition"
              >
                Próxima
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
