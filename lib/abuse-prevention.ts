/**
 * Sistema de Prevenção de Abuso por IP
 * 
 * Detecta e bloqueia usuários que criam múltiplas contas gratuitas
 * para abusar dos trials (2 gerações gratuitas por conta)
 */

import { supabaseAdmin } from './supabase';
import { clerkClient } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const ABUSE_THRESHOLDS = {
  // Máximo de contas permitidas por IP (últimos 30 dias)
  MAX_ACCOUNTS_PER_IP: 3,
  
  // Máximo de usos trial por IP (últimos 30 dias)
  MAX_TRIAL_USAGE_PER_IP: 10,
  
  // Janela de análise em dias
  ANALYSIS_WINDOW_DAYS: 30,
};

// ============================================================================
// FUNÇÕES DE UTILIDADE
// ============================================================================

/**
 * Extrai o IP real do cliente considerando proxies/CDN
 */
export async function getClientIP(req?: Request): Promise<string> {
  const headersList = req ? new Headers(req.headers) : await headers();
  
  // Prioridade: x-forwarded-for > x-real-ip > fallback
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const cfConnectingIp = headersList.get('cf-connecting-ip'); // Cloudflare
  
  // x-forwarded-for pode conter múltiplos IPs (proxy chain)
  // Pegar o primeiro (IP original do cliente)
  const ip = cfConnectingIp || forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  
  return ip;
}

/**
 * Calcula data inicial da janela de análise
 */
function getAnalysisStartDate(): Date {
  const now = new Date();
  return new Date(now.getTime() - ABUSE_THRESHOLDS.ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

// ============================================================================
// RASTREAMENTO DE SIGNUPS
// ============================================================================

export interface SignupTrackingData {
  ipAddress: string;
  email: string;
  clerkId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Registra um novo signup no banco
 */
export async function trackSignup(data: SignupTrackingData): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('ip_signups')
      .insert({
        ip_address: data.ipAddress,
        email: data.email,
        clerk_id: data.clerkId,
        user_id: data.userId || null,
        metadata: data.metadata || {},
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Abuse Prevention] Erro ao registrar signup:', error);
    }
  } catch (error) {
    console.error('[Abuse Prevention] Erro ao rastrear signup:', error);
  }
}

/**
 * Conta quantas contas foram criadas de um IP
 */
export async function countAccountsFromIP(ipAddress: string): Promise<number> {
  try {
    const startDate = getAnalysisStartDate();
    
    const { count, error } = await supabaseAdmin
      .from('ip_signups')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('[Abuse Prevention] Erro ao contar contas:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[Abuse Prevention] Erro ao contar contas:', error);
    return 0;
  }
}

// ============================================================================
// RASTREAMENTO DE TRIAL USAGE
// ============================================================================

export interface TrialUsageData {
  ipAddress: string;
  userId: string;
  clerkId?: string;
  actionType: 'editor_generation' | 'ai_request' | 'tool_usage';
  metadata?: Record<string, any>;
}

/**
 * Registra uso de recurso trial
 */
export async function trackTrialUsage(data: TrialUsageData): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('ip_trial_usage')
      .insert({
        ip_address: data.ipAddress,
        user_id: data.userId,
        clerk_id: data.clerkId || null,
        action_type: data.actionType,
        metadata: data.metadata || {},
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Abuse Prevention] Erro ao registrar trial usage:', error);
    }
  } catch (error) {
    console.error('[Abuse Prevention] Erro ao rastrear trial usage:', error);
  }
}

/**
 * Conta quantos trials foram usados de um IP
 */
export async function countTrialUsageFromIP(ipAddress: string): Promise<number> {
  try {
    const startDate = getAnalysisStartDate();
    
    const { count, error } = await supabaseAdmin
      .from('ip_trial_usage')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('[Abuse Prevention] Erro ao contar trial usage:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[Abuse Prevention] Erro ao contar trial usage:', error);
    return 0;
  }
}

// ============================================================================
// DETECÇÃO DE ABUSO
// ============================================================================

export interface AbuseCheckResult {
  isAbuse: boolean;
  shouldBlock: boolean;
  reason?: string;
  accountsCount: number;
  trialUsageCount: number;
}

/**
 * Verifica se um IP está abusando do sistema
 */
