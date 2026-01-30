'use client';

import { useState } from 'react';
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatExpiration = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
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
          alt="QR Code PIX"
          className="w-64 h-64"
        />
      </div>

      {/* Valor */}
      <div className="text-center">
        <p className="text-zinc-400 text-sm mb-1">Valor a pagar</p>
        <p className="text-3xl font-bold text-white">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(value)}
        </p>
      </div>

      {/* Código PIX */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
        <p className="text-zinc-400 text-xs mb-2">Código PIX Copia e Cola</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-white bg-zinc-900 p-3 rounded-lg overflow-x-auto whitespace-nowrap">
            {payload.substring(0, 50)}...
          </code>
          <button
            onClick={handleCopy}
            className={`p-3 rounded-lg transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
            }`}
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>
        {copied && (
          <p className="text-emerald-400 text-xs mt-2 animate-fade-in">
            ✓ Código copiado!
          </p>
        )}
      </div>

      {/* Instruções */}
      <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
        <h4 className="text-emerald-400 font-semibold text-sm mb-2">
          Como pagar com PIX
        </h4>
        <ol className="text-zinc-300 text-xs space-y-1.5 list-decimal list-inside">
          <li>Abra o app do seu banco</li>
          <li>Escolha pagar com PIX QR Code ou Copia e Cola</li>
          <li>Escaneie o QR Code ou cole o código acima</li>
          <li>Confirme o pagamento</li>
          <li>Pronto! Seu plano será ativado automaticamente</li>
        </ol>
      </div>

      {/* Expiração */}
      <div className="text-center">
        <p className="text-zinc-500 text-xs">
          QR Code válido até {formatExpiration(expirationDate)}
        </p>
      </div>
    </div>
  );
}
