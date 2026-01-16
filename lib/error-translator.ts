/**
 * Error Translator - Tradutor de Erros Técnicos
 * Converte erros do sistema para linguagem clara em português
 * com sugestões de ações detalhadas para resolução
 */

export interface TranslatedError {
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  suggestedAction: string;
  howToFix: string;
  actionType: 'notify_user' | 'retry' | 'check_service' | 'contact_support' | 'upgrade' | 'wait' | 'none';
  category: 'ai' | 'payment' | 'auth' | 'network' | 'storage' | 'unknown';
}

// Dicionário de traduções com instruções detalhadas
const ERROR_TRANSLATIONS: Record<string, Omit<TranslatedError, 'title'>> = {
  // ===== ERROS DE IA / GEMINI =====
  'ETIMEDOUT': {
    description: 'A conexão com a IA demorou demais e foi interrompida',
    severity: 'critical',
    suggestedAction: 'Verificar status do Google Gemini',
    howToFix: '1. Acessar status.cloud.google.com\n2. Verificar se Gemini API está operacional\n3. Se estiver OK, aguardar 5 min e tentar novamente\n4. Se persistir, verificar quotas no Google Cloud Console',
    actionType: 'check_service',
    category: 'ai',
  },
  'gemini': {
    description: 'Erro na comunicação com a IA do Google Gemini',
    severity: 'critical',
    suggestedAction: 'Reiniciar a geração',
    howToFix: '1. Verificar se a imagem enviada é válida (PNG/JPG)\n2. Tentar novamente em 30 segundos\n3. Se erro persistir, verificar logs detalhados no Sentry\n4. Pode ser limite de quota - verificar Google Cloud Console',
    actionType: 'retry',
    category: 'ai',
  },
  'Rate limit': {
    description: 'Limite de requisições da IA atingido',
    severity: 'warning',
    suggestedAction: 'Aguardar e tentar novamente',
    howToFix: '1. Aguardar 60 segundos\n2. Tentar novamente\n3. Se persistir, aumentar quota no Google Cloud Console\n4. Considerar otimizar número de requisições por usuário',
    actionType: 'wait',
    category: 'ai',
  },
  'quota': {
    description: 'Cota de uso da IA excedida para o mês',
    severity: 'critical',
    suggestedAction: 'Aumentar quota no Google Cloud',
    howToFix: '1. Acessar console.cloud.google.com\n2. Ir em APIs & Services → Quotas\n3. Localizar Generative Language API\n4. Solicitar aumento de quota ou aguardar reset mensal',
    actionType: 'check_service',
    category: 'ai',
  },
  'Invalid image': {
    description: 'A imagem enviada é inválida ou está corrompida',
    severity: 'warning',
    suggestedAction: 'Pedir nova imagem ao usuário',
    howToFix: '1. Contatar usuário via email\n2. Explicar que a imagem não pôde ser processada\n3. Pedir para enviar uma nova imagem em formato PNG ou JPG\n4. Verificar se o tamanho está dentro do limite (50MB)',
    actionType: 'notify_user',
    category: 'ai',
  },
  'generation failed': {
    description: 'Falha ao gerar o estêncil',
    severity: 'warning',
    suggestedAction: 'Usuário deve tentar novamente',
    howToFix: '1. Verificar se imagem original está acessível\n2. Se usuário reclamou, pedir para tentar novamente\n3. Se erro persistir, verificar logs no Sentry\n4. Considerar reprocessar manualmente se necessário',
    actionType: 'retry',
    category: 'ai',
  },

  // ===== ERROS DE PAGAMENTO / STRIPE =====
  'stripe': {
    description: 'Erro no processamento de pagamento',
    severity: 'critical',
    suggestedAction: 'Verificar Stripe Dashboard',
    howToFix: '1. Acessar dashboard.stripe.com\n2. Verificar seção de Payments\n3. Identificar transação com problema\n4. Se webhook falhou, verificar em Developers → Webhooks',
    actionType: 'check_service',
    category: 'payment',
  },
  'card_declined': {
    description: 'Cartão do cliente foi recusado pelo banco',
    severity: 'warning',
    suggestedAction: 'Enviar link para atualizar cartão',
    howToFix: '1. Enviar email ao cliente explicando o problema\n2. Incluir link para página de billing/payments\n3. Sugerir tentar outro cartão ou forma de pagamento\n4. Verificar se há tentativas recentes de fraude',
    actionType: 'notify_user',
    category: 'payment',
  },
  'insufficient_funds': {
    description: 'Saldo insuficiente no cartão do cliente',
    severity: 'warning',
    suggestedAction: 'Notificar cliente discretamente',
    howToFix: '1. Enviar email discreto ao cliente\n2. Informar que pagamento não foi processado\n3. Sugerir verificar com o banco ou usar outro cartão\n4. Oferecer extensão do prazo se necessário',
    actionType: 'notify_user',
    category: 'payment',
  },
  'expired_card': {
    description: 'Cartão do cliente está expirado',
    severity: 'warning',
    suggestedAction: 'Solicitar atualização do cartão',
    howToFix: '1. Enviar email ao cliente\n2. Informar que o cartão cadastrado expirou\n3. Incluir link direto para atualizar dados de pagamento\n4. Oferecer assistência se necessário',
    actionType: 'notify_user',
    category: 'payment',
  },
  'webhook': {
    description: 'Falha ao processar webhook de pagamento',
    severity: 'critical',
    suggestedAction: 'Verificar configuração do webhook',
    howToFix: '1. Acessar dashboard.stripe.com/webhooks\n2. Verificar se endpoint está correto\n3. Checar se secret está configurado no .env\n4. Verificar logs do webhook no Stripe para detalhes',
    actionType: 'check_service',
    category: 'payment',
  },
  'checkout': {
    description: 'Erro durante o processo de checkout',
    severity: 'warning',
    suggestedAction: 'Recriar sessão de checkout',
    howToFix: '1. Verificar se plano e preço existem no Stripe\n2. Checar se cliente está autenticado\n3. Tentar gerar nova sessão de checkout\n4. Se persistir, verificar logs da API /api/checkout',
    actionType: 'retry',
    category: 'payment',
  },

  // ===== ERROS DE AUTENTICAÇÃO / CLERK =====
  'clerk': {
    description: 'Erro no sistema de autenticação Clerk',
    severity: 'warning',
    suggestedAction: 'Pedir ao usuário fazer login novamente',
    howToFix: '1. Verificar status do Clerk em status.clerk.dev\n2. Se usuário específico, pedir para limpar cookies\n3. Verificar se chaves de API estão corretas\n4. Checar se domínio está configurado no Clerk Dashboard',
    actionType: 'notify_user',
    category: 'auth',
  },
  'Unauthenticated': {
    description: 'Usuário tentou acessar sem estar logado',
    severity: 'info',
    suggestedAction: 'Redirecionamento automático para login',
    howToFix: 'Nenhuma ação necessária - comportamento esperado.\nO sistema já redireciona automaticamente para a página de login.',
    actionType: 'none',
    category: 'auth',
  },
  'Não autorizado': {
    description: 'Sessão do usuário expirou ou é inválida',
    severity: 'info',
    suggestedAction: 'Fazer login novamente',
    howToFix: 'Nenhuma ação necessária - comportamento esperado.\nUsuário será redirecionado automaticamente para reautenticar.',
    actionType: 'none',
    category: 'auth',
  },
  'session': {
    description: 'Problema com a sessão do usuário',
    severity: 'warning',
    suggestedAction: 'Limpar cookies e relogar',
    howToFix: '1. Orientar usuário a limpar cookies do site\n2. Fazer logout e login novamente\n3. Se persistir, verificar configuração do Clerk\n4. Checar se há conflito com extensões do navegador',
    actionType: 'notify_user',
    category: 'auth',
  },

  // ===== ERROS DE REDE =====
  'ECONNREFUSED': {
    description: 'Servidor externo recusou a conexão',
    severity: 'critical',
    suggestedAction: 'Verificar serviços externos',
    howToFix: '1. Verificar status do serviço (Supabase, Stripe, etc)\n2. Checar se URLs estão corretas no .env\n3. Verificar se não há bloqueio de firewall\n4. Testar conexão manual via curl',
    actionType: 'check_service',
    category: 'network',
  },
  'ENOTFOUND': {
    description: 'Domínio não encontrado (erro de DNS)',
    severity: 'critical',
    suggestedAction: 'Verificar configuração de DNS',
    howToFix: '1. Verificar se URL está correta no .env\n2. Testar resolução DNS: nslookup dominio.com\n3. Pode ser problema temporário de DNS\n4. Aguardar 5 minutos e tentar novamente',
    actionType: 'check_service',
    category: 'network',
  },
  'fetch failed': {
    description: 'Falha na requisição de rede',
    severity: 'warning',
    suggestedAction: 'Tentar novamente',
    howToFix: '1. Problema temporário de conexão\n2. Tentar novamente em alguns segundos\n3. Se persistir, verificar conectividade\n4. Pode ser timeout - verificar se operação é muito lenta',
    actionType: 'retry',
    category: 'network',
  },
  'NetworkError': {
    description: 'Erro de rede do navegador do usuário',
    severity: 'info',
    suggestedAction: 'Problema de conexão do usuário',
    howToFix: 'Nenhuma ação necessária do lado do servidor.\nUsuário provavelmente tem conexão instável ou perdeu internet momentaneamente.',
    actionType: 'none',
    category: 'network',
  },
  'Load failed': {
    description: 'Falha ao carregar recurso (imagem, arquivo)',
    severity: 'info',
    suggestedAction: 'Recarregar a página',
    howToFix: 'Comum em conexões móveis instáveis.\n1. Usuário deve recarregar a página\n2. Se persistir, verificar se arquivo existe no storage\n3. Checar permissões do bucket no Supabase',
    actionType: 'retry',
    category: 'network',
  },

  // ===== ERROS DE STORAGE / SUPABASE =====
  'supabase': {
    description: 'Erro no banco de dados Supabase',
    severity: 'critical',
    suggestedAction: 'Verificar Supabase Dashboard',
    howToFix: '1. Acessar supabase.com/dashboard\n2. Verificar se banco está online\n3. Checar logs em Database → Logs\n4. Verificar se não excedeu limite de conexões',
    actionType: 'check_service',
    category: 'storage',
  },
  'storage': {
    description: 'Erro no armazenamento de arquivos',
    severity: 'critical',
    suggestedAction: 'Verificar Supabase Storage',
    howToFix: '1. Acessar Supabase → Storage\n2. Verificar se bucket project-images existe\n3. Checar políticas de acesso (RLS)\n4. Verificar limite de tamanho do arquivo (50MB)',
    actionType: 'check_service',
    category: 'storage',
  },
  'RLS': {
    description: 'Política de segurança bloqueou a operação',
    severity: 'critical',
    suggestedAction: 'Revisar políticas RLS',
    howToFix: '1. Acessar Supabase → Authentication → Policies\n2. Verificar políticas da tabela afetada\n3. Checar se user_id está correto na operação\n4. Pode ser necessário ajustar política ou usar service_role',
    actionType: 'contact_support',
    category: 'storage',
  },
  'duplicate key': {
    description: 'Tentativa de inserir registro duplicado',
    severity: 'warning',
    suggestedAction: 'Verificar se já existe',
    howToFix: 'Geralmente não é crítico.\n1. Verificar se operação já foi realizada\n2. Pode ser retry de uma operação já bem-sucedida\n3. Se intencional, usar upsert ao invés de insert',
    actionType: 'none',
    category: 'storage',
  },
};

