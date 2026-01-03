'use client';

/**
 * MembersList
 * Lista membros da organização com opções de gerenciamento
 */

import { useState } from 'react';
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Membros ({members.length})
        </h3>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {members.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            Nenhum membro na organização
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {member.user.picture ? (
                    <img
                      src={member.user.picture}
                      alt={member.user.name || 'User'}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {(member.user.name || member.user.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.user.name || member.user.email}
                    </p>
                    {member.role === 'owner' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        Proprietário
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {member.user.email}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Entrou em{' '}
                    {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {isOwner && member.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(member.user_id)}
                  disabled={removingId === member.user_id}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removingId === member.user_id ? 'Removendo...' : 'Remover'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
