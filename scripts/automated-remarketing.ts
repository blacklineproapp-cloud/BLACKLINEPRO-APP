import { createClient } from '@supabase/supabase-js';
import { sendRemarketingEmail } from '../lib/email';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * CRONOGRAMA DE ENVIO AUTOMATIZADO
 *
 * Dia 1 (24h após cadastro):  Campanha "initial" - Apresenta recursos e benefícios
 * Dia 7 (7 dias após):        Campanha "reminder" - Comparação com concorrentes, social proof
 * Dia 14 (14 dias após):      Campanha "final" - Última chamada, foco em simplicidade
 */

interface CampaignConfig {
  type: 'initial' | 'reminder' | 'final';
  daysAfterSignup: number;
  description: string;
}

const CAMPAIGNS: CampaignConfig[] = [
  {
    type: 'initial',
    daysAfterSignup: 1,
    description: 'Campanha Inicial - Apresentação de recursos'
  },
  {
    type: 'reminder',
    daysAfterSignup: 7,
    description: 'Campanha Lembrete - Comparação e urgência'
  },
  {
    type: 'final',
    daysAfterSignup: 14,
    description: 'Campanha Final - Última oportunidade'
  }
];

interface SendOptions {
  dryRun?: boolean;
  delayMs?: number;
}

