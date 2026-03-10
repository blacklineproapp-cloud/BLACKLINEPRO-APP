import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from './supabase';
import { getOrSetCache, invalidateCache } from './cache';
import { checkAndRevertExpiredCourtesy } from './courtesy-service';
import { logger, maskEmail } from './logger';

/**
 * Atualiza o timestamp de última atividade do usuário
 * 🚀 OTIMIZADO: Apenas uma vez a cada 15 minutos para poupar o Supabase
 */
const ACTIVITY_THROTTLE_MS = 15 * 60 * 1000; // 15 minutos
const lastUpdateMap = new Map<string, number>();

export async function updateUserActivity(userId: string) {
  try {
    const now = Date.now();
    const lastUpdate = lastUpdateMap.get(userId) || 0;

    // Se já atualizou recentemente, ignorar
    if (now - lastUpdate < ACTIVITY_THROTTLE_MS) {
      return;
    }

    // Atualizar no DB
    const { error } = await supabaseAdmin
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('clerk_id', userId);

    if (error) throw error;

    // Atualizar log local
    lastUpdateMap.set(userId, now);
    
    // Limpeza periódica do Map (se crescer muito)
    if (lastUpdateMap.size > 1000) {
      const purgeThreshold = now - (ACTIVITY_THROTTLE_MS * 2);
      for (const [id, time] of lastUpdateMap.entries()) {
        if (time < purgeThreshold) lastUpdateMap.delete(id);
      }
    }
  } catch (err) {
    logger.error('[Auth] Erro ao atualizar atividade do usuário:', err);
  }
}

// Função auxiliar para retry com backoff exponencial
// 🚨 OTIMIZADO: Menos tentativas para falhar rápido e não travar UX
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2, // Reduzido de 3 para 2
  baseDelay: number = 500 // Reduzido de 1000 para 500
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Verificar se é um erro de rede/timeout/521
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes('fetch') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('TimeoutError') ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('521') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT');

      // Se não for erro de rede, não retry
      if (!isNetworkError) {
        throw error;
      }

      // Se for a última tentativa, não esperar
      if (attempt === maxRetries - 1) {
        break;
      }

      // Backoff rápido: 500ms, 1s
      const delay = baseDelay * Math.pow(2, attempt);
      logger.debug('[Auth] Retry', { attempt: attempt + 1, maxRetries, delay });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Helper para criar ou buscar usuário automaticamente
export async function getOrCreateUser(clerkId: string) {
  try {
    // 🚀 OTIMIZAÇÃO: Cache de 15 minutos (reduz requests Redis em 80%)
    // Dados de usuário mudam raramente (plano, email, nome)
    // Quando admin muda plano, cache é invalidado manualmente
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
          logger.error('[Auth] Usuário não autenticado no Clerk');
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
          logger.info('[Auth] Usuário existente encontrado, atualizando clerk_id', { email: maskEmail(normalizedEmail) });

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
            logger.error('[Auth] Erro ao atualizar usuário existente:', updateError);
            throw updateError;
          }

          logger.info('[Auth] Usuário existente atualizado', { email: maskEmail(normalizedEmail) });
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
              logger.warn('[Auth] Duplicate key error, tentando buscar usuário...');
              const { data: existingByEmail } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('email', normalizedEmail)
                .single();

              if (existingByEmail) {
                return existingByEmail;
              }
            }

            logger.error('[Auth] Erro ao criar usuário:', {
              message: error.message,
              details: error.details || 'Sem detalhes',
              hint: error.hint || 'Sem dica',
              code: error.code || 'Sem código'
            });
            throw error;
          }

          return data;
        });

        logger.info('[Auth] Usuário criado', { email: maskEmail(normalizedEmail) });
        return newUser;
      },
      {
        ttl: 300000, // 5 minutos (reduz memória em 66% vs 15min)
        tags: [`user:${clerkId}`],
        namespace: 'users',
      }
    );

    // 🔒 VERIFICAR CORTESIA EXPIRADA (apenas se usuário existe)
    if (user?.id) {
      try {
        const courtesyCheck = await checkAndRevertExpiredCourtesy(user.id);
        
        if (courtesyCheck.wasReverted) {
          logger.info('[Auth] Cortesia expirada, revertido para FREE', { userId: user.id });
          // Invalidar cache para forçar reload dos dados atualizados
          await invalidateCache(clerkId, 'users');
          
          // Buscar dados atualizados
          const { data: updatedUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          return updatedUser || user;
        }
      } catch (courtesyError) {
        // Não bloquear login se verificação de cortesia falhar
        logger.error('[Auth] ⚠️ Erro ao verificar cortesia (não bloqueante):', courtesyError);
      }
    }

    return user;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('[Auth] Erro fatal ao criar/buscar usuário após múltiplas tentativas:', {
      message: error.message || 'Erro desconhecido',
      details: String(err),
      stack: error.stack,
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
      logger.info('[Auth] Admin verificado (Clerk metadata)', { email: maskEmail(user.emailAddresses[0]?.emailAddress), role });
      return true;
    }

    // Fallback: verificar por email (usando config centralizada)
    const { isAdminEmail } = await import('./admin-config');

    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || '';

    if (isAdminEmail(userEmail)) {
      logger.info('[Auth] Admin verificado (email)', { email: maskEmail(userEmail) });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('[Auth] Erro ao verificar admin:', error);
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
    logger.error('[Auth] Erro ao verificar superadmin:', error);
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
