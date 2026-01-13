'use client';

import { useState, useEffect } from 'react';
import { 
  CreditCard, Search, Filter, RefreshCw, Download, 
  CheckCircle, XCircle, Clock, ExternalLink 
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  stripe_payment_id: string;
  user: {
    email: string;
    name: string | null;
  };
  created_at: string;
}

export default function FinancePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadPayments = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/transactions?page=${page}&limit=20`;
      if (search) url += `&query=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao carregar pagamentos');
      
      const data = await res.json();
      setPayments(data.payments || []);
      setTotalRevenue(data.totalRevenue || 0);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPayments();
    }, 500);
    return () => clearTimeout(timeout);
  }, [page, search, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'paid':
        return 'bg-emerald-900/20 text-emerald-400 border-emerald-800/30';
      case 'pending':
      case 'processing':
        return 'bg-amber-900/20 text-amber-400 border-amber-800/30';
      case 'failed':
      case 'canceled':
        return 'bg-red-900/20 text-red-400 border-red-800/30';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-900/20 border border-emerald-800/30 rounded-xl">
              <CreditCard size={24} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Transações</h1>
              <p className="text-zinc-400 text-sm">Histórico completo de pagamentos e assinaturas</p>
            </div>
          </div>
          <button
            onClick={() => loadPayments()}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition"
          >
            <RefreshCw size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-black border border-emerald-800/50 rounded-xl p-6 mb-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <CreditCard size={120} className="text-emerald-500" />
           </div>
           
           <div className="relative z-10">
              <p className="text-emerald-400 font-medium mb-1 flex items-center gap-2">
                 <CheckCircle size={16} />
                 Receita Total Confirmada (Stripe)
              </p>
              <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </h2>
              <p className="text-zinc-500 text-sm mt-2 max-w-md">
                Soma de todas as transações com status 'succeeded' ou 'paid' processadas pelo sistema.
              </p>
           </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg flex-1">
            <Search size={16} className="text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por email, ID Stripe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm w-full text-zinc-300 placeholder:text-zinc-600"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg md:w-48">
            <Filter size={16} className="text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm w-full text-zinc-300"
            >
              <option value="">Todos Status</option>
              <option value="succeeded">Sucesso (Succeeded)</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Carregando transações..." />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
            <CreditCard size={48} className="mx-auto text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400">Nenhuma transação encontrada</h3>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                   <tr>
                     <th className="p-4 font-medium">Data</th>
                     <th className="p-4 font-medium">Usuário</th>
                     <th className="p-4 font-medium">Valor</th>
                     <th className="p-4 font-medium">Status</th>
                     <th className="p-4 font-medium">Método</th>
                     <th className="p-4 font-medium">ID Transação</th>
                     <th className="p-4 font-medium text-right">Ações</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800">
                   {payments.map((payment) => (
                     <tr key={payment.id} className="hover:bg-zinc-800/30 transition-colors">
                       <td className="p-4 whitespace-nowrap text-zinc-500 font-mono text-xs">
                         {new Date(payment.created_at).toLocaleString('pt-BR')}
                       </td>
                       <td className="p-4">
                         <div className="font-medium text-zinc-300">{payment.user?.email || 'N/A'}</div>
                         <div className="text-xs text-zinc-500">{payment.user?.name}</div>
                       </td>
                       <td className="p-4 font-bold text-zinc-200">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: payment.currency || 'BRL' }).format(payment.amount)}
                       </td>
                       <td className="p-4">
                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(payment.status)}`}>
                           {payment.status === 'succeeded' ? <CheckCircle size={12} /> : 
                            payment.status === 'failed' ? <XCircle size={12} /> : 
                            <Clock size={12} />}
                           {payment.status.toUpperCase()}
                         </span>
                       </td>
                       <td className="p-4 text-zinc-400 capitalize">
                         {payment.payment_method}
                       </td>
                       <td className="p-4 font-mono text-xs text-zinc-500 truncate max-w-[120px]">
                         {payment.stripe_payment_id}
                       </td>
                       <td className="p-4 text-right">
                         <a 
                           href={`https://dashboard.stripe.com/payments/${payment.stripe_payment_id}`}
                           target="_blank"
                           rel="noreferrer"
                           className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                         >
                           Stripe <ExternalLink size={12} />
                         </a>
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
