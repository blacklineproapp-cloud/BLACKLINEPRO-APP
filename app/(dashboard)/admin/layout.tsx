import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';

/**
 * Layout para páginas de admin
 * Verifica permissão no servidor ANTES de renderizar o conteúdo
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificação server-side - bloqueia antes de renderizar
  const hasAdminAccess = await isAdmin();
  
  if (!hasAdminAccess) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
