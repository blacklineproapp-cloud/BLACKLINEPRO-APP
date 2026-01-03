'use client';

/**
 * Organization Management Page
 * Página para gerenciar organização Studio/Enterprise
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import OrganizationCard from '@/components/organization/OrganizationCard';
import MembersList from '@/components/organization/MembersList';
import InviteMemberDialog from '@/components/organization/InviteMemberDialog';
import type { Organization, OrganizationMemberWithUser } from '@/lib/types/organization';

export default function OrganizationPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [maxMembers, setMaxMembers] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    loadOrganization();
  }, [isLoaded, isSignedIn]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar organizações do usuário
      const response = await fetch('/api/organizations');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar organizações');
      }

      if (!data.organizations || data.organizations.length === 0) {
        setError('Você não pertence a nenhuma organização');
        return;
      }

      const org = data.organizations[0];
      setOrganization(org);

      // Buscar membros
      await loadMembers(org.id);

      // Verificar se é owner
      const isUserOwner = org.owner_id === (await getUserId());
      setIsOwner(isUserOwner);
    } catch (err: any) {
      console.error('Error loading organization:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/members`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar membros');
      }

      setMembers(data.members);
      setMemberCount(data.member_count);
      setMaxMembers(data.max_members);
    } catch (err: any) {
      console.error('Error loading members:', err);
    }
  };

  const getUserId = async (): Promise<string | null> => {
    // Helper para buscar user_id do banco
    // Implementar conforme necessário
    return null;
  };

  const handleRemoveMember = async (userId: string) => {
    if (!organization) return;

    try {
      const response = await fetch(
        `/api/organizations/${organization.id}/members?userId=${userId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao remover membro');
      }

      // Recarregar membros
      await loadMembers(organization.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Organização não encontrada'}
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Voltar ao Dashboard
          </button>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gerenciar Organização
            </h1>

            {isOwner && (
              <InviteMemberDialog
                organizationId={organization.id}
                canAddMore={memberCount < maxMembers}
                onInviteSent={() => loadMembers(organization.id)}
              />
            )}
          </div>
        </div>

        {/* Organization Card */}
        <div className="mb-6">
          <OrganizationCard
            organization={organization}
            memberCount={memberCount}
            isOwner={isOwner}
          />
        </div>

        {/* Members List */}
        <MembersList
          members={members}
          isOwner={isOwner}
          onRemoveMember={isOwner ? handleRemoveMember : undefined}
        />
      </div>
    </div>
  );
}
