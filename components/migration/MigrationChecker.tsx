'use client';

/**
 * MigrationChecker - Componente que verifica se o usuário precisa fornecer CPF
 *
 * Deve ser incluído no layout do dashboard para verificar automaticamente
 * quando o usuário logado precisa completar a migração
 */

import { useEffect, useState, useCallback } from 'react';
import CpfMigrationModal from './CpfMigrationModal';

interface MigrationStatus {
  needsCpf: boolean;
  currentPlan?: string;
  migrationItem?: {
    plan: string;
    billingDay: number;
    migrationType: string;
    isCourtesy: boolean;
  };
}

export default function MigrationChecker() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkMigrationStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/migration/check');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);

        // Se precisa de CPF, mostrar modal
        if (data.needsCpf) {
          setShowModal(true);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar migração:', error);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // Verificar apenas uma vez ao carregar
    checkMigrationStatus();
  }, [checkMigrationStatus]);

  const handleSuccess = () => {
    // Atualizar status após migração bem-sucedida
    setStatus({ needsCpf: false });
    setShowModal(false);

    // Opcional: recarregar a página para atualizar dados do usuário
    window.location.reload();
  };

  const handleClose = () => {
    // Não permitir fechar o modal sem completar a migração
    // O usuário precisa fornecer o CPF
    // setShowModal(false);
  };

  // Não renderizar nada se estiver verificando ou não precisar de CPF
  if (checking || !status?.needsCpf) {
    return null;
  }

  return (
    <CpfMigrationModal
      isOpen={showModal}
      onClose={handleClose}
      onSuccess={handleSuccess}
      currentPlan={status.migrationItem?.plan || status.currentPlan}
      billingDay={status.migrationItem?.billingDay || 1}
    />
  );
}
