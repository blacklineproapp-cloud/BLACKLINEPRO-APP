'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminBootstrapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const checkBootstrapStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/bootstrap/check');
      const data = await res.json();

      if (res.ok) {
        setStatus(data);

        // Se já é admin, redirecionar para o painel
        if (data.user.isAdmin) {
          setTimeout(() => {
            router.push('/admin');
          }, 2000);
        }
      } else {
        setResult({ error: data.error || 'Erro ao verificar status' });
      }
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkBootstrapStatus();
  }, [checkBootstrapStatus]);

  const handleBootstrap = async () => {
    try {
      setBootstrapping(true);
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, ...data });

        // Redirecionar para admin após 2 segundos
        setTimeout(() => {
          router.push('/admin');
        }, 2000);
      } else {
        setResult({ error: data.message || data.error || 'Erro ao criar admin' });
      }
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setBootstrapping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Verificando status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Bootstrap Admin</h1>
          <p className="text-zinc-400">Criação do primeiro administrador do sistema</p>
        </div>

        {/* Status Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Status Atual</h2>

          {status && (
            <div className="space-y-3">
              {/* Usuário */}
              <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
                <div>
                  <div className="text-sm text-zinc-400">Seu email</div>
                  <div className="font-medium">{status.user.email}</div>
                </div>
                {status.user.isAdmin ? (
                  <CheckCircle size={20} className="text-indigo-500" />
                ) : (
                  <XCircle size={20} className="text-zinc-400" />
                )}
              </div>

              {/* Admin Status */}
              <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
                <div>
                  <div className="text-sm text-zinc-400">Você é admin?</div>
                  <div className="font-medium">
                    {status.user.isAdmin ? (
                      <span className="text-indigo-500">Sim</span>
                    ) : (
                      <span className="text-zinc-500">Não</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bootstrap Available */}
              <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
                <div>
                  <div className="text-sm text-zinc-400">Bootstrap disponível?</div>
                  <div className="font-medium">
                    {status.bootstrap.available ? (
                      <span className="text-indigo-500">Sim - Nenhum admin existe</span>
                    ) : (
                      <span className="text-amber-500">Não - {status.bootstrap.adminCount} admin(s) existem</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action / Result */}
        {result ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            {result.success ? (
              <div className="text-center">
                <CheckCircle size={48} className="text-indigo-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2 text-indigo-500">Sucesso!</h3>
                <p className="text-zinc-400 mb-4">{result.message}</p>
                <div className="bg-zinc-950 rounded-lg p-4 mb-4">
                  <div className="text-sm text-zinc-500 mb-1">Email</div>
                  <div className="font-medium">{result.admin.email}</div>
                  <div className="text-sm text-zinc-500 mb-1 mt-2">Role</div>
                  <div className="font-medium text-indigo-500">{result.admin.role}</div>
                </div>
                <p className="text-sm text-zinc-500">Redirecionando para o painel admin...</p>
              </div>
            ) : (
              <div className="text-center">
                <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2 text-red-500">Erro</h3>
                <p className="text-zinc-400 mb-4">{result.error}</p>
                <Button
                  variant="secondary"
                  onClick={() => setResult(null)}
                  className="px-6 py-2 rounded-lg"
                >
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        ) : status?.user.isAdmin ? (
          <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-xl p-6 text-center">
            <CheckCircle size={48} className="text-indigo-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-indigo-500">Você já é admin!</h3>
            <p className="text-zinc-400 mb-4">Redirecionando para o painel administrativo...</p>
          </div>
        ) : status?.bootstrap.available ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-6">
              <AlertTriangle size={24} className="text-amber-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Atenção</h3>
                <p className="text-sm text-zinc-400">
                  Você está prestes a se tornar o primeiro <strong className="text-white">superadmin</strong> do sistema.
                  Esta ação só pode ser feita uma vez.
                </p>
                <p className="text-sm text-zinc-500 mt-2">
                  Após criar o primeiro admin, este endpoint será bloqueado automaticamente por segurança.
                </p>
              </div>
            </div>

            <Button
              variant="default"
              onClick={handleBootstrap}
              disabled={bootstrapping}
              className="w-full font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2"
            >
              {bootstrapping ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Criando admin...
                </>
              ) : (
                <>
                  <Shield size={20} />
                  Tornar-me Superadmin
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-6 text-center">
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-red-500">Bootstrap Bloqueado</h3>
            <p className="text-zinc-400 mb-4">
              Já existem {status?.bootstrap.adminCount} administrador(es) no sistema.
            </p>
            <p className="text-sm text-zinc-500">
              Entre em contato com um admin existente para obter permissões.
            </p>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="text-zinc-400 hover:text-white"
          >
            ← Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
