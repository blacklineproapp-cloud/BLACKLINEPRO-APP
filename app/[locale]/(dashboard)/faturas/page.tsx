'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  FileText, ArrowLeft, Download, Copy, Check, 
  Clock, CheckCircle, XCircle, AlertTriangle,
  Loader2, ExternalLink, Receipt, CreditCard, QrCode
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';

interface Invoice {
  id: string;
  status: string;
  statusLabel: string;
  value: number;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
  billingTypeLabel: string;
  dueDate: string;
  paymentDate: string | null;
  description: string;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  isPaid: boolean;
  isOverdue: boolean;
  isPending: boolean;
}

export default function FaturasPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetch('/api/asaas/invoices');
      if (!res.ok) throw new Error('Erro ao carregar faturas');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getStatusConfig = (invoice: Invoice) => {
    if (invoice.isPaid) {
      return {
        label: invoice.statusLabel,
        icon: CheckCircle,
        bgColor: 'bg-green-900/20',
        borderColor: 'border-green-800',
        textColor: 'text-green-400'
      };
    }
    
    if (invoice.isOverdue) {
      return {
        label: invoice.statusLabel,
        icon: AlertTriangle,
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-800',
        textColor: 'text-red-400'
      };
    }
    
    if (invoice.isPending) {
      return {
        label: invoice.statusLabel,
        icon: Clock,
        bgColor: 'bg-amber-900/20',
        borderColor: 'border-amber-800',
        textColor: 'text-amber-400'
      };
    }

    return {
      label: invoice.statusLabel,
      icon: Clock,
      bgColor: 'bg-zinc-800',
      borderColor: 'border-zinc-700',
      textColor: 'text-zinc-400'
    };
  };

  const getPaymentMethodConfig = (billingType: Invoice['billingType']) => {
    switch (billingType) {
      case 'PIX':
        return {
          icon: QrCode,
          bgColor: 'bg-indigo-500/20',
          textColor: 'text-indigo-400'
        };
      case 'BOLETO':
        return {
          icon: FileText,
          bgColor: 'bg-amber-500/20',
          textColor: 'text-amber-400'
        };
      case 'CREDIT_CARD':
        return {
          icon: CreditCard,
          bgColor: 'bg-indigo-500/20',
          textColor: 'text-indigo-400'
        };
      default:
        return {
          icon: FileText,
          bgColor: 'bg-zinc-700/20',
          textColor: 'text-zinc-400'
        };
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando faturas..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/assinatura')}
            className="gap-2 mb-4"
          >
            <ArrowLeft size={20} />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/30 rounded-xl flex items-center justify-center">
              <Receipt className="text-indigo-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Minhas Faturas</h1>
              <p className="text-zinc-400 text-sm lg:text-base">
                Histórico completo de pagamentos e cobranças
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Faturas */}
        {invoices.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-zinc-500" size={32} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma fatura encontrada</h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Seu histórico de pagamentos aparecerá aqui quando você realizar cobranças.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => {
              const statusConfig = getStatusConfig(invoice);
              const paymentConfig = getPaymentMethodConfig(invoice.billingType);
              const StatusIcon = statusConfig.icon;
              const PaymentIcon = paymentConfig.icon;

              return (
                <div
                  key={invoice.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 lg:p-6 transition hover:border-zinc-700"
                >
                  {/* Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white text-lg">
                          {invoice.description}
                        </h3>
                        {/* Badge do Método de Pagamento */}
                        <div className={`px-2 py-1 rounded-md flex items-center gap-1.5 ${paymentConfig.bgColor}`}>
                          <PaymentIcon size={12} className={paymentConfig.textColor} />
                          <span className={`text-xs font-medium ${paymentConfig.textColor}`}>
                            {invoice.billingTypeLabel}
                          </span>
                        </div>
                      </div>
                      <p className="text-zinc-400 text-sm">
                        Vencimento: {formatDate(invoice.dueDate)}
                      </p>
                    </div>

                    {/* Valor + Status */}
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold text-white">
                        {formatCurrency(invoice.value)}
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
                    {invoice.paymentDate && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-green-400" />
                        <span>Pago em: {formatDate(invoice.paymentDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {/* Download PDF/Boleto */}
                    {(invoice.invoiceUrl || invoice.bankSlipUrl) && (
                      <a
                        href={invoice.invoiceUrl || invoice.bankSlipUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-medium transition"
                      >
                        <Download size={16} />
                        <span className="hidden sm:inline">
                          {invoice.billingType === 'BOLETO' ? 'Baixar Boleto' : 'Baixar Fatura'}
                        </span>
                        <span className="sm:hidden">PDF</span>
                      </a>
                    )}

                    {/* Pagar Boleto - apenas para boletos pendentes */}
                    {invoice.bankSlipUrl && invoice.billingType === 'BOLETO' && !invoice.isPaid && (
                      <>
                        <a
                          href={invoice.bankSlipUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition"
                        >
                          <ExternalLink size={16} />
                          <span className="hidden sm:inline">Pagar Boleto</span>
                          <span className="sm:hidden">Pagar</span>
                        </a>

                        <Button
                          variant="secondary"
                          onClick={() => handleCopyLink(invoice.bankSlipUrl!, invoice.id)}
                          className="gap-2"
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
                        </Button>
                      </>
                    )}

                    {/* Ver Comprovante - para pagamentos concluídos */}
                    {invoice.isPaid && (invoice.invoiceUrl || invoice.bankSlipUrl) && (
                      <a
                        href={invoice.invoiceUrl || invoice.bankSlipUrl || '#'}
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
            Informações sobre Pagamentos
          </h3>
          <ul className="text-sm text-zinc-400 space-y-2">
            <li>• <strong>PIX:</strong> Confirmação instantânea após o pagamento</li>
            <li>• <strong>Boleto:</strong> Compensação em até 3 dias úteis</li>
            <li>• <strong>Cartão:</strong> Processamento imediato</li>
            <li>• Seu acesso é liberado automaticamente após a confirmação do pagamento</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
