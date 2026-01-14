'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  FileText, ArrowLeft, Download, Copy, Check, 
  Clock, CheckCircle, XCircle, AlertTriangle,
  Loader2, ExternalLink, Receipt
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Invoice {
  id: string;
  status: 'paid' | 'pending' | 'overdue' | 'void';
  amount: number;
  currency: string;
  created_at: string;
  due_date: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  hosted_url: string | null;
  description: string;
  is_boleto: boolean;
}

export default function BoletosPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/user/invoices');
      if (!res.ok) throw new Error('Erro ao carregar boletos');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Erro ao carregar boletos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
      return;
    }

    if (isLoaded && isSignedIn) {
      loadInvoices();
    }
  }, [isLoaded, isSignedIn, router, loadInvoices]);

  const handleCopyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL'
    }).format(amount);
  };

  const getStatusConfig = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Pago',
          icon: CheckCircle,
          bgColor: 'bg-green-900/20',
          borderColor: 'border-green-800',
          textColor: 'text-green-400'
        };
      case 'pending':
        return {
          label: 'Pendente',
          icon: Clock,
          bgColor: 'bg-amber-900/20',
          borderColor: 'border-amber-800',
          textColor: 'text-amber-400'
        };
      case 'overdue':
        return {
          label: 'Vencido',
          icon: AlertTriangle,
          bgColor: 'bg-red-900/20',
          borderColor: 'border-red-800',
          textColor: 'text-red-400'
        };
      case 'void':
        return {
          label: 'Cancelado',
          icon: XCircle,
          bgColor: 'bg-zinc-800',
          borderColor: 'border-zinc-700',
          textColor: 'text-zinc-500'
        };
      default:
        return {
          label: status,
          icon: Clock,
          bgColor: 'bg-zinc-800',
          borderColor: 'border-zinc-700',
          textColor: 'text-zinc-400'
        };
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando boletos..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/assinatura')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-4"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Receipt className="text-emerald-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Meus Boletos</h1>
              <p className="text-zinc-400 text-sm lg:text-base">
                Acompanhe seus pagamentos via boleto
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Boletos */}
        {invoices.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-zinc-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum boleto encontrado</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Quando você fizer pagamentos via boleto, eles aparecerão aqui para acompanhamento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => {
              const statusConfig = getStatusConfig(invoice.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={invoice.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 lg:p-6 transition hover:border-zinc-700"
                >
                  {/* Header - Desktop */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg">
                        {invoice.description}
                      </h3>
                      <p className="text-zinc-400 text-sm mt-1">
                        Criado em {formatDate(invoice.created_at)}
                      </p>
                    </div>

                    {/* Valor + Status */}
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold text-white">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </span>
                      <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${statusConfig.bgColor} border ${statusConfig.borderColor}`}>
                        <StatusIcon size={16} className={statusConfig.textColor} />
                        <span className={`text-sm font-medium ${statusConfig.textColor}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="flex flex-wrap gap-4 text-sm text-zinc-400 mb-4">
                    {invoice.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        <span>Vence: {formatDate(invoice.due_date)}</span>
                      </div>
                    )}
                    {invoice.paid_at && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-green-400" />
                        <span>Pago em: {formatDate(invoice.paid_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {invoice.pdf_url && (
                      <a
                        href={invoice.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition"
                      >
                        <Download size={16} />
                        <span className="hidden sm:inline">Baixar PDF</span>
                        <span className="sm:hidden">PDF</span>
                      </a>
                    )}

                    {invoice.hosted_url && invoice.status !== 'paid' && (
                      <>
                        <a
                          href={invoice.hosted_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition"
                        >
                          <ExternalLink size={16} />
                          <span className="hidden sm:inline">Pagar Boleto</span>
                          <span className="sm:hidden">Pagar</span>
                        </a>

                        <button
                          onClick={() => handleCopyLink(invoice.hosted_url!, invoice.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition"
                        >
                          {copiedId === invoice.id ? (
                            <>
                              <Check size={16} className="text-green-400" />
                              <span className="hidden sm:inline text-green-400">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={16} />
                              <span className="hidden sm:inline">Copiar Link</span>
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {invoice.hosted_url && invoice.status === 'paid' && (
                      <a
                        href={invoice.hosted_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition"
                      >
                        <ExternalLink size={16} />
                        <span className="hidden sm:inline">Ver Comprovante</span>
                        <span className="sm:hidden">Comprovante</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            Informações sobre Boletos
          </h3>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li>• Os boletos são gerados automaticamente 3 dias antes do vencimento</li>
            <li>• O prazo para pagamento é de até 4 dias após o vencimento</li>
            <li>• Após o pagamento, a compensação pode levar até 3 dias úteis</li>
            <li>• Seu acesso é liberado automaticamente após a confirmação</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
