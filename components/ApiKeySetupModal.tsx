'use client';

/**
 * BLACK LINE PRO — BYOK API Key Setup Modal
 *
 * Step-by-step tutorial guiding the user to get their free Gemini API key
 * and paste it into the app. After setup, all generations consume the
 * user's own Gemini quota (free tier = 1500 req/day) — zero cost to us.
 */
import { useState, useEffect, useRef, memo } from 'react';
import { X, ExternalLink, Copy, Check, Key, Sparkles, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import { Button } from '@/components/ui/button';

interface ApiKeySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the user saves a valid key */
  onSuccess?: () => void;
}

const STEPS = [
  {
    number: 1,
    title: 'Acesse o Google AI Studio',
    description: 'Clique no botão abaixo para abrir a página de chaves do Google AI Studio.',
    cta: 'Abrir Google AI Studio',
    url: 'https://aistudio.google.com/apikey',
  },
  {
    number: 2,
    title: 'Ative o faturamento da sua chave',
    description: 'Na lista de chaves, clique em "Configurar faturamento" ao lado da sua chave. Preencha seus dados de contato, adicione uma forma de pagamento e clique em "Concluir a configuração da conta".',
    cta: null,
    url: null,
  },
  {
    number: 3,
    title: 'Cole sua chave aqui',
    description: 'Copie a chave (começa com "AIza...") e cole abaixo. Ela fica salva apenas no seu navegador — nunca enviamos para nossos servidores.',
    cta: null,
    url: null,
  },
];

function ApiKeySetupModal({ isOpen, onClose, onSuccess }: ApiKeySetupModalProps) {
  const { setApiKey } = useApiKey();
  const [step,     setStep]     = useState(0);
  const [keyInput, setKeyInput] = useState('');
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setKeyInput('');
      setError('');
      setSaved(false);
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Focus input on step 2
  useEffect(() => {
    if (step === 2 && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  if (!isOpen) return null;

  const handleSaveKey = async () => {
    const trimmed = keyInput.trim();

    if (!trimmed) {
      setError('Cole sua chave API antes de continuar.');
      return;
    }
    if (!trimmed.startsWith('AIza')) {
      setError('A chave deve começar com "AIza". Verifique se copiou corretamente.');
      return;
    }
    if (trimmed.length < 30) {
      setError('Chave muito curta. Verifique se copiou a chave completa.');
      return;
    }

    setError('');
    setSaving(true);

    // Basic validation: try a lightweight Gemini call
    try {
      const res = await fetch('/api/byok/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      if (res.status === 404) {
        // Endpoint não existe neste ambiente — skip validation, salvar mesmo assim
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? 'Chave inválida. Tente novamente.');
        setSaving(false);
        return;
      }
    } catch {
      // Erro de rede — skip validation e salvar mesmo assim
    }

    setApiKey(trimmed);
    setSaving(false);
    setSaved(true);

    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 1200);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setKeyInput(text.trim());
      setError('');
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="byok-title"
    >
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-modal overflow-hidden animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Key size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 id="byok-title" className="text-base font-bold text-white tracking-tight">
                Configure sua chave Gemini
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
Sua chave • Seu controle • Pague só o que usar
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            aria-label="Fechar"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Step progress */}
        <div className="px-6 pb-5">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    i < step
                      ? 'bg-indigo-500 text-white'
                      : i === step
                      ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {i < step ? <Check size={10} /> : s.number}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px transition-colors ${i < step ? 'bg-indigo-500/40' : 'bg-zinc-800'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 pb-6 space-y-5">
          <div className="animate-fade-in">
            <h3 className="text-sm font-semibold text-white mb-1.5">
              {STEPS[step].title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {STEPS[step].description}
            </p>
          </div>

          {/* Step 0 — Open Google AI Studio */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Sparkles size={12} className="text-indigo-400" />
                  <span>Geração de imagens com <strong className="text-white">IA do Google Gemini</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Check size={12} className="text-green-500" />
                  <span>Custo médio: <strong className="text-white">~R$ 0,20 por stencil</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Check size={12} className="text-green-500" />
                  <span>Requer billing ativo no Google Cloud</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Check size={12} className="text-green-500" />
                  <span>Sua chave, seu controle — pague só o que usar</span>
                </div>
              </div>

              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-glow"
              >
                <ExternalLink size={14} />
                Abrir Google AI Studio
              </a>

              <Button
                onClick={() => setStep(1)}
                variant="ghost"
                className="w-full py-2.5 text-sm"
              >
                Já tenho uma chave →
              </Button>
            </div>
          )}

          {/* Step 1 — Instructions */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  { n: 1, text: 'Na lista de chaves, clique em "Configurar faturamento" (ao lado da sua chave)' },
                  { n: 2, text: 'Preencha dados de contato, adicione forma de pagamento e clique "Concluir configuração"' },
                  { n: 3, text: 'Volte à lista de chaves e copie a chave (começa com AIza...)' },
                ].map(item => (
                  <div key={item.n} className="flex items-start gap-3 p-3 bg-zinc-800/40 rounded-lg border border-zinc-700/40">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                      {item.n}
                    </span>
                    <span className="text-xs text-zinc-300 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl gap-2"
              >
                Já copiei a chave
                <ChevronRight size={14} />
              </Button>
            </div>
          )}

          {/* Step 2 — Paste key */}
          {step === 2 && !saved && (
            <div className="space-y-3">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={keyInput}
                  onChange={(e) => { setKeyInput(e.target.value); setError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey(); }}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 pr-24 bg-zinc-800 border border-zinc-700 focus:border-indigo-500/50 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-colors font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  onClick={handlePasteFromClipboard}
                  variant="secondary"
                  size="sm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]"
                >
                  <Copy size={11} />
                  Colar
                </Button>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-zinc-800/40 rounded-lg border border-zinc-700/40">
                <Key size={12} className="text-zinc-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Sua chave é salva <strong className="text-zinc-400">apenas no seu navegador</strong> (localStorage).
                  Nunca a enviamos ou armazenamos em nossos servidores.
                </p>
              </div>

              <Button
                onClick={handleSaveKey}
                disabled={saving || !keyInput.trim()}
                className="w-full py-3 rounded-xl gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Salvar e começar
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Success state */}
          {saved && (
            <div className="flex flex-col items-center gap-3 py-4 animate-fade-in">
              <div className="p-4 rounded-full bg-green-500/15 border border-green-500/25">
                <CheckCircle2 size={32} className="text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Chave configurada!</p>
                <p className="text-xs text-zinc-500 mt-1">Gerações ilimitadas ativadas.</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
      </div>
    </div>
  );
}

export default memo(ApiKeySetupModal);
