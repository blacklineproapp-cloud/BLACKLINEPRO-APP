'use client';

/**
 * MembersList
 * Lista membros da organização com opções de gerenciamento
 */

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { OrganizationMemberWithUser } from '@/lib/types/organization';

interface MembersListProps {
  members: OrganizationMemberWithUser[];
  isOwner: boolean;
  onRemoveMember?: (userId: string) => Promise<void>;
}

export default function MembersList({
  members,
  isOwner,
  onRemoveMember,
}: MembersListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (userId: string) => {
    if (!onRemoveMember || !confirm('Tem certeza que deseja remover este membro?')) {
      return;
    }

    setRemovingId(userId);
    try {
      await onRemoveMember(userId);
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800">
      <div className="px-6 py-4 border-b border-zinc-800">
        <h3 className="text-lg font-semibold text-white">
          Membros ({members.length})
        </h3>
      </div>

      <div className="divide-y divide-zinc-800">
        {members.length === 0 ? (
          <div className="px-6 py-8 text-center text-zinc-400">
            Nenhum membro na organização
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {member.user.picture ? (
                    <Image
                      src={member.user.picture}
                      alt={member.user.name || 'User'}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                      {(member.user.name || member.user.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">
                      {member.user.name || member.user.email}
                    </p>
                    {member.role === 'owner' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900 text-indigo-200">
                        Proprietário
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400">
                    {member.user.email}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Entrou em{' '}
                    {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {isOwner && member.role !== 'owner' && (
                <Button
                  variant="link"
                  onClick={() => handleRemove(member.user_id)}
                  disabled={removingId === member.user_id}
                  className="text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  {removingId === member.user_id ? 'Removendo...' : 'Remover'}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