export async function checkIPAbuse(ipAddress: string): Promise<AbuseCheckResult> {
  try {
    // 1. Verificar se IP já está bloqueado
    const { data: blockedSignup } = await supabaseAdmin
      .from('ip_signups')
      .select('is_blocked')
      .eq('ip_address', ipAddress)
      .eq('is_blocked', true)
      .limit(1)
      .single();

    if (blockedSignup?.is_blocked) {
      return {
        isAbuse: true,
        shouldBlock: true,
        reason: 'IP já bloqueado por abuso anterior',
        accountsCount: 0,
        trialUsageCount: 0,
      };
    }

    // 2. Contar contas criadas deste IP
    const accountsCount = await countAccountsFromIP(ipAddress);

    // 3. Contar trials usados deste IP
    const trialUsageCount = await countTrialUsageFromIP(ipAddress);

    // 4. Verificar se excedeu limites
    const exceededAccounts = accountsCount > ABUSE_THRESHOLDS.MAX_ACCOUNTS_PER_IP;
    const exceededTrials = trialUsageCount > ABUSE_THRESHOLDS.MAX_TRIAL_USAGE_PER_IP;

    const isAbuse = exceededAccounts || exceededTrials;
    const shouldBlock = exceededAccounts; // Bloquear apenas se criou muitas contas

    let reason: string | undefined;
    if (isAbuse) {
      const reasons = [];
      if (exceededAccounts) {
        reasons.push(`${accountsCount} contas criadas (limite: ${ABUSE_THRESHOLDS.MAX_ACCOUNTS_PER_IP})`);
      }
      if (exceededTrials) {
        reasons.push(`${trialUsageCount} trials usados (limite: ${ABUSE_THRESHOLDS.MAX_TRIAL_USAGE_PER_IP})`);
      }
      reason = reasons.join(', ');
    }

    return {
      isAbuse,
      shouldBlock,
      reason,
      accountsCount,
      trialUsageCount,
    };
  } catch (error) {
    console.error('[Abuse Prevention] Erro ao verificar abuso:', error);
    // Em caso de erro, não bloquear (fail-open para não afetar usuários legítimos)
    return {
      isAbuse: false,
      shouldBlock: false,
      accountsCount: 0,
      trialUsageCount: 0,
    };
  }
}

/**
 * Bloqueia um IP marcando todos os signups como bloqueados
 */
export async function blockIP(ipAddress: string, reason: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('ip_signups')
      .update({ 
        is_blocked: true,
        metadata: { 
          blocked_at: new Date().toISOString(),
          block_reason: reason 
        }
      })
      .eq('ip_address', ipAddress);

    if (error) {
      console.error('[Abuse Prevention] Erro ao bloquear IP:', error);
    } else {
      console.log(`[Abuse Prevention] 🚫 IP bloqueado: ${ipAddress} - ${reason}`);
    }
  } catch (error) {
    console.error('[Abuse Prevention] Erro ao bloquear IP:', error);
  }
}

/**
 * Desbloqueia um IP
 */
export async function unblockIP(ipAddress: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('ip_signups')
      .update({ 
        is_blocked: false,
        metadata: { 
          unblocked_at: new Date().toISOString(),
        }
      })
      .eq('ip_address', ipAddress);

    if (error) {
      throw new Error(`Erro ao desbloquear IP: ${error.message}`);
    }

    console.log(`[Abuse Prevention] ✅ IP desbloqueado: ${ipAddress}`);
  } catch (error: any) {
    console.error('[Abuse Prevention] Erro ao desbloquear IP:', error);
    throw error;
  }
}

// ============================================================================
// VERIFICAÇÃO DE SIGNUP
// ============================================================================

export interface SignupAbuseCheckResult extends AbuseCheckResult {
  userDeleted?: boolean;
}

/**
 * Verifica abuso durante signup e bloqueia se necessário
 * 
 * @param ipAddress - IP do usuário
 * @param email - Email da conta
 * @param clerkId - ID do Clerk
 * @returns Resultado da verificação
 */
