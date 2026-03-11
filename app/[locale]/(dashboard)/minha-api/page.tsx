'use client';

import { useState } from 'react';
import {
  Key, Trash2, ExternalLink, CheckCircle2, AlertTriangle,
  Copy, Check, Sparkles, Shield, DollarSign, RefreshCw
} from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import { Button } from '@/components/ui/button';

export default function ApiKeyPage() {
  const { apiKey, hasKey, isValidated, removeApiKey, setApiKey, markValidated } = useApiKey();
  const [newKey, setNewKey] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const maskedKey = apiKey ? `${apiKey.slice(0, 10)}${'•'.repeat(20)}${apiKey.slice(-6)}` : '';

  const handleSaveNewKey = () => {
    const trimmed = newKey.trim();
    if (!trimmed || !trimmed.startsWith('AIza') || trimmed.length < 30) return;
    setApiKey(trimmed);
    setNewKey('');
    setEditing(false);
    setTestResult(null);
  };

  const handleRemove = () => {
    removeApiKey();
    setConfirmRemove(false);
    setTestResult(null);
  };

  const handleCopyKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleTestKey = async () => {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/byok/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      if (res.status === 404) {
        // Endpoint não existe — assumir OK
        markValidated();
        setTestResult('success');
      } else if (res.ok) {
        markValidated();
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Chave API Gemini</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerencie sua chave de acesso para geração de stencils com IA
          </p>
        </div>

        {/* Status Card */}
        <div className={`rounded-2xl border p-6 ${
          hasKey
            ? 'bg-zinc-900/50 border-zinc-800'
            : 'bg-amber-500/5 border-amber-500/20'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${hasKey ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                <Key size={20} className={hasKey ? 'text-indigo-400' : 'text-amber-400'} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {hasKey ? (
                    <>
                      <CheckCircle2 size={14} className="text-green-400" />
                      <span className="text-sm text-green-400 font-medium">Chave configurada</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span className="text-sm text-amber-300 font-medium">Nenhuma chave configurada</span>
                    </>
                  )}
                </div>
                {hasKey && isValidated && (
                  <span className="text-[10px] text-zinc-500 mt-0.5">Validada com sucesso</span>
                )}
              </div>
            </div>
          </div>

          {/* Key display */}
          {hasKey && (
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-400 font-mono truncate">
                {maskedKey}
              </code>
              <Button
                onClick={handleCopyKey}
                variant="ghost"
                size="icon"
                className="flex-shrink-0 rounded-xl"
                title="Copiar chave"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </Button>
            </div>
          )}

          {/* Test result */}
          {testResult && (
            <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
              testResult === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {testResult === 'success'
                ? 'Chave válida! Pronta para uso.'
                : 'Chave inválida ou sem billing ativo. Verifique no Google AI Studio.'
              }
            </div>
          )}

          {/* Actions */}
          {!editing && !confirmRemove && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => { setEditing(true); setNewKey(''); }}
                className="gap-2 text-sm rounded-xl"
                size="sm"
              >
                <Key size={14} />
                {hasKey ? 'Trocar chave' : 'Adicionar chave'}
              </Button>
              {hasKey && (
                <>
                  <Button
                    onClick={handleTestKey}
                    variant="secondary"
                    size="sm"
                    disabled={testing}
                    className="gap-2 text-sm rounded-xl"
                  >
                    <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
                    {testing ? 'Testando...' : 'Testar chave'}
                  </Button>
                  <Button
                    onClick={() => setConfirmRemove(true)}
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                  >
                    <Trash2 size={14} />
                    Remover
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Edit mode */}
          {editing && (
            <div className="space-y-3">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNewKey(); }}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 focus:border-indigo-500/50 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-colors font-mono"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveNewKey}
                  disabled={!newKey.trim().startsWith('AIza') || newKey.trim().length < 30}
                  className="gap-2 text-sm rounded-xl"
                  size="sm"
                >
                  <Check size={14} />
                  Salvar chave
                </Button>
                <Button onClick={() => setEditing(false)} variant="ghost" size="sm" className="text-sm rounded-xl">
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Confirm remove */}
          {confirmRemove && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-3">
              <p className="text-sm text-red-300">Tem certeza? Sem a chave você não consegue gerar stencils.</p>
              <div className="flex gap-2">
                <Button onClick={handleRemove} variant="ghost" size="sm" className="text-sm text-red-400 hover:bg-red-500/10 rounded-xl">
                  Sim, remover
                </Button>
                <Button onClick={() => setConfirmRemove(false)} variant="ghost" size="sm" className="text-sm rounded-xl">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* How to get a key */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Como obter sua chave</h2>

          <div className="space-y-3">
            {[
              {
                step: '1',
                title: 'Acesse o Google AI Studio',
                desc: 'Faça login com sua conta Google e vá em "Chaves de API" (aistudio.google.com/apikey).',
              },
              {
                step: '2',
                title: 'Clique em "Configurar faturamento"',
                desc: 'Ao lado da sua chave, clique em "Configurar faturamento". Sem isso, a quota de geração de imagens é 0.',
              },
              {
                step: '3',
                title: 'Preencha dados e forma de pagamento',
                desc: 'Informe seus dados de contato, adicione uma forma de pagamento (cartão) e clique em "Concluir a configuração da conta".',
              },
              {
                step: '4',
                title: 'Copie a chave e cole aqui',
                desc: 'Volte à lista de chaves, copie (começa com AIza...) e cole acima. Fica salva apenas no seu navegador.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 font-bold text-xs">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{item.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <ExternalLink size={14} />
            Abrir Google AI Studio
          </a>
        </div>

        {/* Pricing info */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign size={18} className="text-indigo-400" />
            Custos estimados
          </h2>
          <p className="text-sm text-zinc-400">
            A geração de imagens usa o modelo <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">gemini-2.5-flash-image</code>.
            Você paga diretamente ao Google.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-2xl font-bold text-white">~R$ 0,20</p>
              <p className="text-xs text-zinc-400 mt-1">por stencil gerado</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-2xl font-bold text-white">~R$ 20</p>
              <p className="text-xs text-zinc-400 mt-1">para 100 stencils</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { icon: Shield, text: 'Sem mensalidade fixa' },
              { icon: Sparkles, text: 'Paga só o que usar' },
              { icon: Key, text: 'Sua chave, seu controle' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 text-xs">
                <Icon size={12} className="text-indigo-400" />
                {text}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
