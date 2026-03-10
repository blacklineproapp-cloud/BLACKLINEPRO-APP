'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { OverviewTab } from './components/OverviewTab';
import { TransactionsTab } from './components/TransactionsTab';
import { SubscriptionsTab } from './components/SubscriptionsTab';

const TABS = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'transactions', label: 'Transações' },
  { id: 'subscriptions', label: 'Assinaturas' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-900/20 border border-indigo-800/30 rounded-xl">
            <CreditCard size={24} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Financeiro</h1>
            <p className="text-zinc-400 text-sm">Receita, transações e assinaturas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
      </div>
    </div>
  );
}