/**
 * Traduz um erro técnico para linguagem clara
 */
export function translateError(errorTitle: string, errorValue?: string): TranslatedError {
  const fullError = `${errorTitle} ${errorValue || ''}`.toLowerCase();

  for (const [key, translation] of Object.entries(ERROR_TRANSLATIONS)) {
    if (fullError.includes(key.toLowerCase())) {
      return {
        title: key,
        ...translation,
      };
    }
  }

  // Fallback para erros desconhecidos
  return {
    title: 'Erro Desconhecido',
    description: errorTitle || 'Ocorreu um erro não catalogado',
    severity: 'warning',
    suggestedAction: 'Analisar stack trace para identificar causa',
    howToFix: '1. Verificar detalhes completos no Sentry\n2. Analisar stack trace do erro\n3. Identificar arquivo e linha do problema\n4. Contatar suporte técnico se necessário',
    actionType: 'contact_support',
    category: 'unknown',
  };
}

/**
 * Retorna cores baseadas na severidade
 */
export function getSeverityStyles(severity: 'critical' | 'warning' | 'info') {
  const styles = {
    critical: { bgColor: 'bg-red-900/20', borderColor: 'border-red-800/50', textColor: 'text-red-400', icon: '❌' },
    warning: { bgColor: 'bg-yellow-900/20', borderColor: 'border-yellow-800/50', textColor: 'text-yellow-400', icon: '⚠️' },
    info: { bgColor: 'bg-blue-900/20', borderColor: 'border-blue-800/50', textColor: 'text-blue-400', icon: 'ℹ️' },
  };
  return styles[severity];
}

/**
 * Retorna label da categoria
 */
export function getCategoryLabel(category: TranslatedError['category']): string {
  const labels = { ai: 'IA', payment: 'Pagamento', auth: 'Autenticação', network: 'Rede', storage: 'Banco', unknown: 'Outros' };
  return labels[category];
}

/**
 * Formata tempo relativo
 */
export function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  if (hours < 24) return `há ${hours}h`;
  if (days < 7) return `há ${days} dias`;
  return new Date(dateString).toLocaleDateString('pt-BR');
}
