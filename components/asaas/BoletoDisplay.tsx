'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Copy, Check, Calendar } from 'lucide-react';

interface BoletoDisplayProps {
  boletoUrl: string;
  invoiceUrl?: string;
  dueDate: string;
  value: number;
  barcode?: string;
}

export default function BoletoDisplay({
  boletoUrl,
  invoiceUrl,
  dueDate,
  value,
  barcode,
}: BoletoDisplayProps) {
  const t = useTranslations('asaas.boleto');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (barcode) {
      await navigator.clipboard.writeText(barcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDueDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const daysUntilDue = () => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-4">
      {/* Valor e Vencimento */}
      <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-amber-400 text-sm mb-1">{t('title')}</p>
            <p className="text-3xl font-bold text-white">
              {new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'BRL',
              }).format(value)}
            </p>
          </div>
          <div className="w-16 h-16 bg-amber-600/20 border border-amber-500/30 rounded-full flex items-center justify-center">
            <Calendar className="text-amber-400" size={28} />
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-amber-300">
          <Calendar size={16} />
          <span className="text-sm">
            {t('dueDate', { date: formatDueDate(dueDate) })}
          </span>
        </div>
        
        {daysUntilDue() > 0 && (
          <p className="text-amber-400/70 text-xs mt-2">
            {t('daysUntilDue', { count: daysUntilDue() })}
          </p>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="grid grid-cols-1 gap-3">
        <a
          href={boletoUrl || invoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-amber-600/20"
        >
          <ExternalLink size={20} />
          {t('openPdf')}
        </a>

        {barcode && (
          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
            }`}
          >
            {copied ? (
              <>
                <Check size={20} />
                {t('barcodeCopied')}
              </>
            ) : (
              <>
                <Copy size={20} />
                {t('copyBarcode')}
              </>
            )}
          </button>
        )}
      </div>

      {/* Código de Barras */}
      {barcode && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
          <p className="text-zinc-400 text-xs mb-2">{t('barcodeLabel')}</p>
          <code className="text-xs text-white bg-zinc-900 p-3 rounded-lg block overflow-x-auto">
            {barcode}
          </code>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-amber-600/10 border border-amber-500/30 rounded-xl p-4">
        <h4 className="text-amber-400 font-semibold text-sm mb-2">
          {t('instructionsTitle')}
        </h4>
        <ol className="text-zinc-300 text-xs space-y-1.5 list-decimal list-inside">
          {(t.raw('instructions') as string[]).map((inst, i) => (
            <li key={i}>{inst}</li>
          ))}
        </ol>
      </div>

      {/* Aviso */}
      <div className="text-center">
        <p className="text-zinc-500 text-xs">
          {t('waitAviso')}
        </p>
      </div>
    </div>
  );
}
