'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  HelpCircle, Plus, ChevronRight, ChevronLeft, Check,
  CreditCard, Wrench, User, Lightbulb, MessageSquare,
  Upload, X as XIcon, Image as ImageIcon, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { id: 'billing', label: 'Pagamento', icon: CreditCard, description: 'Dúvidas sobre cobrança, assinatura ou reembolso' },
  { id: 'technical', label: 'Problema Técnico', icon: Wrench, description: 'Erros, bugs ou funcionalidades que não funcionam' },
  { id: 'account', label: 'Minha Conta', icon: User, description: 'Acesso, configurações ou dados da conta' },
  { id: 'feature', label: 'Sugestão', icon: Lightbulb, description: 'Ideias para melhorar o StencilFlow' },
  { id: 'general', label: 'Outros', icon: MessageSquare, description: 'Outras dúvidas ou assuntos' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Aguardando', color: 'text-yellow-400 bg-yellow-900/30', icon: Clock },
  in_progress: { label: 'Em Análise', color: 'text-blue-400 bg-blue-900/30', icon: AlertCircle },
  waiting_user: { label: 'Respondido', color: 'text-green-400 bg-green-900/30', icon: CheckCircle },
  resolved: { label: 'Resolvido', color: 'text-emerald-400 bg-emerald-900/30', icon: CheckCircle },
  closed: { label: 'Fechado', color: 'text-zinc-400 bg-zinc-800', icon: CheckCircle }
};

export default function SuportePage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  
  // Wizard state
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets');
      if (!res.ok) throw new Error('Erro ao carregar');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Limitar a 2 arquivos
    const maxFiles = 2 - attachments.length;
    const filesToProcess = Array.from(files).slice(0, maxFiles);
    
    for (const file of filesToProcess) {
      // Verificar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 5MB.');
        continue;
      }
      
      // Converter para base64
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const resetWizard = () => {
    setStep(1);
    setCategory('');
    setSubject('');
    setDescription('');
    setAttachments([]);
    setShowWizard(false);
  };

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject, 
          category, 
          message: description,
          attachments 
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar ticket');
      }

      const data = await res.json();
      resetWizard();
      router.push(`/suporte/${data.ticket.id}`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!category;
    if (step === 2) return subject.trim().length > 0 && description.trim().length > 0;
    if (step === 3) return true;
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl">
              <HelpCircle size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Suporte</h1>
              <p className="text-zinc-400 text-sm">Como podemos ajudar?</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition"
          >
            <Plus size={18} />
            Novo Ticket
          </button>
        </div>

        {/* Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden">
              {/* Progress */}
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold">Novo Ticket</h2>
                  <button onClick={resetWizard} className="p-1 hover:bg-zinc-800 rounded-lg">
                    <XIcon size={20} />
                  </button>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(s => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        s <= step ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Etapa {step} de 4: {
                    step === 1 ? 'Categoria' : 
                    step === 2 ? 'Descrição' : 
                    step === 3 ? 'Anexos' : 'Revisar'
                  }
                </p>
              </div>

              {/* Content */}
              <div className="p-4 min-h-[300px]">
                {/* Step 1: Categoria */}
                {step === 1 && (
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-400 mb-4">Selecione o tipo de problema:</p>
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${
                            category === cat.id
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${category === cat.id ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}>
                            <Icon size={20} className={category === cat.id ? 'text-emerald-400' : 'text-zinc-400'} />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{cat.label}</p>
                            <p className="text-xs text-zinc-500">{cat.description}</p>
                          </div>
                          {category === cat.id && (
                            <Check className="ml-auto text-emerald-400" size={20} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Step 2: Descrição */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Assunto</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Resumo do problema"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Descrição</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descreva o problema em detalhes..."
                        rows={6}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none resize-none"
                        maxLength={2000}
                      />
                      <p className="text-xs text-zinc-500 text-right mt-1">{description.length}/2000</p>
                    </div>
                  </div>
                )}

                {/* Step 3: Anexos */}
                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400">
                      Anexe prints de tela para nos ajudar a entender o problema (opcional)
                    </p>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Preview dos Anexos */}
                    <div className="flex gap-3">
                      {attachments.map((att, i) => (
                        <div key={i} className="relative w-32 h-32 rounded-xl overflow-hidden border border-zinc-700">
                          <img src={att} alt={`Anexo ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeAttachment(i)}
                            className="absolute top-1 right-1 p-1 bg-red-600 rounded-lg"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      ))}
                      
                      {attachments.length < 2 && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-32 h-32 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex flex-col items-center justify-center gap-2 transition"
                        >
                          <Upload size={24} className="text-zinc-500" />
                          <span className="text-xs text-zinc-500">Adicionar</span>
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs text-zinc-500">
                      Máximo 2 imagens, 5MB cada
                    </p>
                  </div>
                )}

                {/* Step 4: Revisar */}
                {step === 4 && (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400 mb-4">Revise seu ticket:</p>
                    
                    <div className="bg-zinc-950 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-xs text-zinc-500">Categoria</p>
                        <p className="font-medium">{CATEGORIES.find(c => c.id === category)?.label}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Assunto</p>
                        <p className="font-medium">{subject}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Descrição</p>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{description}</p>
                      </div>
                      {attachments.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-2">Anexos ({attachments.length})</p>
                          <div className="flex gap-2">
                            {attachments.map((att, i) => (
                              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden">
                                <img src={att} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-800 flex gap-3">
                {step > 1 && (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition flex items-center gap-2"
                  >
                    <ChevronLeft size={18} />
                    Voltar
                  </button>
                )}
                
                {step < 4 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={!canProceed()}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition flex items-center justify-center gap-2"
                  >
                    Continuar
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-medium transition flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Enviando...' : 'Enviar Ticket'}
                    <Check size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Tickets */}
        {tickets.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <HelpCircle size={48} className="text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum ticket ainda</h3>
            <p className="text-zinc-500 mb-6">Precisa de ajuda? Abra um ticket!</p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition"
            >
              Abrir Primeiro Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => {
              const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
              const StatusIcon = statusConfig.icon;
              const CategoryIcon = CATEGORIES.find(c => c.id === ticket.category)?.icon || MessageSquare;

              return (
                <Link
                  key={ticket.id}
                  href={`/suporte/${ticket.id}`}
                  className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition">
                      <CategoryIcon size={20} className="text-zinc-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon size={12} />
                          {statusConfig.label}
                        </span>
                      </div>
                      
                      <h3 className="font-medium truncate">{ticket.subject}</h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <ChevronRight size={20} className="text-zinc-600 group-hover:text-zinc-400 transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
