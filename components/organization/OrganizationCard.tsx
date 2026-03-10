'use client';

/**
 * OrganizationCard
 * Exibe informações da organização com limites e status
 */

import { Organization } from '@/lib/types/organization';
import { ORGANIZATION_MEMBER_LIMITS } from '@/lib/types/organization';

interface OrganizationCardProps {
  organization: Organization;
  memberCount: number;
  isOwner: boolean;
}

export default function OrganizationCard({
  organization,
  memberCount,
  isOwner,
}: OrganizationCardProps) {
  const maxMembers = ORGANIZATION_MEMBER_LIMITS[organization.plan];
  const usagePercentage = (memberCount / maxMembers) * 100;

  const isActive = organization.subscription_status === 'active';

  return (
    <div className="bg-zinc-900 rounded-lg shadow-sm border border-zinc-800 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {organization.name}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {isOwner ? 'Você é o proprietário' : 'Você é membro'}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex gap-2">
          <span
            className={`
              inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
              ${
                isActive
                  ? 'bg-green-900 text-green-200'
                  : 'bg-red-900 text-red-200'
              }
            `}
          >
            {isActive ? 'Ativa' : 'Inativa'}
          </span>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-900 text-indigo-200 uppercase">
            {organization.plan}
          </span>
        </div>
      </div>

      {/* Members Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-300">Membros</span>
          <span className="font-semibold text-white">
            {memberCount} / {maxMembers}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              usagePercentage >= 100
                ? 'bg-red-500'
                : usagePercentage >= 80
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>

        {usagePercentage >= 100 && (
          <p className="text-xs text-red-400">
            Limite de membros atingido
          </p>
        )}
      </div>

      {/* Credits Info (se houver) */}
      {organization.credits > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-300">Créditos Avulsos</span>
            <span className="font-semibold text-white">
              {organization.credits}
            </span>
          </div>
        </div>
      )}

      {/* Usage Info */}
      {organization.plan === 'studio' && (
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>680 gerações/mês compartilhadas</span>
        </div>
      )}
    </div>
  );
}
