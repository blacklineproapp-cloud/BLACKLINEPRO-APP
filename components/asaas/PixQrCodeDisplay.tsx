'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';

interface PixQrCodeDisplayProps {
  encodedImage: string;
  payload: string;
  expirationDate: string;
  value: number;
}

export default function PixQrCodeDisplay({
  encodedImage,
  payload,
  expirationDate,
  value,
}: PixQrCodeDisplayProps) {
  const t = useTranslations('asaas.pix');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatExpiration = (date: string) => {
    return new Date(date).toLocaleString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* QR Code */}
      <div className="bg-white p-4 rounded-xl mx-auto w-fit">
        <img
          src={`data:image/png;base64,${encodedImage}`}
          alt={t('title')}
          className="w-64 h-64"
        />
      </div>

      {/* Valor */}
      <div className="text-center">
        <p className="text-zinc-400 text-sm mb-1">{t('value')}</p>
        <p className="text-3xl font-bold text-white">
          {new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: 'BRL',
          }).format(value)}
        </p>
      </div>

      {/* Código PIX */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
        <p className="text-zinc-400 text-xs mb-2">{t('copyCode')}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-white bg-zinc-900 p-3 rounded-lg overflow-x-auto whitespace-nowrap">
            {payload.substring(0, 50)}...
          </code>
          <button
            onClick={handleCopy}
            className={`p-3 rounded-lg transition-all ${
              copied
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
            }`}
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>
        {copied && (
          <p className="text-indigo-400 text-xs mt-2 animate-fade-in">
            ✓ {t('copied')}
          </p>
        )}
      </div>

      {/* Instruções */}
      <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-4">
        <h4 className="text-indigo-400 font-semibold text-sm mb-2">
          {t('instructionsTitle')}
        </h4>
        <ol className="text-zinc-300 text-xs space-y-1.5 list-decimal list-inside">
          {(t.raw('instructions') as string[]).map((inst, i) => (
            <li key={i}>{inst}</li>
          ))}
        </ol>
      </div>

      {/* Expiração */}
      <div className="text-center">
        <p className="text-zinc-500 text-xs">
          {t('expiresAt', { date: formatExpiration(expirationDate) })}
        </p>
      </div>
    </div>
  );
}
