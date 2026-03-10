'use client';

/**
 * InviteMemberDialog
 * Dialog para convidar novos membros
 */

import { useState } from 'react';
import ModalWrapper from '@/components/ui/ModalWrapper';
import { Button } from '@/components/ui/button';

interface InviteMemberDialogProps {
  organizationId: string;
  canAddMore: boolean;
  onInviteSent?: () => void;
}

export default function InviteMemberDialog({
  organizationId,
  canAddMore,
  onInviteSent,
}: InviteMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !email.includes('@')) {
      setError('Por favor, insira um email válido');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar convite');
      }

      setSuccess(true);
      setEmail('');

      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        onInviteSent?.();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant={canAddMore ? 'default' : 'secondary'}
        onClick={() => setIsOpen(true)}
        disabled={!canAddMore}
        className={`px-4 py-2 rounded-lg font-medium ${
          canAddMore
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-zinc-700 text-zinc-400'
        }`}
      >
        {canAddMore ? 'Convidar Membro' : 'Limite Atingido'}
      </Button>
    );
  }

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      maxWidth="max-w-md"
      preventClose={loading}
    >
      <div className="p-6">
        <h2 id="modal-title" className="text-2xl font-bold text-white mb-4">
          Convidar Membro
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Email do novo membro
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
              className="w-full px-4 py-2 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-zinc-800 text-white"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
              <p className="text-sm text-green-400">
                Convite enviado com sucesso!
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 min-h-[44px] rounded-lg font-medium text-zinc-300"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={loading || !email}
              className="flex-1 px-4 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
            >
              {loading ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-xs text-zinc-400">
          Um email será enviado com o link para aceitar o convite. O convite expira em 72 horas.
        </p>
      </div>
    </ModalWrapper>
  );
}
