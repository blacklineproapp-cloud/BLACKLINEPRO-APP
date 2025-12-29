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
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Usuário';
        const picture = clerkUser.imageUrl || null;

        // Criar usuário no Supabase com retry
        const newUser = await retryWithBackoff(async () => {
          const { data, error } = await supabaseAdmin
            .from('users')
            .insert({
              clerk_id: clerkId,
              email: email,
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

        console.log(`✅ Usuário criado automaticamente: ${email}`);
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
 * Verifica se um usuário é admin (qualquer role: admin ou superadmin)
 * @param userId - Clerk user ID
 * @returns true se for admin ativo (não expirado)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // Buscar no cache primeiro (5 minutos)
    const cacheKey = `admin:${userId}`;
    const cached = await getOrSetCache(
      cacheKey,
      async () => {
        // IMPORTANTE: admin_users.user_id é UUID (users.id), não clerk_id!
        // Precisamos fazer JOIN para converter clerk_id → UUID
        const { data, error } = await supabaseAdmin
          .from('admin_users')
          .select('role, expires_at, user_id, users!inner(clerk_id)')
          .eq('users.clerk_id', userId)
          .single();

        if (error || !data) {
          console.log('[Auth] Usuário não é admin:', userId, error?.message);
          return { isAdmin: false };
        }

        // Verificar se expirou
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          console.log('[Auth] Admin expirado:', userId);
          return { isAdmin: false };
        }

        console.log('[Auth] ✅ Admin verificado:', userId, 'role:', data.role);
        return { isAdmin: true, role: data.role };
      },
      {
        ttl: 300000, // 5 minutos
        tags: [`admin:${userId}`],
        namespace: 'admin',
      }
    );

    return cached.isAdmin;
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
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    // JOIN com users para converter clerk_id → UUID
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('role, expires_at, users!inner(clerk_id)')
      .eq('users.clerk_id', userId)
      .eq('role', 'superadmin')
      .single();

    if (error || !data) {
      return false;
    }

    // Verificar se expirou
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar superadmin:', error);
    return false;
  }
}

/**
 * Verifica se usuário é admin, caso contrário lança erro
 * Útil para proteger rotas de API
 */
export async function requireAdmin(userId: string | null): Promise<void> {
  if (!userId) {
    throw new Error('Não autorizado. Faça login para continuar.');
  }

  const admin = await isAdmin(userId);
  if (!admin) {
    throw new Error('Acesso negado. Esta ação requer privilégios de administrador.');
  }
}

/**
 * Verifica se usuário é superadmin, caso contrário lança erro
 * Útil para proteger rotas de API críticas
 */
export async function requireSuperAdmin(userId: string | null): Promise<void> {
  if (!userId) {
    throw new Error('Não autorizado. Faça login para continuar.');
  }

  const superAdmin = await isSuperAdmin(userId);
  if (!superAdmin) {
    throw new Error('Acesso negado. Esta ação requer privilégios de superadministrador.');
  }
}

/**
 * Invalida cache de admin para um usuário
 * Útil após conceder/revogar permissões
 */
export async function invalidateAdminCache(userId: string): Promise<void> {
  await invalidateCache(`admin:${userId}`);
}
