'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, Clock, ExternalLink, CreditCard, Download, Filter
} from 'lucide-react';
import { DataTable, Column } from '../../components/ui/DataTable';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  stripe_payment_id: string;
  asaas_payment_id: string;
  provider: 'stripe' | 'asaas';
  user: { email: string; name: string | null } | null;
  created_at: string;
}

export function TransactionsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/transactions?page=${page}&limit=20`;
      if (search) url += `&query=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (methodFilter) url += `&method=${methodFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro');
      const data = await res.json();
      setPayments(data.payments || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, methodFilter]);

  useEffect(() => {
    const t = setTimeout(loadPayments, 400);
    return () => clearTimeout(t);
  }, [loadPayments]);

  const exportCSV = () => {
    if (payments.length === 0) return;

    const header = 'Data,Email,Nome,Valor,Moeda,Status,Metodo,Provider,ID\n';
    const rows = payments.map(p => {
      const date = new Date(p.created_at).toLocaleDateString('pt-BR');
      const email = p.user?.email || '';
      const name = (p.user?.name || '').replace(/,/g, ' ');
      const id = p.provider === 'asaas' ? p.asaas_payment_id : p.stripe_payment_id;
      return `${date},${email},${name},${p.amount},${p.currency || 'BRL'},${p.status},${p.payment_method},${p.provider},${id}`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; icon: typeof CheckCircle }> = {
      succeeded: { bg: 'bg-emerald-900/20 text-emerald-400 border-emerald-800/30', icon: CheckCircle },
      paid: { bg: 'bg-emerald-900/20 text-emerald-400 border-emerald-800/30', icon: CheckCircle },
      pending: { bg: 'bg-amber-900/20 text-amber-400 border-amber-800/30', icon: Clock },
      processing: { bg: 'bg-amber-900/20 text-amber-400 border-amber-800/30', icon: Clock },
      failed: { bg: 'bg-red-900/20 text-red-400 border-red-800/30', icon: XCircle },
      canceled: { bg: 'bg-red-900/20 text-red-400 border-red-800/30', icon: XCircle },
    };
    const s = map[status] || { bg: 'bg-zinc-800 text-zinc-400 border-zinc-700', icon: Clock };
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${s.bg}`}>
        <Icon size={12} /> {status.toUpperCase()}
      </span>
    );
  };

  const columns: Column<Payment>[] = [
    {
      key: 'date',
      header: 'Data',
      render: (p) => (
        <span className="text-zinc-500 font-mono text-xs whitespace-nowrap">
          {new Date(p.created_at).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Usuário',
      render: (p) => (
        <div>
          <div className="font-medium text-zinc-300 text-sm">{p.user?.email || 'N/A'}</div>
          {p.user?.name && <div className="text-xs text-zinc-500">{p.user.name}</div>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (p) => (
        <span className="font-bold text-zinc-200">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: p.currency || 'BRL' }).format(p.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => getStatusBadge(p.status),
    },
    {
      key: 'method',
      header: 'Método',
      render: (p) => <span className="text-zinc-400 text-sm capitalize">{p.payment_method || '-'}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => {
        const isAsaas = p.provider === 'asaas';
        const id = isAsaas ? p.asaas_payment_id : p.stripe_payment_id;
        const label = isAsaas ? 'Asaas' : 'Stripe';
        const url = isAsaas
          ? `https://www.asaas.com/dashboard/payments/${id}`
          : `https://dashboard.stripe.com/payments/${id}`;
        return (
          <a href={url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition">
            {label} <ExternalLink size={12} />
          </a>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg flex-1 w-full sm:max-w-xs">
          <Filter size={14} className="text-zinc-500" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-transparent border-none focus:outline-none text-sm w-full text-zinc-300"
          >
            <option value="">Todos Status</option>
            <option value="succeeded">Sucesso</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="failed">Falhou</option>
          </select>
        </div>

        <button
          onClick={() => { setMethodFilter(methodFilter === 'boleto' ? '' : 'boleto'); setPage(1); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition whitespace-nowrap ${
            methodFilter === 'boleto'
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {methodFilter === 'boleto' ? 'Boletos (ativo)' : 'Filtrar Boletos'}
        </button>

        <button
          onClick={exportCSV}
          disabled={payments.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-40 ml-auto"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        searchPlaceholder="Buscar por email, ID..."
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchValue={search}
        loading={loading}
        emptyMessage="Nenhuma transação encontrada"
        emptyIcon={<CreditCard size={48} />}
        pagination={{
          page,
          totalPages,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
