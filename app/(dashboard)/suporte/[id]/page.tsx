'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Clock, CheckCircle, AlertCircle, 
  CreditCard, Wrench, User, Lightbulb, MessageSquare,
  Image as ImageIcon, ExternalLink
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Message {
  id: string;
  sender_type: 'user' | 'admin';
  message: string;
  attachments?: string[];
  action_taken?: {
    type: string;
    result: string;
    details?: string;
  };
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

const CATEGORIES: Record<string, { label: string; icon: any }> = {
  billing: { label: 'Pagamento', icon: CreditCard },
  technical: { label: 'Problema Técnico', icon: Wrench },
  account: { label: 'Minha Conta', icon: User },
  feature: { label: 'Sugestão', icon: Lightbulb },
  general: { label: 'Outros', icon: MessageSquare },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  open: { label: 'Aguardando', color: 'text-yellow-400 bg-yellow-900/30', description: 'Seu ticket está na fila de atendimento' },
  in_progress: { label: 'Em Análise', color: 'text-blue-400 bg-blue-900/30', description: 'Nossa equipe está analisando seu ticket' },
  waiting_user: { label: 'Respondido', color: 'text-green-400 bg-green-900/30', description: 'Temos uma resposta para você!' },
  resolved: { label: 'Resolvido', color: 'text-emerald-400 bg-emerald-900/30', description: 'Este ticket foi resolvido' },
  closed: { label: 'Fechado', color: 'text-zinc-400 bg-zinc-800', description: 'Este ticket está fechado' }
};

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState<string | null>(null);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/suporte');
          return;
        }
        throw new Error('Erro ao carregar ticket');
      }
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Tem certeza que deseja fechar este ticket?')) return;

    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' })
      });

      if (!res.ok) throw new Error('Erro ao fechar');
      setTicket(prev => prev ? { ...prev, status: 'closed' } : null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleReopen = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' })
      });

      if (!res.ok) throw new Error('Erro ao reabrir');
      setTicket(prev => prev ? { ...prev, status: 'open' } : null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando..." />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500">Ticket não encontrado</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const categoryInfo = CATEGORIES[ticket.category] || CATEGORIES.general;
  const CategoryIcon = categoryInfo.icon;
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  // Separar mensagem do usuário e resposta do admin
  const userMessage = messages.find(m => m.sender_type === 'user');
  const adminResponse = messages.find(m => m.sender_type === 'admin');

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/suporte" className="p-2 hover:bg-zinc-800 rounded-xl transition">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`rounded-xl p-4 mb-6 ${statusConfig.color.replace('text-', 'border-').replace('/30', '/50')} border`}>
          <p className="text-sm">{statusConfig.description}</p>
        </div>

        {/* Ticket Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
          {/* Header do Ticket */}
          <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-lg">
              <CategoryIcon size={20} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{categoryInfo.label}</p>
              <h1 className="font-bold text-lg">{ticket.subject}</h1>
            </div>
          </div>

          {/* Corpo - Mensagem do Usuário */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                V
              </div>
              <span className="text-sm font-medium">Você</span>
              <span className="text-xs text-zinc-500">
                {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            
            <p className="text-zinc-300 whitespace-pre-wrap mb-4">
              {userMessage?.message || 'Sem descrição'}
            </p>

            {/* Anexos */}
            {userMessage?.attachments && userMessage.attachments.length > 0 && (
              <div className="flex gap-2">
                {userMessage.attachments.map((att, i) => (
                  <button
                    key={i}
                    onClick={() => setImageModal(att)}
                    className="w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-500 transition"
                  >
                    <img src={att} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resposta do Admin */}
          {adminResponse && (
            <div className="p-4 bg-emerald-950/30 border-t border-emerald-900/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                  S
                </div>
                <span className="text-sm font-medium text-emerald-400">Suporte StencilFlow</span>
                <span className="text-xs text-zinc-500">
                  {new Date(adminResponse.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              <p className="text-zinc-300 whitespace-pre-wrap">
                {adminResponse.message}
              </p>

              {/* Ação Executada */}
              {adminResponse.action_taken && (
                <div className={`mt-3 p-3 rounded-lg ${
                  adminResponse.action_taken.result === 'success'
                    ? 'bg-emerald-900/30 border border-emerald-800/50'
                    : 'bg-red-900/30 border border-red-800/50'
                }`}>
                  <p className="text-sm">
                    {adminResponse.action_taken.result === 'success' ? '✅' : '❌'}{' '}
                    {adminResponse.action_taken.details}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          {isClosed ? (
            <button
              onClick={handleReopen}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition"
            >
              Ainda preciso de ajuda
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition"
            >
              Fechar Ticket
            </button>
          )}
          
          <Link
            href="/suporte"
            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition"
          >
            Voltar
          </Link>
        </div>

        {/* Modal de Imagem */}
        {imageModal && (
          <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setImageModal(null)}
          >
            <img 
              src={imageModal} 
              alt="Anexo" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
