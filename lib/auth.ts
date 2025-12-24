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
              plan: 'starter', // Default plan
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
