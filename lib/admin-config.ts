/**
 * Admin Configuration - Centralizado
 * 
 * Este arquivo centraliza todas as configurações de administração
 * para evitar duplicação e garantir consistência.
 */

// Emails com acesso administrativo (case-insensitive)
export const ADMIN_EMAILS = [
  'erickrussomat@gmail.com',
  'yurilojavirtual@gmail.com',
] as const;

// Tipo para emails admin
export type AdminEmail = typeof ADMIN_EMAILS[number];

/**
 * Verifica se um email tem acesso admin
 * @param email Email a verificar
 * @returns true se for admin
 */
export function isAdminEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(adminEmail => 
    adminEmail.toLowerCase() === normalizedEmail
  );
}

// Configurações de segurança admin
export const ADMIN_CONFIG = {
  // Tempo máximo de sessão admin (em ms)
  sessionTimeout: 4 * 60 * 60 * 1000, // 4 horas
  
  // Rate limiting para ações admin
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
  },
  
  // Ações que requerem log obrigatório
  loggedActions: [
    'block_user',
    'unblock_user', 
    'change_plan',
    'delete_user',
    'grant_courtesy_plan',
    'activate_user',
    'merge_users',
  ] as const,
} as const;

// Tipo para ações logadas
export type LoggedAction = typeof ADMIN_CONFIG.loggedActions[number];
