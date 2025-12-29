import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from './supabase';
import { getOrSetCache, invalidateCache } from './cache';

// Função auxiliar para retry com backoff exponencial
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Verificar se é um erro de rede/timeout/521
      const isNetworkError = 
        error.message?.includes('fetch') ||
        error.message?.includes('timeout') ||
        error.message?.includes('521') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT');
      
      // Se não for erro de rede, não retry
      if (!isNetworkError) {
        throw error;
      }
      
      // Se for a última tentativa, não esperar
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Backoff exponencial: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⚠️ Tentativa ${attempt + 1}/${maxRetries} falhou. Tentando novamente em ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Helper para criar ou buscar usuário automaticamente
export async function getOrCreateUser(clerkId: string) {
  try {
    // Buscar usuário com cache (1 minuto)
    const user = await getOrSetCache(
      clerkId,
      async () => {
        // Tentar buscar usuário existente com retry
        const existingUser = await retryWithBackoff(async () => {
          const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('clerk_id', clerkId)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
            throw error;
          }

          return data;
        });

        if (existingUser) {
          return existingUser;
        }

        // Usuário não existe, buscar dados do Clerk e criar
        const clerkUser = await currentUser();

        if (!clerkUser) {
          console.error('❌ Usuário não autenticado no Clerk');
          throw new Error('Usuário não autenticado');
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress || '';
        const normalizedEmail = email.toLowerCase().trim();
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Usuário';
        const picture = clerkUser.imageUrl || null;

        // Verificar se já existe usuário com este email (proteção extra)
        const { data: emailUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (emailUser) {
          console.log(`⚠️ Usuário com email ${normalizedEmail} já existe, atualizando clerk_id...`);

          // Atualizar clerk_id do usuário existente
          const { data: updated, error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              clerk_id: clerkId,
              name: name,
              picture: picture,
            })
            .eq('id', emailUser.id)
            .select()
            .single();

          if (updateError) {
            console.error('Erro ao atualizar usuário existente:', updateError);
            throw updateError;
          }

          console.log(`✅ Usuário existente atualizado: ${normalizedEmail}`);
          return updated;
        }

        // Criar usuário no Supabase com retry
        const newUser = await retryWithBackoff(async () => {
          const { data, error } = await supabaseAdmin
            .from('users')
            .insert({
              clerk_id: clerkId,
              email: normalizedEmail,
              name: name,
              picture: picture,
              subscription_status: 'inactive',
              is_paid: false,
              tools_unlocked: false,
              plan: 'free', // Usuário começa FREE, só muda após pagamento
              credits: 0,
              usage_this_month: {},
              daily_usage: {},
            })
            .select()
            .single();

          if (error) {
            // Se for erro de duplicação, tentar buscar o usuário
            if (error.code === '23505') {
              console.log('⚠️ Duplicate key error, tentando buscar usuário...');
              const { data: existingByEmail } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('email', normalizedEmail)
                .single();

              if (existingByEmail) {
                return existingByEmail;
              }
            }

            console.error('Erro ao criar usuário:', {
              message: error.message,
              details: error.details || 'Sem detalhes',
              hint: error.hint || 'Sem dica',
              code: error.code || 'Sem código'
            });
            throw error;
          }

          return data;
        });

        console.log(`✅ Usuário criado automaticamente: ${normalizedEmail}`);
        return newUser;
      },
      {
        ttl: 60000, // 1 minuto (dados de usuário mudam com frequência)
        tags: [`user:${clerkId}`],
        namespace: 'users',
      }
    );

    return user;
  } catch (err: any) {
    console.error('❌ Erro fatal ao criar/buscar usuário após múltiplas tentativas:', {
      message: err.message || 'Erro desconhecido',
      details: err.toString(),
      stack: err.stack,
    });
    return null;
  }
}

// ============================================
// ADMIN ROLE CHECKING
// ============================================

/**
 * Verifica se um usuário é admin usando Clerk Public Metadata OU email
 *
 * Configure no Clerk Dashboard:
 * Users → [Usuário] → Metadata → Public metadata:
 * { "role": "admin" } ou { "role": "superadmin" }
 *
 * OU adicione o email na lista ADMIN_EMAILS abaixo
 *
 * @param userId - Clerk user ID (opcional, se não passar usa currentUser)
 * @returns true se for admin ou superadmin
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  try {
    const user = await currentUser();

    if (!user) {
      return false;
    }

    // Se passou userId, verificar se é o mesmo usuário
    if (userId && user.id !== userId) {
      return false;
    }

    // Verificar por role no Clerk metadata
    const role = user.publicMetadata?.role as string | undefined;
    const isAdminRole = role === 'admin' || role === 'superadmin';

    if (isAdminRole) {
      console.log('[Auth] ✅ Admin verificado (Clerk metadata):', user.emailAddresses[0]?.emailAddress, 'role:', role);
      return true;
    }

    // Fallback: verificar por email
    const ADMIN_EMAILS = [
      'erickrussomat@gmail.com',
      'yurilojavirtual@gmail.com',
    ];

    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || '';
    const isAdminEmail = ADMIN_EMAILS.some(e => e.toLowerCase() === userEmail);

    if (isAdminEmail) {
      console.log('[Auth] ✅ Admin verificado (email):', userEmail);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Erro ao verificar admin:', error);
    return false;
  }
}

/**
 * Verifica se um usuário é superadmin
 * @param userId - Clerk user ID
 * @returns true se for superadmin ativo
 */
export async function isSuperAdmin(userId?: string): Promise<boolean> {
  try {
    const user = await currentUser();

    if (!user) {
      return false;
    }

    // Se passou userId, verificar se é o mesmo usuário
    if (userId && user.id !== userId) {
      return false;
    }

    const role = user.publicMetadata?.role as string | undefined;
    return role === 'superadmin';
  } catch (error) {
    console.error('❌ Erro ao verificar superadmin:', error);
    return false;
  }
}

/**
 * Verifica se usuário é admin, caso contrário lança erro
 * Útil para proteger rotas de API
 */
export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error('Acesso negado. Esta ação requer privilégios de administrador.');
  }
}

/**
 * Verifica se usuário é superadmin, caso contrário lança erro
 * Útil para proteger rotas de API críticas
 */
export async function requireSuperAdmin(): Promise<void> {
  const superAdmin = await isSuperAdmin();
  if (!superAdmin) {
    throw new Error('Acesso negado. Esta ação requer privilégios de superadministrador.');
  }
}