export async function checkSignupAbuse(
  ipAddress: string,
  email: string,
  clerkId: string
): Promise<SignupAbuseCheckResult> {
  try {
    // 1. Registrar signup
    await trackSignup({ ipAddress, email, clerkId });

    // 2. Verificar abuso
    const abuseCheck = await checkIPAbuse(ipAddress);

    // 3. Se detectou abuso, tomar ação
    if (abuseCheck.shouldBlock) {
      console.warn(`[Abuse Prevention] ⚠️ Abuso detectado: ${email} (${ipAddress}) - ${abuseCheck.reason}`);

      // 3.1. Deletar conta recém-criada
      try {
        await clerkClient.users.deleteUser(clerkId);
        console.log(`[Abuse Prevention] 🗑️ Conta deletada: ${email}`);
      } catch (deleteError) {
        console.error('[Abuse Prevention] Erro ao deletar usuário:', deleteError);
      }

      // 3.2. Bloquear IP
      await blockIP(ipAddress, abuseCheck.reason || 'Múltiplas contas detectadas');

      return {
        ...abuseCheck,
        userDeleted: true,
      };
    }

    // 4. Signup legítimo
    if (abuseCheck.accountsCount > 1) {
      console.log(`[Abuse Prevention] ℹ️ Signup suspeito mas permitido: ${email} (${ipAddress}) - ${abuseCheck.accountsCount} contas`);
    }

    return {
      ...abuseCheck,
      userDeleted: false,
    };
  } catch (error) {
    console.error('[Abuse Prevention] Erro ao verificar signup:', error);
    return {
      isAbuse: false,
      shouldBlock: false,
      accountsCount: 0,
      trialUsageCount: 0,
      userDeleted: false,
    };
  }
}

// ============================================================================
// ESTATÍSTICAS
// ============================================================================

export interface AbuseStats {
  totalSignups: number;
  blockedIPs: number;
  suspiciousIPs: number;
  totalTrialUsage: number;
  topAbusers: Array<{
    ip: string;
    accountsCount: number;
    trialUsageCount: number;
    isBlocked: boolean;
  }>;
}

/**
 * Retorna estatísticas de abuso (para painel admin)
 */
