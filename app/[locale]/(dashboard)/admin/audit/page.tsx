'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, Search, Filter, RefreshCw, Calendar, 
  User, Database, Terminal, AlertTriangle, CheckCircle, Lock 
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';

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

interface ReconciliationData {
    stripeOnly: { email: string; count: number; chargeIds: string[]; suggestedPlan?: string }[];
    dbOnly: { email: string; plan: string; paymentSource?: string | null; isCourtesy?: boolean }[];
    multiPayers: { email: string; count: number }[];
    stats: {
        processedCharges: number;
        uniquePayers: number;
        dbPaidCount: number;
    };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtros
  const [filterAction, setFilterAction] = useState('');
  const [selectedView, setSelectedView] = useState<'stripeOnly' | 'dbOnly' | 'multiPayers' | null>('stripeOnly');

  const loadData = async (forceReconcile = false) => {
    setLoading(true);
    try {
      let url = `/api/admin/audit?page=${page}&limit=20`;
      if (filterAction) url += `&action=${filterAction}`;
      if (forceReconcile) url += `&reconcile=true`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao carregar dados');
      
      const data = await res.json();
      setLogs(data.logs || []);
      if (data.reconciliation) {
          setReconciliation(data.reconciliation);
      }
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar dados de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true); // Carrega reconciliação na primeira vez
  }, [page, filterAction]);

  const handleFixStripeOnly = async (email: string, plan: string = 'pro') => {
     if (!confirm(`Deseja ativar o plano ${plan.toUpperCase()} para ${email} (Cortesia de 30 dias até sincronizar)?`)) return;
     
     setFixing(email);
     try {
         const res = await fetch('/api/admin/audit', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
                 action: 'fix_stripe_only', 
                 email, 
                 plan,
                 courtesyDurationDays: 30 
             })
         });
         
         if (!res.ok) {
             const err = await res.json();
             throw new Error(err.error || 'Erro ao corrigir');
         }
         
         alert('Usuário ativado com sucesso! (Válido por 30 dias ou até o Stripe atualizar)');
         loadData(true);
     } catch (error: any) {
         alert(error.message);
     } finally {
         setFixing(null);
     }
  };

  // Classificar usuário como Boleto
  const handleMarkAsBoleto = async (email: string) => {
     if (!confirm(`Confirma que ${email} pagou via BOLETO?`)) return;
     setFixing(email);
     try {
         const res = await fetch('/api/admin/audit', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ action: 'mark_as_boleto', email })
         });
         if (!res.ok) throw new Error((await res.json()).error || 'Erro');
         alert('Usuário marcado como pagamento por boleto ✅');
         loadData(true);
     } catch (error: any) {
         alert(error.message);
     } finally {
         setFixing(null);
     }
  };

  // Classificar usuário como Cortesia
  const handleMarkAsCourtesy = async (email: string) => {
     if (!confirm(`Confirma que ${email} recebeu CORTESIA administrativa?`)) return;
     setFixing(email);
     try {
         const res = await fetch('/api/admin/audit', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ action: 'mark_as_courtesy', email })
         });
         if (!res.ok) throw new Error((await res.json()).error || 'Erro');
         alert('Usuário marcado como cortesia ✅');
         loadData(true);
     } catch (error: any) {
         alert(error.message);
     } finally {
         setFixing(null);
     }
  };

  // Revogar acesso (voltar para free)
  const handleRevokeAccess = async (email: string) => {
     if (!confirm(`⚠️ ATENÇÃO: Isso vai REMOVER o acesso pago de ${email}. O usuário volta para plano FREE. Continuar?`)) return;
     setFixing(email);
     try {
         const res = await fetch('/api/admin/audit', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ action: 'revoke_access', email })
         });
         if (!res.ok) throw new Error((await res.json()).error || 'Erro');
         alert('Acesso revogado. Usuário agora é FREE.');
         loadData(true);
     } catch (error: any) {
         alert(error.message);
     } finally {
         setFixing(null);
     }
  };

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
              <h1 className="text-2xl lg:text-3xl font-bold">Auditoria & Reconciliação</h1>
              <p className="text-zinc-400 text-sm">Análise de integridade financeira e ações administrativas</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            className="gap-2"
          >
            <RefreshCw size={16} />
            Atualizar Análise
          </Button>
        </div>

        {/* RECONCILIAÇÃO CARDS */}
        {reconciliation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Card 1: Stripe Only (CRÍTICO) */}
                <button 
                    onClick={() => setSelectedView('stripeOnly')}
                    className={`text-left p-6 rounded-xl relative overflow-hidden group transition-all ${
                        selectedView === 'stripeOnly' 
                        ? 'bg-red-900/20 border-2 border-red-500 ring-2 ring-red-500/20' 
                        : 'bg-zinc-900/50 border border-red-900/50 hover:bg-zinc-900 hover:border-red-800'
                    }`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <AlertTriangle size={64} className="text-red-500" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-red-400 font-medium mb-1 flex items-center gap-2">
                             <AlertTriangle size={16} />
                             Apenas Stripe (Crítico)
                        </h3>
                        <p className="text-3xl font-bold text-white mb-2">{reconciliation.stripeOnly?.length ?? 0}</p>
                        <p className="text-zinc-500 text-sm">Usuários que pagaram mas não estão ativos no banco.</p>
                    </div>
                </button>

                {/* Card 2: DB Only (WARNING) */}
                <button
                    onClick={() => setSelectedView('dbOnly')}
                    className={`text-left p-6 rounded-xl relative overflow-hidden group transition-all ${
                        selectedView === 'dbOnly'
                        ? 'bg-amber-900/20 border-2 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-zinc-900/50 border border-amber-900/50 hover:bg-zinc-900 hover:border-amber-800'
                    }`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <Database size={64} className="text-amber-500" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-amber-400 font-medium mb-1 flex items-center gap-2">
                             <Lock size={16} />
                             Apenas Banco (Alerta)
                        </h3>
                        <p className="text-3xl font-bold text-white mb-2">{reconciliation.dbOnly?.length ?? 0}</p>
                        <p className="text-zinc-500 text-sm">Ativos no banco sem pagamento recente no Stripe.</p>
                    </div>
                </button>

                {/* Card 3: Renovações (INFO) */}
                <button
                    onClick={() => setSelectedView('multiPayers')}
                    className={`text-left p-6 rounded-xl relative overflow-hidden group transition-all ${
                        selectedView === 'multiPayers'
                        ? 'bg-blue-900/20 border-2 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-zinc-900/50 border border-blue-900/50 hover:bg-zinc-900 hover:border-blue-800'
                    }`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                        <RefreshCw size={64} className="text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-blue-400 font-medium mb-1 flex items-center gap-2">
                             <CheckCircle size={16} />
                             Renovações
                        </h3>
                        <p className="text-3xl font-bold text-white mb-2">{reconciliation.multiPayers?.length ?? 0}</p>
                        <p className="text-zinc-500 text-sm">Usuários com múltiplos pagamentos confirmados.</p>
                    </div>
                </button>
            </div>
        )}

        {/* DETALHES DA SELEÇÃO */}
        {reconciliation && selectedView === 'stripeOnly' && (reconciliation.stripeOnly?.length ?? 0) > 0 && (
            <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <h2 className="text-xl font-bold mb-4 text-red-400 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Ação Necessária: Usuários Pagantes Inativos
                </h2>
                <div className="bg-zinc-900 border border-red-900/30 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-red-950/20 text-red-200">
                            <tr>
                                <th className="p-4">Email</th>
                                <th className="p-4">Plano Pago</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4 text-center">Qtd</th>
                                <th className="p-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {(reconciliation.stripeOnly ?? []).map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-zinc-800/30">
                                    <td className="p-4 font-mono text-zinc-300 text-xs">{item.email}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 uppercase">{item.suggestedPlan}</span>
                                    </td>
                                    <td className="p-4 text-indigo-400 font-medium">{item.amountBRL || `R$ ${(item.lastAmount / 100).toFixed(2)}`}</td>
                                    <td className="p-4 text-zinc-500 text-center">{item.count}x</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleFixStripeOnly(item.email, item.suggestedPlan || 'ink')}
                                                disabled={fixing === item.email}
                                            >
                                                {fixing === item.email ? '...' : `${item.suggestedPlan?.toUpperCase() || 'INK'}`}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {reconciliation && selectedView === 'dbOnly' && (
             <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <h2 className="text-xl font-bold mb-4 text-amber-400 flex items-center gap-2">
                    <Database size={20} />
                    Apenas no Banco (Possíveis Cortesia ou Erro)
                </h2>
                <div className="bg-zinc-900 border border-amber-900/30 rounded-xl overflow-hidden">
                     {(reconciliation.dbOnly?.length ?? 0) === 0 ? (
                        <div className="p-8 text-center text-zinc-500">Nenhum registro encontrado nesta categoria.</div>
                     ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-amber-950/20 text-amber-200">
                                <tr>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Plano</th>
                                    <th className="p-4">Valor Plano</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {(reconciliation.dbOnly ?? []).map((item: any, idx: number) => {
                                    const planPrices: Record<string, string> = {
                                        ink: 'R$ 50',
                                        pro: 'R$ 100',
                                        studio: 'R$ 300',
                                        free: 'Grátis'
                                    };
                                    return (
                                    <tr key={idx} className="hover:bg-zinc-800/30">
                                        <td className="p-4 font-mono text-zinc-300 text-xs">{item.email}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 uppercase">{item.plan}</span>
                                            {item.isCourtesy && <span className="ml-2 px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">🎁</span>}
                                        </td>
                                        <td className="p-4 text-amber-400 font-medium">{planPrices[item.plan] || '-'}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleMarkAsBoleto(item.email)}
                                                    disabled={fixing === item.email}
                                                >
                                                    {fixing === item.email ? '...' : 'Boleto'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleMarkAsCourtesy(item.email)}
                                                    disabled={fixing === item.email}
                                                    className="bg-blue-600 hover:bg-blue-500"
                                                >
                                                    Cortesia
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleRevokeAccess(item.email)}
                                                    disabled={fixing === item.email}
                                                >
                                                    Revogar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                     )}
                </div>
            </div>
        )}

        {reconciliation && selectedView === 'multiPayers' && (
             <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <h2 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                    <RefreshCw size={20} />
                    Renovações Recentes ({reconciliation.multiPayers?.length ?? 0})
                </h2>
                <div className="bg-zinc-900 border border-blue-900/30 rounded-xl overflow-hidden">
                     {(reconciliation.multiPayers?.length ?? 0) === 0 ? (
                        <div className="p-8 text-center text-zinc-500">Nenhum registro encontrado nesta categoria.</div>
                     ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-blue-950/20 text-blue-200">
                                <tr>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Total de Pagamentos</th>
                                    <th className="p-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {(reconciliation.multiPayers ?? []).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-zinc-800/30">
                                        <td className="p-4 font-mono text-zinc-300">{item.email}</td>
                                        <td className="p-4 text-zinc-400 font-medium">{item.count} pagamentos</td>
                                        <td className="p-4 text-right">
                                            <span className="flex items-center justify-end gap-1 text-indigo-400 text-xs">
                                                <CheckCircle size={14} />
                                                Cliente Fiel
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     )}
                </div>
            </div>
        )}

        {/* Tabela de Logs (Existente) */}
        <h2 className="text-xl font-bold mb-4 text-zinc-200 flex items-center gap-2">
            <Terminal size={20} />
            Logs do Sistema
        </h2>
        
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
              <option value="fix_discrepancy">Correções de Auditoria</option>
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
        {loading && !logs.length ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Carregando dados..." />
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
                           <ShieldAlert size={14} className="text-indigo-500" />
                           <span className="font-medium text-zinc-300">{log.admin?.email || 'Sistema'}</span>
                         </div>
                       </td>
                       <td className="p-4">
                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                           log.action === 'fix_discrepancy' ? 'bg-blue-900/20 text-blue-400 border-blue-800/30' :
                           log.action.includes('DELETE') || log.action.includes('BLOCK') ? 'bg-red-900/20 text-red-400 border-red-800/30' :
                           log.action.includes('ADD') ? 'bg-indigo-900/20 text-indigo-400 border-indigo-800/30' :
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-zinc-500">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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