async function automatedRemarketing(options: SendOptions = {}) {
  const { dryRun = false, delayMs = 1000 } = options;

  console.log('🤖 SISTEMA AUTOMATIZADO DE REMARKETING');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🧪 Modo: ${dryRun ? 'DRY RUN (não enviará emails)' : 'PRODUÇÃO (enviará emails reais)'}`);
  console.log('='.repeat(80));
  console.log('');

  let totalSent = 0;
  let totalErrors = 0;

  // Processar cada campanha do cronograma
  for (const campaign of CAMPAIGNS) {
    console.log(`\n📧 ${campaign.description} (${campaign.daysAfterSignup} dias após cadastro)`);
    console.log('-'.repeat(80));

    // Calcular data limite (usuários cadastrados há X dias ou mais)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - campaign.daysAfterSignup);

    // Buscar usuários FREE elegíveis para esta campanha
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('is_paid', false)
      .lte('created_at', cutoffDate.toISOString());

    if (usersError) {
      console.error(`❌ Erro ao buscar usuários: ${usersError.message}`);
      continue;
    }

    if (!users || users.length === 0) {
      console.log(`ℹ️  Nenhum usuário elegível para esta campanha.`);
      continue;
    }

    // Buscar quais usuários JÁ RECEBERAM esta campanha
    const { data: alreadySent, error: sentError } = await supabase
      .from('remarketing_campaigns')
      .select('user_id')
      .eq('campaign_type', campaign.type);

    if (sentError) {
      console.error(`❌ Erro ao verificar campanhas enviadas: ${sentError.message}`);
      continue;
    }

    const alreadySentIds = new Set((alreadySent || []).map(r => r.user_id));

    // Filtrar usuários que AINDA NÃO RECEBERAM
    const eligibleUsers = users.filter(user => !alreadySentIds.has(user.id));

    console.log(`📊 Total elegível: ${users.length}`);
    console.log(`✅ Já receberam: ${alreadySentIds.size}`);
    console.log(`📨 Pendentes de envio: ${eligibleUsers.length}\n`);

    if (eligibleUsers.length === 0) {
      console.log(`✓ Todos os usuários elegíveis já receberam esta campanha.\n`);
      continue;
    }

    if (dryRun) {
      console.log('🧪 DRY RUN - Emails que SERIAM enviados:\n');
      console.log(`${'Email'.padEnd(40)} | ${'Cadastro'.padEnd(12)} | ${'Dias'.padEnd(6)}`);
      console.log('-'.repeat(65));

      eligibleUsers.forEach(user => {
        const email = user.email.substring(0, 38).padEnd(40);
        const date = new Date(user.created_at).toLocaleDateString('pt-BR').padEnd(12);
        const daysAgo = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`${email} | ${date} | ${daysAgo} dias`);
      });
      console.log('');
      continue;
    }

    // ENVIO REAL
    let campaignSuccess = 0;
    let campaignErrors = 0;

    for (let i = 0; i < eligibleUsers.length; i++) {
      const user = eligibleUsers[i];
      const progress = `[${i + 1}/${eligibleUsers.length}]`;

      try {
        console.log(`${progress} Enviando ${campaign.type} para: ${user.email}...`);

        const result = await sendRemarketingEmail(
          user.email,
          user.name || 'Tatuador',
          campaign.type
        );

        if (result && result.success) {
          // Registrar envio bem-sucedido
          await supabase
            .from('remarketing_campaigns')
            .insert({
              user_id: user.id,
              campaign_type: campaign.type,
              email_status: 'sent'
            });

          campaignSuccess++;
          totalSent++;
          console.log(`${progress} ✅ Enviado com sucesso`);
        } else {
          // Registrar falha
          await supabase
            .from('remarketing_campaigns')
            .insert({
              user_id: user.id,
              campaign_type: campaign.type,
              email_status: 'failed',
              error_message: result?.error || 'Erro desconhecido'
            });

          campaignErrors++;
          totalErrors++;
          console.log(`${progress} ❌ Falha: ${result?.error || 'Erro desconhecido'}`);
        }

        // Delay entre emails
        if (i < eligibleUsers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
        // Registrar erro
        await supabase
          .from('remarketing_campaigns')
          .insert({
            user_id: user.id,
            campaign_type: campaign.type,
            email_status: 'failed',
            error_message: error.message
          });

        campaignErrors++;
        totalErrors++;
        console.log(`${progress} ❌ Erro: ${error.message}`);
      }
    }

    console.log(`\n${campaign.description}:`);
    console.log(`  ✅ Enviados: ${campaignSuccess}`);
    console.log(`  ❌ Erros: ${campaignErrors}`);
  }

  // Resumo final
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMO GERAL');
  console.log('='.repeat(80));
  console.log(`✅ Total enviados com sucesso: ${totalSent}`);
  console.log(`❌ Total de erros: ${totalErrors}`);
  console.log('');

  if (dryRun) {
    console.log('🧪 DRY RUN concluído. Nenhum email foi enviado.');
    console.log('💡 Para enviar de verdade, remova a flag --dry-run\n');
  } else {
    console.log('✅ Campanha automatizada concluída!\n');
  }
}

// Parse argumentos
const args = process.argv.slice(2);
const options: SendOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--dry-run' || arg === '-d') {
    options.dryRun = true;
  } else if (arg === '--delay') {
    options.delayMs = parseInt(args[++i], 10);
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
🤖 Sistema Automatizado de Remarketing

Este script envia automaticamente emails de remarketing para usuários FREE
seguindo um cronograma específico:

📅 CRONOGRAMA:
  • Dia 1  (24h após cadastro)   → Campanha "initial"   - Apresentação de recursos
  • Dia 7  (7 dias após)         → Campanha "reminder"  - Comparação com concorrentes
  • Dia 14 (14 dias após)        → Campanha "final"     - Última oportunidade

🔒 PROTEÇÕES:
  • Nunca envia o mesmo tipo de campanha duas vezes para o mesmo usuário
  • Só envia para usuários FREE (is_paid = false)
  • Registra todos os envios na tabela 'remarketing_campaigns'

Uso:
  npm run remarketing:auto [opções]

Opções:
  -d, --dry-run         Modo teste - não envia emails reais
  --delay <ms>          Delay entre emails em ms (padrão: 1000)
  -h, --help            Mostra esta ajuda

Exemplos:
  npm run remarketing:auto -- --dry-run              # Testar sem enviar
  npm run remarketing:auto                           # Enviar campanhas automaticamente
  npm run remarketing:auto -- --delay 2000           # Delay de 2s entre emails

⚙️  CONFIGURAÇÃO (Cron Job Sugerido):
  Execute este script diariamente para manter o funil de remarketing ativo:

  0 9 * * * cd /path/to/blacklinepro && npm run remarketing:auto
  (Todo dia às 9h da manhã)
    `);
    process.exit(0);
  }
}

automatedRemarketing(options).catch(console.error);
