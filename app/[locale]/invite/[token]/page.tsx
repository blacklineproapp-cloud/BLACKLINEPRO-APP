'use client';

/**
 * Accept Invite Page
 * Página para aceitar convite de organização
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface InviteData {
  email: string;
  organization: {
    id: string;
    name: string;
    plan: string;
  };
  inviter: {
    name: string | null;
    email: string;
  };
  expires_at: string;
}

export default function AcceptInvitePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadInvite = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/invites/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Convite inválido');
      }

      setInvite(data.invite);
    } catch (err: any) {
      console.error('Error loading invite:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/invite/${token}`);
      return;
    }

    loadInvite();
  }, [isLoaded, isSignedIn, token, loadInvite, router]);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      setError(null);

      const response = await fetch(`/api/invites/${token}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao aceitar convite');
      }

      setSuccess(true);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push('/dashboard/organization');
      }, 2000);
    } catch (err: any) {
      console.error('Error accepting invite:', err);
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="max-w-md w-full bg-zinc-900 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/20">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white">
              Convite Inválido
            </h2>
            <p className="mt-2 text-zinc-400">{error}</p>
            <Button
              variant="default"
              onClick={() => router.push('/dashboard')}
              className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
            >
              Ir para Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="max-w-md w-full bg-zinc-900 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-900/20">
              <svg
                className="h-6 w-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white">
              Convite Aceito!
            </h2>
            <p className="mt-2 text-zinc-400">
              Você agora é membro da organização.
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Redirecionando...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const expiresAt = new Date(invite.expires_at);
  const now = new Date();
  const hoursLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full bg-zinc-900 rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-900/20 mb-4">
            <svg
              className="h-6 w-6 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Convite para Organização
          </h1>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Organização</p>
            <p className="font-semibold text-white">
              {invite.organization.name}
            </p>
            <span className="inline-block mt-2 px-2 py-1 rounded text-xs font-medium bg-indigo-900 text-indigo-200 uppercase">
              {invite.organization.plan}
            </span>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Convidado por</p>
            <p className="font-medium text-white">
              {invite.inviter.name || invite.inviter.email}
            </p>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Email do convite</p>
            <p className="font-medium text-white">{invite.email}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Expira em {hoursLeft} horas</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            variant="default"
            onClick={handleAccept}
            disabled={accepting}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
          >
            {accepting ? 'Aceitando...' : 'Aceitar Convite'}
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="w-full px-4 py-3 rounded-lg font-medium text-zinc-300"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
