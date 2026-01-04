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

interface SendOptions {
  campaignType?: 'initial' | 'reminder' | 'final';
  dryRun?: boolean;
  limit?: number;
  delayMs?: number;
}

async function sendRemarketingEmails(options: SendOptions = {}) {
  const {
    campaignType = 'initial',
    dryRun = false,
    limit,
    delayMs = 1000 // 1 segundo entre emails para não sobrecarregar
  } = options;

  console.log('🔍 CAMPANHA DE REMARKETING PARA USUÁRIOS FREE');
  console.log('='.repeat(80));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`📧 Tipo de campanha: ${campaignType}`);
  console.log(`🧪 Modo: ${dryRun ? 'DRY RUN (não enviará emails)' : 'PRODUÇÃO (enviará emails reais)'}`);
  if (limit) console.log(`🔢 Limite: ${limit} emails`);
  console.log('='.repeat(80));
  console.log('');

  // Buscar usuários FREE (is_paid = false)
  let query = supabase
    .from('users')
    .select('id, email, name, created_at')
    .eq('is_paid', false)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: freeUsers, error } = await query;

  if (error) {
    console.error('❌ Erro ao buscar usuários FREE:', error.message);
    return;
  }

  if (!freeUsers || freeUsers.length === 0) {
    console.log('ℹ️  Nenhum usuário FREE encontrado.');
    return;
  }

  console.log(`📊 Total de usuários FREE encontrados: ${freeUsers.length}\n`);

  if (dryRun) {
    console.log('🧪 DRY RUN - Emails que SERIAM enviados:\n');
    console.log(`${'Nome'.padEnd(30)} | ${'Email'.padEnd(35)} | ${'Cadastro'.padEnd(12)}`);
    console.log('-'.repeat(80));

    freeUsers.forEach(user => {
      const name = (user.name || 'Sem Nome').substring(0, 28).padEnd(30);
      const email = user.email.substring(0, 33).padEnd(35);
      const date = new Date(user.created_at).toLocaleDateString('pt-BR');
      console.log(`${name} | ${email} | ${date}`);
    });

    console.log('\n✅ DRY RUN concluído. Nenhum email foi enviado.');
    console.log(`💡 Para enviar de verdade, remova a flag --dry-run\n`);
    return;
  }

  // Envio real de emails
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ email: string; error: string }> = [];

  console.log('📨 Iniciando envio de emails...\n');

  for (let i = 0; i < freeUsers.length; i++) {
    const user = freeUsers[i];
    const progress = `[${i + 1}/${freeUsers.length}]`;

    try {
      console.log(`${progress} Enviando para: ${user.email}...`);

      const result = await sendRemarketingEmail(
        user.email,
        user.name || 'Tatuador',
        campaignType
      );

      if (result && result.success) {
        successCount++;
        console.log(`${progress} ✅ Enviado com sucesso para ${user.email}`);
      } else {
        errorCount++;
        const errorMsg = result?.error || 'Erro desconhecido';
        errors.push({ email: user.email, error: errorMsg });
        console.log(`${progress} ❌ Falha ao enviar para ${user.email}: ${errorMsg}`);
      }

      // Delay entre emails
      if (i < freeUsers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error: any) {
      errorCount++;
      errors.push({ email: user.email, error: error.message });
      console.log(`${progress} ❌ Erro ao enviar para ${user.email}: ${error.message}`);
    }
  }

  // Resumo final
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMO DO ENVIO');
  console.log('='.repeat(80));
  console.log(`Total de usuários FREE:  ${freeUsers.length}`);
  console.log(`✅ Enviados com sucesso:  ${successCount}`);
  console.log(`❌ Erros:                 ${errorCount}`);
  console.log(`📈 Taxa de sucesso:       ${((successCount / freeUsers.length) * 100).toFixed(1)}%`);

  if (errors.length > 0) {
    console.log('\n❌ DETALHES DOS ERROS:');
    console.log('-'.repeat(80));
    errors.forEach(({ email, error }) => {
      console.log(`${email}: ${error}`);
    });
  }

  console.log('\n✅ Campanha de remarketing concluída!');
}

// Parse argumentos da linha de comando
const args = process.argv.slice(2);
const options: SendOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--campaign' || arg === '-c') {
    const type = args[++i] as 'initial' | 'reminder' | 'final';
    if (['initial', 'reminder', 'final'].includes(type)) {
      options.campaignType = type;
    } else {
      console.error('❌ Tipo de campanha inválido. Use: initial, reminder ou final');
      process.exit(1);
    }
  } else if (arg === '--dry-run' || arg === '-d') {
    options.dryRun = true;
  } else if (arg === '--limit' || arg === '-l') {
    options.limit = parseInt(args[++i], 10);
  } else if (arg === '--delay') {
    options.delayMs = parseInt(args[++i], 10);
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
📧 Script de Remarketing para Usuários FREE

Uso:
  npm run remarketing [opções]

Opções:
  -c, --campaign <type>   Tipo de campanha: initial, reminder, final (padrão: initial)
  -d, --dry-run           Modo teste - não envia emails reais
  -l, --limit <number>    Limita quantidade de emails a enviar
  --delay <ms>            Delay entre emails em ms (padrão: 1000)
  -h, --help              Mostra esta ajuda

Exemplos:
  npm run remarketing -- --dry-run                          # Teste sem enviar
  npm run remarketing -- --campaign initial                 # Campanha inicial
  npm run remarketing -- --campaign reminder --limit 10     # Enviar para 10 usuários
  npm run remarketing -- --campaign final --delay 2000      # Campanha final com delay de 2s

Tipos de Campanha:
  initial   - Primeiro contato apresentando recursos
  reminder  - Lembrete com comparação vs concorrentes
  final     - Última chamada focando em simplicidade
    `);
    process.exit(0);
  }
}

sendRemarketingEmails(options).catch(console.error);
