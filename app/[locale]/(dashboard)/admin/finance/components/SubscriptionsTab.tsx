'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface Subscription {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  status: string;
  description?: string;
  user: { email: string; name: string | null; plan: string } | null;
}

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUALLY: 'Semestral',
  YEARLY: 'Anual',
};

const BILLING_LABELS: Record<string, string> = {
  CREDIT_CARD: 'Cartão',
  PIX: 'PIX',
  BOLETO: 'Boleto',
};

export function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  useEffect(() => {
    fetch('/api/admin/subscriptions')
      .then((res) => res.json())
      .then((data) => setSubscriptions(data.subscriptions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = subscriptions.filter((s) => {
    const matchSearch = !search ||
      s.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase());
    const matchPlan = !planFilter || s.user?.plan === planFilter;
    return matchSearch && matchPlan;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg flex-1">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por email, nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-sm w-full text-zinc-300 placeholder:text-zinc-600"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg text-sm text-zinc-300 focus:outline-none"
        >
          <option value="">Todos planos</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="studio">Studio</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Summary */}
      <div className="text-xs text-zinc-500">
        {filtered.length} assinatura(s) ativa(s)
        {filtered.length > 0 && (
          <> — Total: R$ {filtered.reduce((s, sub) => s + sub.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
          <CreditCard size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm">Nenhuma assinatura encontrada</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Plano</th>
                  <th className="p-4 font-medium">Valor</th>
                  <th className="p-4 font-medium">Ciclo</th>
                  <th className="p-4 font-medium">Método</th>
                  <th className="p-4 font-medium">Próx. Cobrança</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-zinc-300">{sub.user?.email || sub.customer}</div>
                      {sub.user?.name && <div className="text-xs text-zinc-500">{sub.user.name}</div>}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        sub.user?.plan === 'pro' ? 'bg-emerald-900/30 text-emerald-400' :
                        sub.user?.plan === 'starter' ? 'bg-blue-900/30 text-blue-400' :
                        sub.user?.plan === 'studio' ? 'bg-purple-900/30 text-purple-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {(sub.user?.plan || 'N/A').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-zinc-200">
                      R$ {sub.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-zinc-400 text-xs">
                      {CYCLE_LABELS[sub.cycle] || sub.cycle}
                    </td>
                    <td className="p-4 text-zinc-400 text-xs">
                      {BILLING_LABELS[sub.billingType] || sub.billingType}
                    </td>
                    <td className="p-4 text-zinc-400 font-mono text-xs">
                      {new Date(sub.nextDueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/20 text-emerald-400 border border-emerald-800/30">
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