export async function getAbuseStats(): Promise<AbuseStats> {
  try {
    const startDate = getAnalysisStartDate();

    // Total de signups
    const { count: totalSignups } = await supabaseAdmin
      .from('ip_signups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // IPs bloqueados
    const { count: blockedIPs } = await supabaseAdmin
      .from('ip_signups')
      .select('ip_address', { count: 'exact', head: true })
      .eq('is_blocked', true)
      .gte('created_at', startDate.toISOString());

    // Total de trial usage
    const { count: totalTrialUsage } = await supabaseAdmin
      .from('ip_trial_usage')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Top abusadores (IPs com mais contas)
    const { data: topAbusersData } = await supabaseAdmin
      .from('ip_signups')
      .select('ip_address, is_blocked')
      .gte('created_at', startDate.toISOString());

    // Agrupar por IP
    const ipMap = new Map<string, { count: number; blocked: boolean }>();
    topAbusersData?.forEach(row => {
      const existing = ipMap.get(row.ip_address) || { count: 0, blocked: false };
      ipMap.set(row.ip_address, {
        count: existing.count + 1,
        blocked: existing.blocked || row.is_blocked,
      });
    });

    // Converter para array e ordenar
    const topAbusers = Array.from(ipMap.entries())
      .map(([ip, data]) => ({
        ip,
        accountsCount: data.count,
        trialUsageCount: 0, // TODO: calcular se necessário
        isBlocked: data.blocked,
      }))
      .sort((a, b) => b.accountsCount - a.accountsCount)
      .slice(0, 10);

    const suspiciousIPs = topAbusers.filter(a => a.accountsCount > 1).length;

    return {
      totalSignups: totalSignups || 0,
      blockedIPs: blockedIPs || 0,
      suspiciousIPs,
      totalTrialUsage: totalTrialUsage || 0,
      topAbusers,
    };
  } catch (error) {
    console.error('[Abuse Prevention] Erro ao buscar estatísticas:', error);
    return {
      totalSignups: 0,
      blockedIPs: 0,
      suspiciousIPs: 0,
      totalTrialUsage: 0,
      topAbusers: [],
    };
  }
}

// ============================================================================
// GERENCIAMENTO DE IPs
// ============================================================================

export interface IPDetails {
  ipAddress: string;
  isBlocked: boolean;
  accountsCount: number;
  trialUsageCount: number;
  accounts: Array<{
    email: string;
    clerkId: string;
    userId: string | null;
    createdAt: string;
    isBlocked: boolean;
  }>;
  trials: Array<{
    actionType: string;
    createdAt: string;
    metadata: Record<string, any>;
  }>;
  blockReason?: string;
  blockedAt?: string;
}

/**
 * Busca detalhes completos de um IP específico
 */
export async function getIPDetails(ipAddress: string): Promise<IPDetails> {
  try {
    const startDate = getAnalysisStartDate();

    // Buscar todas as contas deste IP
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('ip_signups')
      .select('email, clerk_id, user_id, created_at, is_blocked, metadata')
      .eq('ip_address', ipAddress)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (accountsError) {
      throw new Error(`Erro ao buscar contas: ${accountsError.message}`);
    }

    // Buscar trials deste IP
    const { data: trials, error: trialsError } = await supabaseAdmin
      .from('ip_trial_usage')
      .select('action_type, created_at, metadata')
      .eq('ip_address', ipAddress)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (trialsError) {
      throw new Error(`Erro ao buscar trials: ${trialsError.message}`);
    }

    const isBlocked = accounts?.some(a => a.is_blocked) || false;
    const blockInfo = accounts?.find(a => a.is_blocked);

    return {
      ipAddress,
      isBlocked,
      accountsCount: accounts?.length || 0,
      trialUsageCount: trials?.length || 0,
      accounts: (accounts || []).map(a => ({
        email: a.email,
        clerkId: a.clerk_id,
        userId: a.user_id,
        createdAt: a.created_at,
        isBlocked: a.is_blocked,
      })),
      trials: (trials || []).map(t => ({
        actionType: t.action_type,
        createdAt: t.created_at,
        metadata: t.metadata || {},
      })),
      blockReason: blockInfo?.metadata?.block_reason,
      blockedAt: blockInfo?.metadata?.blocked_at,
    };
  } catch (error: any) {
    console.error('[Abuse Prevention] Erro ao buscar detalhes do IP:', error);
    throw error;
  }
}

// ============================================================================
// BUSCA
// ============================================================================

export interface SearchResult {
  type: 'ip' | 'email';
  value: string;
  accountsCount: number;
  isBlocked: boolean;
  lastSeen: string;
}

/**
 * Busca por IP ou email
 */
export async function searchAbuse(query: string): Promise<SearchResult[]> {
  try {
    const startDate = getAnalysisStartDate();
    const results: SearchResult[] = [];

    // Verificar se é um IP (formato xxx.xxx.xxx.xxx)
    const isIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(query);

    if (isIP) {
      // Buscar por IP
      const { data: ipData } = await supabaseAdmin
        .from('ip_signups')
        .select('ip_address, is_blocked, created_at')
        .eq('ip_address', query)
        .gte('created_at', startDate.toISOString());

      if (ipData && ipData.length > 0) {
        results.push({
          type: 'ip',
          value: query,
          accountsCount: ipData.length,
          isBlocked: ipData.some(d => d.is_blocked),
          lastSeen: ipData[0].created_at,
        });
      }
    } else {
      // Buscar por email (parcial)
      const { data: emailData } = await supabaseAdmin
        .from('ip_signups')
        .select('email, ip_address, is_blocked, created_at')
        .ilike('email', `%${query}%`)
        .gte('created_at', startDate.toISOString())
        .limit(20);

      if (emailData) {
        // Agrupar por email
        const emailMap = new Map<string, { count: number; blocked: boolean; lastSeen: string }>();
        
        emailData.forEach(row => {
          const existing = emailMap.get(row.email) || { count: 0, blocked: false, lastSeen: row.created_at };
          emailMap.set(row.email, {
            count: existing.count + 1,
            blocked: existing.blocked || row.is_blocked,
            lastSeen: row.created_at > existing.lastSeen ? row.created_at : existing.lastSeen,
          });
        });

        emailMap.forEach((data, email) => {
          results.push({
            type: 'email',
            value: email,
            accountsCount: data.count,
            isBlocked: data.blocked,
            lastSeen: data.lastSeen,
          });
        });
      }
    }

    return results;
  } catch (error: any) {
    console.error('[Abuse Prevention] Erro ao buscar:', error);
    return [];
  }
}
