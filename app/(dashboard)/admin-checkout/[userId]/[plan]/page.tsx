'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CheckoutModal from '@/components/CheckoutModal';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const userId = params.userId as string;
  const plan = params.plan as 'starter' | 'pro' | 'studio';

  useEffect(() => {
    // Validar plano
    if (!['starter', 'pro', 'studio'].includes(plan)) {
      alert('Plano inválido');
      router.push('/dashboard');
      return;
    }

    // Buscar dados do usuário
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/admin/users?userId=${userId}`);
        if (!res.ok) throw new Error('Usuário não encontrado');
        
        const data = await res.json();
        setUserEmail(data.email || '');
        setLoading(false);
        setIsOpen(true);
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        alert('Erro ao carregar dados do usuário');
        router.push('/dashboard');
      }
    };

    fetchUser();
  }, [userId, plan, router]);

  const handleClose = () => {
    setIsOpen(false);
    router.push('/dashboard');
  };

  const handleSuccess = () => {
    setIsOpen(false);
    router.push('/dashboard?payment=success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text="Carregando checkout..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Ativar Assinatura StencilFlow
          </h1>
          <p className="text-zinc-400">
            Complete o pagamento para ativar seu plano {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </p>
          {userEmail && (
            <p className="text-sm text-zinc-500 mt-2">
              Conta: {userEmail}
            </p>
          )}
        </div>

        <CheckoutModal
          plan={plan}
          cycle="monthly"
          isOpen={isOpen}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
