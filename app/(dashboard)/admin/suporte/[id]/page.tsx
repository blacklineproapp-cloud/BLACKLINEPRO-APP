'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Send, CheckCircle, 
  CreditCard, Wrench, User, Lightbulb, MessageSquare,
  RefreshCw, Ban, Trash2, ExternalLink
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Message {
  id: string;
  sender_type: 'user' | 'admin';
  message: string;
  attachments?: string[];
  action_taken?: any;
  created_at: string;
}

interface TicketUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  is_paid: boolean;
  is_blocked: boolean;
  subscription_status: string;
  clerk_id: string;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  user: TicketUser;
}

const CATEGORIES: Record<string, { label: string; icon: any }> = {
  billing: { label: 'Pagamento', icon: CreditCard },
  technical: { label: 'Problema Técnico', icon: Wrench },
  account: { label: 'Minha Conta', icon: User },
  feature: { label: 'Sugestão', icon: Lightbulb },
  general: { label: 'Outros', icon: MessageSquare },
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em Atendimento' },
  { value: 'waiting_user', label: 'Aguardando Usuário' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Fechado' },
];

const ACTIONS = [
  { id: 'change_plan', label: 'Trocar Plano', icon: CreditCard },
  { id: 'unblock', label: 'Desbloquear', icon: Ban },
  { id: 'clear_cache', label: 'Limpar Cache', icon: RefreshCw },
  { id: 'reset_usage', label: 'Resetar Uso', icon: Trash2 },
];

export default function AdminTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [response, setResponse] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [actionData, setActionData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`);
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Erro ao carregar ticket:', errorData);
        alert(`Erro: ${errorData.error || 'Não foi possível carregar o ticket'}`);
        router.push('/admin/suporte');
        return;
      }
      const data = await res.json();

      // Verificar se user existe
      if (!data.ticket?.user) {
        console.error('Ticket sem dados de usuário:', data.ticket);
        alert('Erro: Dados do usuário não encontrados neste ticket');
        router.push('/admin/suporte');
        return;
      }

      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Erro:', error);
      router.push('/admin/suporte');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: response,
          action: selectedAction || undefined,
          actionData: selectedAction ? actionData : undefined,
        })
      });

      if (!res.ok) throw new Error('Erro ao responder');

      await loadTicket();
      setResponse('');
      setSelectedAction('');
      setActionData({});
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await fetch(`/api/admin/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setTicket(prev => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando..." />
      </div>
    );
  }

  if (!ticket) return null;

  const categoryInfo = CATEGORIES[ticket.category] || CATEGORIES.general;
  const CategoryIcon = categoryInfo.icon;
  const userMessage = messages.find(m => m.sender_type === 'user');
  const hasResponded = messages.some(m => m.sender_type === 'admin');

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/suporte" className="p-2 hover:bg-zinc-800 rounded-xl transition">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{ticket.subject}</h1>
            <p className="text-sm text-zinc-500">{categoryInfo.label}</p>
          </div>
          
          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mensagem do Usuário */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {ticket.user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium text-sm">{ticket.user.email}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(ticket.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <p className="whitespace-pre-wrap text-zinc-300 mb-4">
                {userMessage?.message}
              </p>

              {/* Anexos */}
              {userMessage?.attachments && userMessage.attachments.length > 0 && (
                <div className="flex gap-2">
                  {userMessage.attachments.map((att, i) => (
                    <button
                      key={i}
                      onClick={() => setImageModal(att)}
                      className="w-20 h-20 rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-500"
                    >
                      <img src={att} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Resposta Anterior */}
            {hasResponded && messages.filter(m => m.sender_type === 'admin').map(msg => (
              <div key={msg.id} className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-sm font-bold">
                    S
                  </div>
                  <div>
                    <p className="font-medium text-sm text-emerald-400">Suporte</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(msg.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-zinc-300">{msg.message}</p>
                
                {msg.action_taken && (
                  <div className="mt-3 p-2 bg-zinc-900/50 rounded-lg text-sm">
                    ✅ Ação: {msg.action_taken.type} - {msg.action_taken.details}
                  </div>
                )}
              </div>
            ))}

            {/* Form de Resposta */}
            <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Escreva sua resposta..."
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 focus:border-emerald-500 outline-none resize-none mb-3"
              />

              {/* Ações */}
              <div className="flex flex-wrap gap-2 mb-4">
                {ACTIONS.map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setSelectedAction(selectedAction === action.id ? '' : action.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                        selectedAction === action.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      <Icon size={14} />
                      {action.label}
                    </button>
                  );
                })}
              </div>

              {/* Dados da Ação */}
              {selectedAction === 'change_plan' && (
                <select
                  value={actionData.plan || ''}
                  onChange={(e) => setActionData({ plan: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 mb-3"
                >
                  <option value="">Selecione o plano...</option>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="studio">Studio</option>
                </select>
              )}

              <button
                type="submit"
                disabled={submitting || !response.trim()}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                {submitting ? 'Enviando...' : (
                  <>
                    <Send size={18} />
                    Enviar Resposta
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar - Info do Usuário */}
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">USUÁRIO</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500">Email</p>
                  <p className="text-sm font-medium">{ticket.user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Nome</p>
                  <p className="text-sm font-medium">{ticket.user.name || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Plano</p>
                  <p className="text-sm font-medium uppercase">{ticket.user.plan || 'free'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Status</p>
                  <p className="text-sm font-medium">
                    {ticket.user.is_paid ? '✅ Pago' : '❌ Não pago'}
                    {ticket.user.is_blocked && ' • ⛔ Bloqueado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Imagem */}
        {imageModal && (
          <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setImageModal(null)}
          >
            <img src={imageModal} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
}
